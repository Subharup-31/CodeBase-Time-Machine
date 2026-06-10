import { describe, it, expect } from 'vitest';
import { isAgenticQuery } from '../lib/agentEngine';

describe('isAgenticQuery', () => {
    it('returns true for refactor queries', () => {
        expect(isAgenticQuery('refactor the authentication module')).toBe(true);
        expect(isAgenticQuery('find duplicate functions')).toBe(true);
        expect(isAgenticQuery('align clone functions')).toBe(true);
    });

    it('returns true for git history queries', () => {
        expect(isAgenticQuery('who broke the login function')).toBe(true);
        expect(isAgenticQuery('when was this introduced')).toBe(true);
        expect(isAgenticQuery('show me the commit history for auth')).toBe(true);
        expect(isAgenticQuery('what is the entropy score of this file')).toBe(true);
    });

    it('returns true for report generation queries', () => {
        expect(isAgenticQuery('generate a security scan report')).toBe(true);
        expect(isAgenticQuery('create unit test for this function')).toBe(true);
    });

    it('returns false for simple code lookup queries', () => {
        expect(isAgenticQuery('what does the login function do')).toBe(false);
        expect(isAgenticQuery('explain the authentication middleware')).toBe(false);
        expect(isAgenticQuery('how does user registration work')).toBe(false);
    });

    it('is case insensitive', () => {
        expect(isAgenticQuery('REFACTOR this code')).toBe(true);
        expect(isAgenticQuery('WHO introduced this bug')).toBe(true);
    });

    it('handles very long queries without performance degradation', () => {
        const longQuery = 'explain '.repeat(200) + 'this function';
        const start = Date.now();
        isAgenticQuery(longQuery);
        expect(Date.now() - start).toBeLessThan(50); // must complete in <50ms
    });

    it('returns a boolean for any input', () => {
        expect(typeof isAgenticQuery('random query')).toBe('boolean');
        expect(typeof isAgenticQuery('')).toBe('boolean');
    });
});



