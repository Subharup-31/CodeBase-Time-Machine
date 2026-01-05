"use client";

import { Suspense } from "react";
import RepoInput from "@/app/components/RepoInput";
import AskSection from "@/app/components/AskSection";
import { Separator } from "@/components/ui/separator";

export default function TimeMachinePage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Time Machine</h2>
                <p className="text-gray-500">Process a repository and ask questions about its history.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">
                <RepoInput />
                <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-gray-50 px-2 text-gray-500 font-medium tracking-wider">Then Ask Questions</span>
                    </div>
                </div>
                <Suspense fallback={<div>Loading...</div>}>
                    <AskSection />
                </Suspense>
            </div>
        </div>
    );
}
