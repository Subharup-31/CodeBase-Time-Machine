"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Database } from "lucide-react";

interface Repo {
    name: string;
    url: string;
    collection: string;
    createdAt: string;
}

export default function ReposPage() {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRepoName, setNewRepoName] = useState("");
    const [newRepoUrl, setNewRepoUrl] = useState("");
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchRepos();
    }, []);

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

    const handleAddRepo = async () => {
        if (!newRepoName || !newRepoUrl) return;
        setAdding(true);

        try {
            const res = await fetch("/api/repos/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ displayName: newRepoName, repoUrl: newRepoUrl }),
            });

            if (res.ok) {
                setNewRepoName("");
                setNewRepoUrl("");
                fetchRepos();
            } else {
                alert("Failed to add repo");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAdding(false);
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Repository Manager</h2>
                <p className="text-gray-500">Manage your indexed repositories and memory collections.</p>
            </div>

            <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                <CardHeader>
                    <CardTitle className="text-gray-900">Add New Repository</CardTitle>
                    <CardDescription className="text-gray-500">Connect a GitHub repository to start indexing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            placeholder="Display Name (e.g. MyAuthService)"
                            value={newRepoName}
                            onChange={(e) => setNewRepoName(e.target.value)}
                            className="bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 h-11 transition-all"
                        />
                        <Input
                            placeholder="GitHub URL (https://github.com/...)"
                            value={newRepoUrl}
                            onChange={(e) => setNewRepoUrl(e.target.value)}
                            className="bg-white/50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20 h-11 transition-all"
                        />
                    </div>
                    <Button
                        onClick={handleAddRepo}
                        disabled={adding || !newRepoName || !newRepoUrl}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:-translate-y-0.5 h-11 px-6 rounded-xl"
                    >
                        {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add Repository
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">Loading repositories...</div>
                ) : repos.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">No repositories added yet.</div>
                ) : (
                    repos.map((repo) => (
                        <Card key={repo.name} className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between text-gray-900">
                                    <span className="truncate">{repo.name}</span>
                                    <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                                        <Database className="h-4 w-4 text-indigo-600" />
                                    </div>
                                </CardTitle>
                                <CardDescription className="truncate text-gray-500 text-xs">{repo.url}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100 font-mono break-all">
                                    {repo.collection}
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100 font-medium">
                                        Use @{repo.name}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteRepo(repo.name)}
                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
    );
}
