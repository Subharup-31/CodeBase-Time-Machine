"use client";

import { motion } from "framer-motion";
import { Clock, GitCommit, CircuitBoard, Search, Zap, Shield } from "lucide-react";

const features = [
    {
        title: "Time Machine Mode",
        description: "Explore commits, timestamps, and file diffs to understand how your codebase evolved over time.",
        icon: Clock,
        gradient: "from-blue-500 to-cyan-500",
        bgGlow: "bg-blue-500/20",
        size: "large",
    },
    {
        title: "Flow Mode",
        description: "Auto-generated architecture diagrams to visualize complex logic flows and dependencies.",
        icon: CircuitBoard,
        gradient: "from-purple-500 to-pink-500",
        bgGlow: "bg-purple-500/20",
        size: "large",
    },
    {
        title: "Deep Repo Search",
        description: "Ask anything about your code and get semantic, context-aware answers instantly.",
        icon: Search,
        gradient: "from-orange-500 to-red-500",
        bgGlow: "bg-orange-500/20",
        size: "small",
    },
    {
        title: "Multi-Repo Workspace",
        description: "Switch between multiple repositories seamlessly in one unified dashboard.",
        icon: GitCommit,
        gradient: "from-green-500 to-emerald-500",
        bgGlow: "bg-green-500/20",
        size: "small",
    },
    {
        title: "Lightning Fast",
        description: "Instant responses powered by advanced caching and optimized AI models.",
        icon: Zap,
        gradient: "from-yellow-500 to-orange-500",
        bgGlow: "bg-yellow-500/20",
        size: "small",
    },
    {
        title: "Enterprise Security",
        description: "SOC 2 compliant with end-to-end encryption for your sensitive code.",
        icon: Shield,
        gradient: "from-indigo-500 to-purple-500",
        bgGlow: "bg-indigo-500/20",
        size: "small",
    },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" },
    },
};

export default function Features() {
    return (
        <section id="features" className="py-32 bg-gradient-to-b from-white via-gray-50/50 to-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-1/2 left-0 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl -translate-y-1/2" />
            <div className="absolute top-1/4 right-0 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 mb-4">
                        Features
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                        Everything you need to
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> master </span>
                        your code
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                        Powerful tools designed to help you understand, navigate, and explain any codebase with AI assistance.
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            className={`group relative p-6 md:p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden ${feature.size === "large" ? "lg:col-span-2 lg:row-span-1" : ""
                                }`}
                        >
                            {/* Hover Glow */}
                            <div className={`absolute inset-0 ${feature.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />

                            {/* Gradient Border on Hover */}
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-indigo-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500" />

                            <div className="relative z-10">
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="h-7 w-7 text-white" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 leading-relaxed">
                                    {feature.description}
                                </p>

                                {/* Arrow Indicator */}
                                <div className="mt-4 flex items-center text-indigo-600 font-medium text-sm opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                                    Learn more →
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
