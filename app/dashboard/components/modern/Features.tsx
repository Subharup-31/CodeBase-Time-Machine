"use client";

import { motion } from "framer-motion";
import { History, GitBranch, Database, Zap, Search, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
    {
        title: "Time Machine",
        description: "Travel back through your commit history to understand how code evolved.",
        icon: History,
        color: "text-blue-500",
    },
    {
        title: "Flow Mode",
        description: "Visualize complex logic flows with AI-generated Mermaid diagrams.",
        icon: GitBranch,
        color: "text-purple-500",
    },
    {
        title: "Repo Manager",
        description: "Seamlessly switch between multiple repositories and analyze them instantly.",
        icon: Database,
        color: "text-green-500",
    },
    {
        title: "Instant Analysis",
        description: "Get answers about your codebase in milliseconds using vector search.",
        icon: Zap,
        color: "text-yellow-500",
    },
    {
        title: "Deep Search",
        description: "Find exactly what you're looking for with semantic code search.",
        icon: Search,
        color: "text-red-500",
    },
    {
        title: "Secure & Local",
        description: "Your code stays private. We process everything securely.",
        icon: Lock,
        color: "text-cyan-500",
    },
];

export default function Features() {
    return (
        <section className="py-24 bg-muted/30">
            <div className="container px-4 md:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Powerful Features</h2>
                    <p className="text-muted-foreground max-w-[600px] mx-auto">
                        Everything you need to master your codebase, built into one powerful dashboard.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Card className="h-full border-muted/50 hover:border-primary/20 transition-colors hover:shadow-lg bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <feature.icon className={`h-10 w-10 mb-4 ${feature.color}`} />
                                    <CardTitle>{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
