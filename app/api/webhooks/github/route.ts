import { NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        // 1. Verify GitHub Webhook Signature (Optional but recommended)
        const signature = req.headers.get("x-hub-signature-256");
        const githubEvent = req.headers.get("x-github-event");

        // We only care about push events
        if (githubEvent !== "push") {
            return NextResponse.json({ message: "Ignored non-push event" }, { status: 200 });
        }

        const bodyText = await req.text();
        const payload = JSON.parse(bodyText);
        
        // Ensure this is a valid repository push
        if (!payload.repository || !payload.repository.html_url) {
            return NextResponse.json({ message: "Ignored, missing repository URL" }, { status: 200 });
        }

        const repoUrl = payload.repository.html_url;
        const displayName = payload.repository.name;

        // Signature verification is MANDATORY — reject requests with no secret configured
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        if (!secret) {
            console.error("[Webhook] GITHUB_WEBHOOK_SECRET is not configured. Rejecting request.");
            return NextResponse.json({ error: "Webhook secret not configured on server." }, { status: 500 });
        }

        if (!signature) {
            return NextResponse.json({ error: "Missing X-Hub-Signature-256 header." }, { status: 401 });
        }

        const hmac = crypto.createHmac("sha256", secret);
        const digest = "sha256=" + hmac.update(bodyText).digest("hex");
        // Use timingSafeEqual to prevent timing attacks
        const sigBuf = Buffer.from(signature);
        const digestBuf = Buffer.from(digest);
        if (sigBuf.length !== digestBuf.length || !crypto.timingSafeEqual(sigBuf, digestBuf)) {
            return NextResponse.json({ error: "Unauthorized: Invalid Signature" }, { status: 401 });
        }

        // Trigger the background job
        await inngest.send({
            name: "repository.index",
            data: {
                repoUrl,
                displayName
            }
        });

        console.log(`[Webhook] Triggered background indexing for ${repoUrl}`);

        return NextResponse.json({ message: "Webhook received, incremental indexing triggered" }, { status: 200 });
    } catch (e) {
        console.error("Webhook error", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

                                                                                           
