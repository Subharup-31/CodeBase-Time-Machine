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
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Repository Manager</h2>
                <p className="text-muted-foreground">Manage your indexed repositories and memory collections.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Repository</CardTitle>
                    <CardDescription>Connect a GitHub repository to start indexing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            placeholder="Display Name (e.g. MyAuthService)"
                            value={newRepoName}
                            onChange={(e) => setNewRepoName(e.target.value)}
                        />
                        <Input
                            placeholder="GitHub URL (https://github.com/...)"
                            value={newRepoUrl}
                            onChange={(e) => setNewRepoUrl(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAddRepo} disabled={adding || !newRepoName || !newRepoUrl}>
                        {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Add Repository
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">Loading repositories...</div>
                ) : repos.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">No repositories added yet.</div>
                ) : (
                    repos.map((repo) => (
                        <Card key={repo.name}>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between">
                                    <span className="truncate">{repo.name}</span>
                                    <Database className="h-4 w-4 text-muted-foreground" />
                                </CardTitle>
                                <CardDescription className="truncate">{repo.url}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground mb-4">
                                    Collection: {repo.collection}
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-xs bg-secondary px-2 py-1 rounded">
                                        Use @{repo.name}
                                    </div>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteRepo(repo.name)}>
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
