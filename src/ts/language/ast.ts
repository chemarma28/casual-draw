export type Span = {
    start: number;
    end: number;
};

export type Polarity = "default" | "positive" | "negative";

export type Diagram = {
    statements: Statement[];
    span: Span;
};

export type Statement = {
    chain: Chain;
    span: Span;
};

export type Chain = {
    vertices: VertexExpression[];
    arrows: Arrow[];
    span: Span;
};

export type VertexExpression = AliasExpression | NameExpression;

export type AliasExpression = {
    kind: "alias";
    name: string;
    label: string;
    delimiter: "(" | "[";
    span: Span;
};

export type NameExpression = {
    kind: "name";
    name: string;
    span: Span;
};

export type VertexExpressionKind = VertexExpression["kind"];

export type Arrow = {
    polarity: Polarity;
    delayed: boolean;
    span: Span;
};
