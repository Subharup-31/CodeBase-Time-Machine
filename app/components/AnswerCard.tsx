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
            <Card className="bg-gradient-to-br from-background to-secondary/10 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>AI Answer</span>
                        {repo && (
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Database className="h-3 w-3" />
                                {repo}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                        {parts.map((part, index) => {
                            if (index % 2 === 1) {
                                // Mermaid block
                                return <MermaidDiagram key={index} chart={part.trim()} onRegenerate={onRegenerate} />;
                            }
                            // Regular text
                            return <p key={index} className="whitespace-pre-wrap leading-relaxed">{part}</p>;
                        })}

                        {files && files.length > 0 && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-md">
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <FileCode className="h-4 w-4" />
                                    Files Found:
                                </h4>
                                <ul className="list-disc list-inside text-sm space-y-1 font-mono text-muted-foreground">
                                    {files.map((file, i) => (
                                        <li key={i}>{file}</li>
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
