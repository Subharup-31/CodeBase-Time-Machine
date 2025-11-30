import { QdrantClient } from "@qdrant/js-client-rest";
import { CodeChunk } from "@/types";
import crypto from "crypto";

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

const VECTOR_SIZE = 768; // Matches Gemini models/text-embedding-004

export function getCollectionName(repoName: string): string {
    // Sanitize repo name to be safe for Qdrant collection names
    // Allow alphanumeric, underscores, and hyphens. 
    // We'll also add a hash to ensure uniqueness if needed, but for now just sanitizing is good.
    const sanitized = repoName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    return `code_chunks_${sanitized}`;
}

export async function ensureRepoCollection(collectionName: string) {
    try {
        const result = await client.getCollections();
        const exists = result.collections.some((c) => c.name === collectionName);

        if (!exists) {
            console.log(`Creating collection ${collectionName}...`);
            await client.createCollection(collectionName, {
                vectors: {
                    size: VECTOR_SIZE,
                    distance: "Cosine",
                },
            });
        }
    } catch (error) {
        console.error("Error ensuring collection:", error);
    }
}

export async function deleteRepoCollection(collectionName: string) {
    try {
        await client.deleteCollection(collectionName);
        console.log(`Deleted collection ${collectionName}`);
    } catch (error) {
        console.error(`Error deleting collection ${collectionName}:`, error);
    }
}

export async function storeVectors(collectionName: string, chunks: CodeChunk[]): Promise<void> {
    if (!process.env.QDRANT_URL) {
        console.warn("QDRANT_URL missing, skipping vector storage");
        return;
    }

    await ensureRepoCollection(collectionName);

    try {
        const points = chunks.map((chunk) => ({
            id: chunk.id,
            vector: chunk.embedding!,
            payload: {
                text: chunk.text,
                filePath: chunk.filePath,
                commit: chunk.commit,
            },
        }));

        await client.upsert(collectionName, {
            wait: true,
            points,
        });

        console.log(`Stored ${points.length} vectors in ${collectionName}`);
    } catch (error) {
        console.error("Error storing vectors:", error);
        throw error;
    }
}

export async function searchVectors(collectionName: string, queryVector: number[], limit: number = 5): Promise<CodeChunk[]> {
    if (!process.env.QDRANT_URL) {
        console.warn("QDRANT_URL missing, returning empty search results");
        return [];
    }

    try {
        // Check if collection exists first to avoid error spam
        const result = await client.getCollections();
        const exists = result.collections.some((c) => c.name === collectionName);

        if (!exists) {
            console.warn(`Collection ${collectionName} does not exist.`);
            return [];
        }

        const results = await client.search(collectionName, {
            vector: queryVector,
            limit,
            with_payload: true,
        });

        return results.map((res) => ({
            id: res.id as string,
            text: res.payload?.text as string,
            filePath: res.payload?.filePath as string,
            commit: res.payload?.commit as string,
            score: res.score,
            embedding: [], // Don't need to return embedding
        }));
    } catch (error) {
        console.error("Error searching vectors:", error);
        return [];
    }
}
