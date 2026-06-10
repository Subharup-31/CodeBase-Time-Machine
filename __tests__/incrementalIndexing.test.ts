import { describe, it, expect } from 'vitest';

describe('Incremental commit filtering', () => {
    it('filters out already-indexed commits correctly', () => {
        const allCommits = [
            { sha: 'abc', message: 'feat: A' },
            { sha: 'def', message: 'feat: B' },
            { sha: 'ghi', message: 'feat: C' },
        ];
        const indexed = new Set(['abc', 'def']);
        const newCommits = allCommits.filter(c => !indexed.has(c.sha));
        expect(newCommits.length).toBe(1);
        expect(newCommits[0].sha).toBe('ghi');
    });

    it('returns all commits when nothing is indexed yet', () => {
        const allCommits = [{ sha: 'aaa', message: '' }, { sha: 'bbb', message: '' }];
        const indexed = new Set<string>();
        const newCommits = allCommits.filter(c => !indexed.has(c.sha));
        expect(newCommits.length).toBe(2);
    });

    it('returns empty when all commits are already indexed', () => {
        const allCommits = [{ sha: 'aaa', message: '' }];
        const indexed = new Set(['aaa']);
        const newCommits = allCommits.filter(c => !indexed.has(c.sha));
        expect(newCommits.length).toBe(0);
    });
});
