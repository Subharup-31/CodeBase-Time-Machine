"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, GitBranch, CheckCircle2, AlertCircle } from "lucide-react";

export default function RepoInput() {
    const [repoUrl, setRepoUrl] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [collection, setCollection] = useState("");

    const handleProcess = async () => {
        if (!repoUrl) return;
        setLoading(true);
        setStatus("idle");
        setMessage("");
        setCollection("");

        try {
            const res = await fetch("/api/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoUrl, displayName }),
            });

            const data = await res.json();

            if (data.success) {
                setStatus("success");
                setMessage(data.message);
                setCollection(data.collection);
            } else {
                setStatus("error");
                setMessage(data.message);
            }
        } catch (e) {
            setStatus("error");
            setMessage("An error occurred while processing the repository.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary" />
                    Connect Repository
                </CardTitle>
                <CardDescription>
                    Enter a public GitHub repository URL to index its history and logic.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        placeholder="Display Name (optional, e.g. MyLib)"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={loading}
                    />
                    <Input
                        placeholder="https://github.com/username/repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <Button
                    onClick={handleProcess}
                    disabled={loading || !repoUrl}
                    className="w-full md:w-auto"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing Repository...
                        </>
                    ) : (
                        "Start Time Machine"
                    )}
                </Button>

                {status === "success" && (
                    <div className="p-4 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-2 border border-green-500/20">
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                            <p className="font-medium">{message}</p>
                            <p className="text-xs opacity-80 mt-1">Memory stored in collection: {collection}</p>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2 border border-destructive/20">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-medium">{message}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
