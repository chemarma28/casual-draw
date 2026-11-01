import type { Diagram, Polarity } from "./ast";
import { LanguageError } from "./error";

export type VertexDefinition = {
    name: string;
    label: string;
    delimiter: "(" | "[";
};

export type LinkDefinition = {
    from: string;
    to: string;
    polarity: Polarity;
    delayed: boolean;
};

export type DiagramModel = {
    vertices: VertexDefinition[];
    links: LinkDefinition[];
    indexOf(name: string): number;
};

export function buildDiagram(
    diagram: Diagram,
    source: string,
): DiagramModel {
    const vertices: VertexDefinition[] = [];
    const indices = new Map<string, number>();
    const links = new Map<string, LinkDefinition>();

    for (const statement of diagram.statements) {
        const chain = statement.chain;
        const names: string[] = [];

        for (const vertex of chain.vertices) {
            if (vertex.kind === "alias") {
                if (indices.has(vertex.name)) {
                    throw new LanguageError(
                        `Variable '${vertex.name}' is already defined`,
                        source,
                        vertex.span.start,
                    );
                }

                indices.set(vertex.name, vertices.length);
                vertices.push({
                    name: vertex.name,
                    label: vertex.label,
                    delimiter: vertex.delimiter,
                });
                names.push(vertex.name);
            } else {
                if (!indices.has(vertex.name)) {
                    throw new LanguageError(
                        `Variable '${vertex.name}' is not defined`,
                        source,
                        vertex.span.start,
                    );
                }

                names.push(vertex.name);
            }
        }

        for (let i = 0; i < chain.arrows.length; i++) {
            const from = names[i];
            const to = names[i + 1];
            const arrow = chain.arrows[i];

            links.set(`${from}\u0000${to}`, {
                from,
                to,
                polarity: arrow.polarity,
                delayed: arrow.delayed,
            });
        }
    }

    return {
        vertices,
        links: [...links.values()],
        indexOf(name: string): number {
            const index = indices.get(name);

            if (index === undefined) {
                throw new Error(`Variable '${name}' is not defined.`);
            }

            return index;
        },
    };
}
