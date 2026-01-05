import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, GitCommit, GitPullRequest, Clock, Star, AlertCircle } from "lucide-react";
import fs from "fs";
import path from "path";
import { fetchRepoStats, fetchCommitHistory } from "@/lib/git";
import { formatDistanceToNow } from "date-fns";
import OnboardButton from "./components/OnboardButton";

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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    Dashboard
                </h2>
                <p className="text-gray-500">Overview of your repository analysis.</p>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-indigo-600 transition-colors">Active Repos</CardTitle>
                        <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                            <GitPullRequest className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{totalRepos}</div>
                        <p className="text-xs text-gray-500 mt-1">Tracking {totalRepos} repositories</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-indigo-600 transition-colors">Total Stars</CardTitle>
                        <div className="p-2 bg-yellow-50 rounded-lg group-hover:bg-yellow-100 transition-colors">
                            <Star className="h-4 w-4 text-yellow-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{totalStars}</div>
                        <p className="text-xs text-gray-500 mt-1">Across all projects</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-indigo-600 transition-colors">Open Issues</CardTitle>
                        <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{totalOpenIssues}</div>
                        <p className="text-xs text-gray-500 mt-1">Needs attention</p>
                    </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-indigo-600 transition-colors">Last Activity</CardTitle>
                        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{lastActive}</div>
                        <p className="text-xs text-gray-500 mt-1">Latest commit</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
                <Card className="col-span-1 lg:col-span-4 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-900">Recent Activity</CardTitle>
                        <CardDescription className="text-gray-500">Latest commits across repositories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {allCommits.length > 0 ? (
                                allCommits.map((commit: any, i: number) => (
                                    <div key={commit.sha} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50/80 transition-all duration-200 group border border-transparent hover:border-gray-100">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-100 group-hover:scale-110 transition-all shrink-0">
                                            <GitCommit className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-none text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{commit.message}</p>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{commit.repoName}</span>
                                                <span>by <span className="font-medium text-gray-700">{commit.author}</span></span>
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md">
                                            {formatDistanceToNow(new Date(commit.date), { addSuffix: true })}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    No recent activity found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Repositories List Card */}
                <Card className="col-span-1 lg:col-span-3 bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-900">Repositories</CardTitle>
                        <CardDescription className="text-gray-500">Your tracked projects.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {repos.map((repo: any) => (
                                <div key={repo.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-white/50 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all duration-200 group gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <GitPullRequest className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{repo.name}</p>
                                            <p className="text-xs text-gray-500">{repo.stats?.language || "Unknown"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-gray-900">{repo.stats?.stars || 0} stars</div>
                                            <div className="text-[10px] text-gray-500">
                                                {repo.stats?.lastUpdate ? formatDistanceToNow(new Date(repo.stats.lastUpdate)) : "N/A"}
                                            </div>
                                        </div>
                                        <OnboardButton repoName={repo.name} />
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
