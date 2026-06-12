import { fetchCommitHistory, fetchCommitDetails, fetchFileContent } from "./git";
import { getEmbeddings } from "./openrouter";
import { storeVectors } from "./pinecone";
import { CodeChunk } from "@/types";
import { saveGraphNodes, getIndexedCommitShas, markCommitsAsIndexed, getRepoId } from "./graphStore";
import { Config } from "./config";
import { createAdminClient } from "./supabase/serviceRole";

import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import Parser from "web-tree-sitter";

export interface CodeSymbol {
    name: string;
    type: "function" | "class";
    signature: string;
    body: string;
    filePath: string;
    commitSha: string;
    calls: string[];
    structuralHash: string;
    astNodeSequence: string[];
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
    structuralHash: string;
}

/**
 * Tokenizes a string of code to calculate Jaccard similarity.
 */
function getTokens(code: string): Set<string> {
    const words = code.toLowerCase().match(/\b\w+\b/g) || [];
    return new Set(words);
}

/**
 * Calculates Jaccard similarity between two sets of code line tokens.
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

/**
 * Fuzzy structural comparison on AST sequences (immune to renames)
 */
export function calculateAstSimilarity(seqA: string[], seqB: string[]): number {
    if (seqA.length === 0 || seqB.length === 0) return 0;
    const freqA: Record<string, number> = {};
    const freqB: Record<string, number> = {};
    seqA.forEach(t => freqA[t] = (freqA[t] || 0) + 1);
    seqB.forEach(t => freqB[t] = (freqB[t] || 0) + 1);
    
    let intersection = 0;
    let union = 0;
    const allKeys = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
    allKeys.forEach(k => {
        const cA = freqA[k] || 0;
        const cB = freqB[k] || 0;
        intersection += Math.min(cA, cB);
        union += Math.max(cA, cB);
    });
    return union === 0 ? 0 : intersection / union;
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
                    calls: getCallsFromTextRegex(bodyText),
                    structuralHash: crypto.createHash("sha256").update(bodyText.replace(/\s+/g, "")).digest("hex"),
                    astNodeSequence: []
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
                        calls: getCallsFromTextRegex(bodyText),
                        structuralHash: crypto.createHash("sha256").update(bodyText.replace(/\s+/g, "")).digest("hex"),
                        astNodeSequence: []
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
            const match = line.match(/\b(class|void|int|string|bool|float|double|public|private|protected|static|fn|function)\s+(\w+)\s*[\(<\s{]/i);

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
                        calls: getCallsFromTextRegex(bodyText),
                        structuralHash: crypto.createHash("sha256").update(bodyText.replace(/\s+/g, "")).digest("hex"),
                        astNodeSequence: []
                    });
                }
            }
            i++;
        }
    }

    return symbols;
}

let isParserInitialized = false;
let parserTs: Parser | null = null;
let parserTsx: Parser | null = null;
let parserPy: Parser | null = null;

/**
 * Initializes web-tree-sitter asynchronously using CDN-hosted WASM binaries
 */
export async function ensureParserInitialized(): Promise<void> {
    if (isParserInitialized) return;
    try {
        await Parser.init({
            locateFile(scriptName: string) {
                return `https://cdn.jsdelivr.net/npm/web-tree-sitter@0.20.8/${scriptName}`;
            }
        });

        const [tsLang, tsxLang, pyLang] = await Promise.all([
            Parser.Language.load("https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.11/out/tree-sitter-typescript.wasm"),
            Parser.Language.load("https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.11/out/tree-sitter-tsx.wasm"),
            Parser.Language.load("https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.11/out/tree-sitter-python.wasm")
        ]);

        parserTs = new Parser();
        parserTs.setLanguage(tsLang);

        parserTsx = new Parser();
        parserTsx.setLanguage(tsxLang);

        parserPy = new Parser();
        parserPy.setLanguage(pyLang);

        isParserInitialized = true;
    } catch (e) {
        console.error("[ParserInit] Failed to initialize web-tree-sitter parser, using regex fallback.", e);
    }
}

/**
 * Computes Merkle-like structural hash of AST node types recursively
 */
export function computeStructuralHash(node: Parser.SyntaxNode): string {
    const childHashes: string[] = [];
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type !== "comment") {
            childHashes.push(computeStructuralHash(child));
        }
    }
    const content = `${node.type}(${childHashes.join(",")})`;
    return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Extracts sequence of AST node types for similarity checks
 */
