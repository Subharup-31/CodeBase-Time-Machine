"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams, useRouter } from 'next/navigation';
import { 
  Loader2, ArrowLeft, Play, Pause, SkipForward, SkipBack, 
  Flame, Sliders, Code, MessageSquare, Calendar, User, Clock, 
  Copy, Check, PanelRightClose, PanelRight, Database, Send, Plus,
  Compass, Skull
} from 'lucide-react';
import dagre from 'dagre';
import { Button } from '@/components/ui/button';

// Helper to layout graph with dagre
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 85;

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: 'top',
      sourcePosition: 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};

const getCallTrace = (targetNode: GeneticNode, activeNodesList: GeneticNode[]) => {
  const upstream = new Set<string>();
  const downstream = new Set<string>();

  const findNodeByName = (name: string) => activeNodesList.find(n => n.name === name);

  // BFS downstream (callees)
  let queue: GeneticNode[] = [targetNode];
  const visitedDown = new Set<string>([targetNode.id]);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const callName of curr.calls || []) {
      const callee = findNodeByName(callName);
      if (callee && !visitedDown.has(callee.id)) {
        visitedDown.add(callee.id);
        downstream.add(callee.id);
        queue.push(callee);
      }
    }
  }

  // BFS upstream (callers)
  queue = [targetNode];
  const visitedUp = new Set<string>([targetNode.id]);
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const callers = activeNodesList.filter(n => n.calls?.includes(curr.name));
    for (const caller of callers) {
      if (!visitedUp.has(caller.id)) {
        visitedUp.add(caller.id);
        upstream.add(caller.id);
        queue.push(caller);
      }
    }
  }

  return { upstream, downstream };
};

