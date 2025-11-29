import { FlowAnalysis } from "./flowEngine";

export function generateFlowPrompt(query: string, analysis: FlowAnalysis): string {
    return `
You are an expert software architect explaining code logic to a beginner.
User Query: "${query}"

Code Analysis:
- Functions: ${analysis.functions.join(", ")}
- Events: ${analysis.events.join(", ")}
- API Calls: ${analysis.apiCalls.join(", ")}
- Components: ${analysis.components.join(", ")}

Instructions:
1. Explain the flow in simple, non-technical terms first.
2. Provide a numbered step-by-step breakdown of exactly what happens.
3. Generate a Mermaid.js diagram code block (graph TD) that visualizes this flow.
4. Do NOT mention specific file paths or commit hashes. Focus on the LOGIC.
5. If the flow involves UI -> Logic -> Backend, make sure to show that.

Output Format:
[Simple Explanation]

**Step-by-Step Flow:**
1. ...
2. ...

**Mermaid Diagram:**
\`\`\`mermaid
graph TD
...
\`\`\`
`;
}
