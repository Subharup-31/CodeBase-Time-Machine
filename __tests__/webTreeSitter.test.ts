import { describe, it, expect } from "vitest";
import { computeStructuralHash, getAstNodeSequence } from "../lib/phylogeneticIndexer";
import Parser from "web-tree-sitter";

// Mock syntax node creator
function createMockNode(type: string, children: any[] = []): Parser.SyntaxNode {
    return {
        type,
        childCount: children.length,
        child(index: number) {
            return children[index] || null;
        },
        // Fill other fields with dummy/casted values to satisfy Type definitions
    } as unknown as Parser.SyntaxNode;
}

describe("AST Structural Hashing & Sequence Generation", () => {
    it("computes structural hash recursively", () => {
        // Create mock AST node structure
        const mockChild1 = createMockNode("identifier");
        const mockChild2 = createMockNode("binary_expression", [
            createMockNode("number"),
            createMockNode("+"),
            createMockNode("number")
        ]);
        const mockRoot = createMockNode("lexical_declaration", [mockChild1, mockChild2]);

        const hash1 = computeStructuralHash(mockRoot);
        const hash2 = computeStructuralHash(mockRoot);
        expect(hash1).toBe(hash2);
        expect(hash1).toBeTypeOf("string");
        expect(hash1.length).toBe(64); // SHA-256 hex length
    });

    it("excludes comment nodes from structural hash", () => {
        const nodeWithComment = createMockNode("lexical_declaration", [
            createMockNode("identifier"),
            createMockNode("comment")
        ]);
        const nodeWithoutComment = createMockNode("lexical_declaration", [
            createMockNode("identifier")
        ]);

        const hashWithComment = computeStructuralHash(nodeWithComment);
        const hashWithoutComment = computeStructuralHash(nodeWithoutComment);
        expect(hashWithComment).toBe(hashWithoutComment);
    });

    it("generates correct AST node sequence excluding brackets/comments", () => {
        const mockRoot = createMockNode("function_definition", [
            createMockNode("("),
            createMockNode("parameter"),
            createMockNode(")"),
            createMockNode("{"),
            createMockNode("expression_statement"),
            createMockNode("comment"),
            createMockNode("}")
        ]);

        const seq = getAstNodeSequence(mockRoot);
        // "(" , ")", "{", "}", and "comment" should be filtered out
        expect(seq).toEqual(["function_definition", "parameter", "expression_statement"]);
    });
});
