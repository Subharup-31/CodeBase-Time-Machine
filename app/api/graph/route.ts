import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const repoName = searchParams.get('repoName');

    if (!repoName) {
        return NextResponse.json({ error: "Missing repoName parameter" }, { status: 400 });
    }

    try {
        const cacheDir = path.join(process.cwd(), ".cache", "repos");
        const graphFilePath = path.join(cacheDir, `${repoName}-graph.json`);

        if (!fs.existsSync(graphFilePath)) {
            return NextResponse.json({ error: "Graph data not found. The repository may not be fully indexed yet." }, { status: 404 });
        }

        const data = fs.readFileSync(graphFilePath, 'utf-8');
        const graph = JSON.parse(data);

        return NextResponse.json({ graph }, { status: 200 });
    } catch (e) {
        console.error("Error reading graph data:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
