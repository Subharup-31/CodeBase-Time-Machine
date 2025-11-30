"use client";

import { motion } from "framer-motion";

export default function DiagramPreview() {
    return (
        <section className="py-24 bg-gray-50/50 border-y border-gray-100 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900">
                        Visualize Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Architecture</span>
                    </h2>
                    <p className="text-gray-500 max-w-[700px] mx-auto text-xl leading-relaxed">
                        Turn complex code into clear, interactive diagrams instantly.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative max-w-5xl mx-auto"
                >
                    <div className="relative rounded-2xl bg-white border border-gray-200/60 shadow-2xl shadow-indigo-100/50 overflow-hidden">
                        <div className="grid md:grid-cols-2 min-h-[500px]">
                            {/* Left: Code Block */}
                            <div className="bg-gray-900 p-8 border-r border-gray-800 font-mono text-sm overflow-hidden text-gray-300">
                                <div className="flex gap-2 mb-6 opacity-50">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex"><span className="text-purple-400 mr-2">export</span> <span className="text-blue-400 mr-2">async</span> <span className="text-yellow-400">function</span> <span className="text-blue-200">processData</span>() {"{"}</div>
                                    <div className="pl-4 flex"><span className="text-gray-500">// Fetch user data</span></div>
                                    <div className="pl-4 flex"><span className="text-purple-400 mr-2">const</span> user = <span className="text-blue-400 mr-2">await</span> db.users.find(id);</div>
                                    <div className="pl-4 flex"></div>
                                    <div className="pl-4 flex"><span className="text-gray-500">// Validate permissions</span></div>
                                    <div className="pl-4 flex"><span className="text-purple-400 mr-2">if</span> (!user.isAdmin) {"{"}</div>
                                    <div className="pl-8 flex"><span className="text-purple-400 mr-2">throw</span> <span className="text-blue-400">new</span> Error(<span className="text-green-400">"Unauthorized"</span>);</div>
                                    <div className="pl-4 flex">{"}"}</div>
                                    <div className="pl-4 flex"></div>
                                    <div className="pl-4 flex"><span className="text-purple-400 mr-2">return</span> process(user);</div>
                                    <div className="flex">{"}"}</div>
                                </div>
                            </div>

                            {/* Right: Diagram */}
                            <div className="bg-white p-8 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

                                <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-[240px]">
                                    <div className="w-full p-4 rounded-lg border border-indigo-100 bg-indigo-50/30 shadow-sm text-center text-sm font-medium text-indigo-900 ring-1 ring-indigo-500/20">
                                        Start Process
                                    </div>
                                    <div className="h-8 w-px bg-gray-300 relative">
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 border-r border-b border-gray-300 rotate-45" />
                                    </div>
                                    <div className="w-full p-4 rounded-lg border-2 border-purple-100 bg-purple-50/50 text-center text-sm font-medium text-purple-700 shadow-sm">
                                        Validate User
                                    </div>
                                    <div className="h-8 w-px bg-gray-300 relative">
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 border-r border-b border-gray-300 rotate-45" />
                                    </div>
                                    <div className="w-full p-4 rounded-lg border border-green-100 bg-green-50/30 shadow-sm text-center text-sm font-medium text-green-800 ring-1 ring-green-500/20">
                                        Execute Logic
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
