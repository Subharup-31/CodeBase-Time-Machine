import { GoogleGenerativeAI } from "@google/generative-ai";
import { CodeChunk } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function embedText(text: string): Promise<number[]> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing, returning mock embedding");
        return Array.from({ length: 768 }, () => Math.random());
    }

    try {
        const model = genAI.getGenerativeModel({ model: "models/text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Error generating embedding:", error);
        // Fallback or rethrow? For now fallback to avoid crash during demo if key is wrong
        return Array.from({ length: 768 }, () => Math.random());
    }
}

export async function generateAnswerWithContext(query: string, contextChunks: CodeChunk[]): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return "Error: GEMINI_API_KEY is missing. Please add it to .env.local";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const contextText = contextChunks
            .map((chunk) => `File: ${chunk.filePath}\nCommit: ${chunk.commit || "Latest"}\nContent:\n${chunk.text}`)
            .join("\n\n---\n\n");

        const prompt = `
You are a senior software engineer analyzing a codebase.
User Query: "${query}"

Context from the codebase:
${contextText}

Instructions:
1. Answer the user's query based strictly on the provided context.
2. Cite specific files and commits where logic changed or exists.
3. If the context doesn't contain the answer, say so.
4. Be concise and technical.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating answer:", error);
        return "I encountered an error while analyzing the code. Please try again.";
    }
}
