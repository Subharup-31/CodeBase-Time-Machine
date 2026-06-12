"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Database, GitBranch, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

interface Repo {
    id?: string;
    name: string;
    url: string;
    namespace: string;
    createdAt: string;
    status?: string;
    progress?: number;
    progressMessage?: string;
    errorMessage?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function autoDetectName(url: string): string {
    const m = url.match(/github\.com\/[^/]+\/([^/]+)/);
    return m ? m[1].replace(/\.git$/, "") : "";
}

export default function ReposPage() {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [repoUrl, setRepoUrl] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [indexState, setIndexState] = useState<"idle" | "indexing" | "done" | "error">("idle");
    const [indexProgress, setIndexProgress] = useState({ stage: "", message: "", percent: 0 });
    const [indexResult, setIndexResult] = useState<{ chunks: number; evolutionChunks: number; symbolChunks: number } | null>(null);
    const [indexError, setIndexError] = useState<string | null>(null);

    useEffect(() => {
        fetchRepos();

        // Subscribe to changes on the repositories table
        const channel = supabase
            .channel('public:repositories')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'repositories' },
                (payload) => {
                    const updatedRepo = payload.new;
                    setRepos((currentRepos) =>
                        currentRepos.map((repo) =>
                            repo.name === updatedRepo.name
                                ? {
                                    ...repo,
                                    status: updatedRepo.status,
                                    progress: updatedRepo.progress,
                                    progressMessage: updatedRepo.progress_message,
                                    errorMessage: updatedRepo.error_message,
                                    indexedAt: updatedRepo.indexed_at
                                  }
                                : repo
                        )
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'repositories' },
                (payload) => {
                    const newRepo = payload.new;
                    setRepos((current) => [...current, {
                        id: newRepo.id,
                        name: newRepo.name,
                        url: newRepo.url,
                        namespace: newRepo.namespace,
                        createdAt: newRepo.created_at,
                        status: newRepo.status,
                        progress: newRepo.progress,
                        progressMessage: newRepo.progress_message,
                        errorMessage: newRepo.error_message
                    }]);
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'repositories' },
                (payload) => {
                    setRepos(current => current.filter(r => r.name !== payload.old.name));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Auto-detect display name from URL
    useEffect(() => {
        const name = autoDetectName(repoUrl);
        if (name) setDisplayName(name);
    }, [repoUrl]);

    const fetchRepos = async () => {
        try {
            const res = await fetch("/api/repos/list");
            const data = await res.json();
            if (data.success) {
                setRepos(data.repos);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleIndex = async () => {
        if (!repoUrl.trim()) return;

        setIndexState("indexing");
        setIndexProgress({ stage: "starting", message: "Connecting...", percent: 0 });
        setIndexError(null);
        setIndexResult(null);

        try {
            const response = await fetch("/api/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoUrl: repoUrl.trim(), displayName: displayName.trim() || undefined }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to queue indexing");
            }

            setIndexState("done");
            setIndexProgress({ stage: "done", message: "Queued for indexing. Track progress in the list below!", percent: 100 });
            setRepoUrl("");
            setDisplayName("");
            // Refresh repos list
            await fetchRepos();
        } catch (err: any) {
            setIndexState("error");
            setIndexError(err.message || "Connection failed");
        }
    };

    const handleDeleteRepo = async (name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This will wipe its memory.`)) return;

        try {
            const res = await fetch("/api/repos/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            if (res.ok) {
                fetchRepos();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="max-w-[1400px] mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Repository Manager</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">Manage your indexed repositories and memory collections.</p>
                </div>

                <Card className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                    <CardHeader>
                        <CardTitle className="text-zinc-900 dark:text-zinc-50">Add New Repository</CardTitle>
                        <CardDescription className="text-zinc-500 dark:text-zinc-400">Connect a GitHub repository to start indexing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <GitBranch className="absolute left-3 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                    <Input
                                        placeholder="https://github.com/owner/repo"
                                        value={repoUrl}
                                        onChange={(e) => setRepoUrl(e.target.value)}
                                        disabled={indexState === "indexing"}
                                        className="pl-9 h-11 bg-white/70 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-zinc-200/50 dark:focus:ring-zinc-800/50 rounded-xl transition-all"
                                        onKeyDown={(e) => { if (e.key === "Enter") handleIndex(); }}
                                    />
                                </div>
                                <Input
                                    placeholder="Name (auto)"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    disabled={indexState === "indexing"}
                                    className="w-36 h-11 bg-white/70 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-zinc-200/50 dark:focus:ring-zinc-800/50 rounded-xl transition-all"
                                />
                                <Button
                                    onClick={handleIndex}
                                    disabled={!repoUrl.trim() || indexState === "indexing"}
                                    className="h-11 px-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 transition-all whitespace-nowrap"
                                >
                                    {indexState === "indexing" ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Indexing…</>
                                    ) : (
                                        <><Zap className="mr-2 h-4 w-4" />Start</>
                                    )}
                                </Button>
                            </div>

                            {/* Progress bar */}
                            <AnimatePresence>
                                {indexState === "indexing" && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs text-zinc-600 dark:text-zinc-400">
                                                <span className="flex items-center gap-1.5">
                                                    <Loader2 className="h-3 w-3 animate-spin text-zinc-900 dark:text-zinc-100" />
                                                    {indexProgress.message}
                                                </span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{indexProgress.percent}%</span>
                                            </div>
                                            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                                                    initial={{ width: "0%" }}
                                                    animate={{ width: `${indexProgress.percent}%` }}
                                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Success */}
                            <AnimatePresence>
                                {indexState === "done" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl px-4 py-2.5"
                                    >
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        <span>
                                            {indexResult ? (
                                                <>
                                                    <strong>{indexResult.chunks}</strong> knowledge chunks indexed —{" "}
                                                    <span className="text-green-600 dark:text-green-400">{indexResult.evolutionChunks} commit diffs</span> +{" "}
                                                    <span className="text-green-600 dark:text-green-400">{indexResult.symbolChunks} code symbols</span>
                                                </>
                                            ) : (
                                                <span>Repository queued for background indexing. You can monitor the progress bar below in real-time!</span>
                                            )}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error */}
                            <AnimatePresence>
                                {indexState === "error" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl px-4 py-2.5"
                                    >
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{indexError}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
    
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full text-center py-12 text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">Loading repositories...</div>
                    ) : repos.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">No repositories added yet.</div>
                    ) : (
                        repos.map((repo) => (
                            <Card key={repo.name} className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-zinc-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center justify-between text-zinc-900 dark:text-zinc-50">
                                        <span className="truncate">{repo.name}</span>
                                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                                            <Database className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                                        </div>
                                    </CardTitle>
                                    <CardDescription className="truncate text-zinc-500 dark:text-zinc-400 text-xs">{repo.url}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800/60 font-mono break-all">
                                        {repo.namespace}
                                    </div>
                                    {repo.status === 'indexing' || repo.status === 'pending' ? (
                                        <div className="flex flex-col gap-1 mb-4">
                                            <div className="flex justify-between text-[10px] font-semibold text-zinc-650 dark:text-zinc-350">
                                                <span className="truncate pr-2">{repo.progressMessage || (repo.status === 'pending' ? "Queued..." : "Indexing...")}</span>
                                                <span>{repo.progress || 0}%</span>
                                            </div>
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1">
                                                <div 
                                                    className="bg-zinc-900 dark:bg-zinc-100 h-1 rounded-full transition-all duration-500 ease-out" 
                                                    style={{ width: `${repo.progress || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ) : repo.status === 'error' ? (
                                        <div className="flex flex-col gap-1 mb-4">
                                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                                <span className="truncate pr-1">{repo.errorMessage || repo.progressMessage || 'Indexing failed'}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 dark:text-green-400 mb-4">
                                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            <span>Ready</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                        <div className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 font-medium">
                                            Use @{repo.name}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteRepo(repo.name)}
                                            className="text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

                                                                                                                                     
