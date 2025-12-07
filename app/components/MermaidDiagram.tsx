"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Maximize2, X, ZoomIn, ZoomOut, RotateCcw, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MermaidDiagramProps {
    chart: string;
    onRegenerate?: () => void;
}

export default function MermaidDiagram({ chart, onRegenerate }: MermaidDiagramProps) {
    const ref = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [error, setError] = useState(false);

    useEffect(() => {
        const renderChart = async () => {
            if (ref.current) {
                try {
                    setError(false);
                    mermaid.initialize({
                        startOnLoad: true,
                        theme: "default",
                        securityLevel: "loose",
                        suppressErrorRendering: true, // We handle errors manually
                    });

                    // Validate syntax first
                    try {
                        await mermaid.parse(chart);
                    } catch (e) {
                        console.error("Mermaid syntax error:", e);
                        setError(true);
                        return;
                    }

                    await mermaid.run({
                        nodes: [ref.current],
                    });
                } catch (e) {
                    console.error("Mermaid rendering error:", e);
                    setError(true);
                }
            }
        };

        renderChart();
    }, [chart]);

    // Re-render mermaid in modal when opening fullscreen
    useEffect(() => {
        if (isFullscreen && modalRef.current && !error) {
            mermaid.run({
                nodes: [modalRef.current],
            });
        }
    }, [isFullscreen, chart, error]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
    const handleReset = () => {
        setZoom(2); // Default to 200% for fullscreen
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (error) {
        return (
            <div className="my-4 p-6 bg-red-50 border border-red-100 rounded-lg flex flex-col items-center justify-center gap-3 text-center">
                <div className="bg-red-100 p-3 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                    <h3 className="font-medium text-red-900">Diagram Generation Failed</h3>
                    <p className="text-sm text-red-600 mt-1">The AI generated an invalid diagram syntax.</p>
                </div>
                {onRegenerate && (
                    <Button
                        onClick={onRegenerate}
                        variant="outline"
                        className="mt-2 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Diagram
                    </Button>
                )}
            </div>
        );
    }

    return (
        <>
            {/* Default View */}
            <div className="relative group">
                <div className="mermaid my-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg overflow-x-auto flex justify-center" ref={ref}>
                    {chart}
                </div>
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                        setIsFullscreen(true);
                        setZoom(2);
                    }}
                >
                    <Maximize2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Fullscreen Modal */}
            {isFullscreen && (
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b bg-card">
                        <h2 className="font-semibold text-lg">Architecture Flow</h2>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                                <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                                <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleReset} title="Reset View">
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Diagram Area */}
                    <div
                        className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900 cursor-move flex items-center justify-center p-10"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <div
                            ref={modalRef}
                            className="mermaid origin-center transition-transform duration-75 ease-out"
                            style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`
                            }}
                        >
                            {chart}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
