"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, Database, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
    const pathname = usePathname();

    const links = [
        { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
        { href: "/dashboard/time-machine", icon: History, label: "Time Machine" },
        { href: "/dashboard/repos", icon: Database, label: "Repos" },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/50 z-50 px-6 py-2 pb-6">
            <div className="flex justify-between items-center">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[64px]",
                                isActive
                                    ? "text-indigo-600 bg-indigo-50"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
                            <span className="text-[10px] font-medium">{link.label}</span>
                        </Link>
                    );
                })}
                <Link
                    href="/login"
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 min-w-[64px]"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Logout</span>
                </Link>
            </div>
        </div>
    );
}
