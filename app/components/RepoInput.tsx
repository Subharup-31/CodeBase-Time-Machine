"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Github } from "lucide-react";

export default function RepoInput() {
    const [repoUrl, setRepoUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleProcess = async () => {
        if (!repoUrl) return;
        setLoading(true);
        setStatus("idle");

        try {
            const res = await fetch("/api/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoUrl }),
            });

            if (res.ok) {
                setStatus("success");
            } else {
                setStatus("error");
            }
        } catch (e) {
            setStatus("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Process Repository</CardTitle>
                <CardDescription>Enter a GitHub URL to index its history and code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex space-x-2">
                    <Input
                        placeholder="https://github.com/username/repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                    />
                    <Button onClick={handleProcess} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                        {loading ? "Processing..." : "Process"}
                    </Button>
                </div>
                {status === "success" && (
                    <div className="text-sm text-green-600 font-medium">
                        Repository processed successfully! You can now ask questions.
                    </div>
                )}
                {status === "error" && (
                    <div className="text-sm text-red-600 font-medium">
                        Failed to process repository. Please try again.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
