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
            .map((chunk) => `File: ${chunk.filePath}\nCommit: ${chunk.commit || "Unknown"}\nContent:\n${chunk.text}`)
            .join("\n\n---\n\n");

        const prompt = `
You are the analysis engine for a multi-repository codebase explorer.
Current Mode: TIMELINE MODE

====================================================
GLOBAL RULES
====================================================
1. NEVER hallucinate files, features, logic, APIs, or commit dates.
2. NEVER invent code paths that are not explicitly present in the retrieved chunks.
3. Only use the text passed in contextChunks.
4. If a question mentions a specific repo using @RepoName, all reasoning MUST be constrained to that repo.
5. When explaining functionality, include ONLY what exists in the provided chunks.

====================================================
TIMELINE MODE RULES
====================================================
Timeline mode answers questions like: "When was X added?", "Which commit introduced Z?", "How did this file evolve?"

1. If the repo has NO commit timestamps (or commit is "Unknown"):
   Respond exactly with:
   "This repository has no commit history available."

2. If the requested file DOES NOT EXIST in the repo (context is empty or irrelevant):
   Respond exactly with:
   "The file or feature you asked about does not exist in this repository."

3. If the file EXISTS but no timestamps exist:
   Respond exactly with:
   "This file exists in the repository, but commit history is not available, so the date it was added cannot be determined."

4. NEVER output or include:
   - CSS
   - HTML
   - JS
   - any code snippet
   - any irrelevant context
   - any file contents

5. Timeline answers MUST be short, factual, and NEVER speculative.

====================================================
User Query: "${query}"

Context from the codebase:
${contextText}

Instructions:
Answer the user's query based strictly on the provided context and the rules above.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating answer:", error);
        return "I encountered an error while analyzing the code. Please try again.";
    }
}

export async function expandKeywordsWithAI(keywords: string[]): Promise<string[]> {
    if (!process.env.GEMINI_API_KEY || keywords.length === 0) {
        return keywords;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
        You are a code search assistant.
        The user is searching for files related to these keywords: ${JSON.stringify(keywords)}.
        
        Generate a JSON array of 5-10 technical synonyms, related file names, or coding concepts that might appear in a codebase for these terms.
        Example: ["login"] -> ["auth", "authentication", "signin", "session", "jwt", "user_controller"]
        
        Return ONLY the JSON array of strings. No markdown, no explanations.
        `;

        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();

        // Clean up response to ensure valid JSON
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const expanded = JSON.parse(cleanJson);

        if (Array.isArray(expanded)) {
            // Combine original keywords with new ones and deduplicate
            return Array.from(new Set([...keywords, ...expanded]));
        }
        return keywords;
    } catch (error) {
        console.error("Error expanding keywords with AI:", error);
        return keywords;
    }
}
