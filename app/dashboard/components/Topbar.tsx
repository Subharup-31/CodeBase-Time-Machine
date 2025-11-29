import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

export default function Topbar() {
    return (
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
            <div className="text-sm font-medium text-muted-foreground">
                Project: <span className="text-foreground font-semibold">My Awesome App</span>
            </div>
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
