"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    User, Bell, ChevronRight, Home,
    Settings, LogOut, FileText, GitBranch,
    MessageSquare, Sun, Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

export default function Topbar() {
    const pathname = usePathname();
    const [isUserOpen, setIsUserOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const { theme, toggleTheme, mounted } = useTheme();

    const userRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(event.target as Node)) {
                setIsUserOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Generate breadcrumbs
    const getBreadcrumbs = () => {
        const paths = pathname.split('/').filter(p => p);
        return paths.map((path, index) => {
            const href = `/${paths.slice(0, index + 1).join('/')}`;
            const label = path.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const isLast = index === paths.length - 1;

            return (
                <div key={path} className="flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    {isLast ? (
                        <span className="font-medium text-zinc-900 dark:text-zinc-50 text-sm">{label}</span>
                    ) : (
                        <Link href={href} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm">
                            {label}
                        </Link>
                    )}
                </div>
            );
        });
    };

    const notifications = [
        { id: 1, title: "Analysis Complete", desc: "Repo 'Auth-Service' has been indexed.", time: "2m ago", icon: GitBranch, color: "text-zinc-900 bg-zinc-100 dark:text-zinc-100 dark:bg-zinc-800" },
        { id: 2, title: "New Comment", desc: "AI suggested an optimization.", time: "1h ago", icon: MessageSquare, color: "text-zinc-900 bg-zinc-100 dark:text-zinc-100 dark:bg-zinc-800" },
        { id: 3, title: "System Update", desc: "Time Machine v2.1 is live.", time: "1d ago", icon: Settings, color: "text-zinc-900 bg-zinc-100 dark:text-zinc-100 dark:bg-zinc-800" },
    ];

    return (
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-6 relative z-20">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5">
                <Link href="/dashboard" className="flex items-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    <Home className="w-4 h-4" />
                </Link>
                {getBreadcrumbs()}
            </div>

            <div className="flex items-center gap-2">
                {/* Theme Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    onClick={toggleTheme}
                    title="Toggle Theme"
                >
                    {mounted && theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                    ) : (
                        <Moon className="h-4 w-4" />
                    )}
                </Button>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 relative ${isNotifOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                    >
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-zinc-900 dark:bg-zinc-50 rounded-full border border-white dark:border-zinc-950"></span>
                    </Button>

                    <AnimatePresence>
                        {isNotifOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-1.5 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-md overflow-hidden z-50 text-zinc-900 dark:text-zinc-50"
                            >
                                <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                    <h3 className="font-semibold text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Notifications</h3>
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer hover:underline">Mark all read</span>
                                </div>
                                <div className="max-h-[260px] overflow-y-auto">
                                    {notifications.map((notif) => (
                                        <div key={notif.id} className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 flex gap-3 cursor-pointer">
                                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${notif.color}`}>
                                                <notif.icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{notif.title}</p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{notif.desc}</p>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">{notif.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 bg-zinc-50 dark:bg-zinc-900/60 text-center border-t border-zinc-100 dark:border-zinc-800">
                                    <Link href="#" className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">View all notifications</Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* User Profile */}
                <div className="relative" ref={userRef}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 ${isUserOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
                        onClick={() => setIsUserOpen(!isUserOpen)}
                    >
                        <User className="h-4 w-4" />
                    </Button>

                    <AnimatePresence>
                        {isUserOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded shadow-md overflow-hidden z-50 text-zinc-900 dark:text-zinc-50"
                            >
                                <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">Developer</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">dev@example.com</p>
                                </div>
                                <div className="p-1 space-y-0.5">
                                    <Link href="/dashboard/profile" className="block">
                                        <button className="w-full text-left flex items-center px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
                                            <User className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                                            Profile
                                        </button>
                                    </Link>
                                    <Link href="/dashboard/settings" className="block">
                                        <button className="w-full text-left flex items-center px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
                                            <Settings className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                                            Settings
                                        </button>
                                    </Link>
                                    <Link href="/dashboard/billing" className="block">
                                        <button className="w-full text-left flex items-center px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors">
                                            <FileText className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                                            Billing
                                        </button>
                                    </Link>
                                </div>
                                <div className="p-1 border-t border-zinc-100 dark:border-zinc-800">
                                    <Link href="/login" className="block">
                                        <button className="w-full text-left flex items-center px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors">
                                            <LogOut className="mr-2 h-3.5 w-3.5" />
                                            Log out
                                        </button>
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}
