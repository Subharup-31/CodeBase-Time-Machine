import { NextResponse } from "next/server";
import { generateAnswerWithContext, embedText } from "@/lib/gemini";
import { searchVectors } from "@/lib/qdrant";

export async function POST(req: Request) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ answer: "Please provide a question." }, { status: 400 });
        }

        // 1. Embed query
        const queryEmbedding = await embedText(query);

        // 2. Search Qdrant
        const contextChunks = await searchVectors("codebase", queryEmbedding, 5);

        // 3. Generate Answer
        const answer = await generateAnswerWithContext(query, contextChunks);

        return NextResponse.json({ answer, context: contextChunks });
    } catch (error) {
        console.error("Error in /api/ask:", error);
        return NextResponse.json({ answer: "Something went wrong." }, { status: 500 });
    }
}
