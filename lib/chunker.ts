import { CodeChunk } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function chunkText(text: string, filePath: string, commit?: string, size: number = 500): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        const chunkText = text.slice(start, end);

        // Simple logic to avoid cutting words in half if possible, 
        // but for code it's better to just chunk by lines or strict size.
        // Here we just do strict size for simplicity in this mock.

        chunks.push({
            id: uuidv4(),
            text: chunkText,
            filePath,
            commit
        });

        start += size;
    }

    return chunks;
}
