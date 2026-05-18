import { fetchCommitHistory, fetchCommitDetails, fetchFileContent } from "./git";
import { getEmbeddings } from "./openrouter";
import { storeVectors } from "./pinecone";
import { CodeChunk } from "@/types";
import { createAdminClient } from "./supabase/serviceRole";

import { v4 as uuidv4 } from "uuid";
import Parser from "tree-sitter";
// @ts-ignore
import TypeScript from "tree-sitter-typescript";
// @ts-ignore
import Python from "tree-sitter-python";

export interface CodeSymbol {
    name: string;
    type: "function" | "class";
    signature: string;
    body: string;
    filePath: string;
    commitSha: string;
    calls: string[];
}

export interface GeneticNode {
    id: string;
    name: string;
    type: "function" | "class";
    filePath: string;
    commitSha: string;
    parentIds: string[];
    changeType: "origin" | "mutation" | "speciation" | "deletion";
    body: string;
    calls: string[];
}

/**
 * Tokenizes a string of code to calculate Jaccard similarity.
 */
function getTokens(code: string): Set<string> {
    const words = code.toLowerCase().match(/\b\w+\b/g) || [];
    return new Set(words);
}

/**
 * Calculates similarity between two code blocks.
 */
export function calculateCodeSimilarity(codeA: string, codeB: string): number {
    const tokensA = getTokens(codeA);
    const tokensB = getTokens(codeB);
    let intersectionCount = 0;
    tokensA.forEach(token => {
        if (tokensB.has(token)) {
            intersectionCount++;
        }
    });
    const unionSize = tokensA.size + tokensB.size - intersectionCount;
    if (unionSize === 0) return 0;
    return intersectionCount / unionSize;
}

const controlKeywords = new Set([
    "if", "for", "while", "catch", "switch", "return", "def", "class", "func", "function", 
    "import", "require", "await", "yield", "let", "const", "var", "else", "try", "throw"
]);

/**
 * Extracts function/method calls from raw code block text using regex.
 */
