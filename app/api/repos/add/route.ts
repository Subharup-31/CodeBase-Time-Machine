import { z } from 'zod';
import { NextResponse } from "next/server";
import { addRepo, repoExists } from "@/lib/repoRegistry";
import { getCollectionName, ensureRepoCollection } from "@/lib/pinecone";
import { parseGithubRepo } from "@/lib/git";
import { createClient } from "@/lib/supabase/server";

const AddRepoSchema = z.object({
    repoUrl: z.string().url().refine(url => /^https?:\/\/github\.com\/[^/]+\/[^/]+/.test(url), {
        message: 'Must be a valid GitHub repository URL'
    }),
    displayName: z.string().min(1).max(100).optional()
});

function autoDetectName(repoUrl: string, providedName?: string): string {
    if (providedName && providedName.trim()) {
        return providedName.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    }
    try {
        const { repo } = parseGithubRepo(repoUrl);
        return repo.replace(/[^a-zA-Z0-9_-]/g, "-");
    } catch {
        return "repo-" + Date.now();
    }
}

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        let rawBody: unknown;
        try {
            rawBody = await req.json();
        } catch {
            return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
        }

        const parseResult = AddRepoSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, message: parseResult.error.issues[0].message },
                { status: 400 }
            );
        }
        const { repoUrl, displayName: providedName } = parseResult.data;

        const displayName = autoDetectName(repoUrl, providedName);

        if (await repoExists(displayName)) {
            return NextResponse.json(
                { success: false, message: `Repository "${displayName}" is already registered. Delete it first to re-add.` },
                { status: 409 }
            );
        }

        const collectionName = getCollectionName(displayName);

        // Ensure Qdrant collection
        await ensureRepoCollection(collectionName);

        // Register in repos.json
        await addRepo({
            name: displayName,
            url: repoUrl,
            collection: collectionName,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: `Repository "${displayName}" registered. Use the Time Machine page to index it.`,
            collection: collectionName,
            name: displayName,
        });
    } catch (error: unknown) {
        console.error("Error adding repo:", error);
        const message = error instanceof Error ? error.message : "Internal server error";
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}

 
 

                                                                                                                                                                     
