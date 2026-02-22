"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

const plans = [
    {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Perfect for exploring and small projects",
        features: [
            "1 repository",
            "50 queries/month",
            "Basic Time Machine",
            "Community support",
            "7-day history",
        ],
        cta: "Get Started",
        highlighted: false,
    },
    {
        name: "Pro",
        price: "$19",
        period: "/month",
        description: "For professional developers and power users",
        features: [
            "Unlimited repositories",
            "Unlimited queries",
            "Full Time Machine access",
            "Flow Mode diagrams",
            "Priority support",
            "90-day history",
            "API access",
        ],
        cta: "Start Free Trial",
        highlighted: true,
    },
    {
        name: "Team",
        price: "$49",
        period: "/user/month",
        description: "For teams that need collaboration and security",
        features: [
            "Everything in Pro",
            "Unlimited team members",
            "SSO / SAML",
            "Advanced security",
            "Custom integrations",
            "Unlimited history",
            "Dedicated support",
            "SLA guarantee",
        ],
        cta: "Contact Sales",
        highlighted: false,
    },
];

export default function Pricing() {
    return (
        <section id="pricing" className="py-32 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <span className="inline-flex items-center rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-600 mb-4">
                        Pricing
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
                        Simple,
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> transparent </span>
                        pricing
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                        Start free and scale as you grow. No hidden fees, cancel anytime.
                    </p>
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.15 }}
                            className={`relative ${plan.highlighted ? "md:-mt-4 md:mb-4" : ""}`}
                        >
                            {/* Popular Badge */}
                            {plan.highlighted && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                                    <div className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium px-4 py-1.5 rounded-full shadow-lg">
                                        <Sparkles className="w-4 h-4" />
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            <div
                                className={`h-full rounded-3xl p-8 transition-all duration-300 ${plan.highlighted
                                    ? "bg-gradient-to-b from-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/30 border-2 border-indigo-400"
                                    : "bg-white border border-gray-200 hover:border-indigo-200 hover:shadow-xl"
                                    }`}
                            >
                                {/* Plan Name */}
                                <div className="mb-6">
                                    <h3
                                        className={`text-xl font-bold mb-2 ${plan.highlighted ? "text-white" : "text-gray-900"
                                            }`}
                                    >
                                        {plan.name}
                                    </h3>
                                    <p
                                        className={`text-sm ${plan.highlighted ? "text-indigo-200" : "text-gray-500"
                                            }`}
                                    >
                                        {plan.description}
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="mb-8">
                                    <span
                                        className={`text-5xl font-bold ${plan.highlighted ? "text-white" : "text-gray-900"
                                            }`}
                                    >
                                        {plan.price}
                                    </span>
                                    <span
                                        className={`text-lg ${plan.highlighted ? "text-indigo-200" : "text-gray-500"
                                            }`}
                                    >
                                        {plan.period}
                                    </span>
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, featureIndex) => (
                                        <li key={featureIndex} className="flex items-start gap-3">
                                            <div
                                                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlighted
                                                    ? "bg-white/20"
                                                    : "bg-green-100"
                                                    }`}
                                            >
                                                <Check
                                                    className={`w-3 h-3 ${plan.highlighted ? "text-white" : "text-green-600"
                                                        }`}
                                                />
                                            </div>
                                            <span
                                                className={
                                                    plan.highlighted ? "text-indigo-100" : "text-gray-600"
                                                }
                                            >
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Link href="/dashboard" className="block">
                                    <Button
                                        size="lg"
                                        className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 ${plan.highlighted
                                            ? "bg-white text-indigo-600 hover:bg-gray-100 shadow-lg"
                                            : "bg-gray-900 text-white hover:bg-gray-800"
                                            }`}
                                    >
                                        {plan.cta}
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center mt-12"
                >
                    <p className="text-gray-500 text-sm">
                        🔒 Secure payment powered by Stripe • 30-day money-back guarantee
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
