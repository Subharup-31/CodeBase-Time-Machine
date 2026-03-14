process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dummy.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-key";

import { describe, it, expect, vi } from 'vitest';
import { calculateCodeSimilarity, extractSymbols } from '../lib/phylogeneticIndexer';
import { getEvolutionaryHotspots } from '../lib/phylogeneticRAG';

// Mock createAdminClient from serviceRole to intercept Supabase queries
vi.mock('../lib/supabase/serviceRole', () => {
    return {
        createAdminClient: () => ({
            from: () => ({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: {
                                    graph_data: {
                                        "node-1": {
                                            id: "node-1",
                                            name: "foo",
                                            type: "function",
                                            filePath: "lib/foo.ts",
                                            commitSha: "sha-1",
                                            parentIds: [],
                                            changeType: "origin",
                                            body: "function foo() {}",
                                            calls: []
                                        },
                                        "node-2": {
                                            id: "node-2",
                                            name: "foo",
                                            type: "function",
                                            filePath: "lib/foo.ts",
                                            commitSha: "sha-2",
                                            parentIds: ["node-1"],
                                            changeType: "mutation",
                                            body: "function foo() { console.log(1); }",
                                            calls: []
                                        },
                                        "node-3": {
                                            id: "node-3",
                                            name: "bar",
                                            type: "function",
                                            filePath: "lib/bar.ts",
                                            commitSha: "sha-2",
                                            parentIds: [],
                                            changeType: "origin",
                                            body: "function bar() {}",
                                            calls: []
                                        }
                                    }
                                },
                                error: null
                            })
                        })
                    })
                })
            })
        })
    };
});

describe('calculateCodeSimilarity', () => {
    it('returns 1.0 for identical code', () => {
        const code = 'function foo() { return bar(); }';
        expect(calculateCodeSimilarity(code, code)).toBe(1);
    });

    it('returns 0 for completely different code', () => {
        expect(calculateCodeSimilarity('abc', 'xyz')).toBe(0);
    });

    it('returns >0.5 for similar code blocks', () => {
        const codeA = 'function handleUser(id) { const user = getUser(id); return user.name; }';
        const codeB = 'function processUser(id) { const user = getUser(id); return user.email; }';
        expect(calculateCodeSimilarity(codeA, codeB)).toBeGreaterThan(0.5);
    });

    it('returns <0.3 for very different code blocks', () => {
        const codeA = 'function fetchData() { return http.get(\"/api\"); }';
        const codeB = 'class DatabaseManager { constructor() { this.pool = []; } }';
        expect(calculateCodeSimilarity(codeA, codeB)).toBeLessThan(0.3);
    });

    it('handles empty strings', () => {
        expect(calculateCodeSimilarity('', '')).toBe(0);
        expect(calculateCodeSimilarity('foo()', '')).toBe(0);
    });
});

describe('extractSymbols', () => {
    it('extracts symbols from TS function declarations', () => {
        const code = 'function calculate(x: number) { return x * 2; }';
        const symbols = extractSymbols(code, 'math.ts', 'commit-sha');
        expect(symbols.length).toBeGreaterThanOrEqual(1);
        expect(symbols[0].name).toBe('calculate');
        expect(symbols[0].type).toBe('function');
    });

    it('extracts symbols from multi-language Go code', () => {
        const code = 'func ProcessData(data string) {\n\tfmt.Println(data)\n}';
        const symbols = extractSymbols(code, 'main.go', 'commit-sha');
        expect(symbols.length).toBeGreaterThanOrEqual(1);
        expect(symbols[0].name).toBe('ProcessData');
        expect(symbols[0].type).toBe('function');
    });
});

describe('getEvolutionaryHotspots', () => {
    it('identifies top volatile symbols based on mutation count', async () => {
        const hotspots = await getEvolutionaryHotspots('code_chunks_test', 'user-id');
        expect(hotspots.length).toBeGreaterThanOrEqual(1);
        expect(hotspots[0].name).toBe('foo');
        expect(hotspots[0].mutationCount).toBe(1);
    });
});
