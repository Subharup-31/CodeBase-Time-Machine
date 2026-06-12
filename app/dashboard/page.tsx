import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, GitCommit, GitPullRequest, Clock, Star, AlertCircle } from "lucide-react";
import { fetchRepoStats, fetchCommitHistory } from "@/lib/git";
import { formatDistanceToNow } from "date-fns";
import { getAllRepos } from "@/lib/repoRegistry";
import RepoListClient from "./components/RepoListClient";

// Always fetch fresh data — GitHub stats change and repos can be indexed any time
export const dynamic = "force-dynamic";

async function getData() {
    try {
        const reposData = await getAllRepos();

        if (!reposData || reposData.length === 0) {
            return { repos: [] };
        }

        const statsPromises = reposData.map(async (repo: any) => {
            try {
                const stats = await fetchRepoStats(repo.url);
                // Fetch recent commits for activity
                const commits = await fetchCommitHistory(repo.url, 5);
                return { ...repo, stats, recentCommits: commits };
            } catch {
                return { ...repo, stats: null, recentCommits: [] };
            }
        });

        const reposWithStats = await Promise.all(statsPromises);

        return { repos: reposWithStats };
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return { repos: [], error };
    }
}

export default async function DashboardPage() {
    const { repos } = await getData();

    // Calculate aggregates
    const totalRepos = repos.length;
    const totalStars = repos.reduce((acc: number, r: any) => acc + (r.stats?.stars || 0), 0);
    const totalOpenIssues = repos.reduce((acc: number, r: any) => acc + (r.stats?.openIssues || 0), 0);

    // Find most recent activity
    const allCommits = repos.flatMap((r: any) =>
        r.recentCommits.map((c: any) => ({
            ...c,
            repoName: r.name
        }))
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const lastActive = allCommits[0]?.date ? formatDistanceToNow(new Date(allCommits[0].date), { addSuffix: true }) : "N/A";    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            <div className="max-w-[1400px] mx-auto w-full space-y-6 text-zinc-900 dark:text-zinc-50">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold tracking-tight">
                        Dashboard
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Overview of your repository analysis.</p>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active Repos</CardTitle>
                            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                                <GitPullRequest className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalRepos}</div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Tracking {totalRepos} repositories</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Stars</CardTitle>
                            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                                <Star className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalStars}</div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Across all projects</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Open Issues</CardTitle>
                            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                                <AlertCircle className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalOpenIssues}</div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Needs attention</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Last Activity</CardTitle>
                            <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                                <Clock className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate">{lastActive}</div>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">Latest commit</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                    <Card className="col-span-1 lg:col-span-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Recent Activity</CardTitle>
                            <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">Latest commits across repositories.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {allCommits.length > 0 ? (
                                    allCommits.map((commit: any) => (
                                        <div key={commit.sha} className="flex items-start gap-3 p-3 rounded border border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                                            <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                                <GitCommit className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                            </div>
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{commit.message}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                                                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{commit.repoName}</span>
                                                    <span>by <span className="font-medium text-zinc-700 dark:text-zinc-300">{commit.author}</span></span>
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap bg-zinc-50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded">
                                                {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-xs text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/50 rounded border border-dashed border-zinc-200 dark:border-zinc-800">
                                        No recent activity found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Repositories List Card */}
                    <RepoListClient initialRepos={repos} />
                </div>
            </div>
        </div>
    );
}
