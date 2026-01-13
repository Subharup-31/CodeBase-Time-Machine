export interface CodeChunk {
    id: string;
    text: string;
    embedding?: number[];
    filePath: string;
    commit?: string;
    score?: number;
}

export interface RepoProcessResponse {
    success: boolean;
    message?: string;
    chunksProcessed?: number;
}

export interface AskResponse {
    answer: string;
    context?: CodeChunk[];
}

export interface GitFileNode {
    path: string;
    type: "file" | "dir";
    content?: string;
}

export interface CommitInfo {
    sha: string;
    message: string;
    date: string;
    author: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
}

