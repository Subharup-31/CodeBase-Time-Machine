import { callOpenRouter, OpenRouterMessage } from "./openrouter";
import { GeneticNode } from "./phylogeneticIndexer";
import { alignMultipleCodeSequences } from "./alignmentAlgorithms";

export interface CodeAlignmentResult {
    alignment: string;
    ancestor: string;
    refactoringPlan: string;
}

/**
 * Performs Multiple Code Sequence Alignment (MCSA) and synthesizes the Ancestral State (refactoring).
 */
export async function performBioAlignmentAndSynthesis(
    symbols: GeneticNode[]
): Promise<CodeAlignmentResult> {
    if (symbols.length < 2) {
        throw new Error("Alignment requires at least two code symbols.");
    }

    const formattedCodeInputs = symbols.map((s, index) => {
        return `Code Variant ${index + 1} (File: ${s.filePath}):\n\`\`\`\n${s.body}\n\`\`\``;
    }).join("\n\n");

    // Perform biological alignment programmatically
    const sequenceLines = symbols.map(s => s.body.split("\n"));
    const alignmentConsensus = alignMultipleCodeSequences(sequenceLines);

    const prompt = `
You are a Research-Grade Bioinformatics-inspired Code Alignment Engine.
Your task is to analyze multiple copy-pasted and mutated variants of a code block (functions/classes) and perform two tasks:

1. MULTIPLE CODE SEQUENCE ALIGNMENT (MCSA)
We have run a Needleman-Wunsch global line-alignment algorithm to align these sequences for you. Use it to verify variations:
${alignmentConsensus}

Clearly highlight in your response:
- [CONSERVED]: Lines of code that are identical across all variants.
- [MUTATED: filePath]: File-specific variations or custom modifications.

2. ANCESTRAL STATE SYNTHESIS (GENE SPLICING)
Synthesize a single, optimized, parameterized "Ancestral Function" (Core Genotype) that replaces all variants. 
Extract the file-specific custom mutations into clean configuration options or arguments (e.g. callbacks, options object).

3. REFACTORING PLAN
Provide a brief, step-by-step plan showing how to replace all the copy-pasted variants with a call to the new Ancestral Function.

Format your output exactly as follows:

=== MULTIPLE CODE SEQUENCE ALIGNMENT ===
[Consensus alignment text showing aligned blocks with [CONSERVED] and [MUTATED: filePath] tags]

=== ANCESTRAL STATE SYNTHESIS ===
\`\`\`typescript
[Unified optimized ancestor function code]
\`\`\`

=== REFACTORING PLAN ===
[Steps to replace duplicates with the unified ancestor]

Input variants to align:
${formattedCodeInputs}
`;

    const messages: OpenRouterMessage[] = [
        {
            role: "system",
            content: "You are an advanced software refactoring assistant specializing in code sequence alignment and deduplication."
        },
        {
            role: "user",
            content: prompt
        }
    ];

    try {
        console.log(`[Bio-Alignment] Aligning ${symbols.length} code variants...`);
        const responseMessage = await callOpenRouter(messages);
        const text = responseMessage.content || "";

        // Parse sections based on headers
        const alignmentPart = text.match(/=== MULTIPLE CODE SEQUENCE ALIGNMENT ===([\s\S]*?)=== ANCESTRAL STATE SYNTHESIS ===/i);
        const ancestorPart = text.match(/=== ANCESTRAL STATE SYNTHESIS ===([\s\S]*?)=== REFACTORING PLAN ===/i);
        const planPart = text.match(/=== REFACTORING PLAN ===([\s\S]*)/i);

        return {
            alignment: alignmentPart ? alignmentPart[1].trim() : "Failed to compile code alignment.",
            ancestor: ancestorPart ? ancestorPart[1].trim() : "Failed to synthesize ancestor.",
            refactoringPlan: planPart ? planPart[1].trim() : "Failed to generate refactoring plan."
        };

    } catch (error) {
        console.error("[Bio-Alignment] Error during alignment and synthesis:", error);
        throw error;
    }
}

                                                                                                                                                               
