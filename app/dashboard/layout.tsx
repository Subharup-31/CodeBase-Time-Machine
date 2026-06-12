"use client";

import { Suspense } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileNav from "./components/MobileNav";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isTimeMachine = pathname === "/dashboard/time-machine";

    return (
        <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden font-sans">
            <Suspense fallback={<div className="hidden md:flex h-screen w-60 border-r border-[#262626] bg-[#191919]" />}>
                <Sidebar />
            </Suspense>
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {!isTimeMachine && <Topbar />}
                <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {children}
                </main>
                <MobileNav />
            </div>
        </div>
    );
}


                                                                                                                                                               
