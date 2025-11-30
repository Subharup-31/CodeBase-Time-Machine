"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MermaidDiagramProps {
    chart: string;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const ref = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (ref.current) {
            mermaid.initialize({
                startOnLoad: true,
                theme: "default",
                securityLevel: "loose",
            });
            mermaid.run({
                nodes: [ref.current],
            });
        }
    }, [chart]);

    // Re-render mermaid in modal when opening fullscreen
    useEffect(() => {
        if (isFullscreen && modalRef.current) {
            mermaid.run({
                nodes: [modalRef.current],
            });
        }
    }, [isFullscreen, chart]);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 5));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
    const handleReset = () => {
        setZoom(1);
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
                    onClick={() => setIsFullscreen(true)}
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
