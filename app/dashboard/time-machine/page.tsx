"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    GitBranch, Send, Loader2, AlertCircle, ChevronDown,
    Copy, RotateCcw, BookOpen, Shield, TestTube, HeartPulse,
    Clock, Database, Terminal, X, ChevronRight, Sparkles, Plus, Mic, AudioLines, Share2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MermaidDiagram from "@/app/components/MermaidDiagram";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Repo {
    name: string;
    url: string;
    namespace: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
                        <div key={i} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 overflow-x-auto">
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
    let tableLines: string[] = [];

    const renderTable = (tblLines: string[], key: number) => {
        const parsedRows = tblLines.map(l => {
            const parts = l.trim().replace(/^\||\|$/g, '').split('|');
            return parts.map(p => p.trim());
        });

        let headerRow = parsedRows[0] || [];
        let bodyRows = parsedRows.slice(1);

        if (bodyRows[0] && bodyRows[0].every(col => /^-+:*|:*:-+$/.test(col) || col === '')) {
            bodyRows = bodyRows.slice(1);
        }

        return (
            <div key={key} className="my-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-750 dark:text-zinc-300 font-semibold">
                        <tr>
                            {headerRow.map((col, idx) => (
                                <th key={idx} className="px-4 py-2 border-r last:border-r-0 border-zinc-200 dark:border-zinc-800">
                                    <InlineMarkdown text={col} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
                        {bodyRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                {row.map((col, cIdx) => (
                                    <td key={cIdx} className="px-4 py-2 border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 whitespace-pre-wrap">
                                        <InlineMarkdown text={col} />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const flushTable = (key: number) => {
        if (tableLines.length > 0) {
            elements.push(renderTable(tableLines, key));
            tableLines = [];
        }
    };

    const isDividerRow = (l: string) => {
        if (!l) return false;
        const trimmed = l.trim();
        if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
        const clean = trimmed.replace(/[|:\-\s]/g, '');
        return clean === '' && trimmed.replace(/[\s]/g, '').length > 0;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("```")) {
            flushTable(i);
            if (inCode) {
                elements.push(
                    <pre key={i} className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs font-mono my-2 border border-zinc-800 dark:border-zinc-800 whitespace-pre-wrap break-words">
                        <code className="whitespace-pre-wrap break-words">{codeBlock.join("\n")}</code>
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

        // Handle table row accumulation (both with and without leading/trailing pipes)
        const currentLine = line;
        const nextLine = lines[i + 1];
        
        const checkTableLine = () => {
            const trimmed = currentLine.trim();
            if (!trimmed.includes('|')) return false;
            if (tableLines.length > 0) return true;
            if (nextLine) {
                return isDividerRow(nextLine);
            }
            return false;
        };

        if (checkTableLine()) {
            tableLines.push(currentLine);
            continue;
        } else {
            flushTable(i);
        }

        if (line.startsWith("### ")) {
            elements.push(<h3 key={i} className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mt-3 mb-1">{line.slice(4)}</h3>);
        } else if (line.startsWith("## ")) {
            elements.push(<h2 key={i} className="font-bold text-base text-zinc-900 dark:text-zinc-50 mt-4 mb-2">{line.slice(3)}</h2>);
        } else if (line.startsWith("# ")) {
            elements.push(<h1 key={i} className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mt-4 mb-2">{line.slice(2)}</h1>);
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
            elements.push(
                <li key={i} className="ml-4 text-zinc-700 dark:text-zinc-300 text-sm list-disc">
                    <InlineMarkdown text={line.slice(2)} />
                </li>
            );
        } else if (/^\d+\.\s/.test(line)) {
            elements.push(
                <li key={i} className="ml-4 text-zinc-700 dark:text-zinc-300 text-sm list-decimal">
                    <InlineMarkdown text={line.replace(/^\d+\.\s/, "")} />
                </li>
            );
        } else if (line.trim()) {
            elements.push(
                <p key={i} className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
                    <InlineMarkdown text={line} />
                </p>
            );
        }
    }

    flushTable(lines.length);
    return <div className="space-y-1">{elements}</div>;
}

function InlineMarkdown({ text }: { text: string }) {
    // Bold, italic, code inline
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
        <>
            {parts.map((p, i) => {
                if (p.startsWith("**") && p.endsWith("**")) {
                    return <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-50">{p.slice(2, -2)}</strong>;
                }
                if (p.startsWith("`") && p.endsWith("`")) {
                    return <code key={i} className="bg-zinc-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 px-1 py-0.5 rounded text-xs font-mono border border-zinc-200 dark:border-zinc-700">{p.slice(1, -1)}</code>;
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

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    activeRepo?: string; // name of the last active repo for this session
}

function loadChatSessions(): ChatSession[] {
    try {
        const raw = localStorage.getItem("ctm_chat_sessions");
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveChatSessions(sessions: ChatSession[]) {
    try {
        localStorage.setItem("ctm_chat_sessions", JSON.stringify(sessions));
        window.dispatchEvent(new Event("ctm_chats_updated"));
    } catch {}
}

function TimeMachineContent() {
    const searchParams = useSearchParams();

    // Repos list from API
    const [repos, setRepos] = useState<Repo[]>([]);
    const [showRepoDropdown, setShowRepoDropdown] = useState(false);

    // Chat sessions state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const [inputValue, setInputValue] = useState("");
    const [isAsking, setIsAsking] = useState(false);
    const [streamingId, setStreamingId] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // ── Load repos on mount
    const fetchRepos = async () => {
        try {
            const res = await fetch("/api/repos/list");
            const data = await res.json();
            if (data.success) {
                setRepos(data.repos);
            }
        } catch {}
    };

    useEffect(() => {
        fetchRepos();
    }, []);

    // Sync sessions from localStorage & handle URL parameters
    const loadSessionsFromStorage = useCallback(() => {
        const loaded = loadChatSessions();
        if (loaded.length === 0) {
            const defaultSession: ChatSession = {
                id: Date.now().toString(),
                title: "New chat",
                messages: []
            };
            loaded.push(defaultSession);
            saveChatSessions(loaded);
        }
        setSessions(loaded);

        const urlChatId = searchParams.get("chatId");
        if (urlChatId && loaded.some(s => s.id === urlChatId)) {
            setActiveSessionId(urlChatId);
            localStorage.setItem("ctm_last_active_session_id", urlChatId);
        } else {
            const lastActiveId = localStorage.getItem("ctm_last_active_session_id");
            const exists = loaded.find(s => s.id === lastActiveId);
            const targetId = exists ? exists.id : loaded[0].id;
            setActiveSessionId(targetId);
            localStorage.setItem("ctm_last_active_session_id", targetId);
        }
    }, [searchParams]);

    useEffect(() => {
        loadSessionsFromStorage();
        window.addEventListener("ctm_chats_updated", loadSessionsFromStorage);
        return () => window.removeEventListener("ctm_chats_updated", loadSessionsFromStorage);
    }, [loadSessionsFromStorage]);

    const activeSession = sessions.find(s => s.id === activeSessionId) || null;
    const messages = useMemo(() => activeSession ? activeSession.messages : [], [activeSession]);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const updateSessionMessages = (sessionId: string, newMessages: ChatMessage[]) => {
        setSessions((prev) => {
            const updated = prev.map((s) => {
                if (s.id !== sessionId) return s;
                let title = s.title;
                if (title === "New chat" && newMessages.length > 0) {
                    const firstUser = newMessages.find(m => m.role === "user");
                    if (firstUser) {
                        title = firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? "..." : "");
                    }
                }
                let activeRepo = s.activeRepo;
                const lastWithRepo = [...newMessages].reverse().find(m => m.repo);
                if (lastWithRepo) {
                    activeRepo = lastWithRepo.repo;
                }
                return { ...s, title, messages: newMessages, activeRepo };
            });
            saveChatSessions(updated);
            return updated;
        });
    };

    const updateSessionRepo = (sessionId: string, repoName: string) => {
        setSessions((prev) => {
            const updated = prev.map((s) => {
                if (s.id !== sessionId) return s;
                return { ...s, activeRepo: repoName };
            });
            saveChatSessions(updated);
            return updated;
        });
    };

    // Switch active repo manually from dropdown
    const switchRepo = (repo: Repo) => {
        if (!activeSessionId) return;
        updateSessionRepo(activeSessionId, repo.name);
        setShowRepoDropdown(false);
        inputRef.current?.focus();
    };

    const handleRepoChipClick = (repoName: string) => {
        setInputValue((prev) => `@${repoName} ${prev}`);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // ── Chat via SSE ──────────────────────────────────────────────────────────
    const handleAsk = async (overrideQuery?: string) => {
        const q = (overrideQuery ?? inputValue).trim();
        if (!q || isAsking || !activeSessionId) return;

        setInputValue("");
        setIsAsking(true);

        const userMsg: ChatMessage = {
            id: typeof window !== "undefined" ? window.crypto.randomUUID() : Math.random().toString(),
            role: "user",
            content: q,
            timestamp: Date.now(),
        };

        const assistantId = typeof window !== "undefined" ? window.crypto.randomUUID() : Math.random().toString();
        const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            repo: activeSession?.activeRepo,
            timestamp: Date.now(),
            isStreaming: true,
        };

        const currentMessages = [...messages, userMsg, assistantMsg];
        updateSessionMessages(activeSessionId, currentMessages);
        setStreamingId(assistantId);

        abortRef.current = new AbortController();

        try {
            const historyPayload = messages.map(m => ({
                role: m.role,
                content: m.content,
                repo: m.repo
            }));

            const response = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: q,
                    activeRepo: activeSession?.activeRepo,
                    history: historyPayload,
                    chatId: activeSessionId
                }),
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
                            if (event.repo) {
                                updateSessionRepo(activeSessionId, event.repo);
                            }
                        } else if (event.type === "chunk") {
                            accContent += event.text;
                            setSessions((prev) => {
                                const updated = prev.map((s) => {
                                    if (s.id !== activeSessionId) return s;
                                    return {
                                        ...s,
                                        messages: s.messages.map((m) =>
                                            m.id === assistantId ? { ...m, content: accContent } : m
                                        ),
                                    };
                                });
                                return updated;
                            });
                        } else if (event.type === "done") {
                            setSessions((prev) => {
                                const updated = prev.map((s) => {
                                    if (s.id !== activeSessionId) return s;
                                    const nextMessages = s.messages.map((m) =>
                                        m.id === assistantId ? { ...m, isStreaming: false } : m
                                    );
                                    let activeRepo = s.activeRepo;
                                    const lastWithRepo = [...nextMessages].reverse().find(m => m.repo);
                                    if (lastWithRepo) {
                                        activeRepo = lastWithRepo.repo;
                                    }
                                    return { ...s, messages: nextMessages, activeRepo };
                                });
                                saveChatSessions(updated);
                                return updated;
                            });
                        } else if (event.type === "error") {
                            setSessions((prev) => {
                                const updated = prev.map((s) => {
                                    if (s.id !== activeSessionId) return s;
                                    return {
                                        ...s,
                                        messages: s.messages.map((m) =>
                                            m.id === assistantId
                                                ? { ...m, content: `⚠️ ${event.message}`, isStreaming: false }
                                                : m
                                        ),
                                    };
                                });
                                saveChatSessions(updated);
                                return updated;
                            });
                        }
                    } catch {}
                }
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setSessions((prev) => {
                    const updated = prev.map((s) => {
                        if (s.id !== activeSessionId) return s;
                        return {
                            ...s,
                            messages: s.messages.map((m) =>
                                m.id === assistantId
                                    ? { ...m, content: "⚠️ Connection error. Please try again.", isStreaming: false }
                                    : m
                            ),
                        };
                    });
                    saveChatSessions(updated);
                    return updated;
                });
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
        if (!activeSessionId) return;
        updateSessionMessages(activeSessionId, []);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full bg-[#f9f9f9] dark:bg-[#191919] text-zinc-900 dark:text-zinc-100">
            <style dangerouslySetInnerHTML={{ __html: `
                ::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                * {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            ` }} />
            {/* Chat Toolbar */}
            <div className="flex-none flex items-center justify-between px-6 py-3 border-b border-zinc-200/50 dark:border-[#262626] bg-[#f9f9f9] dark:bg-[#191919]">
                <div className="relative">
                    <button
                        onClick={() => setShowRepoDropdown((v) => !v)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-850 dark:text-zinc-100 hover:opacity-80 transition-opacity px-2 py-1 rounded-md"
                    >
                        <span>{activeSession?.activeRepo ? activeSession.activeRepo : "Time Machine"}</span>
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                    </button>

                    <AnimatePresence>
                        {showRepoDropdown && repos.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 mt-1.5 w-60 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden"
                            >
                                {repos.map((repo) => (
                                    <button
                                        key={repo.name}
                                        onClick={() => switchRepo(repo)}
                                        className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${activeSession?.activeRepo === repo.name ? "bg-zinc-50 text-zinc-900 dark:bg-zinc-800/50 dark:text-zinc-50" : "text-zinc-750 dark:text-zinc-350"
                                            }`}
                                    >
                                        <Database className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium truncate text-zinc-900 dark:text-zinc-50">{repo.name}</p>
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
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

                <div className="flex items-center gap-2">
                    <button
                        onClick={clearChat}
                        className="text-xs text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 transition-colors px-2 py-1.5 rounded border border-zinc-200 dark:border-[#262626] font-medium"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => navigator.clipboard.writeText(window.location.href)}
                        className="px-3 py-1.5 bg-zinc-900 dark:bg-[#2f2f2f] hover:opacity-90 text-zinc-50 dark:text-zinc-100 border border-transparent dark:border-zinc-750 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold shadow-sm"
                    >
                        <Share2 className="h-3.5 w-3.5" />
                        Share
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-none bg-[#f9f9f9] dark:bg-[#191919]">
                <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-8">
                    {messages.length === 0 && (
                        <div className="h-[55vh] flex flex-col items-center justify-center gap-6 text-center py-8">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center shadow-sm">
                                <GitBranch className="w-6.5 h-6.5 text-zinc-700 dark:text-zinc-300" />
                            </div>
                            <div>
                                <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-xl tracking-tight">
                                    {activeSession?.activeRepo 
                                        ? `Ask anything about ${activeSession.activeRepo}` 
                                        : "How can I help you today?"}
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                                    {activeSession?.activeRepo
                                        ? "Query code architecture, trace history, locate evolutionary hotspots, or review bugs."
                                        : "Ask questions across your indexed repositories. Mention any repo using @reponame to target it."}
                                </p>
                            </div>

                            {/* Target Repo Chip Helper when no active repo is set */}
                            {!activeSession?.activeRepo && repos.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center max-w-md mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <p className="text-xs text-zinc-400 w-full text-center mb-1">Target an indexed repository by clicking below or mentioning `@name`:</p>
                                    {repos.map((repo) => (
                                        <button
                                            key={repo.name}
                                            onClick={() => handleRepoChipClick(repo.name)}
                                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-[#202020] transition-all shadow-sm font-semibold cursor-pointer"
                                        >
                                            <Database className="h-3 w-3 text-zinc-400" />
                                            @{repo.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Quick action chips */}
                            {activeSession?.activeRepo && (
                                <div className="flex flex-wrap gap-2 justify-center max-w-lg mt-2">
                                    {quickActions.map((action) => (
                                        <button
                                            key={action.label}
                                            onClick={() => handleAsk(action.label)}
                                            disabled={isAsking}
                                            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all shadow-sm"
                                        >
                                            <action.icon className="h-3 w-3 text-zinc-400" />
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
                                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`group relative ${msg.role === "user" ? "max-w-[70%]" : "flex-1 w-full"}`}>
                                    {msg.role === "assistant" && msg.repo && (
                                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1 ml-0.5 font-bold uppercase tracking-wider">
                                            {msg.repo}
                                        </p>
                                    )}
                                    <div
                                        className={
                                            msg.role === "user"
                                                ? "rounded-2xl px-5 py-3 bg-[#f0f0f0] dark:bg-[#2b2b2a] text-[#191919] dark:text-zinc-100 text-sm leading-relaxed whitespace-pre-wrap shadow-sm border border-zinc-200/40 dark:border-transparent"
                                                : "text-zinc-900 dark:text-zinc-100 py-1"
                                        }
                                    >
                                        {msg.role === "user" ? (
                                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        ) : (
                                            <div className="w-full">
                                                {msg.content ? (
                                                    <MessageContent content={msg.content} />
                                                ) : null}
                                                {msg.isStreaming && (
                                                    <span className="inline-block w-1.5 h-4 bg-zinc-900 dark:bg-zinc-100 rounded-sm ml-0.5 animate-pulse align-middle" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions on hover */}
                                    {msg.role === "assistant" && !msg.isStreaming && msg.content && (
                                        <div className="absolute -bottom-7 left-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => copyMessage(msg.content)}
                                                className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm"
                                            >
                                                <Copy className="h-2.5 w-2.5" /> Copy
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* Quick actions (when there are messages) */}
            {messages.length > 0 && activeSession?.activeRepo && (
                <div className="flex-none bg-[#f9f9f9] dark:bg-[#191919] pb-2">
                    <div className="max-w-3xl mx-auto w-full px-4 md:px-6">
                        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                            {quickActions.slice(0, 5).map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => handleAsk(action.label)}
                                    disabled={isAsking}
                                    className="flex-none flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-[#222222] border border-zinc-200/50 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all whitespace-nowrap shadow-sm"
                                >
                                    <action.icon className="h-3 w-3 text-zinc-400" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Input area */}
            <div className="flex-none bg-[#f9f9f9] dark:bg-[#191919] pb-6 pt-2">
                <div className="max-w-3xl mx-auto w-full px-4 md:px-6">
                    <div className="flex flex-col bg-white dark:bg-[#222222] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 py-3 shadow-sm focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition-all">
                        <div className="flex items-center gap-2">
                            <button className="text-zinc-400 hover:text-zinc-250 dark:hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850">
                                <Plus className="h-4 w-4" />
                            </button>
                            <input
                                ref={inputRef}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAsk();
                                    }
                                }}
                                placeholder="Write a message... Mention a repository with @name to target it"
                                disabled={isAsking}
                                className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 px-1 py-1 text-sm placeholder-zinc-500 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>

                        {/* Card footer controls */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                            <div className="flex items-center gap-1.5">
                                <button className="text-[10px] font-semibold bg-zinc-150 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-750 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-700/60 transition-colors flex items-center gap-1">
                                    <span>Sonnet 4.6</span>
                                    <ChevronDown className="h-2.5 w-2.5" />
                                </button>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800/40 uppercase tracking-wide">Low</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button className="text-zinc-400 hover:text-zinc-250 dark:hover:text-zinc-200 transition-colors p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850">
                                    <Mic className="h-3.5 w-3.5" />
                                </button>
                                <button className="text-zinc-400 hover:text-zinc-250 dark:hover:text-zinc-200 transition-colors p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850">
                                    <AudioLines className="h-3.5 w-3.5" />
                                </button>
                                <Button
                                    onClick={() => handleAsk()}
                                    disabled={!inputValue.trim() || isAsking}
                                    className="h-7 w-7 p-0 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-lg transition-all"
                                >
                                    {isAsking ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Send className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-center text-zinc-500 dark:text-zinc-500 mt-2 font-medium">
                        Claude is AI and can make mistakes. Please double-check responses.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function TimeMachinePage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-[#f9f9f9] dark:bg-[#191919]">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
        }>
            <TimeMachineContent />
        </Suspense>
    );
}
