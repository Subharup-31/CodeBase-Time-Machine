import { CodeChunk } from "@/types";

export interface FlowAnalysis {
    functions: string[];
    events: string[];
    calls: string[];
    components: string[];
    apiCalls: string[];
    dataFlows: string[];
}

export function analyzeCodeFlow(chunks: CodeChunk[]): FlowAnalysis {
    const analysis: FlowAnalysis = {
        functions: [],
        events: [],
        calls: [],
        components: [],
        apiCalls: [],
        dataFlows: [],
    };

    const codeContent = chunks.map((c) => c.text).join("\n");

    // 1. Extract Functions
    const functionMatches = codeContent.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]+)\s*=>)/g);
    if (functionMatches) {
        analysis.functions = functionMatches.map(m => m.replace(/function\s+|const\s+|=\s*.*|=>.*/g, "").trim());
    }

    // 2. Extract Event Handlers (onClick, onSubmit, etc.)
    const eventMatches = codeContent.match(/on[A-Z]\w+(?=\={)/g);
    if (eventMatches) {
        analysis.events = [...new Set(eventMatches)]; // Unique events
    }

    // 3. Extract API Calls (fetch, axios, etc.)
    const apiMatches = codeContent.match(/(?:fetch|axios\.[a-z]+)\s*\(([^)]+)\)/g);
    if (apiMatches) {
        analysis.apiCalls = apiMatches.map(m => m.trim());
    }

    // 4. Extract Components (React components often start with capital letters in export)
    const componentMatches = codeContent.match(/export\s+default\s+function\s+([A-Z]\w+)/g);
    if (componentMatches) {
        analysis.components = componentMatches.map(m => m.replace("export default function ", "").trim());
    }

    // 5. Extract Data Flows (useEffect dependencies, state updates)
    const effectMatches = codeContent.match(/useEffect\s*\(\s*\(\)\s*=>\s*{[^}]*},\s*\[(.*?)\]\)/g);
    if (effectMatches) {
        analysis.dataFlows = effectMatches.map(m => `Effect dependent on: ${m.match(/\[(.*?)\]/)?.[1] || "none"}`);
    }

    return analysis;
}
