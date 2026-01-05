"use client";

import { motion } from "framer-motion";
import { Clock, GitCommit, CircuitBoard, Search } from "lucide-react";

const features = [
    {
        title: "Time Machine Mode",
        description: "Explore commits, timestamps, and file diffs to understand evolution.",
        icon: Clock,
        color: "text-blue-600",
        bg: "bg-blue-50",
        hoverBg: "group-hover:bg-blue-100",
    },
    {
        title: "Flow Mode",
        description: "Auto-generated architecture diagrams to visualize complex logic.",
        icon: CircuitBoard,
        color: "text-purple-600",
        bg: "bg-purple-50",
        hoverBg: "group-hover:bg-purple-100",
    },
    {
        title: "Deep Repo Search",
        description: "Ask anything about the code and get semantic, context-aware answers.",
        icon: Search,
        color: "text-pink-600",
        bg: "bg-pink-50",
        hoverBg: "group-hover:bg-pink-100",
    },
    {
        title: "Multi-Repo Workspace",
        description: "Seamlessly switch between multiple repositories in one dashboard.",
        icon: GitCommit,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        hoverBg: "group-hover:bg-cyan-100",
    },
];

export default function Features() {
    return (
        <section className="py-32 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 ${feature.hoverBg} transition-colors`}>
                                <feature.icon className={`h-6 w-6 ${feature.color}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
