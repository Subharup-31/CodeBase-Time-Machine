"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";

export default function Hero() {
    return (
        <section className="relative h-screen flex items-center justify-center overflow-hidden bg-background">
            {/* Background Gradients */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
                <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[100px] animate-pulse delay-1000" />
            </div>

            <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-6">
                        v2.0 is now live
                    </div>
                </motion.div>

                <motion.h1
                    className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    Master Your Codebase <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                        Through Time & Space
                    </span>
                </motion.h1>

                <motion.p
                    className="max-w-[600px] text-muted-foreground text-lg md:text-xl mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    Navigate commit history, visualize architecture flows, and understand your project's evolution with AI-powered insights.
                </motion.p>

                <motion.div
                    className="flex flex-col sm:flex-row gap-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <Link href="/dashboard">
                        <Button size="lg" className="h-12 px-8 text-base gap-2">
                            Get Started <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="https://github.com" target="_blank">
                        <Button variant="outline" size="lg" className="h-12 px-8 text-base gap-2">
                            <Github className="h-4 w-4" />
                            View on GitHub
                        </Button>
                    </Link>
                </motion.div>

                {/* Floating UI Elements (Decorative) */}
                <motion.div
                    className="absolute -z-10 w-full max-w-5xl mt-20 opacity-20 dark:opacity-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                >
                    <div className="aspect-video rounded-xl border bg-card shadow-2xl" />
                </motion.div>
            </div>
        </section>
    );
}
