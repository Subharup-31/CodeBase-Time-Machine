import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, GitBranch, Clock, Brain } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Navbar */}
            <header className="border-b">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2 font-bold text-xl">
                        <Clock className="h-6 w-6 text-primary" />
                        <span>Codebase Time-Machine</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Link href="/login">
                            <Button variant="ghost">Login</Button>
                        </Link>
                        <Link href="/login">
                            <Button>Get Started</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="flex-1">
                <section className="py-24 md:py-32 text-center container mx-auto px-6">
                    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-6">
                        Now in Beta
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                        AI-powered code understanding <br /> with vector memory
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                        Travel through your commit history, understand how features evolved, and debug with the context of time.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Link href="/login">
                            <Button size="lg" className="h-12 px-8 text-base">
                                Start Analyzing <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                            View Demo
                        </Button>
                    </div>
                </section>

                {/* Features */}
                <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
                    <div className="container mx-auto px-6">
                        <div className="grid md:grid-cols-3 gap-12">
                            <div className="space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <GitBranch className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Commit History RAG</h3>
                                <p className="text-muted-foreground">
                                    We index every commit to understand how your code changes over time, not just the current state.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Brain className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Deep Reasoning</h3>
                                <p className="text-muted-foreground">
                                    Powered by Gemini, our AI reasons across thousands of chunks to answer complex architectural questions.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Time Travel Debugging</h3>
                                <p className="text-muted-foreground">
                                    Pinpoint exactly when a bug was introduced or a feature was modified with precision.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t py-12 bg-background">
                <div className="container mx-auto px-6 text-center text-muted-foreground">
                    <p>&copy; 2024 Codebase Time-Machine. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
