import assert from "node:assert/strict";
import { test } from "node:test";
import type { DiagramModel } from "./language/model";
import { buildDiagram } from "./language/model";
import { parse } from "./language/parser";
import { adjacency } from "./math";

function build(source: string): DiagramModel {
    return buildDiagram(parse(source), source);
}

function manual(
    names: string[],
    links: Array<[string, string]>,
): DiagramModel {
    const indices = new Map(
        names.map((name, index) => [name, index]),
    );

    return {
        vertices: names.map((name) => ({
            name,
            label: name,
            delimiter: "(",
        })),
        links: links.map(([from, to]) => ({
            from,
            to,
            polarity: "positive",
            delayed: false,
        })),
        indexOf(name: string): number {
            const index = indices.get(name);

            if (index === undefined) {
                throw new Error(`Variable '${name}' is not defined.`);
            }

            return index;
        },
    };
}

test("builds a directed adjacency matrix", () => {
    const diagram = build("@A(A) +> @B(B);");

    assert.deepEqual(adjacency(diagram), [
        [0, 1],
        [0, 0],
    ]);
});

test("keeps opposite links as separate directed edges", () => {
    const diagram = build(
        "@A(A) +> @B(B);\nB -> A;",
    );

    assert.deepEqual(adjacency(diagram), [
        [0, 1],
        [1, 0],
    ]);
});

test("writes self loops to the diagonal", () => {
    const diagram = build("@A(A) +> A;");

    assert.deepEqual(adjacency(diagram), [[1]]);
});

test("keeps isolated vertices in the matrix", () => {
    const diagram = manual(
        ["A", "B", "C"],
        [["A", "B"]],
    );

    assert.deepEqual(adjacency(diagram), [
        [0, 1, 0],
        [0, 0, 0],
        [0, 0, 0],
    ]);
});

test("returns a zero matrix when there are no links", () => {
    const diagram = manual(["A", "B"], []);

    assert.deepEqual(adjacency(diagram), [
        [0, 0],
        [0, 0],
    ]);
});
