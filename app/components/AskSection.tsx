"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send } from "lucide-react";
import AnswerCard from "./AnswerCard";
import { AskResponse } from "@/types";

export default function AskSection() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<AskResponse | null>(null);

    const handleAsk = async () => {
        if (!query) return;
        setLoading(true);
        setResponse(null);

        try {
            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query }),
            });

            const data = await res.json();
            setResponse(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Ask the Time-Machine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="e.g., When was the login feature added? How did the payment logic evolve?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleAsk} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Ask Question
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {response && (
                <AnswerCard answer={response.answer} context={response.context} />
            )}
        </div>
    );
}
