import { NextResponse } from "next/server";
import { getAllRepos } from "@/lib/repoRegistry";

export async function GET() {
    try {
        const repos = getAllRepos();
        return NextResponse.json({ success: true, repos });
    } catch (error) {
        console.error("Error listing repos:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
