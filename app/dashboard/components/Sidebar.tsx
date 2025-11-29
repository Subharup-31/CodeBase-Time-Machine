import Link from "next/link";
import { LayoutDashboard, History, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
    return (
        <div className="h-screen w-64 border-r bg-card flex flex-col">
            <div className="p-6 border-b">
                <h1 className="text-xl font-bold tracking-tight">Time-Machine</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                    <LayoutDashboard className="h-5 w-5" />
                    <span>Dashboard</span>
                </Link>
                <Link href="/dashboard/time-machine" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                    <History className="h-5 w-5" />
                    <span>Time Machine</span>
                </Link>
                <Link href="/dashboard/settings" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                </Link>
            </nav>
            <div className="p-4 border-t">
                <Link href="/login" className="flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </Link>
            </div>
        </div>
    );
}
