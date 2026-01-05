"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

const trustedCompanies = [
    "Vercel", "Stripe", "Linear", "Notion", "Figma", "GitHub"
];

export default function Hero() {
    return (
        <section className="relative min-h-screen pt-32 pb-20 flex items-center justify-center overflow-hidden bg-white">
            {/* Animated Gradient Orbs */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-indigo-400/30 to-purple-400/30 rounded-full blur-[120px] animate-blob" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-[100px] animate-blob delay-300" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-[140px] animate-pulse-glow" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-indigo-500/30 rounded-full"
                        style={{
                            top: `${20 + i * 15}%`,
                            left: `${10 + i * 15}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.3, 0.7, 0.3],
                        }}
                        transition={{
                            duration: 3 + i * 0.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.2,
                        }}
                    />
                ))}
            </div>

            <div className="container mx-auto relative z-10 px-6 md:px-12 lg:px-24">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center text-center max-w-5xl mx-auto"
                >
                    {/* Badge */}
                    <motion.div
                        variants={itemVariants}
                        className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 px-4 py-2 text-sm font-medium text-indigo-700 backdrop-blur-sm shadow-lg shadow-indigo-100/50 mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>v2.0 is now live — See what&apos;s new</span>
                        <ArrowRight className="w-3 h-3" />
                    </motion.div>

                    {/* Main Heading */}
                    <motion.h1
                        variants={itemVariants}
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6"
                    >
                        Master Your Codebase
                        <br />
                        <span className="relative inline-block mt-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient bg-300%">
                                Through Time & Space
                            </span>
                            {/* Underline decoration */}
                            <svg
                                className="absolute -bottom-2 left-0 w-full h-3 text-indigo-500/30"
                                viewBox="0 0 300 12"
                                fill="none"
                                preserveAspectRatio="none"
                            >
                                <motion.path
                                    d="M1 5.5C32 2 62 2 95 5.5C128 9 158 9 191 5.5C224 2 254 2 299 5.5"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, delay: 0.8 }}
                                />
                            </svg>
                        </span>
                    </motion.h1>

                    {/* Description */}
                    <motion.p
                        variants={itemVariants}
                        className="max-w-2xl text-lg md:text-xl text-gray-600 leading-relaxed mb-10"
                    >
                        Traverse commit history, decode architecture, and uncover every part of your project with AI-powered insights. The ultimate tool for developers.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        variants={itemVariants}
                        className="flex flex-col sm:flex-row gap-4 mb-16"
                    >
                        <Link href="/dashboard">
                            <Button
                                size="lg"
                                className="h-14 px-8 text-base bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-xl shadow-indigo-300/40 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group"
                            >
                                Start Exploring Free
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-14 px-8 text-base border-2 border-gray-200 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50 rounded-xl transition-all duration-300 group"
                        >
                            <Play className="mr-2 h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                            Watch Demo
                        </Button>
                    </motion.div>

                    {/* Product Preview */}
                    <motion.div
                        variants={itemVariants}
                        className="relative w-full max-w-4xl"
                    >
                        {/* Glow effect behind */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-60" />

                        <motion.div
                            className="relative rounded-2xl border border-gray-200/60 bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden"
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Window Header */}
                            <div className="h-12 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between px-4">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    Connected to auth-service
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex min-h-[400px]">
                                {/* Sidebar */}
                                <div className="hidden md:block w-56 border-r border-gray-100 bg-gray-50/50 p-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg text-indigo-700 text-sm font-medium">
                                            <div className="w-4 h-4 rounded bg-indigo-600" />
                                            Time Machine
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-sm hover:bg-gray-100 rounded-lg transition-colors">
                                            <div className="w-4 h-4 rounded bg-gray-300" />
                                            Flow Mode
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 text-gray-500 text-sm hover:bg-gray-100 rounded-lg transition-colors">
                                            <div className="w-4 h-4 rounded bg-gray-300" />
                                            Deep Search
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="flex-1 p-6 space-y-6">
                                    {/* User Message */}
                                    <motion.div
                                        className="flex justify-end"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1.2 }}
                                    >
                                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-lg max-w-[80%]">
                                            <p className="text-sm">When was authentication added to the user service?</p>
                                        </div>
                                    </motion.div>

                                    {/* AI Response */}
                                    <motion.div
                                        className="flex gap-4"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.6 }}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <div className="bg-white border border-gray-100 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
                                                <p className="text-sm text-gray-700 mb-3">
                                                    Authentication was introduced in <code className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono">commit 8f2a1b</code> by <strong>Aisha</strong> on Oct 24, 2023.
                                                </p>

                                                {/* Commit Card */}
                                                <div className="border border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-white p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="font-mono text-indigo-600 font-bold">8f2a1b9</span>
                                                        <span className="text-gray-400">•</span>
                                                        <span className="text-gray-600">feat: implement JWT auth flow</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">+ auth.service.ts</span>
                                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">+ jwt.strategy.ts</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Trusted By Section */}
                    <motion.div
                        variants={itemVariants}
                        className="mt-20 w-full"
                    >
                        <p className="text-sm text-gray-400 mb-6 uppercase tracking-widest font-medium">
                            Trusted by developers at
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                            {trustedCompanies.map((company, index) => (
                                <motion.div
                                    key={company}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 2 + index * 0.1 }}
                                    className="text-xl md:text-2xl font-bold text-gray-300 hover:text-gray-500 transition-colors cursor-default"
                                >
                                    {company}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
