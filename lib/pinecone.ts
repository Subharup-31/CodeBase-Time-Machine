import { Pinecone } from "@pinecone-database/pinecone";
import { CodeChunk } from "@/types";

export const client = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY || "dummy_api_key",
});

const INDEX_NAME = process.env.PINECONE_INDEX || "codebase-time-machine";
const VECTOR_SIZE = 1536; // Matches OpenRouter/OpenAI text-embedding-3-small

export function getCollectionName(repoName: string): string {
    const sanitized = repoName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    return `code_chunks_${sanitized}`;
}

export async function ensureRepoCollection(collectionName: string) {
    if (!process.env.PINECONE_API_KEY) {
        console.warn("PINECONE_API_KEY missing");
        return;
    }
    try {
        const indexList = await client.listIndexes();
        const exists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME);

        if (!exists) {
            console.log(`Creating Pinecone index ${INDEX_NAME}...`);
            await client.createIndex({
                name: INDEX_NAME,
                dimension: VECTOR_SIZE,
                metric: "cosine",
                spec: {
                    serverless: {
                        cloud: "aws",
                        region: "us-east-1",
                    },
                },
            });
            console.log("Waiting for index to become ready...");
            let attempts = 0;
            while (attempts < 60) {
                const indexModel = await client.describeIndex(INDEX_NAME);
                if (indexModel.status?.ready) {
                    console.log(`Pinecone index ${INDEX_NAME} is ready!`);
                    break;
                }
                attempts++;
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
    } catch (error) {
        console.error("Error ensuring Pinecone index:", error);
    }
}

export interface CollectionStats {
    exists: boolean;
    vectorCount: number;
}

export async function getCollectionStats(collectionName: string): Promise<CollectionStats> {
    if (!process.env.PINECONE_API_KEY) {
        return { exists: false, vectorCount: 0 };
    }
    try {
        const indexList = await client.listIndexes();
        const exists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME);
        if (!exists) {
            return { exists: false, vectorCount: 0 };
        }

        const index = client.index(INDEX_NAME);
        const stats = await index.describeIndexStats();
        const nsStats = stats.namespaces?.[collectionName];
        return {
            exists: !!nsStats,
            vectorCount: nsStats?.recordCount ?? 0,
        };
    } catch (error) {
        console.error("Error getting collection stats:", error);
        return { exists: false, vectorCount: 0 };
    }
}

export async function deleteRepoCollection(collectionName: string) {
    if (!process.env.PINECONE_API_KEY) return;
    try {
        const index = client.index(INDEX_NAME);
        await index.deleteAll({ namespace: collectionName });
        console.log(`Deleted all vectors in namespace ${collectionName}`);
    } catch (error) {
        console.error(`Error deleting namespace ${collectionName}:`, error);
    }
}

export async function storeVectors(collectionName: string, chunks: CodeChunk[]): Promise<void> {
    if (!process.env.PINECONE_API_KEY) {
        console.warn("PINECONE_API_KEY missing, skipping vector storage");
        return;
    }

    await ensureRepoCollection(collectionName);

    try {
        const index = client.index(INDEX_NAME);
        const records = chunks.map((chunk) => {
            if (!chunk.embedding || chunk.embedding.length === 0) {
                throw new Error(`Missing embedding for chunk ${chunk.id}`);
            }
            return {
                id: chunk.id,
                values: chunk.embedding,
                metadata: {
                    text: chunk.text,
                    filePath: chunk.filePath,
                    commit: chunk.commit || "",
                },
            };
        });

        // Batch upserts in chunks of 50 to avoid request payload size limits (max 4MB)
        const batchSize = 50;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await index.namespace(collectionName).upsert({ records: batch });
            console.log(`Stored batch of ${batch.length} vectors in namespace ${collectionName} (${i + batch.length}/${records.length})`);
        }
        console.log(`Stored all ${records.length} vectors in Pinecone namespace ${collectionName}`);
    } catch (error) {
        console.error("Error storing vectors in Pinecone:", error);
        throw error;
    }
}

export async function searchVectors(collectionName: string, queryVector: number[], limit: number = 5): Promise<CodeChunk[]> {
    if (!process.env.PINECONE_API_KEY) {
        console.warn("PINECONE_API_KEY missing, returning empty search results");
        return [];
    }

    try {
        const indexList = await client.listIndexes();
        const exists = indexList.indexes?.some((idx) => idx.name === INDEX_NAME);
        if (!exists) {
            console.warn(`Index ${INDEX_NAME} does not exist.`);
            return [];
        }

        const index = client.index(INDEX_NAME);
        const queryResponse = await index.namespace(collectionName).query({
            vector: queryVector,
            topK: limit,
            includeMetadata: true,
        });

        if (!queryResponse.matches) return [];

        return queryResponse.matches.map((match) => ({
            id: match.id,
            text: match.metadata?.text as string,
            filePath: match.metadata?.filePath as string,
            commit: match.metadata?.commit as string,
            score: match.score,
            embedding: [],
        }));
    } catch (error) {
        console.error("Error searching vectors in Pinecone:", error);
        return [];
    }
}

                                                                                                                         
