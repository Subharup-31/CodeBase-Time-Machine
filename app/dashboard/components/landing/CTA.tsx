"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
    return (
        <section className="py-32 bg-gradient-to-b from-white to-indigo-50/50">
            <div className="container mx-auto px-4 md:px-6 text-center">
                <div className="max-w-3xl mx-auto space-y-8">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
                        Understand your entire codebase like never before.
                    </h2>
                    <div className="flex justify-center">
                        <Link href="/dashboard">
                            <Button size="lg" className="h-14 px-10 text-lg bg-indigo-600 text-white hover:bg-indigo-700 rounded-full shadow-xl shadow-indigo-200/50 transition-all hover:shadow-2xl hover:-translate-y-1">
                                Start with ArchaiLens <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
