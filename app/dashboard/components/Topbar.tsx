"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    User, Bell, ChevronRight, Home,
    Settings, LogOut, FileText, GitBranch,
    MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Topbar() {
    const pathname = usePathname();
    const [isUserOpen, setIsUserOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

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
                <div key={path} className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    {isLast ? (
                        <span className="font-medium text-gray-900">{label}</span>
                    ) : (
                        <Link href={href} className="text-gray-500 hover:text-indigo-600 transition-colors">
                            {label}
                        </Link>
                    )}
                </div>
            );
        });
    };

    const notifications = [
        { id: 1, title: "Analysis Complete", desc: "Repo 'Auth-Service' has been indexed.", time: "2m ago", icon: GitBranch, color: "text-green-600 bg-green-50" },
        { id: 2, title: "New Comment", desc: "AI suggested an optimization.", time: "1h ago", icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
        { id: 3, title: "System Update", desc: "Time Machine v2.1 is live.", time: "1d ago", icon: Settings, color: "text-purple-600 bg-purple-50" },
    ];

    return (
        <header className="h-16 border-b border-gray-200/50 bg-white/50 backdrop-blur-xl flex items-center justify-between px-6 relative z-20 transition-all duration-200">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2">
                <Link href="/dashboard" className="flex items-center text-sm text-gray-500 hover:text-indigo-600 transition-colors gap-2">
                    <Home className="w-4 h-4" />
                </Link>
                {getBreadcrumbs()}
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-full transition-colors relative ${isNotifOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-50 hover:text-indigo-600'}`}
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                        >
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                        </Button>

                        <AnimatePresence>
                            {isNotifOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-xl overflow-hidden z-50"
                                >
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                                        <span className="text-xs text-indigo-600 font-medium cursor-pointer hover:underline">Mark all read</span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.map((notif) => (
                                            <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex gap-3 cursor-pointer">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.color}`}>
                                                    <notif.icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{notif.desc}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 bg-gray-50/50 text-center border-t border-gray-100">
                                        <Link href="#" className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors">View all notifications</Link>
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
                            className={`rounded-full transition-colors ${isUserOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-50 hover:text-indigo-600'}`}
                            onClick={() => setIsUserOpen(!isUserOpen)}
                        >
                            <User className="h-5 w-5" />
                        </Button>

                        <AnimatePresence>
                            {isUserOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-xl overflow-hidden z-50"
                                >
                                    <div className="p-4 border-b border-gray-100">
                                        <p className="font-medium text-gray-900">Developer</p>
                                        <p className="text-xs text-gray-500">dev@example.com</p>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <Link href="/dashboard/profile">
                                            <Button variant="ghost" className="w-full justify-start text-sm font-normal text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl h-9">
                                                <User className="mr-2 h-4 w-4" />
                                                Profile
                                            </Button>
                                        </Link>
                                        <Link href="/dashboard/settings">
                                            <Button variant="ghost" className="w-full justify-start text-sm font-normal text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl h-9">
                                                <Settings className="mr-2 h-4 w-4" />
                                                Settings
                                            </Button>
                                        </Link>
                                        <Link href="/dashboard/billing">
                                            <Button variant="ghost" className="w-full justify-start text-sm font-normal text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl h-9">
                                                <FileText className="mr-2 h-4 w-4" />
                                                Billing
                                            </Button>
                                        </Link>
                                    </div>
                                    <div className="p-2 border-t border-gray-100">
                                        <Link href="/login">
                                            <Button variant="ghost" className="w-full justify-start text-sm font-normal text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl h-9">
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Log out
                                            </Button>
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    );
}
