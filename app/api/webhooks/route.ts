import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/serviceRole";

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSig = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuffer = Buffer.from(signature.padEnd(expectedSig.length));
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";
    const secret = process.env.GITHUB_WEBHOOK_SECRET || "";

    if (secret && !verifyWebhookSignature(body, signature, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Only process push events to the default branch
    if (event.ref !== `refs/heads/${event.repository?.default_branch}`) {
        return NextResponse.json({ message: "Not default branch push, ignoring." });
    }

    const repoUrl = event.repository?.html_url;
    if (!repoUrl) return NextResponse.json({ error: "Missing repository URL" }, { status: 400 });

    // Find all users who have indexed this repo
    const adminClient = createAdminClient();
    const { data: repos } = await adminClient
        .from("repositories")
        .select("id, name, user_id")
        .eq("url", repoUrl)
        .eq("status", "ready");

    if (!repos || repos.length === 0) {
        return NextResponse.json({ message: "No indexed repos found for this URL." });
    }

    // Fire incremental sync event for each user's copy of this repo
    await Promise.all(
        repos.map(repo =>
            inngest.send({
                name: "repo/sync.requested",
                data: {
                    userId: repo.user_id,
                    repoUrl,
                    repoName: repo.name,
                    repoId: repo.id,
                }
            })
        )
    );

    return NextResponse.json({ message: `Triggered sync for ${repos.length} repo(s).` });
}
