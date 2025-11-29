"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Send, GitBranch } from "lucide-react";
import mermaid from "mermaid";

export default function FlowPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ answer: string; mermaid?: string } | null>(null);
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({ startOnLoad: true, theme: 'default' });
    }, []);

    useEffect(() => {
        if (result?.mermaid && mermaidRef.current) {
            mermaid.contentLoaded();
            // Force re-render of mermaid diagram
            mermaid.run({
                nodes: [mermaidRef.current],
            });
        }
    }, [result]);

    const handleAsk = async () => {
        if (!query) return;
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });

            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 h-full flex flex-col">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Architecture Flow</h2>
                <p className="text-muted-foreground">Visualize how your code works step-by-step.</p>
            </div>

            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Ask about Logic Flow</CardTitle>
                    <CardDescription>e.g., "How does the login process work?" or "Explain the payment flow"</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                        <Input
                            placeholder="Describe the flow you want to understand..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                        />
                        <Button onClick={handleAsk} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Analyze
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {result && (
                <div className="grid md:grid-cols-2 gap-6 flex-1 min-h-0">
                    <Card className="flex flex-col overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <GitBranch className="mr-2 h-5 w-5 text-primary" />
                                Explanation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-y-auto flex-1">
                            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                                {result.answer}
                            </div>
                        </CardContent>
                    </Card>

                    {result.mermaid && (
                        <Card className="flex flex-col overflow-hidden">
                            <CardHeader>
                                <CardTitle>Visual Flow</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-y-auto flex-1 bg-white dark:bg-slate-950 p-4 rounded-b-lg flex items-center justify-center">
                                <div className="mermaid" ref={mermaidRef}>
                                    {result.mermaid}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
