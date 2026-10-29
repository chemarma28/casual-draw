export type DemoNode = {
    id: string;
    label: string;
    x: number;
    y: number;
};

export type DemoLink = {
    from: string;
    to: string;
    mid: {
        x: number;
        y: number;
    };
};

export type DemoGraph = {
    nodes: DemoNode[];
    links: DemoLink[];
};

export const DEMO_GRAPH: DemoGraph = {
    nodes: [
        { id: "a", label: "A", x: -200, y: -120 },
        { id: "b", label: "B", x: 200, y: -120 },
        { id: "c", label: "C", x: 200, y: 120 },
        { id: "d", label: "D", x: -200, y: 120 },
    ],
    links: [
        { from: "a", to: "b", mid: { x: 0, y: -230 } },
        { from: "b", to: "c", mid: { x: 300, y: 0 } },
        { from: "c", to: "d", mid: { x: 0, y: 230 } },
        { from: "d", to: "a", mid: { x: -300, y: 0 } },
    ],
};

export function createDemoGraph(): DemoGraph {
    return {
        nodes: DEMO_GRAPH.nodes.map((node) => ({ ...node })),
        links: DEMO_GRAPH.links.map((link) => ({
            ...link,
            mid: { ...link.mid },
        })),
    };
}