interface CommitItem {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface GeneticNode {
  id: string;
  name: string;
  type: "function" | "class";
  filePath: string;
  commitSha: string;
  parentIds: string[];
  changeType: "origin" | "mutation" | "speciation" | "deletion";
  body: string;
  calls: string[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function VisualizeContent() {
    const params = useParams();
    const router = useRouter();
    const repoName = params.repoName as string;

    // Additional layout / analysis states
    const [traceTargetId, setTraceTargetId] = useState<string | null>(null);
    const [extinctionActive, setExtinctionActive] = useState(false);
    const [chatId] = useState(() => window.crypto.randomUUID());

    // React Flow states
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const [allNodes, setAllNodes] = useState<any[]>([]);
    const [allEdges, setAllEdges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Time Travel Timeline states
    const [commits, setCommits] = useState<CommitItem[]>([]);
    const [activeCommitIndex, setActiveCommitIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Explorer states
    const [rawGraph, setRawGraph] = useState<Record<string, GeneticNode>>({});
    const [viewMode, setViewMode] = useState<'default' | 'heatmap'>('default');
    const [selectedNode, setSelectedNode] = useState<GeneticNode | null>(null);
    const [selectedNodeVersionId, setSelectedNodeVersionId] = useState<string | null>(null);
    const [rightPanelOpen, setRightPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'code' | 'chat'>('code');

    // Chat states
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isAsking, setIsAsking] = useState(false);
    const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Compute churn/modifications map for heatmap
    const churnMap = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.values(rawGraph).forEach((node) => {
            counts[node.name] = (counts[node.name] || 0) + 1;
        });
        return counts;
    }, [rawGraph]);

    // Fetch graph data on mount
    useEffect(() => {
        if (!repoName) return;

        fetch(`/api/graph?repoName=${encodeURIComponent(repoName)}`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load graph data. The repository may still be indexing.");
                return res.json();
            })
            .then(data => {
                const graph = data.graph as Record<string, GeneticNode>;
                setRawGraph(graph);

                // Build commits list
                let repoCommits: CommitItem[] = data.commits || [];
                if (repoCommits.length === 0) {
                    // Extract unique commit SHAs from graph nodes if missing
                    const shas = Array.from(new Set(Object.values(graph).map(n => n.commitSha)));
                    repoCommits = shas.map(sha => ({
                        sha,
                        message: `Commit ${sha.slice(0, 7)}`,
                        author: 'Unknown',
                        date: ''
                    }));
                }
                setCommits(repoCommits);
                setActiveCommitIndex(repoCommits.length - 1);

                const initialNodes: any[] = [];
                const initialEdges: any[] = [];

                Object.values(graph).forEach((node: GeneticNode) => {
                    initialNodes.push({
                        id: node.id,
                        data: { 
                            nodeData: node,
                            label: (
                                <div className="p-2 w-full max-w-[250px] overflow-hidden text-left">
                                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-50 truncate" title={node.name}>{node.name}</div>
                                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate" title={node.filePath}>{node.filePath}</div>
                                    <div className="mt-1 flex items-center gap-1.5">
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                                            {node.changeType}
                                        </span>
                                        <span className="text-[9px] text-zinc-400 font-mono">
                                            {node.commitSha.slice(0, 7)}
                                        </span>
                                    </div>
                                </div>
                            )
                        },
                        // Default node layout classes
                        className: `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 border rounded-lg p-0 min-w-[150px] shadow-sm transition-all duration-300`
                    });

                    // Edges mapping parentIds
                    node.parentIds.forEach((parentId: string) => {
                        initialEdges.push({
                            id: `e-${parentId}-${node.id}`,
                            source: parentId,
                            target: node.id,
                            animated: node.changeType === 'mutation',
                            style: { stroke: '#a1a1aa', strokeWidth: 1.5 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: '#a1a1aa',
                            },
                        });
                    });
                });

                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
                setAllNodes(layoutedNodes);
                setAllEdges(layoutedEdges);
                setLoading(false);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, [repoName]);

    // Handle Timeline Scrubbing & Styling Modes
    useEffect(() => {
        if (commits.length === 0) return;

        const activeCommitsSlice = commits.slice(0, activeCommitIndex + 1);
        const allowedCommits = new Set(activeCommitsSlice.map(c => c.sha));

        const visibleNodes = allNodes.filter(n => allowedCommits.has(n.data.nodeData.commitSha));
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleEdges = allEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

        // Generate incoming reference counts for extinction tracker
        const incomingRefCount: Record<string, number> = {};
        visibleNodes.forEach(n => {
            incomingRefCount[n.data.nodeData.name] = 0;
        });
        visibleNodes.forEach(n => {
            const calls = n.data.nodeData.calls || [];
            calls.forEach((cName: string) => {
                if (cName in incomingRefCount) {
                    incomingRefCount[cName]++;
                }
            });
        });

        // Resolve active trace if active
        const traceActive = !!traceTargetId;
        const targetNode = traceTargetId ? rawGraph[traceTargetId] : null;
        let traceNodeIds = new Set<string>();
        let upstreamNodeIds = new Set<string>();
        let downstreamNodeIds = new Set<string>();

        if (traceActive && targetNode) {
            const activeGeneticNodes = visibleNodes.map(n => n.data.nodeData as GeneticNode);
            const { upstream, downstream } = getCallTrace(targetNode, activeGeneticNodes);
            upstreamNodeIds = upstream;
            downstreamNodeIds = downstream;
            
            const ids = new Set<string>();
            ids.add(targetNode.id);
            upstream.forEach(id => ids.add(id));
            downstream.forEach(id => ids.add(id));
            traceNodeIds = ids;
        }

        const styledNodes = visibleNodes.map(node => {
            const nodeData = node.data.nodeData as GeneticNode;
            let bgClass = 'bg-white dark:bg-zinc-900';
            let borderClass = 'border-zinc-200 dark:border-zinc-800';
            let style: any = {};

            // 1. Extinction Tracker Styling
            if (extinctionActive && (nodeData.changeType === 'deletion' || incomingRefCount[nodeData.name] === 0)) {
                bgClass = 'bg-red-50/10 dark:bg-red-950/5';
                borderClass = 'border-dashed border-red-400 dark:border-red-800 opacity-60';
            }
            // 2. Risk Heatmap Styling
            else if (viewMode === 'heatmap') {
                const churn = churnMap[nodeData.name] || 1;
                const size = nodeData.body.split('\n').length;
                
                // Color scaling: stable (green) -> warning (yellow/orange) -> hotspot (red)
                if (churn > 4) {
                    bgClass = 'bg-red-50/70 dark:bg-red-950/20';
                    borderClass = 'border-red-400 dark:border-red-800';
                } else if (churn > 2) {
                    bgClass = 'bg-orange-50/70 dark:bg-orange-950/20';
                    borderClass = 'border-orange-400 dark:border-orange-800';
                } else if (churn > 1) {
                    bgClass = 'bg-yellow-50/70 dark:bg-yellow-950/20';
                    borderClass = 'border-yellow-300 dark:border-yellow-850';
                } else {
                    bgClass = 'bg-green-50/60 dark:bg-green-950/10';
                    borderClass = 'border-green-300 dark:border-green-900';
                }

                // Heatmap size scaling (nodes with more lines of code expand slightly)
                const scale = Math.min(1 + size * 0.005, 1.25);
                style = { transform: `scale(${scale})` };
            } 
            // 3. Default ChangeType styling
            else {
                if (nodeData.changeType === 'origin') {
                    bgClass = 'bg-green-50/40 dark:bg-green-950/10';
                    borderClass = 'border-green-300 dark:border-green-900/60';
                } else if (nodeData.changeType === 'mutation') {
                    bgClass = 'bg-blue-50/40 dark:bg-blue-950/10';
                    borderClass = 'border-blue-300 dark:border-blue-900/60';
                } else if (nodeData.changeType === 'speciation') {
                    bgClass = 'bg-purple-50/40 dark:bg-purple-950/10';
                    borderClass = 'border-purple-300 dark:border-purple-900/60';
                } else if (nodeData.changeType === 'deletion') {
                    bgClass = 'bg-red-50/40 dark:bg-red-950/10';
                    borderClass = 'border-red-300 dark:border-red-900/60';
                }
            }

            // Apply Execution Trace Overlays
            if (traceActive && targetNode) {
                if (nodeData.id === targetNode.id) {
                    borderClass = 'border-indigo-650 dark:border-indigo-400 ring-2 ring-indigo-500/50 shadow-md shadow-indigo-500/20';
                    style = { ...style, transform: `${style.transform || ''} scale(1.05)` };
                } else if (traceNodeIds.has(nodeData.id)) {
                    borderClass = 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20';
                } else {
                    style = { ...style, opacity: 0.2, filter: 'grayscale(50%)' };
                }
            }

            return {
                ...node,
                className: `${bgClass} ${borderClass} border rounded-lg p-0 min-w-[150px] shadow-sm transition-all duration-300`,
                style
            };
        });

        // Process edges with trace active
        let finalEdges = visibleEdges;
        if (traceActive && targetNode) {
            const activeGeneticNodes = visibleNodes.map(n => n.data.nodeData as GeneticNode);
            const callEdges: any[] = [];
            
            activeGeneticNodes.forEach(node => {
                if (traceNodeIds.has(node.id)) {
                    (node.calls || []).forEach(callName => {
                        const callee = activeGeneticNodes.find(n => n.name === callName);
                        if (callee && traceNodeIds.has(callee.id)) {
                            callEdges.push({
                                id: `call-${node.id}-${callee.id}`,
                                source: node.id,
                                target: callee.id,
                                animated: true,
                                style: { stroke: '#6366f1', strokeWidth: 2.5 },
                                markerEnd: {
                                    type: MarkerType.ArrowClosed,
                                    color: '#6366f1',
                                },
                            });
                        }
                    });
                }
            });

            const formattedLineageEdges = visibleEdges.map(edge => {
                const isSourceTraced = traceNodeIds.has(edge.source);
                const isTargetTraced = traceNodeIds.has(edge.target);
                if (isSourceTraced && isTargetTraced) {
                    return {
                        ...edge,
                        style: { ...edge.style, stroke: '#818cf8', opacity: 0.5 }
                    };
                }
                return {
                    ...edge,
                    style: { ...edge.style, opacity: 0.1 }
                };
            });

            finalEdges = [...formattedLineageEdges, ...callEdges];
        }

        setNodes(styledNodes);
        setEdges(finalEdges);
    }, [activeCommitIndex, viewMode, allNodes, allEdges, commits, churnMap, traceTargetId, extinctionActive, rawGraph, setNodes, setEdges]);

    // Handle fitting camera to execution trace path
    const { fitView } = useReactFlow();

    useEffect(() => {
        if (traceTargetId && rawGraph[traceTargetId]) {
            const targetNode = rawGraph[traceTargetId];
            const activeCommitsSlice = commits.slice(0, activeCommitIndex + 1);
            const allowedCommits = new Set(activeCommitsSlice.map(c => c.sha));
            const visibleNodes = allNodes.filter(n => allowedCommits.has(n.data.nodeData.commitSha));
            const activeGeneticNodes = visibleNodes.map(n => n.data.nodeData as GeneticNode);
            
            const { upstream, downstream } = getCallTrace(targetNode, activeGeneticNodes);
            const allTracedNodeIds: string[] = [targetNode.id];
            upstream.forEach(id => allTracedNodeIds.push(id));
            downstream.forEach(id => allTracedNodeIds.push(id));
            
            if (allTracedNodeIds.length > 0) {
                setTimeout(() => {
                    fitView({
                        nodes: allTracedNodeIds.map(id => ({ id })),
                        duration: 800,
                        padding: 0.2
                    });
                }, 100);
            }
        }
    }, [traceTargetId, fitView, activeCommitIndex, allNodes, commits, rawGraph]);

    // Handle Timeline Playback
    useEffect(() => {
        if (isPlaying) {
            playbackTimerRef.current = setInterval(() => {
                setActiveCommitIndex((prev) => {
                    if (prev >= commits.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1500);
        } else {
            if (playbackTimerRef.current) {
                clearInterval(playbackTimerRef.current);
            }
        }
        return () => {
            if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
        };
    }, [isPlaying, commits]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Node click handler
    const onNodeClick = useCallback((_: any, node: any) => {
        const nodeData = node.data.nodeData as GeneticNode;
        setSelectedNode(nodeData);
        setSelectedNodeVersionId(nodeData.id);
        setRightPanelOpen(true);
    }, []);

    const onConnect = useCallback(
        (params: any) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Copy selected code node body
    const copyCodeBody = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedNodeId(id);
        setTimeout(() => setCopiedNodeId(null), 2000);
    };

    // Calculate node mutation history list
    const symbolCommits = useMemo(() => {
        if (!selectedNode) return [];
        return Object.values(rawGraph)
            .filter((n) => n.name === selectedNode.name)
            .map((n) => {
                const commitInfo = commits.find(c => c.sha === n.commitSha);
                return {
                    nodeId: n.id,
                    changeType: n.changeType,
                    commitSha: n.commitSha,
                    message: commitInfo?.message || 'Indexed commit',
                    author: commitInfo?.author || 'Unknown',
                    date: commitInfo?.date ? new Date(commitInfo.date).toLocaleDateString() : ''
                };
            })
            .reverse();
    }, [selectedNode, rawGraph, commits]);

    // Check if the currently selected symbol has 0 callers or is deleted in the active timeline
    const isSelectedNodeDeadCode = useMemo(() => {
        if (!selectedNode || commits.length === 0) return false;
        if (selectedNode.changeType === 'deletion') return true;
        
        const activeCommitsSlice = commits.slice(0, activeCommitIndex + 1);
        const allowedCommits = new Set(activeCommitsSlice.map(c => c.sha));
        const visibleNodes = allNodes.filter(n => allowedCommits.has(n.data.nodeData.commitSha));
        const activeGeneticNodes = visibleNodes.map(n => n.data.nodeData as GeneticNode);
        
        const hasCallers = activeGeneticNodes.some(n => 
            n.id !== selectedNode.id && n.calls?.includes(selectedNode.name)
        );
        return !hasCallers;
    }, [selectedNode, activeCommitIndex, commits, allNodes]);

    // Selected version of code node
    const activeVersionNode = useMemo(() => {
        if (!selectedNodeVersionId) return selectedNode;
        return rawGraph[selectedNodeVersionId] || selectedNode;
    }, [selectedNodeVersionId, rawGraph, selectedNode]);

    // Handle Chat Question about Active Node
    const handleAskQuestion = async (overridePrompt?: string) => {
        const q = (overridePrompt ?? chatInput).trim();
        if (!q || isAsking || !activeVersionNode) return;

        setChatInput("");
        setIsAsking(true);

        const userMsg: ChatMessage = {
            id: window.crypto.randomUUID(),
            role: 'user',
            content: q,
            timestamp: Date.now()
        };

        const assistantMsg: ChatMessage = {
            id: window.crypto.randomUUID(),
            role: 'assistant',
            content: "",
            timestamp: Date.now()
        };

        setChatMessages(prev => [...prev, userMsg, assistantMsg]);

        try {
            const contextText = [
                `Symbol: ${activeVersionNode.name}`,
                `Type: ${activeVersionNode.type}`,
                `File path: ${activeVersionNode.filePath}`,
                `Mutation type: ${activeVersionNode.changeType}`,
                `Commit: ${activeVersionNode.commitSha}`,
                `Code Content:`,
                activeVersionNode.body
            ].join("\n");

            const fullPrompt = `Regarding the symbol \`${activeVersionNode.name}\` in \`${activeVersionNode.filePath}\`:\n${q}\n\n[Context Code]:\n\`\`\`\n${contextText}\n\`\`\``;

            const res = await fetch("/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: fullPrompt,
                    activeRepo: repoName,
                    history: chatMessages.map(m => ({ role: m.role, content: m.content })),
                    chatId,
                    activeSymbolId: activeVersionNode?.name
                })
            });

            if (!res.body) throw new Error("No body");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const lines = decoder.decode(value, { stream: true }).split("\n\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            if (event.type === "chunk") {
                                accumulated += event.text;
                                setChatMessages(prev => prev.map(m => 
                                    m.id === assistantMsg.id ? { ...m, content: accumulated } : m
                                ));
                            } else if (event.type === "error") {
                                setChatMessages(prev => prev.map(m => 
                                    m.id === assistantMsg.id ? { ...m, content: `⚠️ ${event.message}` } : m
                                ));
                            }
                        } catch {}
                    }
                }
            }
        } catch {
            setChatMessages(prev => prev.map(m => 
                m.id === assistantMsg.id ? { ...m, content: "⚠️ Connection error. Please try again." } : m
            ));
        } finally {
            setIsAsking(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#f9f9f9] dark:bg-[#191919]">
                <div className="flex flex-col items-center gap-4 text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="h-10 w-10 animate-spin text-zinc-800 dark:text-zinc-200" />
                    <p className="text-sm font-semibold">Loading codebase graph & commits...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[#f9f9f9] dark:bg-[#191919] p-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl max-w-md text-center shadow-xl">
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-6">{error}</p>
                    <Button variant="outline" onClick={() => router.push('/dashboard/repos')} className="w-full">
                        Back to Repository Manager
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#f9f9f9] dark:bg-[#191919] overflow-hidden text-zinc-900 dark:text-zinc-50">
            {/* Left Side: Graph and Time Travel Slider */}
            <div className={`flex-1 flex flex-col relative h-full transition-all duration-300 ${rightPanelOpen ? 'mr-[35%]' : ''}`}>
                <div className="flex-1 w-full relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        fitView
                        minZoom={0.05}
                    >
                        <Background color="currentColor" className="text-zinc-200 dark:text-zinc-800" gap={16} />
                        <Controls />
                        <MiniMap 
                            nodeColor={(n: any) => {
                                if (viewMode === 'heatmap') {
                                    if (n.className?.includes('bg-red-50')) return '#f87171';
                                    if (n.className?.includes('bg-orange-50')) return '#fb923c';
                                    if (n.className?.includes('bg-yellow-50')) return '#facc15';
                                    return '#4ade80';
                                }
                                if (n.className?.includes('bg-green-50')) return '#86efac';
                                if (n.className?.includes('bg-blue-50')) return '#93c5fd';
                                if (n.className?.includes('bg-purple-50')) return '#d8b4fe';
                                if (n.className?.includes('bg-red-50')) return '#fca5a5';
                                return '#e5e7eb';
                            }}
                        />
                        {/* Upper Toolbar Header */}
                        <Panel position="top-left" className="bg-white/95 dark:bg-zinc-900/95 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center gap-4 text-zinc-900 dark:text-zinc-50 backdrop-blur-sm z-30">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/repos')} className="gap-2 shrink-0">
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                            <div className="border-l border-zinc-200 dark:border-zinc-800 pl-3">
                                <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 leading-none mb-1 flex items-center gap-1.5">
                                    <Database className="h-3.5 w-3.5 text-zinc-500" />
                                    {repoName}
                                </h1>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                                    Obsidian Knowledge Graph
                                </p>
                            </div>
                        </Panel>

                        {/* Top Right Toggle Panel */}
                        <Panel position="top-right" className="bg-white/95 dark:bg-zinc-900/95 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center gap-1.5 backdrop-blur-sm z-30">
                            <button
                                onClick={() => setViewMode('default')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    viewMode === 'default' 
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900' 
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <Sliders className="h-3.5 w-3.5" />
                                Standard
                            </button>
                            <button
                                onClick={() => setViewMode('heatmap')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    viewMode === 'heatmap' 
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900' 
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <Flame className="h-3.5 w-3.5 text-orange-500" />
                                Risk Heatmap
                            </button>
                            <button
                                onClick={() => setExtinctionActive(!extinctionActive)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    extinctionActive 
                                        ? 'bg-red-500 text-white dark:bg-red-900 dark:text-red-100' 
                                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <Skull className="h-3.5 w-3.5 text-red-550" />
                                Extinction Tracker
                            </button>
                            {!rightPanelOpen && (
                                <button
                                    onClick={() => {
                                        if (nodes.length > 0 && !selectedNode) {
                                            setSelectedNode(nodes[0].data.nodeData);
                                            setSelectedNodeVersionId(nodes[0].data.nodeData.id);
                                        }
                                        setRightPanelOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
                                    title="Open Details Panel"
                                >
                                    <PanelRight className="h-4 w-4" />
                                </button>
                            )}
                        </Panel>
                    </ReactFlow>
                </div>

                {/* Bottom Timeline Playback Slider */}
                {commits.length > 0 && (
                    <div className="flex-none bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 flex flex-col md:flex-row items-center gap-4 z-20 shadow-md">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setIsPlaying(false);
                                    setActiveCommitIndex((prev) => Math.max(prev - 1, 0));
                                }}
                                disabled={activeCommitIndex === 0}
                                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                            >
                                <SkipBack className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 hover:opacity-90 transition-opacity"
                            >
                                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <button
                                onClick={() => {
                                    setIsPlaying(false);
                                    setActiveCommitIndex((prev) => Math.min(prev + 1, commits.length - 1));
                                }}
                                disabled={activeCommitIndex === commits.length - 1}
                                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                            >
                                <SkipForward className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="flex-1 w-full flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-zinc-500">Timeline Slider</span>
                                <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold">
                                    Commit {activeCommitIndex + 1} of {commits.length}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={commits.length - 1}
                                value={activeCommitIndex}
                                onChange={(e) => {
                                    setIsPlaying(false);
                                    setActiveCommitIndex(parseInt(e.target.value));
                                }}
                                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                            />
                        </div>

                        <div className="w-full md:w-80 border-l border-zinc-200 dark:border-zinc-800 pl-4 flex flex-col justify-center gap-0.5">
                            <p className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-50 truncate" title={commits[activeCommitIndex]?.sha}>
                                SHA: {commits[activeCommitIndex]?.sha.slice(0, 12)}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate font-semibold" title={commits[activeCommitIndex]?.message}>
                                {commits[activeCommitIndex]?.message}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Side sliding Drawer: Code details and chat */}
            <div className={`fixed top-0 right-0 bottom-0 z-40 w-[35%] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl transition-transform duration-300 ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header controls */}
                <div className="flex-none p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setActiveTab('code')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                activeTab === 'code'
                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                            }`}
                        >
                            <Code className="h-3.5 w-3.5" />
                            Code Details
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                activeTab === 'chat'
                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                            }`}
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Ask AI
                        </button>
                    </div>
                    <button
                        onClick={() => setRightPanelOpen(false)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Hide details panel"
                    >
                        <PanelRightClose className="h-4 w-4" />
                    </button>
                </div>

                {/* Selected Node details panel body */}
                {selectedNode ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        {activeTab === 'code' ? (
                            // Code details tab
                            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                                <div>
                                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 truncate" title={selectedNode.name}>
                                        {selectedNode.name}
                                    </h2>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate" title={selectedNode.filePath}>
                                        {selectedNode.filePath}
                                    </p>
                                    
                                    <div className="mt-3 flex flex-col gap-2">
                                        <Button 
                                            variant={traceTargetId === selectedNode.id ? "default" : "outline"} 
                                            size="sm" 
                                            onClick={() => {
                                                if (traceTargetId === selectedNode.id) {
                                                    setTraceTargetId(null);
                                                } else {
                                                    setTraceTargetId(selectedNode.id);
                                                }
                                            }}
                                            className="w-full text-xs font-semibold gap-1.5"
                                        >
                                            <Compass className="h-3.5 w-3.5" />
                                            {traceTargetId === selectedNode.id ? "Clear Execution Trace" : "Trace Execution"}
                                        </Button>
                                        
                                        {isSelectedNodeDeadCode && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => {
                                                    setActiveTab('chat');
                                                    handleAskQuestion(`This symbol "${selectedNode.name}" seems to be dead or unused code in the current timeline. Can you help me refactor the codebase to safely remove it, or explain if it is an entry point?`);
                                                }}
                                                className="w-full text-xs font-semibold gap-1.5 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                                            >
                                                <Skull className="h-3.5 w-3.5" />
                                                Ask AI to remove this dead code
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Code box display */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-zinc-500">Source Code</span>
                                        <button
                                            onClick={() => activeVersionNode && copyCodeBody(activeVersionNode.body, activeVersionNode.id)}
                                            className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
                                        >
                                            {activeVersionNode && copiedNodeId === activeVersionNode.id ? (
                                                <><Check className="h-3.5 w-3.5 text-green-500" /> Copied</>
                                            ) : (
                                                <><Copy className="h-3.5 w-3.5" /> Copy Code</>
                                            )}
                                        </button>
                                    </div>
                                    <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-xl font-mono text-[11px] overflow-auto max-h-96 border border-zinc-800 whitespace-pre-wrap break-words">
                                        <code className="whitespace-pre-wrap break-words">
                                            {activeVersionNode?.body || '// No code body available for this action type'}
                                        </code>
                                    </pre>
                                </div>

                                {/* Mutation Timeline */}
                                <div className="space-y-3">
                                    <span className="text-xs font-bold text-zinc-500 block">Mutation History</span>
                                    <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-2.5 pl-4 space-y-4">
                                        {symbolCommits.map((v) => (
                                            <div key={v.nodeId} className="relative">
                                                {/* Visual timeline node dot */}
                                                <div 
                                                    onClick={() => setSelectedNodeVersionId(v.nodeId)}
                                                    className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 cursor-pointer transition-all ${
                                                        selectedNodeVersionId === v.nodeId
                                                            ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 scale-125'
                                                            : 'bg-white dark:bg-zinc-900 border-zinc-350 dark:border-zinc-750'
                                                    }`}
                                                />
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">
                                                        {v.message}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-semibold">
                                                        <span className="font-mono text-zinc-400">{v.commitSha.slice(0, 7)}</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-0.5"><User className="h-3 w-3" /> {v.author}</span>
                                                        <span>•</span>
                                                        <span>{v.date}</span>
                                                        <span>•</span>
                                                        <span className="uppercase text-[9px] px-1 rounded bg-zinc-100 dark:bg-zinc-800">{v.changeType}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // AI chat tab
                            <div className="flex-1 flex flex-col min-h-0 bg-[#fbfbfb] dark:bg-[#151515]">
                                {/* Chat Messages Log */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {chatMessages.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                                                <MessageSquare className="h-5 w-5 text-zinc-500" />
                                            </div>
                                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                                                Ask about {activeVersionNode?.name}
                                            </p>
                                            <p className="text-xs text-zinc-500 max-w-[220px] mt-1">
                                                Get explanations, security checks, or refactoring code for this specific function.
                                            </p>

                                            {/* Quick Actions */}
                                            <div className="grid grid-cols-1 gap-1.5 mt-5 w-full max-w-[250px]">
                                                <button
                                                    onClick={() => handleAskQuestion("Explain what this function does and its primary logic.")}
                                                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-350 cursor-pointer"
                                                >
                                                    Explain logic
                                                </button>
                                                <button
                                                    onClick={() => handleAskQuestion("Are there any security issues, vulnerabilities, or potential edge-case bugs in this code?")}
                                                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-350 cursor-pointer"
                                                >
                                                    Check security
                                                </button>
                                                <button
                                                    onClick={() => handleAskQuestion("Refactor this function to improve readability and complexity, and provide clean unit test cases.")}
                                                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 text-zinc-700 dark:text-zinc-350 cursor-pointer"
                                                >
                                                    Refactor & write tests
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {chatMessages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-3 text-xs leading-relaxed max-w-[85%] ${
                                                msg.role === 'user'
                                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tr-sm border border-zinc-200/40 dark:border-transparent'
                                                    : 'text-zinc-800 dark:text-zinc-200'
                                            }`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                {msg.role === 'assistant' && !msg.content && (
                                                    <span className="inline-block w-1.5 h-3.5 bg-zinc-900 dark:bg-zinc-100 rounded-sm animate-pulse align-middle" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input Bar */}
                                <div className="flex-none p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                    <div className="flex items-center gap-2 bg-[#f9f9f9] dark:bg-[#1e1e1e] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 focus-within:border-zinc-300 dark:focus-within:border-zinc-700">
                                        <input
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAskQuestion();
                                                }
                                            }}
                                            placeholder={`Ask about ${activeVersionNode?.name || ''}...`}
                                            disabled={isAsking}
                                            className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs placeholder-zinc-500 text-zinc-900 dark:text-zinc-100"
                                        />
                                        <button
                                            onClick={() => handleAskQuestion()}
                                            disabled={!chatInput.trim() || isAsking}
                                            className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 disabled:opacity-40 transition-all cursor-pointer"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // Default state if no node is selected
                    <div className="flex-grow flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                        <Sliders className="h-8 w-8 mb-2" />
                        <p className="text-xs font-semibold">Click on any node in the graph to view source code, version history, or ask AI queries.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VisualizePage() {
    return (
        <ReactFlowProvider>
            <VisualizeContent />
        </ReactFlowProvider>
    );
}
