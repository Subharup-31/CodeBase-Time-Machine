"use client";

import { motion } from "framer-motion";
import { GitBranch, MessageSquare, BarChart3, ArrowRight } from "lucide-react";

const steps = [
    {
        number: "01",
        title: "Connect Your Repo",
        description: "Link your GitHub, GitLab, or Bitbucket repository in seconds. We handle the rest.",
        icon: GitBranch,
        gradient: "from-blue-500 to-indigo-500",
    },
    {
        number: "02",
        title: "Ask Anything",
        description: "Use natural language to ask questions about your code. Our AI understands context.",
        icon: MessageSquare,
        gradient: "from-indigo-500 to-purple-500",
    },
    {
        number: "03",
        title: "Get Insights",
        description: "Receive detailed answers, visualizations, and actionable insights instantly.",
        icon: BarChart3,
        gradient: "from-purple-500 to-pink-500",
    },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-32 bg-gray-50 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50" />

            {/* Gradient Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-200/30 rounded-full blur-[120px]" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-4">
                        How It Works
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                        Get started in
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> minutes</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                        Three simple steps to unlock the full potential of your codebase
                    </p>
                </motion.div>

                {/* Steps */}
                <div className="max-w-5xl mx-auto">
                    <div className="relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 -translate-y-1/2 hidden lg:block" />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-4">
                            {steps.map((step, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.2 }}
                                    className="relative"
                                >
                                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 relative z-10 group hover:-translate-y-2 transition-transform duration-300">
                                        {/* Step Number */}
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${step.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <step.icon className="w-8 h-8 text-white" />
                                        </div>

                                        {/* Number Badge */}
                                        <div className="absolute top-4 right-4 text-6xl font-bold text-gray-100 select-none">
                                            {step.number}
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                                            {step.title}
                                        </h3>
                                        <p className="text-gray-500 leading-relaxed">
                                            {step.description}
                                        </p>

                                        {/* Arrow for next step */}
                                        {index < steps.length - 1 && (
                                            <div className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20">
                                                <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-100">
                                                    <ArrowRight className="w-5 h-5 text-indigo-600" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
