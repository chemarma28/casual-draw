export type Position = {
    line: number;
    column: number;
};

export function positionAt(source: string, offset: number): Position {
    const limit = Math.min(Math.max(offset, 0), source.length);

    let line = 1;
    let column = 1;

    for (let i = 0; i < limit; i++) {
        if (source[i] === "\n") {
            line++;
            column = 1;
        } else {
            column++;
        }
    }

    return { line, column };
}

export class LanguageError extends Error {
    readonly offset: number;
    readonly line: number;
    readonly column: number;

    constructor(message: string, source: string, offset: number) {
        const { line, column } = positionAt(source, offset);

        super(`${message} at ${line}:${column}.`);

        this.name = "LanguageError";
        this.offset = offset;
        this.line = line;
        this.column = column;
    }
}
