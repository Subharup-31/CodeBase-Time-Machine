import { fetchRepoTree, fetchFileContent } from "@/lib/git";
import { chunkText } from "@/lib/chunker";
import { embedText } from "@/lib/gemini";
import { storeVectors } from "@/lib/qdrant";

export async function processRepository(repoUrl: string, collectionName: string) {
    console.log(`Processing repo: ${repoUrl} -> Collection: ${collectionName}`);

    // Fetch full tree
    console.log("Fetching file tree...");
    const files = await fetchRepoTree(repoUrl);
    console.log(`📁 Found ${files.length} files`);

    let totalChunks = 0;

    for (const file of files) {
        try {
            // Skip empty paths or likely non-text files based on extension if needed
            const content = await fetchFileContent(repoUrl, file.path);
            if (!content || content.trim().length === 0) continue;

            // Chunk text
            const chunks = chunkText(content, file.path, undefined, 2000);

            console.log(`📄 File: ${file.path} -> ${chunks.length} chunks`);

            // Embed and prepare for storage
            for (const chunk of chunks) {
                chunk.embedding = await embedText(chunk.text);
            }

            // Store vectors
            await storeVectors(collectionName, chunks);

            totalChunks += chunks.length;

        } catch (err) {
            console.error("⚠️ File processing error:", file.path, err);
        }
    }

    return totalChunks;
}
