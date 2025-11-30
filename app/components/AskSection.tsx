"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, Database } from "lucide-react";
import AnswerCard from "./AnswerCard";

interface Repo {
    name: string;
    url: string;
    collection: string;
}

export default function AskSection() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ answer: string; context: any[]; repo?: string; files?: string[] } | null>(null);

    // Autocomplete state
    const [repos, setRepos] = useState<Repo[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredRepos, setFilteredRepos] = useState<Repo[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchRepos();

        // Click outside to close dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchRepos = async () => {
        try {
            const res = await fetch("/api/repos/list");
            const data = await res.json();
            if (data.success) {
                setRepos(data.repos);
            }
        } catch (e) {
            console.error("Failed to fetch repos", e);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        // Check for @ mention trigger
        const lastWord = val.split(" ").pop();
        if (lastWord && lastWord.startsWith("@")) {
            const searchTerm = lastWord.substring(1).toLowerCase();
            const matches = repos.filter(r => r.name.toLowerCase().includes(searchTerm));
            setFilteredRepos(matches);
            setShowDropdown(matches.length > 0);
        } else {
            setShowDropdown(false);
        }
    };

    const selectRepo = (repoName: string) => {
        const words = query.split(" ");
        words.pop(); // Remove the partial @mention
        words.push(`@${repoName} `); // Add the selected repo
        setQuery(words.join(" "));
        setShowDropdown(false);
        inputRef.current?.focus();
    };

    const handleAsk = async () => {
        if (!query) return;
        setLoading(true);
        setResult(null);
        setShowDropdown(false);

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
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Ask Time Machine</h2>
                <p className="text-gray-500">
                    Ask questions about the codebase history or logic.
                    <span className="block text-xs text-indigo-600 mt-1 font-medium">
                        Tip: Use <strong>@RepoName</strong> to ask about a specific repository.
                    </span>
                </p>
            </div>

            <div className="relative">
                <div className="flex space-x-2">
                    <Input
                        ref={inputRef}
                        placeholder="e.g. @MyRepo Explain the auth flow..."
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                if (showDropdown && filteredRepos.length > 0) {
                                    e.preventDefault();
                                    selectRepo(filteredRepos[0].name);
                                } else {
                                    handleAsk();
                                }
                            }
                        }}
                        className="flex-1 h-12 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl"
                    />
                    <Button
                        onClick={handleAsk}
                        disabled={loading}
                        className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:-translate-y-0.5 rounded-xl"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Ask
                    </Button>
                </div>

                {showDropdown && (
                    <div ref={dropdownRef} className="absolute top-full left-0 mt-2 w-64 z-50">
                        <Card className="border-gray-200/50 shadow-xl bg-white/90 backdrop-blur-xl">
                            <CardContent className="p-1">
                                {filteredRepos.map((repo) => (
                                    <div
                                        key={repo.name}
                                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-gray-700"
                                        onClick={() => selectRepo(repo.name)}
                                    >
                                        <Database className="h-3 w-3 text-gray-400" />
                                        <span>{repo.name}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {result && (
                <AnswerCard
                    answer={result.answer}
                    context={result.context}
                    repo={result.repo}
                    files={result.files}
                    onRegenerate={handleAsk}
                />
            )}
        </div>
    );
}
