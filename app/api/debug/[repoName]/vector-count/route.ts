import { NextResponse } from "next/server";
import { getNamespaceName, getNamespaceStats } from "@/lib/pinecone";

export async function GET(req: Request, { params }: { params: { repoName: string } }) {
    try {
        const { repoName } = params;
        const namespaceName = getNamespaceName(repoName);

        const stats = await getNamespaceStats(namespaceName);

        return NextResponse.json({
            repo: repoName,
            namespace: namespaceName,
            vectorCount: stats.vectorCount,
            status: stats.exists ? "ready" : "not_found"
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to get vector count", details: error }, { status: 500 });
    }
}
