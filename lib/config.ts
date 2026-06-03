/**
 * Centralized configuration for tunable algorithm parameters.
 * All thresholds are configurable via environment variables with documented defaults.
 */
export const Config = {
    /**
     * Jaccard token similarity threshold for classifying a code symbol as a
     * "speciation" (copy-paste divergence) of an ancestor.
     * Default: 0.75 (75% token overlap required).
     */
    SPECIATION_SIMILARITY_THRESHOLD: parseFloat(
        process.env.SPECIATION_SIMILARITY_THRESHOLD || "0.75"
    ),

    /**
     * Maximum number of commits to analyze per full index run.
     */
    MAX_COMMITS_PER_INDEX: parseInt(
        process.env.MAX_COMMITS_PER_INDEX || "200"
    ),

    /**
     * Number of vector candidates to fetch before LLM reranking.
     */
    RERANK_CANDIDATE_COUNT: parseInt(
        process.env.RERANK_CANDIDATE_COUNT || "15"
    ),

    /**
     * Maximum agent loop turns before forcing termination.
     */
    MAX_AGENT_TURNS: parseInt(
        process.env.MAX_AGENT_TURNS || "8"
    ),
} as const;
