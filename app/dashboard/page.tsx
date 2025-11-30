import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, GitCommit, GitPullRequest, Clock, Star, AlertCircle } from "lucide-react";
import fs from "fs";
import path from "path";
import { fetchRepoStats, fetchCommitHistory } from "@/lib/git";
import { formatDistanceToNow } from "date-fns";

async function getData() {
    try {
        const reposPath = path.join(process.cwd(), "repos.json");
        if (!fs.existsSync(reposPath)) {
            return { repos: [], stats: null };
        }

        const reposData = JSON.parse(fs.readFileSync(reposPath, "utf-8"));

        const statsPromises = reposData.map(async (repo: any) => {
            const stats = await fetchRepoStats(repo.url);
            // Fetch recent commits for activity
            const commits = await fetchCommitHistory(repo.url);
            return { ...repo, stats, recentCommits: commits.slice(0, 5) };
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

    const lastActive = allCommits[0]?.date ? formatDistanceToNow(new Date(allCommits[0].date), { addSuffix: true }) : "N/A";

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    Dashboard
                </h2>
                <p className="text-gray-500">Overview of your repository analysis.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Repos</CardTitle>
                        <GitPullRequest className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{totalRepos}</div>
                        <p className="text-xs text-gray-500">Tracking {totalRepos} repositories</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Stars</CardTitle>
                        <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{totalStars}</div>
                        <p className="text-xs text-gray-500">Across all projects</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Open Issues</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{totalOpenIssues}</div>
                        <p className="text-xs text-gray-500">Needs attention</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Last Activity</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{lastActive}</div>
                        <p className="text-xs text-gray-500">Latest commit</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Recent Activity</CardTitle>
                        <CardDescription className="text-gray-500">Latest commits across repositories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {allCommits.length > 0 ? (
                                allCommits.map((commit: any, i: number) => (
                                    <div key={commit.sha} className="flex items-center p-3 rounded-lg hover:bg-white/50 transition-colors group">
                                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                                            <GitCommit className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <div className="ml-4 space-y-1 flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-none text-gray-900 truncate">{commit.message}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{commit.repoName}</span>
                                                <span>by {commit.author}</span>
                                            </div>
                                        </div>
                                        <div className="ml-auto font-medium text-xs text-gray-400 whitespace-nowrap pl-2">
                                            {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No recent activity found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Repositories List Card */}
                <Card className="col-span-3 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Repositories</CardTitle>
                        <CardDescription className="text-gray-500">Your tracked projects.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {repos.map((repo: any) => (
                                <div key={repo.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white/50 hover:bg-white hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                                            <GitPullRequest className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{repo.name}</p>
                                            <p className="text-xs text-gray-500">{repo.stats?.language || "Unknown"}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-medium text-gray-900">{repo.stats?.stars || 0} stars</div>
                                        <div className="text-[10px] text-gray-500">
                                            {repo.stats?.lastUpdate ? formatDistanceToNow(new Date(repo.stats.lastUpdate)) : "N/A"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
