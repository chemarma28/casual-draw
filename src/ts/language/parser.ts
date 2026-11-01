import type {
    AliasExpression,
    Arrow,
    Chain,
    Diagram,
    NameExpression,
    Statement,
    VertexExpression,
} from "./ast";
import { LanguageError } from "./error";
import { Lexer } from "./lexer";
import type { Token } from "./lexer";

export function parse(source: string): Diagram {
    return new Parser(source).parseDiagram();
}

class Parser {
    private readonly source: string;
    private readonly lexer: Lexer;

    constructor(source: string) {
        this.source = source;
        this.lexer = new Lexer(source);
    }

    parseDiagram(): Diagram {
        while (this.lexer.peek().kind === "semicolon") {
            this.lexer.next();
        }

        const start = this.lexer.peek().span.start;
        const statements: Statement[] = [];

        while (this.lexer.peek().kind !== "eof") {
            statements.push(this.parseStatement());

            if (this.lexer.peek().kind === "eof") {
                break;
            }

            if (this.lexer.peek().kind !== "semicolon") {
                const token = this.lexer.peek();

                throw this.error(
                    `Expected ';' between statements, but found ${describe(token)}`,
                    token.span.start,
                );
            }

            while (this.lexer.peek().kind === "semicolon") {
                this.lexer.next();
            }
        }

        const end = this.lexer.peek().span.end;

        return {
            statements,
            span: { start, end },
        };
    }

    private parseStatement(): Statement {
        const chain = this.parseChain();

        return {
            chain,
            span: chain.span,
        };
    }

    private parseChain(): Chain {
        const first = this.parseVertex();
        const vertices: VertexExpression[] = [first];
        const arrows: Arrow[] = [];

        while (this.lexer.peek().kind === "arrow") {
            arrows.push(this.parseArrow());
            vertices.push(this.parseVertex());
        }

        if (arrows.length === 0) {
            const token = this.lexer.peek();

            throw this.error(
                `Expected an arrow after vertex, but found ${describe(token)}`,
                token.span.start,
            );
        }

        const last = vertices[vertices.length - 1];

        return {
            vertices,
            arrows,
            span: { start: first.span.start, end: last.span.end },
        };
    }

    private parseVertex(): VertexExpression {
        if (this.lexer.peek().kind === "at") {
            return this.parseAlias();
        }

        return this.parseName();
    }

    private parseAlias(): AliasExpression {
        const at = this.lexer.next();
        const name = this.lexer.next();

        if (name.kind !== "name") {
            throw this.error(
                `Expected a name after '@', but found ${describe(name)}`,
                name.span.start,
            );
        }

        const open = this.lexer.next();

        if (open.kind !== "lparen" && open.kind !== "lbracket") {
            throw this.error(
                `Expected '(' or '[' after alias name '${name.value}', but found ${describe(open)}`,
                open.span.start,
            );
        }

        const closeChar = open.kind === "lparen" ? ")" : "]";
        const closeKind = open.kind === "lparen" ? "rparen" : "rbracket";
        const label = this.lexer.readText(closeChar);
        const closing = this.lexer.next();

        if (closing.kind !== closeKind) {
            throw this.error(
                `Expected '${closeChar}' to close alias '${name.value}', but found ${describe(closing)}`,
                closing.span.start,
            );
        }

        return {
            kind: "alias",
            name: name.value,
            label: label.value,
            delimiter: open.kind === "lparen" ? "(" : "[",
            span: { start: at.span.start, end: closing.span.end },
        };
    }

    private parseName(): NameExpression {
        const token = this.lexer.next();

        if (token.kind !== "name") {
            throw this.error(
                `Expected a vertex name, but found ${describe(token)}`,
                token.span.start,
            );
        }

        return {
            kind: "name",
            name: token.value,
            span: token.span,
        };
    }

    private parseArrow(): Arrow {
        const token = this.lexer.next();

        if (token.kind !== "arrow") {
            throw this.error(
                `Expected an arrow, but found ${describe(token)}`,
                token.span.start,
            );
        }

        return {
            polarity: token.polarity,
            delayed: token.delayed,
            span: token.span,
        };
    }

    private error(message: string, offset: number): LanguageError {
        return new LanguageError(message, this.source, offset);
    }
}

function describe(token: Token): string {
    switch (token.kind) {
        case "name":
            return `name '${token.value}'`;
        case "at":
            return "'@'";
        case "lparen":
            return "'('";
        case "rparen":
            return "')'";
        case "lbracket":
            return "'['";
        case "rbracket":
            return "']'";
        case "arrow":
            return "arrow";
        case "semicolon":
            return "';'";
        case "eof":
            return "end of input";
    }
}
