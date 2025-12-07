import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, GitCommit, Database } from "lucide-react";
import { CodeChunk } from "@/types";

import MermaidDiagram from "./MermaidDiagram";

interface AnswerCardProps {
    answer: string;
    context: CodeChunk[];
    files?: string[];
    repo?: string;
    onRegenerate?: () => void;
}

export default function AnswerCard({ answer, context, repo, files, onRegenerate }: AnswerCardProps) {
    // Split answer by mermaid blocks
    const parts = answer.split(/```mermaid([\s\S]*?)```/g);

    return (
        <div className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-xl border-gray-200/50 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                <CardHeader className="border-b border-gray-100/50 pb-4">
                    <CardTitle className="flex items-center justify-between">
                        <span className="text-xl text-gray-900 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <FileCode className="h-5 w-5 text-indigo-600" />
                            </div>
                            AI Answer
                        </span>
                        {repo && (
                            <Badge variant="outline" className="flex items-center gap-1 bg-white/50 border-indigo-100 text-indigo-700 px-3 py-1">
                                <Database className="h-3 w-3" />
                                {repo}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="prose prose-indigo max-w-none text-gray-700">
                        {parts.map((part, index) => {
                            if (index % 2 === 1) {
                                // Mermaid block
                                return (
                                    <div key={index} className="my-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
                                        <MermaidDiagram chart={part.trim()} onRegenerate={onRegenerate} />
                                    </div>
                                );
                            }
                            // Regular text
                            return <p key={index} className="whitespace-pre-wrap leading-relaxed text-base">{part}</p>;
                        })}

                        {files && files.length > 0 && (
                            <div className="mt-8 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-900">
                                    <FileCode className="h-4 w-4 text-indigo-500" />
                                    Files Found:
                                </h4>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {files.map((file, i) => (
                                        <li key={i} className="text-sm font-mono text-gray-600 bg-white px-3 py-1.5 rounded border border-gray-200/50 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            <span className="truncate">{file}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {context && context.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileCode className="h-5 w-5 text-primary" />
                        Files Used
                    </h3>
                    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Array.from(new Set(context.map(c => c.filePath))).map((filePath, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                                    <FileCode className="h-3 w-3 opacity-70" />
                                    <span className="truncate" title={filePath}>
                                        {filePath}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