export function getAstNodeSequence(node: Parser.SyntaxNode): string[] {
    const sequence: string[] = [];
    function visit(n: Parser.SyntaxNode) {
        if (n.type !== "comment" && n.type !== "{" && n.type !== "}" && n.type !== "(" && n.type !== ")") {
            sequence.push(n.type);
        }
        for (let i = 0; i < n.childCount; i++) {
            const child = n.child(i);
            if (child) visit(child);
        }
    }
    visit(node);
    return sequence;
}

/**
 * Parses a file's content using WebAssembly Tree-Sitter AST Compiler API
 * or falls back to language-specific multi-language parser.
 */
export function extractSymbols(code: string, filePath: string, commitSha: string): CodeSymbol[] {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const symbols: CodeSymbol[] = [];

    let parser: Parser | null = null;
    let isPython = false;

    if (ext === "py" && parserPy) {
        parser = parserPy;
        isPython = true;
    } else if ((ext === "ts" || ext === "js") && parserTs) {
        parser = parserTs;
    } else if ((ext === "tsx" || ext === "jsx") && parserTsx) {
        parser = parserTsx;
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
                            calls: getCallsFromTextRegex(body),
                            structuralHash: computeStructuralHash(node),
                            astNodeSequence: getAstNodeSequence(node)
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
                            calls: getCallsFromTextRegex(body),
                            structuralHash: computeStructuralHash(node),
                            astNodeSequence: getAstNodeSequence(node)
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
                            calls: getCallsFromTextRegex(body),
                            structuralHash: computeStructuralHash(node),
                            astNodeSequence: getAstNodeSequence(node)
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
    collectionName: string, // Keep parameter for compatibility (maps to namespaceName)
    commitLimit: number = 20,
    userId: string,
    onProgress?: (e: ProgressEvent) => void
): Promise<number> {
    console.log(`[Phylogenetics] Commencing index for ${repoUrl}`);
    onProgress?.({ message: `Starting code symbol analysis...`, percent: 0 });

    // Initialize the WebAssembly parser before starting extraction
    await ensureParserInitialized();

    // 1. Fetch recent commits
    const commits = await fetchCommitHistory(repoUrl, commitLimit);
    if (commits.length === 0) return 0;

    // Process commits chronologically (oldest to newest)
    const sortedCommits = [...commits].reverse();

    // Check if we can index incrementally
    let graph: Record<string, GeneticNode> = {};
    let previousCommitSymbols: CodeSymbol[] = [];
    let previousNodeMap: Record<string, string> = {}; // Symbol Signature -> GeneticNode.id
    let commitsToIndex = sortedCommits;

    try {
        const cleanRepoName = collectionName.replace("code_chunks_", "");
        const repoId = await getRepoId(cleanRepoName, userId);
        if (repoId) {
            const adminClient = createAdminClient();
            const { data: latestCommit } = await adminClient
                .from('indexed_commits')
                .select('commit_sha')
                .eq('repo_id', repoId)
                .order('indexed_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const lastIndexedSha = latestCommit?.commit_sha;
            if (lastIndexedSha) {
                console.log(`[Phylogenetics] Found existing index. Last indexed commit: ${lastIndexedSha.slice(0, 7)}`);

                // Check if the latest commit in history is the same as lastIndexedSha
                if (commits.length > 0 && commits[0].sha === lastIndexedSha) {
                    console.log(`[Phylogenetics] Repository is already up to date.`);
                    onProgress?.({ message: `Repository is already up to date.`, percent: 100 });
                    return 0; // Return 0 new chunks since it's up to date
                }

                // Find where the lastIndexedSha is in our fetched commits history
                const lastIdx = commits.findIndex(c => c.sha === lastIndexedSha);
                if (lastIdx !== -1) {
                    // Commits to process are the ones since lastIndexedSha, processed chronologically (oldest to newest)
                    commitsToIndex = [...commits.slice(0, lastIdx)].reverse();
                    console.log(`[Phylogenetics] Incremental index: processing ${commitsToIndex.length} new commits.`);

                    // Fetch active nodes at target ref using DB queries
                    const { data: activeNodes } = await adminClient
                        .from('genetic_nodes')
                        .select('*')
                        .eq('repo_id', repoId)
                        .neq('change_type', 'deletion');

                    // Set indexer loop state
                    previousCommitSymbols = (activeNodes || []).map(n => ({
                        name: n.name,
                        type: n.type as any,
                        signature: "",
                        body: n.body || "",
                        filePath: n.file_path,
                        commitSha: n.commit_sha,
                        calls: n.calls || [],
                        structuralHash: n.structural_hash || "",
                        astNodeSequence: [] // Fallback since raw sequences aren't stored
                    }));

                    previousNodeMap = {};
                    (activeNodes || []).forEach(n => {
                        const sig = `${n.file_path}::${n.name}`;
                        previousNodeMap[sig] = n.id;
                    });
                }
            }
        }
    } catch (err) {
        console.warn("[Phylogenetics] Error checking existing index for incremental run:", err);
    }

    onProgress?.({ message: `Fetching details for ${commitsToIndex.length} commits in parallel...`, percent: 10 });
    console.log(`[Phylogenetics] Pre-fetching details for ${commitsToIndex.length} commits in parallel...`);
    const allCommitDetails = await Promise.all(
        commitsToIndex.map(commit => fetchCommitDetails(repoUrl, commit.sha))
    );
    onProgress?.({ message: `Building code evolution graph...`, percent: 25 });

    for (let index = 0; index < commitsToIndex.length; index++) {
        const commit = commitsToIndex[index];
        const details = allCommitDetails[index];
        if (!details || !details.files) continue;

        console.log(`[Phylogenetics] Analyzing commit [${index + 1}/${commitsToIndex.length}]: ${commit.sha.slice(0, 7)}...`);
        onProgress?.({
            message: `Tracing symbol lineage (${index + 1}/${commitsToIndex.length}): ${commit.message.slice(0, 50)}...`,
            percent: 25 + Math.floor((index / commitsToIndex.length) * 40),
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
                // 2. Look for copy-pastes or renames (high AST structural similarity)
                const bodyLines = currentSym.body.split("\n").length;
                
                // Exclude tiny getters/setters (less than 5 lines) from cross-file copy-paste mapping to avoid noise
                const prevSimilarMatches = previousCommitSymbols
                    .map(p => {
                        const similarity = currentSym.astNodeSequence.length > 0 && p.astNodeSequence.length > 0
                            ? calculateAstSimilarity(currentSym.astNodeSequence, p.astNodeSequence)
                            : calculateCodeSimilarity(currentSym.body, p.body);
                        return { sym: p, sig: `${p.filePath}::${p.name}`, similarity };
                    })
                    .filter(item => {
                        const isSameFileRename = currentSym.filePath === item.sym.filePath && item.similarity > Config.SPECIATION_SIMILARITY_THRESHOLD;
                        const isSameNameMove = currentSym.name === item.sym.name && item.similarity > Config.SPECIATION_SIMILARITY_THRESHOLD;
                        const isNearExactClone = bodyLines >= 5 && item.similarity > 0.90;
                        
                        return isSameNameMove || isSameFileRename || isNearExactClone;
                    });

                if (prevSimilarMatches.length > 0) {
                    // Linked as a speciation/divergence from parents
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
                calls: currentSym.calls,
                structuralHash: currentSym.structuralHash
            };
        }

        // Identify deletions
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
                        calls: [],
                        structuralHash: prevSym.structuralHash
                    };
                }
            }
        }

        previousCommitSymbols = currentCommitSymbols;
        previousNodeMap = currentNodeMap;
    }

    // Save Compiled Dependency Graph (CDG) to Supabase (serverless-safe)
    const cleanRepoName = collectionName.replace("code_chunks_", "");
    const repoId = await getRepoId(cleanRepoName, userId);
    if (repoId) {
        await saveGraphNodes(repoId, userId, graph);
        await markCommitsAsIndexed(repoId, commitsToIndex.map(c => c.sha));
        console.log(`[Phylogenetics] Saved code graph with ${Object.keys(graph).length} nodes and commits to Supabase.`);
    }

    // 3. Upload embeddings of current active symbols to Pinecone namespaces
    const activeNodes = Object.values(graph).filter(n => n.changeType !== "deletion");
    if (activeNodes.length === 0) return 0;

    const chunks: CodeChunk[] = [];

    for (const node of activeNodes) {
        const bodyLines = node.body.split("\n");
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
    // storeVectors internally routes to the Pinecone namespace matching collectionName
    await storeVectors(collectionName, chunks);
    onProgress?.({ message: `Symbol graph complete! ${chunks.length} functions & classes indexed.`, percent: 100 });
    console.log(`[Phylogenetics] Indexed all active symbols in Pinecone!`);

    return chunks.length;
}
