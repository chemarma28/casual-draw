import type { Polarity, Span } from "./ast";
import { LanguageError } from "./error";

export type Token =
    | { kind: "name"; value: string; span: Span }
    | { kind: "at"; span: Span }
    | { kind: "lparen"; span: Span }
    | { kind: "rparen"; span: Span }
    | { kind: "lbracket"; span: Span }
    | { kind: "rbracket"; span: Span }
    | { kind: "arrow"; polarity: Polarity; delayed: boolean; span: Span }
    | { kind: "semicolon"; span: Span }
    | { kind: "eof"; span: Span };

export type TokenKind = Token["kind"];

export class Lexer {
    private readonly source: string;
    private position = 0;
    private buffered: Token | null = null;

    constructor(source: string) {
        this.source = source;
    }

    peek(): Token {
        if (this.buffered === null) {
            this.buffered = this.readToken();
        }

        return this.buffered;
    }

    next(): Token {
        if (this.buffered !== null) {
            const token = this.buffered;
            this.buffered = null;
            return token;
        }

        return this.readToken();
    }

    /**
     * Reads the raw label after an alias opening delimiter.
     *
     * Must be called immediately after consuming "(" or "[" and before
     * any peek()/next() call. The closing delimiter is not consumed.
     */
    readText(close: ")" | "]"): { value: string; span: Span } {
        if (this.buffered !== null) {
            throw new Error(
                "readText() cannot be called while a token is buffered.",
            );
        }

        const start = this.position;

        while (
            this.position < this.source.length &&
            this.source[this.position] !== close
        ) {
            this.position++;
        }

        return {
            value: this.source.slice(start, this.position),
            span: { start, end: this.position },
        };
    }

    private readToken(): Token {
        this.skipWhitespace();

        const start = this.position;
        const ch = this.source[this.position];

        if (ch === undefined) {
            return { kind: "eof", span: { start, end: start } };
        }

        switch (ch) {
            case "@":
                this.position++;
                return { kind: "at", span: { start, end: this.position } };
            case "(":
                this.position++;
                return { kind: "lparen", span: { start, end: this.position } };
            case ")":
                this.position++;
                return { kind: "rparen", span: { start, end: this.position } };
            case "[":
                this.position++;
                return { kind: "lbracket", span: { start, end: this.position } };
            case "]":
                this.position++;
                return { kind: "rbracket", span: { start, end: this.position } };
            case ";":
                this.position++;
                return {
                    kind: "semicolon",
                    span: { start, end: this.position },
                };
            case "|":
            case "+":
            case "-":
            case ">":
                return this.readArrow();
        }

        if (isNameStart(ch)) {
            return this.readName();
        }

        throw new LanguageError(
            `Unexpected character '${ch}'`,
            this.source,
            start,
        );
    }

    private readName(): Token {
        const start = this.position;

        this.position++;

        while (isNameContinue(this.source[this.position])) {
            this.position++;
        }

        return {
            kind: "name",
            value: this.source.slice(start, this.position),
            span: { start, end: this.position },
        };
    }

    private readArrow(): Token {
        const start = this.position;
        let delayed = false;
        let polarity: Polarity = "default";

        if (this.source[this.position] === "|") {
            this.position++;

            if (this.source[this.position] !== "|") {
                throw new LanguageError(
                    "Expected '||' to start a delayed arrow",
                    this.source,
                    start,
                );
            }

            this.position++;
            delayed = true;
        }

        const head = this.source[this.position];

        if (head === "+") {
            polarity = "positive";
            this.position++;
        } else if (head === "-") {
            polarity = "negative";
            this.position++;
        }

        if (this.source[this.position] !== ">") {
            throw new LanguageError(
                "Expected '>' to complete the arrow",
                this.source,
                this.position,
            );
        }

        this.position++;

        return {
            kind: "arrow",
            polarity,
            delayed,
            span: { start, end: this.position },
        };
    }

    private skipWhitespace() {
        while (isWhitespace(this.source[this.position])) {
            this.position++;
        }
    }
}

function isWhitespace(ch: string | undefined): boolean {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function isLetter(ch: string | undefined): boolean {
    return (
        ch !== undefined &&
        ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z"))
    );
}

function isDigit(ch: string | undefined): boolean {
    return ch !== undefined && ch >= "0" && ch <= "9";
}

function isNameStart(ch: string | undefined): boolean {
    return isLetter(ch);
}

function isNameContinue(ch: string | undefined): boolean {
    return isLetter(ch) || isDigit(ch) || ch === "_";
}
