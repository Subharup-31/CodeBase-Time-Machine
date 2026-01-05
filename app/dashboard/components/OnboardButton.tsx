"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, X, Download } from "lucide-react";
import MermaidDiagram from "@/app/components/MermaidDiagram";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OnboardButtonProps {
    repoName: string;
    className?: string;
    disabled?: boolean;
}

export default function OnboardButton({ repoName, className, disabled }: OnboardButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);

    useEffect(() => {
        setReport(null);
    }, [repoName]);

    const handleGenerate = async () => {
        if (!repoName) return;
        setIsOpen(true);
        if (report) return; // Already generated

        setIsLoading(true);
        try {
            const res = await fetch("/api/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoName }),
            });
            const data = await res.json();
            if (data.report) {
                setReport(data.report);
            } else {
                setReport("Failed to generate report. Please try again.");
            }
        } catch (e) {
            console.error(e);
            setReport("Error generating report. Please check the console.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        const element = document.getElementById("report-content");
        if (!element) return;

        try {
            // @ts-ignore
            const html2pdf = (await import("html2pdf.js")).default;
            const opt: any = {
                margin: 10,
                filename: `${repoName}-onboarding.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save();
        } catch (e) {
            console.error("PDF generation failed", e);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={disabled}
                className={`gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 ${className || ""}`}
            >
                <BookOpen className="h-4 w-4" />
                Onboard
            </Button>

            {isOpen && (
                <ModalPortal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b bg-white z-10">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-indigo-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Developer Onboarding: {repoName}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {report && (
                                        <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                                            <Download className="h-4 w-4" />
                                            PDF
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden bg-gray-50/50 relative">
                                {isLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500 bg-white/80 backdrop-blur-sm z-20">
                                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                                        <div className="text-center space-y-1">
                                            <p className="font-medium text-gray-900">Analyzing Codebase...</p>
                                            <p className="text-sm">Reading file structure, key modules, and architecture.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-full p-6">
                                        <div className="pb-20" id="report-content">
                                            <ReportContent content={report || ""} />
                                        </div>
                                    </ScrollArea>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </>
    );
}

import { createPortal } from "react-dom";

function ModalPortal({ children }: { children: React.ReactNode }) {
    if (typeof window === "undefined") return null;
    return createPortal(children, document.body);
}

function ReportContent({ content }: { content: string }) {
    const parts = content.split(/(```mermaid[\s\S]*?```)/g);

    return (
        <div className="space-y-6">
            {/* Force Mermaid SVGs to be larger for PDF/View */}
            <style>{`
                .mermaid svg {
                    width: 100% !important;
                    height: auto !important;
                    max-width: none !important;
                }
            `}</style>

            {parts.map((part, i) => {
                if (part.startsWith("```mermaid")) {
                    const code = part.replace(/```mermaid\n?/, "").replace(/```$/, "").trim();
                    return (
                        <div key={i} className="my-6 p-4 bg-white rounded-lg border shadow-sm w-full overflow-x-auto">
                            <MermaidDiagram chart={code} />
                        </div>
                    );
                }

                if (!part.trim()) return null;

                return (
                    <div key={i} className="prose prose-indigo max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{
                            __html: formatMarkdown(part)
                        }}
                    />
                );
            })}
        </div>
    );
}

function formatMarkdown(text: string) {
    // Basic Markdown to HTML conversion
    let html = text
        // Headers
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-6 mb-3 text-gray-900 flex items-center gap-2"><span class="w-1 h-6 bg-indigo-400 rounded-full inline-block"></span>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4 text-indigo-900 border-b border-indigo-100 pb-2">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-6 text-gray-900">$1</h1>')

        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')

        // Code inline
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-pink-600 font-mono text-sm border border-gray-200">$1</code>')

        // Lists
        .replace(/^\- (.*$)/gm, '<li class="ml-4 list-disc text-gray-700 mb-1">$1</li>')

        // Line breaks (only double newlines to paragraphs ideally, but for now simple br)
        .replace(/\n/g, '<br />');

    return html;
}
