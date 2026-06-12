"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, MessageSquare, Database, LogOut, GitBranch, Plus, Search, Settings, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSession {
    id: string;
    title: string;
    messages: any[];
    activeRepo?: string;
}

function loadChatSessions(): ChatSession[] {
    try {
        const raw = localStorage.getItem("ctm_chat_sessions");
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/repos", label: "Repository Manager", icon: Database, exact: false },
    { href: "/dashboard/time-machine", label: "Time Machine", icon: MessageSquare, exact: false },
];

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [sessions, setSessions] = useState<ChatSession[]>([]);

    const loadSessions = () => {
        setSessions(loadChatSessions());
    };

    useEffect(() => {
        loadSessions();
        window.addEventListener("ctm_chats_updated", loadSessions);
        return () => window.removeEventListener("ctm_chats_updated", loadSessions);
    }, []);

    const handleNewChat = () => {
        const currentSessions = loadChatSessions();
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: "New chat",
            messages: []
        };
        currentSessions.unshift(newSession);
        localStorage.setItem("ctm_chat_sessions", JSON.stringify(currentSessions));
        localStorage.setItem("ctm_last_active_session_id", newSession.id);
        window.dispatchEvent(new Event("ctm_chats_updated"));
        router.push(`/dashboard/time-machine?chatId=${newSession.id}`);
    };

    const isActive = (href: string, exact: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <div className="hidden md:flex h-screen w-60 border-r border-[#262626] bg-[#191919] flex-col relative z-20 shrink-0 font-sans text-zinc-400">
            {/* Header */}
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-zinc-800 text-zinc-100 flex items-center justify-center font-bold border border-zinc-700">
                        <GitBranch className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight text-zinc-100">ArchaiLens</span>
                </div>
                <div className="flex items-center gap-1">
                    <Search className="w-3.5 h-3.5 hover:text-zinc-100 cursor-pointer transition-colors" />
                </div>
            </div>

            {/* New Chat Button */}
            <div className="px-3 pt-4 pb-2">
                <button
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-zinc-800/60 hover:bg-zinc-800 text-zinc-100 rounded-lg transition-colors border border-zinc-700/30 shadow-sm font-medium cursor-pointer"
                >
                    <span>New chat</span>
                    <Plus className="h-4 w-4 text-zinc-400" />
                </button>
            </div>

            {/* Navigation links */}
            <nav className="p-2 space-y-0.5">
                {navItems.map(({ href, label, icon: Icon, exact }) => {
                    const active = isActive(href, exact);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded transition-colors group",
                                active
                                    ? "bg-[#2f2f2f] text-zinc-100"
                                    : "text-zinc-400 hover:bg-[#202020]/60 hover:text-zinc-200"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-4 w-4 shrink-0 transition-transform",
                                    active ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-400"
                                )}
                            />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Recents list */}
            <div className="flex-1 overflow-y-auto px-2 mt-4 space-y-0.5 scrollbar-none border-t border-[#262626] pt-4">
                <div className="flex items-center justify-between px-2 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <span>Recents</span>
                    <SlidersHorizontal className="h-3 w-3 text-zinc-500" />
                </div>
                {sessions.length > 0 ? (
                    sessions.map((session) => {
                        const active = pathname === "/dashboard/time-machine" && searchParams.get("chatId") === session.id;
                        return (
                            <Link
                                key={session.id}
                                href={`/dashboard/time-machine?chatId=${session.id}`}
                                className={cn(
                                    "block px-3 py-1.5 text-xs rounded transition-colors truncate font-medium",
                                    active
                                        ? "bg-[#2f2f2f] text-zinc-100"
                                        : "text-zinc-400 hover:bg-[#202020]/60 hover:text-zinc-200"
                                )}
                                title={session.title}
                            >
                                {session.title}
                            </Link>
                        );
                    })
                ) : (
                    <div className="px-3 py-2 text-[10px] text-zinc-600 italic">
                        No recent chats.
                    </div>
                )}
            </div>

            {/* User Profile Footer */}
            <div className="p-3 border-t border-[#262626]">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#202020]/80 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold border border-zinc-700 text-xs shrink-0">
                            S
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 truncate">Subharup</p>
                            <p className="text-[10px] text-zinc-500 truncate">Free plan</p>
                        </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href="/login" className="text-zinc-500 hover:text-red-400 transition-colors">
                            <LogOut className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
