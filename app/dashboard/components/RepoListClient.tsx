"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GitPullRequest, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import OnboardButton from "./OnboardButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for realtime subscriptions with safe fallback guards for test robustness
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RepoListClient({ initialRepos }: { initialRepos: any[] }) {
    const [repos, setRepos] = useState(initialRepos);

    const handleRetry = async (repoName: string, repoUrl: string) => {
        try {
            await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl, displayName: repoName })
            });
            // Optimistically update status to pending
            setRepos(current =>
                current.map(r => r.name === repoName ? { ...r, status: 'pending', progress: 0, progressMessage: 'Queued for retry...' } : r)
            );
        } catch (e) {
            console.error('Retry failed', e);
        }
    };

    useEffect(() => {
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
                        indexedAt: newRepo.indexed_at,
                        status: newRepo.status,
                        progress: newRepo.progress,
                        progressMessage: newRepo.progress_message,
                        errorMessage: newRepo.error_message,
                        stats: null
                    }]);
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'repositories' },
                (payload) => {
                    setRepos(current => current.filter(r => r.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <Card className="col-span-1 lg:col-span-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
            <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-50">Repositories</CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">Your tracked projects.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {repos.map((repo: any) => (
                        <div key={repo.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                                    <GitPullRequest className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate">{repo.name}</p>
                                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{repo.stats?.language || "Unknown"}</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                {repo.status === 'indexing' || repo.status === 'pending' ? (
                                    <div className="flex flex-col w-full sm:w-36 gap-1">
                                        <div className="flex justify-between text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                                            <span className="truncate pr-2">{repo.progressMessage || (repo.status === 'pending' ? "Queued..." : "Indexing...")}</span>
                                            <span>{repo.progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1">
                                            <div 
                                                className="bg-zinc-900 dark:bg-zinc-50 h-1 rounded-full transition-all duration-500 ease-out" 
                                                style={{ width: `${repo.progress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ) : repo.status === 'error' ? (
                                    <div className="flex flex-col w-full sm:w-48 gap-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                            <span className="inline-flex h-1 w-1 rounded-full bg-red-500"></span>
                                            <span className="truncate pr-1">{repo.errorMessage || repo.progressMessage || 'Indexing failed'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-right hidden sm:block">
                                        <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50">{repo.stats?.stars || 0} stars</div>
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                            {repo.stats?.lastUpdate ? formatDistanceToNow(new Date(repo.stats.lastUpdate)) : "N/A"}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-1.5 w-full sm:w-auto mt-1 sm:mt-0">
                                    {repo.status === 'indexing' || repo.status === 'pending' ? (
                                        <Button variant="outline" size="sm" disabled className="w-full sm:w-auto text-[11px] h-7 px-2.5 gap-1.5">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {repo.status === 'pending' ? 'Queued' : 'Indexing'}
                                        </Button>
                                    ) : repo.status === 'error' ? (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="w-full sm:w-auto text-[11px] h-7 px-2.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                onClick={() => handleRetry(repo.name, repo.url)}
                                            >
                                                Retry
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <OnboardButton repoName={repo.name} />
                                            <Link href={`/repo/${repo.name}/visualize`}>
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto text-[11px] h-7 px-2.5 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                                                    Visualize
                                                </Button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {repos.length === 0 && (
                        <div className="text-center py-8 text-xs text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/50 rounded border border-dashed border-zinc-200 dark:border-zinc-800">
                            No repositories tracked yet.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
