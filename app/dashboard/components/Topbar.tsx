import { Button } from "@/components/ui/button";
import { User, Bell, Search, ChevronRight, Home } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Topbar() {
    return (
        <header className="h-16 border-b border-gray-200/50 bg-white/50 backdrop-blur-xl flex items-center justify-between px-6 relative z-20 transition-all duration-200">
            <div className="flex items-center gap-4">
                <div className="flex items-center text-sm text-gray-500 gap-2">
                    <Home className="w-4 h-4" />
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">Dashboard</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        type="search"
                        placeholder="Search..."
                        className="w-64 pl-9 h-9 bg-white/50 border-gray-200 focus:bg-white transition-all rounded-xl"
                    />
                </div>

                <div className="flex items-center gap-2 border-l border-gray-200/50 pl-4">
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <User className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
