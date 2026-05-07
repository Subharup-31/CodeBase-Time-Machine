import { ToolDefinition } from "@/types";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_CHAT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";

const CHAT_MODELS_FALLBACK = [
    "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "google/gemma-4-31b-it:free"
];

export interface OpenRouterMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: any[];
}

export interface OpenRouterResponse {
    choices: Array<{
        message: OpenRouterMessage;
        finish_reason: string;
    }>;
    error?: {
        message: string;
        code: number;
    };
}

/**
 * Calls OpenRouter Chat Completion API with automated fallback support for free models
 */
export async function callOpenRouter(
    messages: OpenRouterMessage[],
    options?: {
        model?: string;
        tools?: ToolDefinition[];
        onToken?: (token: string) => void;
    }
): Promise<OpenRouterMessage> {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is missing in environment variables.");
    }

    const requestedModel = options?.model;
    const modelsToTry = requestedModel
        ? [requestedModel, ...CHAT_MODELS_FALLBACK.filter(m => m !== requestedModel)]
        : CHAT_MODELS_FALLBACK;

    let lastError: any = null;

    for (const model of modelsToTry) {
        const body: any = {
            model,
            messages,
        };

        if (options?.tools && options.tools.length > 0) {
            body.tools = options.tools.map((t) => ({
                type: "function",
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                },
            }));
            // Force tool calling to be active (vs. auto-deciding to return text)
            body.tool_choice = "auto";
        }

        const shouldStream = !!options?.onToken;
        if (shouldStream) {
            body.stream = true;
        }

        try {
            console.log(`[OpenRouter] Sending request using model: ${model} (stream: ${shouldStream})`);
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://codebase-time-machine.com",
                    "X-Title": "Codebase Time Machine",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
            }

            if (shouldStream) {
                if (!response.body) {
                    throw new Error("Response body is not readable for streaming");
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = "";
                let assistantContent = "";
                const toolCalls: any[] = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    let boundary = buffer.indexOf("\n");
                    while (boundary !== -1) {
                        const line = buffer.slice(0, boundary).trim();
                        buffer = buffer.slice(boundary + 1);
                        boundary = buffer.indexOf("\n");

                        if (line.startsWith("data: ")) {
                            const dataStr = line.slice(6).trim();
                            if (dataStr === "[DONE]") {
                                break;
                            }
                            try {
                                const json = JSON.parse(dataStr);
                                const delta = json.choices?.[0]?.delta;
                                const content = delta?.content || "";
                                if (content) {
                                    assistantContent += content;
                                    options.onToken!(content);
                                }

                                if (delta?.tool_calls) {
                                    for (const tc of delta.tool_calls) {
                                        const idx = tc.index;
                                        if (idx !== undefined) {
                                            if (!toolCalls[idx]) {
                                                toolCalls[idx] = {
                                                    id: tc.id || "",
                                                    type: tc.type || "function",
                                                    function: {
                                                        name: tc.function?.name || "",
                                                        arguments: tc.function?.arguments || ""
                                                    }
                                                };
                                            } else {
                                                if (tc.id) toolCalls[idx].id = tc.id;
                                                if (tc.function?.name) toolCalls[idx].function.name = tc.function.name;
                                                if (tc.function?.arguments) {
                                                    toolCalls[idx].function.arguments += tc.function.arguments;
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                // Ignore incomplete chunks
                            }
                        }
                    }
                }

                const cleanToolCalls = toolCalls.filter(Boolean);

                return {
                    role: "assistant",
                    content: assistantContent || null,
                    tool_calls: cleanToolCalls.length > 0 ? cleanToolCalls : undefined
                };
            } else {
                const data = (await response.json()) as OpenRouterResponse;

                if (data.error) {
                    // If it is a tool calling incompatibility, fail immediately inside this try block
                    // so we can catch it and try the prompt-based fallback for this model.
                    throw new Error(`OpenRouter API Error (${data.error.code || "unknown"}): ${data.error.message}`);
                }

                if (!data.choices || data.choices.length === 0) {
                    throw new Error("No choices returned from OpenRouter API.");
                }

                return data.choices[0].message;
            }
        } catch (error: any) {
            console.warn(`[OpenRouter] Failed request with model ${model}:`, error.message);
            
            // Check if model returned an error stating it doesn't support tools/function calling
            const errMsg = error.message.toLowerCase();
            if (
                errMsg.includes("tool use") ||
                errMsg.includes("function calling") ||
                errMsg.includes("support tool") ||
                errMsg.includes("does not support") ||
                errMsg.includes("tool_choice") ||
                errMsg.includes("tools not supported")
            ) {
                try {
                    console.log(`[OpenRouter Fallback] Model ${model} does not support API-level tool use. Retrying with prompt-based tool calling...`);
                    // Fallback to text fallback does not stream tool calls, which is fine
                    return await callOpenRouterPromptFallback(messages, options?.tools, model);
                } catch (fallbackError: any) {
                    console.warn(`[OpenRouter Fallback] Prompt-based fallback failed for ${model}:`, fallbackError.message);
                    lastError = fallbackError;
                }
            } else {
                lastError = error;
            }
            
            // Short delay to avoid pounding the endpoint
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    throw lastError || new Error("All fallback models failed.");
}

/**
 * Text-only prompt-based tool fallback for models/endpoints that do not support the API tools parameter
 */
async function callOpenRouterPromptFallback(
    messages: OpenRouterMessage[],
    tools: ToolDefinition[] | undefined,
    model: string
): Promise<OpenRouterMessage> {
    if (!tools || tools.length === 0) {
        const responseText = await callOpenRouterTextOnly(messages, model);
        return { role: "assistant", content: responseText };
    }

    const toolInstructions = `
You are an agent that can call tools. To call a tool, you MUST respond with a JSON block matching this schema:
\`\`\`json
{
  "tool": "toolName",
  "arguments": { "argName": "value" }
}
\`\`\`

Available tools:
${tools.map(t => `- ${t.name}: ${t.description}. Parameters: ${JSON.stringify(t.parameters)}`).join("\n")}

If you have the final answer and do not need to call any more tools, respond normally with your final text answer (do not output the JSON block).
`;

    // Clone and inject instructions to system message
    const clonedMessages = [...messages];
    const systemMsgIndex = clonedMessages.findIndex(m => m.role === "system");
    if (systemMsgIndex !== -1) {
        clonedMessages[systemMsgIndex] = {
            ...clonedMessages[systemMsgIndex],
            content: (clonedMessages[systemMsgIndex].content || "") + "\n\n" + toolInstructions
        };
    } else {
        clonedMessages.unshift({ role: "system", content: toolInstructions });
    }

    // Clean role: "tool" and tool_calls messages to prevent API errors
    const cleanedMessages = cleanMessagesForTextOnly(clonedMessages);

    const responseText = await callOpenRouterTextOnly(cleanedMessages, model);

    // Try parsing tool call JSON from markdown or raw text
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/({[\s\S]*?})/);
    
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[1].trim());
            if (parsed.tool && typeof parsed.tool === "string") {
                console.log(`[OpenRouter Prompt Fallback] Successfully parsed tool call: ${parsed.tool}`);
                return {
                    role: "assistant",
                    content: null,
                    tool_calls: [{
                        id: "call_" + Math.random().toString(36).substring(2, 9),
                        type: "function",
                        function: {
                            name: parsed.tool,
                            arguments: JSON.stringify(parsed.arguments || {})
                        }
                    }]
                };
            }
        } catch (e) {
            // Treat as text response if parsing fails
        }
    }

    return {
        role: "assistant",
        content: responseText
    };
}

