"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    GitBranch, Send, Loader2, CheckCircle2, AlertCircle, ChevronDown,
    Copy, RotateCcw, BookOpen, Shield, TestTube, HeartPulse, Zap,
    Clock, Database, Terminal, X, ChevronRight, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MermaidDiagram from "@/app/components/MermaidDiagram";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Repo {
    name: string;
    url: string;
    collection: string;
    createdAt: string;
    indexed: boolean;
    vectorCount: number;
}

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    repo?: string;
    timestamp: number;
    isStreaming?: boolean;
}

interface IndexProgress {
    stage: string;
    message: string;
    percent: number;
}

type IndexState = "idle" | "indexing" | "done" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoDetectName(url: string): string {
    const m = url.match(/github\.com\/[^/]+\/([^/]+)/);
    return m ? m[1].replace(/\.git$/, "") : "";
}

function storageKey(repo: string) {
    return `ctm_chat_${repo}`;
}

function loadHistory(repo: string): ChatMessage[] {
    try {
        const raw = localStorage.getItem(storageKey(repo));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(repo: string, messages: ChatMessage[]) {
    try {
        localStorage.setItem(storageKey(repo), JSON.stringify(messages.slice(-80)));
    } catch {}
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
    const parts = content.split(/(```mermaid[\s\S]*?```)/g);
    return (
        <div className="space-y-3">
            {parts.map((part, i) => {
                if (part.startsWith("```mermaid")) {
                    const code = part.replace(/```mermaid\n?/, "").replace(/```$/, "").trim();
                    return (
                        <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 overflow-x-auto">
                            <MermaidDiagram chart={code} />
                        </div>
                    );
                }
                if (!part.trim()) return null;
                return <MarkdownBlock key={i} text={part} />;
            })}
        </div>
    );
}

function MarkdownBlock({ text }: { text: string }) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let codeBlock: string[] = [];
    let inCode = false;
    let codeLang = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("```")) {
            if (inCode) {
                elements.push(
                    <pre key={i} className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs font-mono my-2">
                        <code>{codeBlock.join("\n")}</code>
                    </pre>
                );
                codeBlock = [];
                inCode = false;
                codeLang = "";
            } else {
                inCode = true;
                codeLang = line.slice(3).trim();
            }
            continue;
        }
        if (inCode) { codeBlock.push(line); continue; }

        if (line.startsWith("### ")) {
            elements.push(<h3 key={i} className="font-semibold text-sm text-gray-900 mt-3 mb-1">{line.slice(4)}</h3>);
        } else if (line.startsWith("## ")) {
            elements.push(<h2 key={i} className="font-bold text-base text-gray-900 mt-4 mb-2">{line.slice(3)}</h2>);
        } else if (line.startsWith("# ")) {
            elements.push(<h1 key={i} className="font-bold text-lg text-gray-900 mt-4 mb-2">{line.slice(2)}</h1>);
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
            elements.push(
                <li key={i} className="ml-4 text-gray-700 text-sm list-disc">
                    <InlineMarkdown text={line.slice(2)} />
                </li>
            );
        } else if (/^\d+\.\s/.test(line)) {
            elements.push(
                <li key={i} className="ml-4 text-gray-700 text-sm list-decimal">
                    <InlineMarkdown text={line.replace(/^\d+\.\s/, "")} />
                </li>
            );
        } else if (line.trim()) {
            elements.push(
                <p key={i} className="text-gray-700 text-sm leading-relaxed">
                    <InlineMarkdown text={line} />
                </p>
            );
        }
    }
    return <div className="space-y-1">{elements}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
    // Bold, italic, code inline
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
        <>
            {parts.map((p, i) => {
                if (p.startsWith("**") && p.endsWith("**")) {
                    return <strong key={i} className="font-semibold text-gray-900">{p.slice(2, -2)}</strong>;
                }
                if (p.startsWith("`") && p.endsWith("`")) {
                    return <code key={i} className="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono border border-gray-200">{p.slice(1, -1)}</code>;
                }
                if (p.startsWith("*") && p.endsWith("*")) {
                    return <em key={i}>{p.slice(1, -1)}</em>;
                }
                return <span key={i}>{p}</span>;
            })}
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimeMachinePage() {
    // Indexing state
    const [repoUrl, setRepoUrl] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [indexState, setIndexState] = useState<IndexState>("idle");
    const [indexProgress, setIndexProgress] = useState<IndexProgress>({ stage: "", message: "", percent: 0 });
    const [indexResult, setIndexResult] = useState<{ chunks: number; evolutionChunks: number; symbolChunks: number } | null>(null);
    const [indexError, setIndexError] = useState<string | null>(null);

    // Chat state
    const [repos, setRepos] = useState<Repo[]>([]);
    const [activeRepo, setActiveRepo] = useState<Repo | null>(null);
    const [showRepoDropdown, setShowRepoDropdown] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isAsking, setIsAsking] = useState(false);
    const [streamingId, setStreamingId] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // ── Load repos on mount
    const fetchRepos = useCallback(async () => {
        try {
            const res = await fetch("/api/repos/list");
            const data = await res.json();
            if (data.success) {
                setRepos(data.repos);
                // Auto-select first indexed repo
                if (!activeRepo) {
                    const first = data.repos.find((r: Repo) => r.indexed) ?? data.repos[0];
                    if (first) {
                        setActiveRepo(first);
                        setMessages(loadHistory(first.name));
                    }
                }
            }
        } catch {}
    }, []);

    useEffect(() => { fetchRepos(); }, [fetchRepos]);

    // Auto-detect display name from URL
    useEffect(() => {
        const name = autoDetectName(repoUrl);
        if (name) setDisplayName(name);
    }, [repoUrl]);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Persist chat history
    useEffect(() => {
        if (activeRepo && messages.length > 0) {
            saveHistory(activeRepo.name, messages.filter((m) => !m.isStreaming));
        }
    }, [messages, activeRepo]);

    // Switch active repo
    const switchRepo = (repo: Repo) => {
        setActiveRepo(repo);
        setMessages(loadHistory(repo.name));
        setShowRepoDropdown(false);
        inputRef.current?.focus();
    };

    // ── Indexing via SSE ──────────────────────────────────────────────────────
    const handleIndex = async () => {
        if (!repoUrl.trim()) return;

        setIndexState("indexing");
        setIndexProgress({ stage: "starting", message: "Connecting...", percent: 0 });
        setIndexError(null);
        setIndexResult(null);

        try {
            const response = await fetch("/api/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoUrl: repoUrl.trim(), displayName: displayName.trim() || undefined }),
            });

            if (!response.body) throw new Error("No stream in response");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const event = JSON.parse(line.slice(6));
                        if (event.type === "progress") {
                            setIndexProgress({
                                stage: event.stage,
                                message: event.message,
                                percent: event.percent,
                            });
                        } else if (event.type === "done") {
                            setIndexState("done");
                            setIndexProgress({ stage: "done", message: event.message, percent: 100 });
                            setIndexResult({
                                chunks: event.chunks,
                                evolutionChunks: event.evolutionChunks,
                                symbolChunks: event.symbolChunks,
                            });
                            // Refresh repos list and auto-select the new one
                            await fetchRepos();
                            const newRepo = repos.find((r) => r.name === event.repo);
                            if (newRepo) switchRepo(newRepo);
                        } else if (event.type === "error") {
                            setIndexState("error");
                            setIndexError(event.message);
                        }
                    } catch {}
                }
            }
        } catch (err: any) {
            setIndexState("error");
            setIndexError(err.message || "Connection failed");
        }
    };

    // ── Chat via SSE ──────────────────────────────────────────────────────────
    const handleAsk = async (overrideQuery?: string) => {
        const q = (overrideQuery ?? inputValue).trim();
        if (!q || isAsking) return;

        setInputValue("");
        setIsAsking(true);

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: q,
            timestamp: Date.now(),
        };

        const assistantId = crypto.randomUUID();
        const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            repo: activeRepo?.name,
            timestamp: Date.now(),
            isStreaming: true,
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setStreamingId(assistantId);

        abortRef.current = new AbortController();

        try {
            const response = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: q, activeRepo: activeRepo?.name }),
                signal: abortRef.current.signal,
            });

            if (!response.body) throw new Error("No stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let accContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const event = JSON.parse(line.slice(6));
                        if (event.type === "meta") {
                            // Could update repo info here
                        } else if (event.type === "chunk") {
                            accContent += event.text;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, content: accContent } : m
                                )
                            );
                        } else if (event.type === "done") {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, isStreaming: false } : m
                                )
                            );
                        } else if (event.type === "error") {
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId
                                        ? { ...m, content: `⚠️ ${event.message}`, isStreaming: false }
                                        : m
                                )
                            );
                        }
                    } catch {}
                }
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: "⚠️ Connection error. Please try again.", isStreaming: false }
                            : m
                    )
                );
            }
        } finally {
            setIsAsking(false);
            setStreamingId(null);
        }
    };

    const quickActions = [
        { label: "What is this project?", icon: Sparkles },
        { label: "Explain the auth flow", icon: Shield },
        { label: "What tech stack is used?", icon: Terminal },
        { label: "What are the open issues?", icon: AlertCircle },
        { label: "When did auth break?", icon: Clock },
        { label: "Generate test cases", icon: TestTube },
        { label: "Run security scan", icon: Shield },
        { label: "Code health score", icon: HeartPulse },
    ];

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    const clearChat = () => {
        if (!activeRepo) return;
        setMessages([]);
        localStorage.removeItem(storageKey(activeRepo.name));
    };

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-8rem)]">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex-none">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <GitBranch className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Time Machine</h1>
                        <p className="text-sm text-gray-500">Index a repo → ask anything about its history</p>
                    </div>
                </div>
            </div>

            {/* ── Index Panel ──────────────────────────────────────────────── */}
            <div className="flex-none bg-white/60 backdrop-blur-xl border border-gray-200/60 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <GitBranch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="https://github.com/owner/repo"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                disabled={indexState === "indexing"}
                                className="pl-9 h-11 bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all"
                                onKeyDown={(e) => { if (e.key === "Enter") handleIndex(); }}
                            />
                        </div>
                        <Input
                            placeholder="Name (auto)"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            disabled={indexState === "indexing"}
                            className="w-36 h-11 bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all"
                        />
                        <Button
                            onClick={handleIndex}
                            disabled={!repoUrl.trim() || indexState === "indexing"}
                            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl whitespace-nowrap"
                        >
                            {indexState === "indexing" ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Indexing…</>
                            ) : (
                                <><Zap className="mr-2 h-4 w-4" />Start</>
                            )}
                        </Button>
                    </div>

                    {/* Progress bar */}
                    <AnimatePresence>
                        {indexState === "indexing" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs text-gray-600">
                                        <span className="flex items-center gap-1.5">
                                            <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                                            {indexProgress.message}
                                        </span>
                                        <span className="font-medium text-indigo-600">{indexProgress.percent}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${indexProgress.percent}%` }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success */}
                    <AnimatePresence>
                        {indexState === "done" && indexResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5"
                            >
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>
                                    <strong>{indexResult.chunks}</strong> knowledge chunks indexed —{" "}
                                    <span className="text-green-600">{indexResult.evolutionChunks} commit diffs</span> +{" "}
                                    <span className="text-green-600">{indexResult.symbolChunks} code symbols</span>
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error */}
                    <AnimatePresence>
                        {indexState === "error" && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
                            >
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{indexError}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Chat Area ────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/40 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden">

                {/* Chat Toolbar */}
                <div className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white/60">
                    <div className="relative">
                        <button
                            onClick={() => setShowRepoDropdown((v) => !v)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                        >
                            <Database className="h-3.5 w-3.5" />
                            {activeRepo ? (
                                <>
                                    <span>{activeRepo.name}</span>
                                    {activeRepo.indexed && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                    )}
                                </>
                            ) : (
                                <span className="text-gray-400">Select a repo</span>
                            )}
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        </button>

                        <AnimatePresence>
                            {showRepoDropdown && repos.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full left-0 mt-1.5 w-60 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                                >
                                    {repos.map((repo) => (
                                        <button
                                            key={repo.name}
                                            onClick={() => switchRepo(repo)}
                                            className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-indigo-50 transition-colors ${activeRepo?.name === repo.name ? "bg-indigo-50 text-indigo-700" : "text-gray-700"
                                                }`}
                                        >
                                            <Database className="h-4 w-4 text-gray-400 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{repo.name}</p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {repo.indexed ? `${repo.vectorCount.toLocaleString()} vectors` : "Not indexed"}
                                                </p>
                                            </div>
                                            {repo.indexed && <span className="ml-auto w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={clearChat}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded flex items-center gap-1"
                            >
                                <X className="h-3 w-3" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center gap-6 text-center py-8">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                <GitBranch className="w-8 h-8 text-indigo-500" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 text-lg">
                                    {activeRepo ? `Ask anything about ${activeRepo.name}` : "Select a repository to start"}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {activeRepo
                                        ? "History, bugs, architecture, code flow — anything."
                                        : "Index a repo above or select one from the dropdown"}
                                </p>
                            </div>

                            {/* Quick action chips */}
                            {activeRepo && (
                                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                                    {quickActions.map((action) => (
                                        <button
                                            key={action.label}
                                            onClick={() => handleAsk(action.label)}
                                            disabled={isAsking}
                                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                                        >
                                            <action.icon className="h-3 w-3" />
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                        <Sparkles className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}

                                <div className={`group relative max-w-[82%] ${msg.role === "user" ? "order-first" : ""}`}>
                                    {msg.role === "assistant" && msg.repo && (
                                        <p className="text-[10px] text-gray-400 mb-1 ml-1 font-medium uppercase tracking-wide">
                                            {msg.repo}
                                        </p>
                                    )}
                                    <div
                                        className={`rounded-2xl px-4 py-3 ${msg.role === "user"
                                            ? "bg-indigo-600 text-white rounded-tr-sm"
                                            : "bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm"
                                            }`}
                                    >
                                        {msg.role === "user" ? (
                                            <p className="text-sm">{msg.content}</p>
                                        ) : (
                                            <div className="text-sm">
                                                {msg.content ? (
                                                    <MessageContent content={msg.content} />
                                                ) : null}
                                                {msg.isStreaming && (
                                                    <span className="inline-block w-2 h-4 bg-indigo-400 rounded-sm ml-0.5 animate-pulse align-middle" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions on hover */}
                                    {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                                        <div className="absolute -bottom-7 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => copyMessage(msg.content)}
                                                className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-gray-200"
                                            >
                                                <Copy className="h-2.5 w-2.5" /> Copy
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {msg.role === "user" && (
                                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-xs font-semibold text-gray-600">U</span>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={chatEndRef} />
                </div>

                {/* Quick actions (when there are messages) */}
                {messages.length > 0 && activeRepo && (
                    <div className="flex-none border-t border-gray-100 px-4 py-2 bg-white/60">
                        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                            {quickActions.slice(0, 5).map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => handleAsk(action.label)}
                                    disabled={isAsking}
                                    className="flex-none flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all whitespace-nowrap"
                                >
                                    <action.icon className="h-3 w-3" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div className="flex-none border-t border-gray-100 p-4 bg-white/80">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAsk();
                                    }
                                }}
                                placeholder={
                                    activeRepo
                                        ? `Ask about ${activeRepo.name}… (or use @OtherRepo)`
                                        : "Index a repository above to start asking questions"
                                }
                                disabled={isAsking || !activeRepo}
                                className="h-11 bg-white border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl pr-10 transition-all"
                            />
                        </div>
                        <Button
                            onClick={() => handleAsk()}
                            disabled={!inputValue.trim() || isAsking || !activeRepo}
                            className="h-11 w-11 p-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200/50 transition-all hover:-translate-y-0.5"
                        >
                            {isAsking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

                                                                                                                 
