import { describe, it, expect, vi } from 'vitest';

// Mock Supabase admin client — table-aware to handle multiple from() calls
vi.mock('../lib/supabase/serviceRole', () => ({
    createAdminClient: () => ({
        from: (table: string) => {
            if (table === 'genetic_nodes') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    range: vi.fn().mockResolvedValue({
                        data: [
                            {
                                id: 'node-1', repo_id: 'repo-1', user_id: 'user-1',
                                name: 'fetchUser', type: 'function', file_path: 'api/user.ts',
                                commit_sha: 'abc123', change_type: 'origin',
                                body: 'function fetchUser() {}',
                                calls: ['getDb']
                            }
                        ],
                        error: null
                    }),
                };
            }
            if (table === 'genetic_edges') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    in: vi.fn().mockResolvedValue({ data: [], error: null }),
                };
            }
            if (table === 'repositories') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { id: 'repo-1' }, error: null }),
                };
            }
            // Fallback
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({ data: [], error: null }),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                upsert: vi.fn().mockResolvedValue({ error: null }),
            };
        }
    })
}));

import { loadGraphNodes, getRepoId } from '../lib/graphStore';

describe('loadGraphNodes', () => {
    it('reconstructs GeneticNode objects from row data', async () => {
        const graph = await loadGraphNodes('repo-1');
        expect(Object.keys(graph).length).toBe(1);
        const node = graph['node-1'];
        expect(node.name).toBe('fetchUser');
        expect(node.type).toBe('function');
        expect(node.calls).toContain('getDb');
        expect(node.parentIds).toEqual([]);
    });
});

describe('getRepoId', () => {
    it('returns the repo id string', async () => {
        const id = await getRepoId('my-repo', 'user-1');
        expect(id).toBe('repo-1');
    });
});
