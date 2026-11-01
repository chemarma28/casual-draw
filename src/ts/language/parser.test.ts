import assert from "node:assert/strict";
import { test } from "node:test";
import { LanguageError } from "./error";
import { parse } from "./parser";

test("parses the README example", () => {
    const diagram = parse(
        [
            "@Population[Population] +> @Births(Births) ||+> Population;",
            "Population +> @Deaths(Deaths) -> Population;",
            "Population -> @Food(Food supply);",
            "Food +> @BirthRate(Birth rate) +> Births;",
            "Food -> @DeathRate(Death rate) +> Deaths;",
        ].join("\n"),
    );

    assert.equal(diagram.statements.length, 5);
    assert.equal(
        diagram.statements.flatMap((statement) => statement.chain.arrows)
            .length,
        9,
    );

    const first = diagram.statements[0].chain;

    assert.deepEqual(
        first.vertices.map((vertex) =>
            vertex.kind === "alias"
                ? {
                      kind: vertex.kind,
                      name: vertex.name,
                      label: vertex.label,
                      delimiter: vertex.delimiter,
                  }
                : { kind: vertex.kind, name: vertex.name },
        ),
        [
            {
                kind: "alias",
                name: "Population",
                label: "Population",
                delimiter: "[",
            },
            {
                kind: "alias",
                name: "Births",
                label: "Births",
                delimiter: "(",
            },
            { kind: "name", name: "Population" },
        ],
    );

    assert.deepEqual(
        first.arrows.map((arrow) => ({
            polarity: arrow.polarity,
            delayed: arrow.delayed,
        })),
        [
            { polarity: "positive", delayed: false },
            { polarity: "positive", delayed: true },
        ],
    );
});

test("parses every link kind", () => {
    const diagram = parse(
        [
            "A > B;",
            "A +> B;",
            "A -> B;",
            "A ||> B;",
            "A ||+> B;",
            "A ||-> B;",
        ].join("\n"),
    );

    assert.equal(diagram.statements.length, 6);
    assert.deepEqual(
        diagram.statements.map((statement) => {
            const arrow = statement.chain.arrows[0];

            return {
                polarity: arrow.polarity,
                delayed: arrow.delayed,
            };
        }),
        [
            { polarity: "default", delayed: false },
            { polarity: "positive", delayed: false },
            { polarity: "negative", delayed: false },
            { polarity: "default", delayed: true },
            { polarity: "positive", delayed: true },
            { polarity: "negative", delayed: true },
        ],
    );
});

test("parses alias labels and delimiters", () => {
    const diagram = parse("@A(Hello, world!) +> @B[Framed];");
    const first = diagram.statements[0].chain;

    assert.deepEqual(
        first.vertices.map((vertex) =>
            vertex.kind === "alias"
                ? {
                      name: vertex.name,
                      label: vertex.label,
                      delimiter: vertex.delimiter,
                  }
                : { name: vertex.name },
        ),
        [
            { name: "A", label: "Hello, world!", delimiter: "(" },
            { name: "B", label: "Framed", delimiter: "[" },
        ],
    );
});

test("rejects a missing alias delimiter", () => {
    assert.throws(
        () => parse("@A[A +> B;"),
        (error: unknown) => {
            if (!(error instanceof LanguageError)) return false;

            assert.match(error.message, /Expected '\]' to close alias 'A'/);
            assert.equal(error.line, 1);
            assert.equal(error.column, 11);

            return true;
        },
    );
});

test("rejects a missing arrow", () => {
    assert.throws(
        () => parse("@A(A) B;"),
        (error: unknown) => {
            if (!(error instanceof LanguageError)) return false;

            assert.match(error.message, /Expected an arrow after vertex/);
            assert.equal(error.line, 1);
            assert.equal(error.column, 7);

            return true;
        },
    );
});

test("rejects a missing statement separator", () => {
    assert.throws(
        () => parse("A +> B C -> D;"),
        (error: unknown) => {
            if (!(error instanceof LanguageError)) return false;

            assert.match(error.message, /Expected ';' between statements/);
            assert.equal(error.line, 1);
            assert.equal(error.column, 8);

            return true;
        },
    );
});
