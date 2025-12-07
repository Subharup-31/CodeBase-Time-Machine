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
        <Card className="w-full bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                    <GitBranch className="h-5 w-5 text-indigo-600" />
                    Connect Repository
                </CardTitle>
                <CardDescription className="text-gray-500">
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
                        className="bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 h-11 transition-all"
                    />
                    <Input
                        placeholder="https://github.com/username/repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        disabled={loading}
                        className="bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 h-11 transition-all"
                    />
                </div>

                <Button
                    onClick={handleProcess}
                    disabled={loading || !repoUrl}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:-translate-y-0.5 h-11 px-8 rounded-xl"
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
                    <div className="p-4 rounded-xl bg-green-50 text-green-700 flex items-center gap-2 border border-green-200 animate-in fade-in zoom-in-95 duration-300">
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                            <p className="font-medium">{message}</p>
                            <p className="text-xs opacity-80 mt-1">Memory stored in collection: {collection}</p>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="p-4 rounded-xl bg-red-50 text-red-700 flex items-center gap-2 border border-red-200 animate-in fade-in zoom-in-95 duration-300">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-medium">{message}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
