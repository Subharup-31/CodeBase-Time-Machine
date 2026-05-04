"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GitPullRequest, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import OnboardButton from "./OnboardButton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for realtime subscriptions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
                current.map(r => r.name === repoName ? { ...r, status: 'pending', progress: 0, progress_message: 'Queued for retry...' } : r)
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
                                ? { ...repo, status: updatedRepo.status, progress: updatedRepo.progress, progress_message: updatedRepo.progress_message } 
                                : repo
                        )
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'repositories' },
                (payload) => {
                    // Fetch initial stats if it's a new repo, or just add it to the list
                    const newRepo = payload.new;
                    setRepos((current) => [...current, { ...newRepo, stats: null }]);
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
        <Card className="col-span-1 lg:col-span-3 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader>
                <CardTitle className="text-xl text-gray-900">Repositories</CardTitle>
                <CardDescription className="text-gray-500">Your tracked projects.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {repos.map((repo: any) => (
                        <div key={repo.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-white/50 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all duration-200 group gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                                    <GitPullRequest className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{repo.name}</p>
                                    <p className="text-xs text-gray-500">{repo.stats?.language || "Unknown"}</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                {repo.status === 'indexing' ? (
                                    <div className="flex flex-col w-full sm:w-48 gap-1">
                                        <div className="flex justify-between text-xs font-medium text-indigo-700">
                                            <span className="truncate pr-2">{repo.progress_message || "Indexing..."}</span>
                                            <span>{repo.progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-indigo-100 rounded-full h-1.5">
                                            <div 
                                                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500 ease-out" 
                                                style={{ width: `${repo.progress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ) : repo.status === 'error' ? (
                                    <div className="flex flex-col w-full sm:w-56 gap-1">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                            <span className="truncate pr-1">{repo.progress_message || 'Indexing failed'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs font-bold text-gray-900">{repo.stats?.stars || 0} stars</div>
                                        <div className="text-[10px] text-gray-500 whitespace-nowrap">
                                            {repo.stats?.lastUpdate ? formatDistanceToNow(new Date(repo.stats.lastUpdate)) : "N/A"}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    {repo.status === 'indexing' ? (
                                        <Button variant="outline" size="sm" disabled className="w-full sm:w-auto gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Indexing
                                        </Button>
                                    ) : repo.status === 'error' ? (
                                        <>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleRetry(repo.name, repo.url)}
                                            >
                                                Retry
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <OnboardButton repoName={repo.name} />
                                            <Link href={`/repo/${repo.name}/visualize`}>
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto text-purple-600 border-purple-200 hover:bg-purple-50">
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
                        <div className="text-center py-8 text-gray-500 text-sm bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            No repositories tracked yet.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

                                                                                                                                              
