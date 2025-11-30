"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
    return (
        <footer className="bg-gray-50 border-t border-gray-200">
            <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                                A
                            </div>
                            <span className="font-bold text-lg tracking-tight text-gray-900">ArchaiLens</span>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Master your codebase through time and space. The ultimate tool for developers to understand, visualize, and query their repositories.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">
                                <Github className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">
                                <Twitter className="h-5 w-5" />
                            </Link>
                            <Link href="#" className="text-gray-400 hover:text-indigo-600 transition-colors">
                                <Linkedin className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>

                    {/* Product Column */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Features</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Time Machine</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Flow Mode</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Changelog</Link></li>
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">API Reference</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Community</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    {/* Company Column */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">About</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} ArchaiLens. All rights reserved.
                    </p>
                    <div className="flex gap-8 text-sm text-gray-500">
                        <Link href="#" className="hover:text-indigo-600 transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-indigo-600 transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-indigo-600 transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
