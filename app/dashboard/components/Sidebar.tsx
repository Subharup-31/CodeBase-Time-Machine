"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Settings, LogOut, GitBranch, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/time-machine", label: "Time Machine", icon: History, exact: false },
    { href: "/dashboard/repos", label: "Repositories", icon: Database, exact: false },
];

export default function Sidebar() {
    const pathname = usePathname();

    const isActive = (href: string, exact: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <div className="hidden md:flex h-screen w-64 border-r border-gray-200/50 bg-white/50 backdrop-blur-xl flex-col relative z-20 shrink-0">
            <div className="p-6 border-b border-gray-200/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
                        <GitBranch className="w-4 h-4" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">ArchaiLens</h1>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map(({ href, label, icon: Icon, exact }) => {
                    const active = isActive(href, exact);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group",
                                active
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-5 w-5 transition-transform group-hover:scale-110",
                                    active ? "text-indigo-600" : ""
                                )}
                            />
                            <span>{label}</span>
                            {active && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            )}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-200/50">
                <Link
                    href="/login"
                    className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                >
                    <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>Logout</span>
                </Link>
            </div>
        </div>
    );
}
