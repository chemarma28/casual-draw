import assert from "node:assert/strict";
import { test } from "node:test";
import { LanguageError } from "./error";
import { buildDiagram } from "./model";
import { parse } from "./parser";

function build(source: string) {
    return buildDiagram(parse(source), source);
}

test("builds vertices and links from a chain", () => {
    const source = "@A(A) +> @B(B) -> @C(C);";
    const model = build(source);

    assert.deepEqual(model.vertices, [
        { name: "A", label: "A", delimiter: "(" },
        { name: "B", label: "B", delimiter: "(" },
        { name: "C", label: "C", delimiter: "(" },
    ]);

    assert.deepEqual(model.links, [
        { from: "A", to: "B", polarity: "positive", delayed: false },
        { from: "B", to: "C", polarity: "negative", delayed: false },
    ]);

    assert.equal(model.indexOf("B"), 1);
});

test("keeps labels, delimiters, polarity and delay", () => {
    const source = "@A(Hello) +> @B[Framed] ||-> A;";
    const model = build(source);

    assert.deepEqual(model.vertices, [
        { name: "A", label: "Hello", delimiter: "(" },
        { name: "B", label: "Framed", delimiter: "[" },
    ]);

    assert.deepEqual(model.links, [
        { from: "A", to: "B", polarity: "positive", delayed: false },
        { from: "B", to: "A", polarity: "negative", delayed: true },
    ]);
});

test("rejects a duplicate alias", () => {
    const source = "@A(A) +> @B(B);\n@A(Again) +> B;";

    assert.throws(
        () => build(source),
        (error: unknown) => {
            if (!(error instanceof LanguageError)) return false;

            assert.match(error.message, /Variable 'A' is already defined/);
            assert.equal(error.line, 2);
            assert.equal(error.column, 1);

            return true;
        },
    );
});

test("rejects an undefined name", () => {
    const source = "@A(A) +> B;";

    assert.throws(
        () => build(source),
        (error: unknown) => {
            if (!(error instanceof LanguageError)) return false;

            assert.match(error.message, /Variable 'B' is not defined/);
            assert.equal(error.line, 1);
            assert.equal(error.column, 10);

            return true;
        },
    );
});

test("rejects a forward reference", () => {
    const source = "@A(A) +> B;\n@B(B) +> A;";

    assert.throws(
        () => build(source),
        (error: unknown) => {
            if (!(error instanceof LanguageError)) return false;

            assert.match(error.message, /Variable 'B' is not defined/);
            assert.equal(error.line, 1);
            assert.equal(error.column, 10);

            return true;
        },
    );
});

test("keeps the last link for the same pair", () => {
    const source = "@A(A) +> @B(B);\nA ||-> B;";
    const model = build(source);

    assert.deepEqual(model.links, [
        { from: "A", to: "B", polarity: "negative", delayed: true },
    ]);
});
