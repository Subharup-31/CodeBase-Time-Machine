import { NextResponse } from "next/server";
import { fetchRepoTree, fetchFileContent } from "@/lib/git";
import { chunkText } from "@/lib/chunker";
import { embedText } from "@/lib/gemini";
import { storeVectors, ensureRepoCollection, getCollectionName } from "@/lib/qdrant";
import { addRepo, getRepoByName } from "@/lib/repoRegistry";

export async function POST(req: Request) {
    try {
        const { repoUrl, displayName } = await req.json();

        if (!repoUrl) {
            return NextResponse.json({ success: false, message: "Repo URL is required" }, { status: 400 });
        }

        // Determine repo name
        const name = displayName || repoUrl.split("/").pop() || "unknown-repo";
        const collectionName = getCollectionName(name);

        console.log(`🚀 Processing repo: ${name} -> Collection: ${collectionName}`);

        // Register repo
        const existing = getRepoByName(name);
        if (!existing) {
            addRepo({
                name,
                url: repoUrl,
                collection: collectionName,
                createdAt: new Date().toISOString()
            });
        }

        // Ensure collection exists
        await ensureRepoCollection(collectionName);

        // Fetch full tree
        console.log("Fetching file tree...");
        const files = await fetchRepoTree(repoUrl);
        console.log(`📁 Found ${files.length} files`);

        let totalChunks = 0;

        for (const file of files) {
            try {
                // Skip empty paths or likely non-text files based on extension if needed
                // For now, fetchFileContent handles some filtering or returns null
                const content = await fetchFileContent(repoUrl, file.path);
                if (!content || content.trim().length === 0) continue;

                // Use existing chunker
                // chunkText(text, filePath, commit, size)
                const chunks = chunkText(content, file.path, undefined, 2000);

                console.log(`📄 File: ${file.path} -> ${chunks.length} chunks`);

                // Embed and prepare for storage
                for (const chunk of chunks) {
                    chunk.embedding = await embedText(chunk.text);
                }

                // Store vectors using the existing function which expects CodeChunk[]
                await storeVectors(collectionName, chunks);

                totalChunks += chunks.length;

            } catch (err) {
                console.error("⚠️ File processing error:", file.path, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Repo processed successfully`,
            repo: name,
            collection: collectionName,
            chunks: totalChunks
        });

    } catch (error) {
        console.error("❌ Error in /api/process:", error);
        return NextResponse.json({ success: false, message: "Processing failed" }, { status: 500 });
    }
}
