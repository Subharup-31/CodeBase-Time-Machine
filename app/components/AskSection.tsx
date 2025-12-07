"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Database, Shield, TestTube, X, Search, HeartPulse } from "lucide-react";
import AnswerCard from "./AnswerCard";
import OnboardButton from "../dashboard/components/OnboardButton";
import { motion, AnimatePresence } from "framer-motion";

interface Repo {
    name: string;
    url: string;
    collection: string;
}

export default function AskSection() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ answer: string; context: any[]; repo?: string; files?: string[] } | null>(null);

    // Autocomplete state
    const [repos, setRepos] = useState<Repo[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredRepos, setFilteredRepos] = useState<Repo[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Advanced Tools State
    const [activeTool, setActiveTool] = useState<"test" | "security" | "health" | null>(null);
    const [repoSearch, setRepoSearch] = useState("");
    const [filteredToolRepos, setFilteredToolRepos] = useState<Repo[]>([]);

    // Initial load and URL param handling
    useEffect(() => {
        fetchRepos();

        const urlQuery = searchParams.get("q");
        if (urlQuery) {
            setQuery(urlQuery);
            executeAsk(urlQuery);
        }

        // Click outside to close dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchParams]);

    // Filter repos for the tool modal
    useEffect(() => {
        if (activeTool) {
            if (!repoSearch.trim()) {
                setFilteredToolRepos(repos);
            } else {
                const lower = repoSearch.toLowerCase();
                setFilteredToolRepos(repos.filter(r => r.name.toLowerCase().includes(lower)));
            }
        }
    }, [repoSearch, activeTool, repos]);

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

    const executeAsk = async (q: string, systemPrompt?: string) => {
        if (!q) return;
        setLoading(true);
        setResult(null);
        setShowDropdown(false);

        // If a system prompt is provided, prepend it to the query or handle it in the backend.
        // Since we can't change backend, we'll prepend it to the query to guide the AI.
        const effectiveQuery = systemPrompt ? `${systemPrompt}\n\nQuery: ${q}` : q;

        try {
            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: effectiveQuery }),
            });

            const data = await res.json();
            setResult(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAsk = () => executeAsk(query);

    const openToolModal = (tool: "test" | "security") => {
        setActiveTool(tool);
        setRepoSearch("");
        setFilteredToolRepos(repos);
    };

    const handleToolSubmit = (repoName: string) => {
        if (!activeTool) return;

        const tool = activeTool;
        setActiveTool(null); // Close modal

        if (tool === "test") {
            // We now rely on the backend "Smart Test Generation" logic which detects "generate test cases".
            // We don't need to pass a system prompt from the frontend anymore.
            const task = `@${repoName} generate test cases`;
            executeAsk(task);
        } else if (tool === "security") {
            // Updated to use backend logic for "security scan"
            const task = `@${repoName} run security scan`;
            executeAsk(task);
        } else if (tool === "health") {
            const task = `@${repoName} generate code health score`;
            executeAsk(task);
        }
    };

    const repoMatch = query.match(/@(\w+)/);
    const currentRepo = repoMatch ? repoMatch[1] : "";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
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
                            className="w-full h-12 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all"
                        />
                        {showDropdown && (
                            <div ref={dropdownRef} className="absolute top-full left-0 mt-2 w-full md:w-64 z-50">
                                <Card className="border-gray-200/50 shadow-xl bg-white/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
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

                    <div className="flex gap-2">
                        <OnboardButton
                            repoName={currentRepo}
                            disabled={!currentRepo}
                            className="h-12 flex-1 md:flex-none px-4 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:bg-white hover:shadow-md transition-all rounded-xl"
                        />

                        <Button
                            onClick={handleAsk}
                            disabled={loading}
                            className="h-12 flex-1 md:flex-none px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:-translate-y-0.5 rounded-xl"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Ask
                        </Button>
                    </div>
                </div>
            </div>

            {/* Advanced AI Tools Section */}
            <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    🔐 Advanced AI Tools
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                        variant="outline"
                        onClick={() => openToolModal("test")}
                        className="h-14 justify-start px-4 bg-white/60 hover:bg-white border-gray-200/50 shadow-sm hover:shadow-md transition-all rounded-xl group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <TestTube className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-gray-900">Generate Test Cases</div>
                            <div className="text-xs text-gray-500">Create unit tests for a repository</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => openToolModal("security")}
                        disabled={loading}
                        className="h-14 justify-start px-4 bg-white/60 hover:bg-white border-gray-200/50 shadow-sm hover:shadow-md transition-all rounded-xl group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors">
                            <Shield className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-gray-900">Run Security Scan</div>
                            <div className="text-xs text-gray-500">Audit repository for vulnerabilities</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => openToolModal("health")}
                        disabled={loading}
                        className="h-14 justify-start px-4 bg-white/60 hover:bg-white border-gray-200/50 shadow-sm hover:shadow-md transition-all rounded-xl group col-span-1 md:col-span-2 lg:col-span-1"
                    >
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 transition-colors">
                            <HeartPulse className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-gray-900">Check Code Health</div>
                            <div className="text-xs text-gray-500">Score maintainability & quality</div>
                        </div>
                    </Button>
                </div>
            </div>

            {/* Repo Selection Modal for Tools */}
            <AnimatePresence>
                {activeTool && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md"
                        >
                            <Card className="bg-white shadow-2xl border-gray-200">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-lg font-semibold">
                                        {activeTool === "test" ? "Select Repo for Tests" : activeTool === "security" ? "Select Repo for Security Scan" : "Select Repo for Health Check"}
                                    </CardTitle>
                                    <Button variant="ghost" size="icon" onClick={() => setActiveTool(null)} className="h-8 w-8 rounded-full">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search repositories..."
                                            value={repoSearch}
                                            onChange={(e) => setRepoSearch(e.target.value)}
                                            className="pl-9 bg-gray-50 border-gray-200"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                                        {filteredToolRepos.length > 0 ? (
                                            filteredToolRepos.map((repo) => (
                                                <div
                                                    key={repo.name}
                                                    onClick={() => handleToolSubmit(repo.name)}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-50 cursor-pointer group transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors shrink-0">
                                                        <Database className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">{repo.name}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 text-sm text-gray-500">
                                                No repositories found.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <AnswerCard
                        answer={result.answer}
                        context={result.context}
                        repo={result.repo}
                        files={result.files}
                        onRegenerate={handleAsk}
                    />
                </div>
            )}
        </div>
    );
}
