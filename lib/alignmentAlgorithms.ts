import { calculateCodeSimilarity } from "./phylogeneticIndexer";

export interface AlignedPair {
    lineA: string | null; // null means gap in sequence A
    lineB: string | null; // null means gap in sequence B
    type: "conserved" | "mutated" | "inserted" | "deleted";
}

/**
 * Needleman-Wunsch global sequence alignment for code lines.
 * Uses code token similarity to score mismatches and edits.
 */
export function alignCodeLines(linesA: string[], linesB: string[]): AlignedPair[] {
    const n = linesA.length;
    const m = linesB.length;

    // DP scoring matrix
    const scoreMatrix: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    const gapPenalty = -2;
    const matchScore = 3;
    const mismatchScore = -1;

    // Initialization
    for (let i = 0; i <= n; i++) scoreMatrix[i][0] = i * gapPenalty;
    for (let j = 0; j <= m; j++) scoreMatrix[0][j] = j * gapPenalty;

    // Fill matrix
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const lineA = linesA[i - 1];
            const lineB = linesB[j - 1];

            // Similarity score between lines (0 to 1)
            const similarity = calculateCodeSimilarity(lineA, lineB);
            let simScore = mismatchScore;
            if (similarity === 1) {
                simScore = matchScore;
            } else if (similarity > 0.4) {
                // Partial similarity
                simScore = Math.floor(similarity * matchScore) || mismatchScore;
            }

            const matchOrMismatch = scoreMatrix[i - 1][j - 1] + simScore;
            const deleteOp = scoreMatrix[i - 1][j] + gapPenalty;
            const insertOp = scoreMatrix[i][j - 1] + gapPenalty;

            scoreMatrix[i][j] = Math.max(matchOrMismatch, deleteOp, insertOp);
        }
    }

    // Backtracking
    const alignment: AlignedPair[] = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0) {
            const lineA = linesA[i - 1];
            const lineB = linesB[j - 1];

            const similarity = calculateCodeSimilarity(lineA, lineB);
            let simScore = mismatchScore;
            if (similarity === 1) {
                simScore = matchScore;
            } else if (similarity > 0.4) {
                simScore = Math.floor(similarity * matchScore) || mismatchScore;
            }

            const currentScore = scoreMatrix[i][j];
            const diagScore = scoreMatrix[i - 1][j - 1];
            const upScore = scoreMatrix[i - 1][j];
            const leftScore = scoreMatrix[i][j - 1];

            if (currentScore === diagScore + simScore) {
                alignment.push({
                    lineA,
                    lineB,
                    type: similarity === 1 ? "conserved" : "mutated"
                });
                i--;
                j--;
            } else if (currentScore === upScore + gapPenalty) {
                alignment.push({
                    lineA,
                    lineB: null,
                    type: "deleted"
                });
                i--;
            } else {
                alignment.push({
                    lineA: null,
                    lineB,
                    type: "inserted"
                });
                j--;
            }
        } else if (i > 0) {
            alignment.push({
                lineA: linesA[i - 1],
                lineB: null,
                type: "deleted"
            });
            i--;
        } else {
            alignment.push({
                lineA: null,
                lineB: linesB[j - 1],
                type: "inserted"
            });
            j--;
        }
    }

    return alignment.reverse();
}

/**
 * Aligns multiple code sequences by iteratively aligning them to a growing consensus template.
 */
export function alignMultipleCodeSequences(sequences: string[][]): string {
    if (sequences.length === 0) return "";
    if (sequences.length === 1) return sequences[0].join("\n");

    let consensus = sequences[0];

    for (let k = 1; k < sequences.length; k++) {
        const current = sequences[k];
        const alignment = alignCodeLines(consensus, current);

        // Build new aligned representation
        const newConsensus: string[] = [];
        for (const pair of alignment) {
            if (pair.type === "conserved") {
                newConsensus.push(`[CONSERVED] ${pair.lineA}`);
            } else if (pair.type === "mutated") {
                newConsensus.push(`[MUTATED] - ${pair.lineA}\n[MUTATED] + ${pair.lineB}`);
            } else if (pair.type === "deleted") {
                newConsensus.push(`[DELETED] ${pair.lineA}`);
            } else {
                newConsensus.push(`[INSERTED] ${pair.lineB}`);
            }
        }
        consensus = newConsensus;
    }

    return consensus.join("\n");
}


