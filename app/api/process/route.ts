import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/lamatic";

export async function POST(req: Request) {
    try {
        const { repoUrl } = await req.json();

        if (!repoUrl) {
            return NextResponse.json({ success: false, message: "Repo URL is required" }, { status: 400 });
        }

        // Trigger the pipeline
        // In a real app, this should be a background job. 
        // For this demo, we'll await it (might timeout on Vercel for large repos, but fine for local/demo)
        const success = await runPipeline(repoUrl);

        if (success) {
            return NextResponse.json({ success: true, message: "Repository processed successfully" });
        } else {
            return NextResponse.json({ success: false, message: "Failed to process repository" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error in /api/process:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
