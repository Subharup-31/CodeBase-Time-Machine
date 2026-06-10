import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { alignCodeLines } from '../lib/alignmentAlgorithms';

describe('alignCodeLines (Needleman-Wunsch)', () => {
    it('aligns identical sequences with all conserved pairs', () => {
        // All lines must contain word tokens so Jaccard similarity = 1.0
        const lines = ['const x = 1', 'return x', 'end function'];
        const alignment = alignCodeLines(lines, lines);
        const conserved = alignment.filter(p => p.type === 'conserved');
        expect(conserved.length).toBe(lines.length);
    });

    it('produces an alignment where output covers all lines from both sequences', () => {
        fc.assert(fc.property(
            fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 1, maxLength: 10 }),
            fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 1, maxLength: 10 }),
            (linesA, linesB) => {
                const result = alignCodeLines(linesA, linesB);
                const resultLinesA = result
                    .filter(p => p.lineA !== null)
                    .map(p => p.lineA);
                const resultLinesB = result
                    .filter(p => p.lineB !== null)
                    .map(p => p.lineB);
                expect(resultLinesA.length).toBe(linesA.length);
                expect(resultLinesB.length).toBe(linesB.length);
            }
        ));
    });

    it('handles empty sequences', () => {
        expect(alignCodeLines([], [])).toEqual([]);
        const r = alignCodeLines(['x'], []);
        expect(r[0].type).toBe('deleted');
        expect(r[0].lineA).toBe('x');
    });

    it('marks changed lines as mutated not conserved', () => {
        const result = alignCodeLines(
            ['function foo() { return 1; }'],
            ['function foo() { return 2; }']
        );
        const conserved = result.filter(p => p.type === 'conserved');
        expect(conserved.length).toBe(0);
    });
});
