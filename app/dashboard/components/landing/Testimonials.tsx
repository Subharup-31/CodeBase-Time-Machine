"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
    {
        quote: "ArchaiLens completely changed how we onboard new developers. They understand our codebase in days instead of weeks.",
        author: "Sarah Chen",
        role: "Engineering Lead",
        company: "TechFlow",
        avatar: "SC",
    },
    {
        quote: "The Time Machine feature is incredible. Debugging legacy code has never been easier. It's like having a senior developer who knows everything.",
        author: "Marcus Rodriguez",
        role: "Senior Developer",
        company: "CodeCraft",
        avatar: "MR",
    },
    {
        quote: "We evaluated 5 different tools and ArchaiLens was the clear winner. The AI actually understands context, not just keywords.",
        author: "Emily Park",
        role: "CTO",
        company: "StartupX",
        avatar: "EP",
    },
];

const companies = [
    "Vercel", "Stripe", "Linear", "Notion", "Figma", "GitHub", "Slack", "Discord"
];

export default function Testimonials() {
    return (
        <section className="py-32 bg-white relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-indigo-100/50 via-purple-100/50 to-pink-100/50 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-4 md:px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-600 mb-4">
                        Testimonials
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                        Loved by
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"> developers </span>
                        worldwide
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                        Join thousands of teams who have transformed their development workflow
                    </p>
                </motion.div>

                {/* Testimonial Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            className="group"
                        >
                            <div className="h-full bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 relative overflow-hidden">
                                {/* Decorative Quote */}
                                <div className="absolute top-4 right-4 text-8xl font-serif text-indigo-50 select-none">
                                    &ldquo;
                                </div>

                                {/* Stars */}
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>

                                {/* Quote */}
                                <p className="text-gray-700 leading-relaxed mb-6 relative z-10">
                                    &ldquo;{testimonial.quote}&rdquo;
                                </p>

                                {/* Author */}
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">
                                            {testimonial.author}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {testimonial.role} at {testimonial.company}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Logo Marquee */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="relative"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />

                    <div className="overflow-hidden py-8">
                        <div className="flex animate-marquee">
                            {[...companies, ...companies].map((company, index) => (
                                <div
                                    key={index}
                                    className="flex-shrink-0 mx-12 text-2xl font-bold text-gray-300 hover:text-gray-500 transition-colors cursor-default"
                                >
                                    {company}
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
