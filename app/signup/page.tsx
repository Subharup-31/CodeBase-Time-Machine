"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Mock signup delay
        setTimeout(() => {
            setLoading(false);
            router.push("/dashboard");
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(120,119,198,0.1),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* Back Button */}
            <div className="absolute top-6 left-6 z-20">
                <Link href="/landing">
                    <Button variant="ghost" className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Button>
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10 px-4"
            >
                <div className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-xl shadow-indigo-100/50 p-8">
                    <div className="text-center mb-8 space-y-2">
                        <div className="flex justify-center mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                                A
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create an account</h1>
                        <p className="text-gray-500 text-sm">Enter your details to get started</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                            />
                        </div>

                        <Button
                            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:-translate-y-0.5"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Creating account..." : "Sign Up"}
                        </Button>

                        <div className="text-center text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
