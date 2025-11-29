import { NextResponse } from "next/server";
import { generateAnswerWithContext, embedText } from "@/lib/gemini";
import { searchVectors } from "@/lib/qdrant";
import { detectMode } from "@/lib/detectMode";
import { analyzeCodeFlow } from "@/lib/flowEngine";
import { generateFlowPrompt } from "@/lib/prompt.flow";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ answer: "Please provide a question." }, { status: 400 });
        }

        const mode = detectMode(query);
        console.log(`Detected mode: ${mode}`);

        // 1. Embed query (common for both)
        const queryEmbedding = await embedText(query);

        // 2. Search Qdrant (common for both)
        const contextChunks = await searchVectors("codebase", queryEmbedding, 5);

        if (mode === "timeline") {
            // Existing Timeline Logic
            const answer = await generateAnswerWithContext(query, contextChunks);
            return NextResponse.json({ mode, answer, context: contextChunks });
        } else {
            // New Flow Logic
            const analysis = analyzeCodeFlow(contextChunks);
            const prompt = generateFlowPrompt(query, analysis);

            // Generate Flow Explanation
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract Mermaid diagram if present
            const mermaidMatch = text.match(/```mermaid\n([\s\S]*?)\n```/);
            const mermaid = mermaidMatch ? mermaidMatch[1] : undefined;

            // Clean up text to remove the mermaid block from the answer display if desired, 
            // or keep it. Let's keep it simple and return the full text as answer, 
            // but also send mermaid separately for the UI to render.

            return NextResponse.json({
                mode,
                answer: text.replace(/```mermaid[\s\S]*?```/, "").trim(), // Remove diagram code from text
                mermaid,
                context: contextChunks
            });
        }

    } catch (error) {
        console.error("Error in /api/ask:", error);
        return NextResponse.json({ answer: "Something went wrong." }, { status: 500 });
    }
}
