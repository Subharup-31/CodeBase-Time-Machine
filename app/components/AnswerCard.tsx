import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CodeChunk } from "@/types";

interface AnswerCardProps {
    answer: string;
    context?: CodeChunk[];
}

export default function AnswerCard({ answer, context }: AnswerCardProps) {
    return (
        <Card className="w-full mt-6 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
                <CardTitle className="text-lg text-primary">AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                    {answer}
                </div>

                {context && context.length > 0 && (
                    <>
                        <Separator className="my-4" />
                        <div>
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">References</h4>
                            <div className="space-y-2">
                                {context.map((chunk) => (
                                    <div key={chunk.id} className="text-xs bg-background p-2 rounded border">
                                        <div className="font-mono font-bold text-primary">{chunk.filePath}</div>
                                        {chunk.commit && <div className="text-muted-foreground">Commit: {chunk.commit}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
