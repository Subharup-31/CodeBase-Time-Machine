import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { getCollectionName } from "@/lib/qdrant";

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

export async function GET(req: Request, { params }: { params: { repoName: string } }) {
    try {
        const { repoName } = params;
        const collectionName = getCollectionName(repoName);

        const collectionInfo = await client.getCollection(collectionName);

        return NextResponse.json({
            repo: repoName,
            collection: collectionName,
            vectorCount: collectionInfo.points_count,
            status: collectionInfo.status
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to get vector count", details: error }, { status: 500 });
    }
}
