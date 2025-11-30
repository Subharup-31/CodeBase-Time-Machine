import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Github, Clock, Zap, Shield } from "lucide-react"

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-background pt-16 md:pt-20 lg:pt-24">
            <div className="container relative z-10 mx-auto px-4 md:px-6">
                <div className="flex flex-col items-center text-center">
                    <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 mb-6">
                        <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                        v1.0 Now Available
                    </div>

                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-600 animate-gradient-x pb-2">
                        Talk to Your Codebase Like Never Before
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
                        Time Machine isn't just a search tool. It's an AI-powered historian that understands your entire git history, logic flows, and architectural evolution.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                        <Link href="/dashboard">
                            <Button size="lg" className="w-full sm:w-auto gap-2 text-base h-12 px-8">
                                Get Started <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="https://github.com" target="_blank">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base h-12 px-8">
                                <Github className="h-4 w-4" /> View on GitHub
                            </Button>
                        </Link>
                    </div>

                    <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-5xl w-full text-left">
                        <div className="flex flex-col gap-2 p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-2">
                                <Clock className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-xl">Time Travel</h3>
                            <p className="text-muted-foreground">Ask "When was auth added?" and get the exact commit, date, and context.</p>
                        </div>
                        <div className="flex flex-col gap-2 p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 w-fit rounded-lg bg-blue-500/10 text-blue-500 mb-2">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-xl">Logic Flow</h3>
                            <p className="text-muted-foreground">Visualize complex logic flows with auto-generated Mermaid diagrams.</p>
                        </div>
                        <div className="flex flex-col gap-2 p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 w-fit rounded-lg bg-green-500/10 text-green-500 mb-2">
                                <Shield className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-xl">Secure & Local</h3>
                            <p className="text-muted-foreground">Your code is indexed locally. We prioritize your privacy and security.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Gradient Blob */}
            <div className="absolute top-0 -z-10 h-full w-full overflow-hidden">
                <div className="absolute left-[50%] top-0 h-[500px] w-[500px] -translate-x-[50%] translate-y-[-20%] rounded-full bg-primary/20 blur-[100px] opacity-50"></div>
            </div>
        </section>
    )
}
