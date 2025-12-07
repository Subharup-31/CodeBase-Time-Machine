import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MobileNav from "./components/MobileNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-white overflow-hidden relative font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </main>
                <MobileNav />
            </div>
        </div>
    );
}
