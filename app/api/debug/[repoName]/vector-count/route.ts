import { NextResponse } from "next/server";
import { getCollectionName, getCollectionStats } from "@/lib/pinecone";

export async function GET(req: Request, { params }: { params: { repoName: string } }) {
    try {
        const { repoName } = params;
        const collectionName = getCollectionName(repoName);

        const stats = await getCollectionStats(collectionName);

        return NextResponse.json({
            repo: repoName,
            collection: collectionName,
            vectorCount: stats.vectorCount,
            status: stats.exists ? "ready" : "not_found"
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to get vector count", details: error }, { status: 500 });
    }
}

                                                                                                                                       
