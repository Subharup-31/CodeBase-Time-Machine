"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
    return (
        <section className="relative min-h-[80vh] pt-24 md:pt-32 flex items-center justify-center overflow-hidden bg-white">
            {/* Subtle Gradient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(120,119,198,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            <div className="container mx-auto relative z-10 px-6 md:px-12 lg:px-24 grid xl:grid-cols-2 gap-8 items-center">
                {/* Left: Text Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="flex flex-col items-start text-left space-y-6"
                >
                    <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1 text-sm font-medium text-indigo-600 backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                        v2.0 is now live
                    </div>

                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                        Master Your Codebase <br />
                        <span className="relative whitespace-nowrap">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient bg-300%">
                                Through{" "}
                            </span>
                            <span className="inline-block text-transparent bg-clip-text bg-[linear-gradient(110deg,#9333ea,45%,#c084fc,55%,#9333ea)] bg-[length:250%_100%] animate-shimmer">
                                Time & Space
                            </span>
                        </span>
                    </h1>

                    <p className="max-w-[550px] text-lg text-gray-600 leading-relaxed">
                        Traverse commit history, decode architecture, and uncover every part of your project with AI-powered insights.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Link href="/dashboard">
                            <Button size="lg" className="h-12 px-8 text-base bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:-translate-y-0.5">
                                Start Exploring <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="#">
                            <Button variant="ghost" size="lg" className="h-12 px-8 text-base text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl">
                                View Demo
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Right: Visual Preview */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="relative scale-[0.95] origin-right"
                >
                    <div className="relative rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-xl shadow-2xl shadow-indigo-100/50 overflow-hidden flex flex-col">
                        {/* Mockup Header */}
                        <div className="h-10 border-b border-gray-100 bg-gray-50/50 flex items-center px-4 gap-2 shrink-0">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400/20" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400/20" />
                                <div className="w-3 h-3 rounded-full bg-green-400/20" />
                            </div>
                        </div>
                        {/* Mockup Content Placeholder */}
                        {/* Mockup Content: Time Machine Interaction */}
                        <div className="flex flex-col bg-gray-50/50 font-sans">
                            {/* Chat Header */}
                            <div className="h-14 border-b border-gray-100 bg-white flex items-center px-6 justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <span className="font-semibold text-gray-900">Time Machine Mode</span>
                                </div>
                                <div className="text-xs text-gray-400">repo: auth-service</div>
                            </div>

                            {/* Chat Area */}
                            <div className="p-6 space-y-6">
                                {/* User Message */}
                                <div className="flex justify-end">
                                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[80%]">
                                        <p className="text-sm">When was authentication added to the user service?</p>
                                    </div>
                                </div>

                                {/* AI Response */}
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                    </div>
                                    <div className="space-y-3 max-w-[90%]">
                                        <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                                            <p className="text-sm text-gray-600 mb-3">
                                                Authentication was introduced in <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-800">commit 8f2a1b</span> by <strong>Aisha</strong> on Oct 24, 2023.
                                            </p>

                                            {/* Commit Card */}
                                            <div className="border border-gray-200 rounded-lg bg-gray-50/50 p-3 space-y-2 mb-3">
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                                                    <span className="text-indigo-600 font-bold">8f2a1b9</span>
                                                    <span>•</span>
                                                    <span>feat: implement JWT auth flow</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-green-600">+ src/auth/jwt.strategy.ts</span>
                                                        <span className="text-gray-400 text-[10px]">45 lines</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-green-600">+ src/auth/auth.service.ts</span>
                                                        <span className="text-gray-400 text-[10px]">128 lines</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Files Used */}
                                            <div className="flex flex-wrap gap-2">
                                                <div className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600 border border-gray-200 flex items-center gap-1.5">
                                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    auth.service.ts
                                                </div>
                                                <div className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600 border border-gray-200 flex items-center gap-1.5">
                                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    jwt.strategy.ts
                                                </div>
                                                <div className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600 border border-gray-200 flex items-center gap-1.5">
                                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    user.controller.ts
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute -z-10 -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                    <div className="absolute -z-10 -bottom-10 -left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
                </motion.div>
            </div>
        </section >
    );
}
