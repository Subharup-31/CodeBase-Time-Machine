"use client";

import { motion } from "framer-motion";

export default function DiagramPreview() {
    return (
        <section className="py-32 bg-white relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-200/30 to-purple-200/30 rounded-full blur-[120px] -z-10" />

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
                        Flow Mode
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4">
                        Visualize Your
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> Architecture</span>
                    </h2>
                    <p className="text-gray-500 max-w-[700px] mx-auto text-xl leading-relaxed">
                        Turn complex code into clear, interactive diagrams instantly
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative max-w-5xl mx-auto"
                >
                    {/* Glow Effect */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-60" />

                    <div className="relative rounded-3xl bg-white border border-gray-200/60 shadow-2xl shadow-indigo-100/50 overflow-hidden">
                        <div className="grid md:grid-cols-2 min-h-[550px]">
                            {/* Left: Code Block */}
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 border-r border-gray-700 font-mono text-sm overflow-hidden">
                                {/* Window Controls */}
                                <div className="flex gap-2 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>

                                {/* Animated Code Lines */}
                                <div className="space-y-3">
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.3 }}
                                        className="flex"
                                    >
                                        <span className="text-purple-400 mr-2">export</span>
                                        <span className="text-blue-400 mr-2">async</span>
                                        <span className="text-yellow-300 mr-2">function</span>
                                        <span className="text-blue-200">processData</span>
                                        <span className="text-gray-400">() {"{"}</span>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.4 }}
                                        className="pl-4 text-gray-500"
                                    >
                                        // Fetch user data
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.5 }}
                                        className="pl-4"
                                    >
                                        <span className="text-purple-400 mr-2">const</span>
                                        <span className="text-blue-200 mr-2">user</span>
                                        <span className="text-gray-400 mr-2">=</span>
                                        <span className="text-blue-400 mr-2">await</span>
                                        <span className="text-gray-300">db.users.find(id);</span>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.6 }}
                                        className="pl-4 text-gray-500"
                                    >
                                        // Validate permissions
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.7 }}
                                        className="pl-4"
                                    >
                                        <span className="text-purple-400 mr-2">if</span>
                                        <span className="text-gray-400">(!user.isAdmin) {"{"}</span>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.8 }}
                                        className="pl-8"
                                    >
                                        <span className="text-purple-400 mr-2">throw</span>
                                        <span className="text-blue-400 mr-2">new</span>
                                        <span className="text-gray-300">Error(</span>
                                        <span className="text-green-400">&quot;Unauthorized&quot;</span>
                                        <span className="text-gray-300">);</span>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.9 }}
                                        className="pl-4 text-gray-400"
                                    >
                                        {"}"}
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 1.0 }}
                                        className="pl-4"
                                    >
                                        <span className="text-purple-400 mr-2">return</span>
                                        <span className="text-gray-300">process(user);</span>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 1.1 }}
                                        className="text-gray-400"
                                    >
                                        {"}"}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Right: Diagram */}
                            <div className="bg-gradient-to-br from-gray-50 to-white p-8 flex items-center justify-center relative overflow-hidden">
                                {/* Grid Pattern */}
                                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />

                                <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-[260px]">
                                    {/* Step 1 */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.5 }}
                                        className="w-full p-5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-center font-semibold shadow-lg shadow-indigo-500/30"
                                    >
                                        Start Process
                                    </motion.div>

                                    {/* Arrow 1 */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.7 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-400 to-purple-400" />
                                        <svg className="w-4 h-4 text-purple-500 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </motion.div>

                                    {/* Step 2 */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.9 }}
                                        className="w-full p-5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center font-semibold shadow-lg shadow-purple-500/30"
                                    >
                                        Validate User
                                    </motion.div>

                                    {/* Arrow 2 */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 1.1 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="w-0.5 h-6 bg-gradient-to-b from-pink-400 to-green-400" />
                                        <svg className="w-4 h-4 text-green-500 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </motion.div>

                                    {/* Step 3 */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 1.3 }}
                                        className="w-full p-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center font-semibold shadow-lg shadow-green-500/30"
                                    >
                                        Execute Logic
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