function getCallsFromTextRegex(body: string): string[] {
    const calls: string[] = [];
    const matches = body.match(/\b(\w+)\s*\(/g) || [];
    for (const m of matches) {
        const name = m.replace("(", "").trim();
        if (!controlKeywords.has(name) && isNaN(Number(name))) {
            calls.push(name);
        }
    }
    return Array.from(new Set(calls));
}



/**
 * Precise parser for Python, Go, and brace-based languages (Java, C++, C#).
 * Handles Python indentation boundaries and Go struct/method definitions.
 */
function extractSymbolsMultiLanguage(code: string, filePath: string, commitSha: string): CodeSymbol[] {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const symbols: CodeSymbol[] = [];
    const lines = code.split("\n");

    if (ext === "py") {
        // Python Indentation-based Parsing
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            const match = line.match(/^\s*(def|class)\s+(\w+)\s*[\(\:]/);
            if (match) {
                const type = match[1] === "class" ? "class" : "function";
                const name = match[2];
                const startLine = i;
                const declarationLine = line;
                
                // Calculate base indentation
                const baseIndent = line.search(/\S/);
                const bodyLines: string[] = [line];
                i++;
                
                // Read ahead until we find a line with less or equal indentation (excluding blank lines)
                while (i < lines.length) {
                    const nextLine = lines[i];
                    const trimmed = nextLine.trim();
                    if (trimmed.length > 0) {
                        const nextIndent = nextLine.search(/\S/);
                        if (nextIndent <= baseIndent) {
                            break;
                        }
                    }
                    bodyLines.push(nextLine);
                    i++;
                }
                
                const bodyText = bodyLines.join("\n");
                symbols.push({
                    name,
                    type: type as "class" | "function",
                    signature: declarationLine.trim(),
                    body: bodyText,
                    filePath,
                    commitSha,
                    calls: getCallsFromTextRegex(bodyText)
                });
                // Since we incremented i, we decrement to not skip a line
                i--;
            }
            i++;
        }
    } else if (ext === "go") {
        // Go Function and Struct Parsing
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            // Match func declarations: func Name(...) or func (r Rec) Name(...)
            const funcMatch = line.match(/^func\s+(?:\([^\)]+\)\s+)?(\w+)\s*\(/);
            const structMatch = line.match(/^type\s+(\w+)\s+struct/);
            
            if ((funcMatch || structMatch) && line.includes("{")) {
                const name = funcMatch ? funcMatch[1] : structMatch![1];
                const type = funcMatch ? "function" : "class";
                const signature = line.trim().replace(/{$/, "").trim();
                
                let bracketCount = 0;
                let bodyLines: string[] = [];
                let foundEnd = false;
                
                for (let j = i; j < lines.length; j++) {
                    bodyLines.push(lines[j]);
                    const openCount = (lines[j].match(/{/g) || []).length;
                    const closeCount = (lines[j].match(/}/g) || []).length;
                    bracketCount += openCount - closeCount;
                    
                    if (bracketCount <= 0) {
                        i = j;
                        foundEnd = true;
                        break;
                    }
                }
                
                if (foundEnd) {
                    const bodyText = bodyLines.join("\n");
                    symbols.push({
                        name,
                        type: type as "class" | "function",
                        signature,
                        body: bodyText,
                        filePath,
                        commitSha,
                        calls: getCallsFromTextRegex(bodyText)
                    });
                }
            }
            i++;
        }
    } else {
        // Default C-style brace-matching fallback for Java, C++, C#, Rust, etc.
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            // Matches class declarations or functions/methods
            const match = line.match(/\b(class|void|int|string|bool|float|double|public|private|protected|static|fn)\s+(\w+)\s*[\(<\s{]/i);
            
            if (match && line.includes("{")) {
                const keyword = match[1].toLowerCase();
                const type = (keyword === "class" || keyword === "struct") ? "class" : "function";
                const name = match[2];
                const signature = line.trim().replace(/{$/, "").trim();
                
                let bracketCount = 0;
                let bodyLines: string[] = [];
                let foundEnd = false;
                
                for (let j = i; j < lines.length; j++) {
                    bodyLines.push(lines[j]);
                    const openCount = (lines[j].match(/{/g) || []).length;
                    const closeCount = (lines[j].match(/}/g) || []).length;
                    bracketCount += openCount - closeCount;
                    
                    if (bracketCount <= 0) {
                        i = j;
                        foundEnd = true;
                        break;
                    }
                }
                
                if (foundEnd) {
                    const bodyText = bodyLines.join("\n");
                    symbols.push({
                        name,
                        type: type as "class" | "function",
                        signature,
                        body: bodyText,
                        filePath,
                        commitSha,
                        calls: getCallsFromTextRegex(bodyText)
                    });
                }
            }
            i++;
        }
    }
    
    return symbols;
}

const parsers = {
    ts: new Parser(),
    tsx: new Parser(),
    py: new Parser()
};

try {
    parsers.ts.setLanguage(TypeScript.typescript as any);
    parsers.tsx.setLanguage(TypeScript.tsx as any);
    parsers.py.setLanguage(Python as any);
} catch (e) {
    console.warn("Failed to set Tree-Sitter languages", e);
}

/**
 * Parses a file's content using Tree-Sitter AST Compiler API (for JS/TS/JSX/TSX and Python)
 * or falls back to language-specific multi-language parser.
 */
export function extractSymbols(code: string, filePath: string, commitSha: string): CodeSymbol[] {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const symbols: CodeSymbol[] = [];

    let parser: Parser | null = null;
    let isPython = false;

    if (ext === "py") {
        parser = parsers.py;
        isPython = true;
    } else if (ext === "ts" || ext === "js") {
        parser = parsers.ts;
    } else if (ext === "tsx" || ext === "jsx") {
        parser = parsers.tsx;
    }

    if (!parser) {
        // Fallback for Go, Java, C++, etc.
        return extractSymbolsMultiLanguage(code, filePath, commitSha);
    }

    try {
        const tree = parser.parse(code);

        const visit = (node: Parser.SyntaxNode) => {
            const type = node.type;

            if (isPython) {
                if (type === "function_definition" || type === "class_definition") {
                    const nameNode = node.childForFieldName("name");
                    if (nameNode) {
                        const symType = type === "class_definition" ? "class" : "function";
                        const name = nameNode.text;
                        const body = node.text;
                        const sigLines = body.split("\n");
                        const signature = sigLines.length > 0 ? sigLines[0].trim() : body;
                        
                        symbols.push({
                            name,
                            type: symType,
                            signature,
                            body,
                            filePath,
                            commitSha,
                            calls: getCallsFromTextRegex(body)
                        });
                    }
                }
            } else {
                // JS/TS
                if (type === "function_declaration" || type === "method_definition" || type === "class_declaration") {
                    const nameNode = node.childForFieldName("name");
                    if (nameNode) {
                        const symType = type === "class_declaration" ? "class" : "function";
                        const name = nameNode.text;
                        const body = node.text;
                        const sigLines = body.split("\n");
                        const signature = sigLines.length > 0 ? sigLines[0].trim() : body;

                        symbols.push({
                            name,
                            type: symType,
                            signature,
                            body,
                            filePath,
                            commitSha,
                            calls: getCallsFromTextRegex(body)
                        });
                    }
                } else if (type === "variable_declarator") {
                    const nameNode = node.childForFieldName("name");
                    const valueNode = node.childForFieldName("value");
                    if (nameNode && valueNode && valueNode.type === "arrow_function") {
                        const name = nameNode.text;
                        const body = valueNode.text;
                        const sigLines = body.split("\n");
                        const signature = sigLines.length > 0 ? sigLines[0].trim() : body;

                        symbols.push({
                            name,
                            type: "function",
                            signature: `${name} = ${signature}`,
                            body,
                            filePath,
                            commitSha,
                            calls: getCallsFromTextRegex(body)
                        });
                    }
                }
            }

            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) visit(child);
            }
        };

        visit(tree.rootNode);
        return symbols;
    } catch (e) {
        console.warn(`[TreeSitter] Failed to parse ${filePath}, falling back.`, e);
        return extractSymbolsMultiLanguage(code, filePath, commitSha);
    }
}



import { ProgressEvent } from "./evolutionIndexer";

/**
 * Builds the Phylogenetic Tree of Code Blocks (PTCB) graph.
 */
export async function processRepositoryPhylogenetics(
    repoUrl: string,
    collectionName: string,
    commitLimit: number = 20,
    userId: string,
    onProgress?: (e: ProgressEvent) => void
): Promise<number> {
    console.log(`[Phylogenetics] Commencing index for ${repoUrl}`);
    onProgress?.({ message: `Starting code symbol analysis...`, percent: 0 });

    // 1. Fetch recent commits
    const commits = await fetchCommitHistory(repoUrl, commitLimit);
    if (commits.length === 0) return 0;
    
    // Process commits chronologically (oldest to newest)
    const sortedCommits = [...commits].reverse();
    
    onProgress?.({ message: `Fetching details for ${sortedCommits.length} commits in parallel...`, percent: 10 });
    // Pre-fetch commit details in parallel to avoid sequential API wait latency
    console.log(`[Phylogenetics] Pre-fetching details for ${sortedCommits.length} commits in parallel...`);
    const allCommitDetails = await Promise.all(
        sortedCommits.map(commit => fetchCommitDetails(repoUrl, commit.sha))
    );
    onProgress?.({ message: `Building code evolution graph...`, percent: 25 });
    
    const graph: Record<string, GeneticNode> = {};
    let previousCommitSymbols: CodeSymbol[] = [];
    let previousNodeMap: Record<string, string> = {}; // Symbol Signature -> GeneticNode.id

    for (let index = 0; index < sortedCommits.length; index++) {
        const commit = sortedCommits[index];
        const details = allCommitDetails[index];
        if (!details || !details.files) continue;

        console.log(`[Phylogenetics] Analyzing commit [${index + 1}/${sortedCommits.length}]: ${commit.sha.slice(0, 7)}...`);
        onProgress?.({
            message: `Tracing symbol lineage (${index + 1}/${sortedCommits.length}): ${commit.message.slice(0, 50)}...`,
            percent: 25 + Math.floor((index / sortedCommits.length) * 40),
        });

        const currentCommitSymbols: CodeSymbol[] = [];
        const currentNodeMap: Record<string, string> = {};

        // Filter and process only relevant code files
        const codeFiles = details.files.filter(f => 
            /\.(ts|js|tsx|jsx|py|go|java|cpp|cs)$/i.test(f.filename)
        );

        // Fetch all file contents for this commit in parallel
        const fileResults = await Promise.all(
            codeFiles.map(async (file) => {
                let content = "";
                if (file.status !== "removed") {
                    try {
                        content = await fetchFileContent(repoUrl, file.filename, commit.sha);
                    } catch (e) {
                        content = file.patch || "";
                    }
                }
                return { filename: file.filename, content };
            })
        );

        for (const fileResult of fileResults) {
            const symbols = extractSymbols(fileResult.content, fileResult.filename, commit.sha);
            currentCommitSymbols.push(...symbols);
        }

        // Trace ancestry for each current symbol
        for (const currentSym of currentCommitSymbols) {
            const symSig = `${currentSym.filePath}::${currentSym.name}`;
            const nodeId = uuidv4();
            currentNodeMap[symSig] = nodeId;

            // Find candidates in previous commit for linkage
            let parentIds: string[] = [];
            let changeType: GeneticNode["changeType"] = "origin";

            // 1. Look for exact match in previous commit (same file, same name)
            const prevExactMatch = previousCommitSymbols.find(
                p => p.name === currentSym.name && p.filePath === currentSym.filePath
            );

            if (prevExactMatch) {
                const prevExactSig = `${prevExactMatch.filePath}::${prevExactMatch.name}`;
                const prevNodeId = previousNodeMap[prevExactSig];
                if (prevNodeId) {
                    parentIds.push(prevNodeId);
                    changeType = "mutation";
                }
            } else {
                // 2. Look for copy-pastes or renames (high similarity elsewhere)
                const prevSimilarMatches = previousCommitSymbols
                    .map(p => ({
                        sym: p,
                        sig: `${p.filePath}::${p.name}`,
                        similarity: calculateCodeSimilarity(currentSym.body, p.body)
                    }))
                    .filter(item => item.similarity > 0.75); // Greater than 75% similarity

                if (prevSimilarMatches.length > 0) {
                    // Linked as a speciation/divergence from parent
                    for (const match of prevSimilarMatches) {
                        const prevNodeId = previousNodeMap[match.sig];
                        if (prevNodeId) {
                            parentIds.push(prevNodeId);
                        }
                    }
                    changeType = "speciation";
                }
            }

            graph[nodeId] = {
                id: nodeId,
                name: currentSym.name,
                type: currentSym.type,
                filePath: currentSym.filePath,
                commitSha: currentSym.commitSha,
                parentIds,
                changeType,
                body: currentSym.body,
                calls: currentSym.calls
            };
        }

        // Identify deletions (symbols in previous commit that disappeared in the current one)
        for (const prevSym of previousCommitSymbols) {
            const prevSig = `${prevSym.filePath}::${prevSym.name}`;
            const stillExists = currentCommitSymbols.some(
                c => c.name === prevSym.name && c.filePath === prevSym.filePath
            );

            if (!stillExists) {
                const prevNodeId = previousNodeMap[prevSig];
                if (prevNodeId) {
                    const deletionNodeId = uuidv4();
                    graph[deletionNodeId] = {
                        id: deletionNodeId,
                        name: prevSym.name,
                        type: prevSym.type,
                        filePath: prevSym.filePath,
                        commitSha: commit.sha,
                        parentIds: [prevNodeId],
                        changeType: "deletion",
                        body: "",
                        calls: []
                    };
                }
            }
        }

        previousCommitSymbols = currentCommitSymbols;
        previousNodeMap = currentNodeMap;
    }

    // Save Compiled Dependency Graph (CDG) to Supabase (serverless-safe)
    const cleanRepoName = collectionName.replace("code_chunks_", "");
    const adminClient = createAdminClient();
    await adminClient
        .from('repositories')
        .update({ graph_data: graph })
        .eq('name', cleanRepoName)
        .eq('user_id', userId);

    console.log(`[Phylogenetics] Saved code graph with ${Object.keys(graph).length} nodes to Supabase.`);

    // 3. Upload embeddings of current active symbols to Qdrant for semantic lookups
    const activeNodes = Object.values(graph).filter(n => n.changeType !== "deletion");
    if (activeNodes.length === 0) return 0;

    const chunks: CodeChunk[] = [];

    for (const node of activeNodes) {
        const bodyLines = node.body.split("\n");
        // If function/class body is larger than 25 lines, chunk it to fit vector token bounds
        if (bodyLines.length > 25) {
            const chunkSize = 15;
            const overlap = 5;
            let subIdx = 0;
            
            for (let start = 0; start < bodyLines.length; start += (chunkSize - overlap)) {
                const end = Math.min(start + chunkSize, bodyLines.length);
                const chunkLines = bodyLines.slice(start, end);
                const subBody = chunkLines.join("\n");
                
                const formattedText = [
                    `Parent Function: ${node.name}`,
                    `Type: ${node.type}`,
                    `File: ${node.filePath}`,
                    `Commit: ${node.commitSha.slice(0, 7)}`,
                    `Sub-chunk Code [Lines ${start + 1}-${end}]:`,
                    subBody
                ].join("\n");
                
                chunks.push({
                    id: `${node.id}-sub-${subIdx++}`,
                    text: formattedText,
                    filePath: node.filePath,
                    commit: node.commitSha
                });
                
                if (end === bodyLines.length) break;
            }
        } else {
            // Short function/class node is stored in full
            const formattedText = [
                `Function: ${node.name}`,
                `Type: ${node.type}`,
                `File: ${node.filePath}`,
                `Commit: ${node.commitSha.slice(0, 7)}`,
                `Code:`,
                node.body
            ].join("\n");
            
            chunks.push({
                id: node.id,
                text: formattedText,
                filePath: node.filePath,
                commit: node.commitSha
            });
        }
    }

    console.log(`[Phylogenetics] Generating embeddings for ${chunks.length} active symbols...`);
    onProgress?.({ message: `Embedding ${chunks.length} code symbols...`, percent: 68 });
    const batchSize = 100;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchTexts = batch.map(c => c.text);
        const batchNum = Math.floor(i / batchSize) + 1;
        onProgress?.({
            message: `Embedding symbols (batch ${batchNum}/${totalBatches})...`,
            percent: 68 + Math.floor((batchNum / totalBatches) * 25),
        });
        const embeddings = await getEmbeddings(batchTexts);

        for (let j = 0; j < batch.length; j++) {
            batch[j].embedding = embeddings[j];
        }
    }

    onProgress?.({ message: `Saving ${chunks.length} symbols to knowledge base...`, percent: 95 });
    await storeVectors(collectionName, chunks);
    onProgress?.({ message: `Symbol graph complete! ${chunks.length} functions & classes indexed.`, percent: 100 });
    console.log(`[Phylogenetics] Indexed all active symbols in Qdrant!`);

    return chunks.length;
}

 
 

                                                                                                                                                                
