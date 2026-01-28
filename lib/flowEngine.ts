import { CodeChunk } from "@/types";

export interface FlowAnalysis {
    functions: string[];
    events: string[];
    routes: string[];
    apiCalls: string[];
    stateChanges: string[];
    domInteractions: string[];
    firebaseCalls: string[];
    empty?: boolean;
}

export function analyzeCodeFlow(chunks: CodeChunk[]): FlowAnalysis {
    const analysis: FlowAnalysis = {
        functions: [],
        events: [],
        routes: [],
        apiCalls: [],
        stateChanges: [],
        domInteractions: [],
        firebaseCalls: [],
    };

    // Merge all text from relevant files
    const codeContent = chunks
        .filter(c => {
            const ext = c.filePath.split('.').pop()?.toLowerCase();
            return !['css', 'scss', 'less', 'json', 'md', 'svg', 'xml', 'txt'].includes(ext || '');
        })
        .map((c) => c.text)
        .join("\n\n");

    // 1. Extract Function Declarations
    // Matches: function foo(), const foo = () => {}, async function foo()
    const functionMatches = codeContent.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g);
    if (functionMatches) {
        analysis.functions = Array.from(new Set(functionMatches.map(m => {
            const nameMatch = m.match(/(?:function\s+|const\s+)(\w+)/);
            return nameMatch ? nameMatch[1] : "";
        }).filter(Boolean)));
    }

    // 2. Extract Event Listeners & Handlers
    // Matches: onClick={...}, addEventListener('click', ...), onSubmit={...}
    const eventMatches = codeContent.match(/(?:on[A-Z]\w+(?=\=\{))|(?:\.addEventListener\(['"](\w+)['"])/g);
    if (eventMatches) {
        analysis.events = Array.from(new Set(eventMatches.map(m => {
            if (m.startsWith("on")) return m;
            const match = m.match(/addEventListener\(['"](\w+)['"]/);
            return match ? `on${match[1]}` : m;
        })));
    }

    // 3. Extract Routes (Next.js / Express patterns)
    // Matches: /app/api/..., router.get(...), app.post(...)
    const routeMatches = codeContent.match(/(?:app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]|export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g);
    if (routeMatches) {
        analysis.routes = Array.from(new Set(routeMatches));
    }

    // 4. Extract API Calls (fetch, axios)
    const apiMatches = codeContent.match(/(?:await\s+)?(?:fetch|axios\.[a-z]+)\s*\(/g);
    if (apiMatches) {
        analysis.apiCalls = Array.from(new Set(apiMatches.map(m => m.replace("(", "").trim())));
    }

    // 5. Extract Firebase Calls
    // Matches: auth.signIn..., db.collection..., firestore.get...
    const firebaseMatches = codeContent.match(/(?:auth|db|firestore|firebase)\.[a-zA-Z0-9_.]+(?=\()/g);
    if (firebaseMatches) {
        analysis.firebaseCalls = Array.from(new Set(firebaseMatches));
    }

    // 6. Extract State Changes
    // Matches: useState, useReducer, setState, dispatch
    const stateMatches = codeContent.match(/(?:set[A-Z]\w+|dispatch)\s*\(/g);
    if (stateMatches) {
        analysis.stateChanges = Array.from(new Set(stateMatches.map(m => m.replace("(", "").trim())));
    }

    // 7. Extract DOM Interactions
    // Matches: getElementById, querySelector, classList.add
    const domMatches = codeContent.match(/(?:document\.|element\.)(?:getElementById|querySelector|querySelectorAll|classList\.(?:add|remove|toggle))\s*\(/g);
    if (domMatches) {
        analysis.domInteractions = Array.from(new Set(domMatches.map(m => m.replace("(", "").trim())));
    }

    // Check if empty logic
    const hasLogic =
        analysis.functions.length > 0 ||
        analysis.events.length > 0 ||
        analysis.routes.length > 0 ||
        analysis.apiCalls.length > 0 ||
        analysis.firebaseCalls.length > 0 ||
        analysis.stateChanges.length > 0 ||
        analysis.domInteractions.length > 0 ||
        // Fallback: check for significant keywords
        codeContent.includes("import ") ||
        codeContent.includes("export ") ||
        codeContent.includes("class ");

    if (!hasLogic) {
        return { ...analysis, empty: true };
    }

    return analysis;
}
