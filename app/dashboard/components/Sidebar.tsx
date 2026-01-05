import Link from "next/link";
import { LayoutDashboard, History, Settings, LogOut, GitBranch, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
    return (
        <div className="hidden md:flex h-screen w-64 border-r border-gray-200/50 bg-white/50 backdrop-blur-xl flex-col relative z-20">
            <div className="p-6 border-b border-gray-200/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
                        A
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-gray-900">ArchaiLens</h1>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group">
                    <LayoutDashboard className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>Dashboard</span>
                </Link>
                <Link href="/dashboard/time-machine" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group">
                    <History className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>Time Machine</span>
                </Link>
                <Link href="/dashboard/repos" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group">
                    <Database className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>Repositories</span>
                </Link>
            </nav>
            <div className="p-4 border-t border-gray-200/50">
                <Link href="/login" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group">
                    <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>Logout</span>
                </Link>
            </div>
        </div>
    );
}
