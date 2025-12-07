"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Navbar() {
    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed top-6 inset-x-0 mx-4 md:mx-auto max-w-2xl z-50 border border-gray-200/50 bg-white/70 backdrop-blur-xl rounded-full shadow-lg shadow-gray-200/20"
        >
            <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                        A
                    </div>
                    <span className="font-bold text-lg tracking-tight text-gray-900">ArchaiLens</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                        Features
                    </Link>
                    <Link href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                        How it Works
                    </Link>
                    <Link href="#pricing" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                        Pricing
                    </Link>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-4">
                    <Link href="/login" className="hidden sm:block">
                        <Button variant="ghost" className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50">
                            Sign In
                        </Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200/50">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}