/**
 * Normalizes tool message roles into user/assistant roles for text-only endpoints
 */
function cleanMessagesForTextOnly(messages: OpenRouterMessage[]): OpenRouterMessage[] {
    return messages.map(msg => {
        if (msg.role === "tool") {
            return {
                role: "user",
                content: `Tool Result [${msg.name}]:\n${msg.content}`
            };
        }
        if (msg.role === "assistant" && msg.tool_calls) {
            const toolCallText = msg.tool_calls.map(tc => 
                `Called Tool: ${tc.function.name} with Arguments: ${tc.function.arguments}`
            ).join("\n");
            return {
                role: "assistant",
                content: toolCallText
            };
        }
        return msg;
    });
}

/**
 * Simple text-only helper
 */
async function callOpenRouterTextOnly(
    messages: OpenRouterMessage[],
    model: string
): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://codebase-time-machine.com",
            "X-Title": "Codebase Time Machine",
        },
        body: JSON.stringify({
            model,
            messages,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (data.error) {
        throw new Error(`OpenRouter API Error: ${data.error.message}`);
    }

    if (!data.choices || data.choices.length === 0) {
        throw new Error("No choices returned from OpenRouter API.");
    }

    return data.choices[0].message.content || "";
}

/**
 * Generates embeddings via OpenRouter
 */
export async function getEmbeddings(
    input: string | string[],
    model: string = DEFAULT_EMBEDDING_MODEL
): Promise<number[][]> {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is missing in environment variables.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
                model,
                input: Array.isArray(input) ? input : [input],
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenRouter Embeddings API error (${response.status}): ${errText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`OpenRouter Embeddings Error: ${data.error.message}`);
        }

        if (!data.data || !Array.isArray(data.data)) {
            throw new Error("Invalid embeddings response format from OpenRouter.");
        }

        // Map response to array of number arrays
        return data.data.map((item: any) => item.embedding);
    } catch (error) {
        console.error("Error generating embeddings:", error);
        throw error;
    }
}

/**
 * Shorthand helper for a single text embedding (returns number[])
 */
export async function getSingleEmbedding(text: string): Promise<number[]> {
    const results = await getEmbeddings(text);
    return results[0];
}

                                                                                                                                                
