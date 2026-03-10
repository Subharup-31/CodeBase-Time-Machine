"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import dagre from 'dagre';
import { Button } from '@/components/ui/button';

// Helper to layout graph with dagre
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 250;
  const nodeHeight = 80;

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

export default function VisualizePage() {
    const params = useParams();
    const router = useRouter();
    const repoName = params.repoName as string;

    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!repoName) return;

        fetch(`/api/graph?repoName=${encodeURIComponent(repoName)}`)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load graph data. The repository may still be indexing.");
                return res.json();
            })
            .then(data => {
                const graph = data.graph;
                const initialNodes: any[] = [];
                const initialEdges: any[] = [];

                Object.values(graph).forEach((node: any) => {
                    // Node color based on changeType
                    let bgColor = '#ffffff';
                    let borderColor = '#e5e7eb';
                    
                    if (node.changeType === 'origin') {
                        bgColor = '#f0fdf4'; // green
                        borderColor = '#86efac';
                    } else if (node.changeType === 'mutation') {
                        bgColor = '#eff6ff'; // blue
                        borderColor = '#93c5fd';
                    } else if (node.changeType === 'speciation') {
                        bgColor = '#faf5ff'; // purple
                        borderColor = '#d8b4fe';
                    } else if (node.changeType === 'deletion') {
                        bgColor = '#fef2f2'; // red
                        borderColor = '#fca5a5';
                    }

                    initialNodes.push({
                        id: node.id,
                        data: { 
                            label: (
                                <div className="p-2 w-full max-w-[250px] overflow-hidden text-left">
                                    <div className="font-bold text-sm text-gray-900 truncate" title={node.name}>{node.name}</div>
                                    <div className="text-[10px] text-gray-500 truncate" title={node.filePath}>{node.filePath}</div>
                                    <div className="text-[10px] mt-1 px-1.5 py-0.5 rounded-sm inline-block font-medium" style={{ backgroundColor: borderColor, color: '#374151' }}>
                                        {node.changeType}
                                    </div>
                                </div>
                            )
                        },
                        style: {
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '8px',
                            padding: 0,
                            minWidth: 150
                        }
                    });

                    // Edges mapping parentIds
                    node.parentIds.forEach((parentId: string) => {
                        initialEdges.push({
                            id: `e-${parentId}-${node.id}`,
                            source: parentId,
                            target: node.id,
                            animated: node.changeType === 'mutation',
                            style: { stroke: '#9ca3af', strokeWidth: 1.5 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: '#9ca3af',
                            },
                        });
                    });
                });

                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
                setLoading(false);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, [repoName]);

    const onConnect = useCallback(
        (params: any) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    if (loading) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center bg-gray-50/50">
                <div className="flex flex-col items-center gap-4 text-gray-500">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <p>Loading phylogenetic graph...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center bg-gray-50/50">
                <div className="bg-red-50 text-red-600 p-6 rounded-xl max-w-md text-center border border-red-100">
                    <p className="font-semibold mb-4">{error}</p>
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] w-full bg-white relative animate-in fade-in duration-500">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                minZoom={0.1}
            >
                <Background color="#ccc" gap={16} />
                <Controls />
                <MiniMap 
                    nodeColor={(n: any) => {
                        return n.style?.background as string || '#fff';
                    }}
                />
                <Panel position="top-left" className="bg-white/80 p-2 rounded-lg backdrop-blur-sm border shadow-sm flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="font-bold text-gray-900 leading-none">Code Phylogenetics</h1>
                        <p className="text-xs text-gray-500">{repoName}</p>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
