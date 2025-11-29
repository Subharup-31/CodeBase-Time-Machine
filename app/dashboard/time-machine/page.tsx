"use client";

import RepoInput from "@/app/components/RepoInput";
import AskSection from "@/app/components/AskSection";
import { Separator } from "@/components/ui/separator";

export default function TimeMachinePage() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Time Machine</h2>
                <p className="text-muted-foreground">Process a repository and ask questions about its history.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
                <RepoInput />
                <Separator />
                <AskSection />
            </div>
        </div>
    );
}
