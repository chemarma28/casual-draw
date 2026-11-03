import { Bounds, Viewport } from "./canvas/viewport";
import {
    FruchtermanReingoldLink,
    FruchtermanReingoldMethod,
} from "./fruchterman";
import { Arc, ArrowHead, calculatePositionsForLabel, Text } from "./graphics";
import { KamadaKawaiMethod } from "./kamada";
import { buildDiagram, DiagramModel } from "./language/model";
import { parse } from "./language/parser";
import { adjacency, distance, hasIntersection, intersectArcAndRectangle, Rectangle, Vector } from "./math";

const VERTEX_FONT = "20px Sans-Serif";
const VERTEX_WIDTH = 150;
const BOUNDS_PADDING = 48;

type DiagramStyle = {
    font: {
        color: string,
        width: string,
        family: string
    },
    outline: {
        color: string,
        width: number
    },
    link: {
        width: number,
        positive: string,
        negative: string
    }
};

type Layout = {
    positions: Vector[];
    midpoints: Vector[];
    links: FruchtermanReingoldLink[];
};

export type AssembledDiagram = {
    diagram: DiagramModel;
    bounds: Bounds;
    draw(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport,
    ): void;
};

function layout(
    diagram: DiagramModel,
    length: number = 750,
    strength: number = 3.2,
): Layout {
    const positions = KamadaKawaiMethod(
        adjacency(diagram),
        {
            length,
            strength,
        },
    );

    const m = adjacency(diagram);
    let sum = 0;
    let count = 0;

    for (let link of diagram.links) {
        if (link.from === link.to)
            continue;

        const uu = positions[diagram.indexOf(link.from)];
        const vv = positions[diagram.indexOf(link.to)];

        sum += distance({ x: uu.x - vv.x, y: uu.y - vv.y });
        ++count;
    }

    const stiffness = count === 0 ? 1 : sum / count / strength;

    const { links, midpoints } = FruchtermanReingoldMethod(
        positions,
        diagram.links.map((link) => ({
            from: diagram.indexOf(link.from),
            to: diagram.indexOf(link.to),
        })),
        { stiffness },
    );

    return { positions, midpoints, links };
}

function computeBounds(
    positions: Vector[],
    midpoints: Vector[],
    labels: Text[],
): Bounds {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const point of [...positions, ...midpoints]) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    for (const label of labels) {
        const rect = label.getBoundingRect();

        minX = Math.min(minX, rect.x.x);
        minY = Math.min(minY, rect.x.y);
        maxX = Math.max(maxX, rect.x.x + rect.width);
        maxY = Math.max(maxY, rect.x.y + rect.height);
    }

    if (!Number.isFinite(minX)) {
        return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
    }

    return {
        minX: minX - BOUNDS_PADDING,
        minY: minY - BOUNDS_PADDING,
        maxX: maxX + BOUNDS_PADDING,
        maxY: maxY + BOUNDS_PADDING,
    };
}

export function assemble(source: string): AssembledDiagram {
    const diagram = buildDiagram(parse(source), source);

    if (diagram.vertices.length === 0) {
        return {
            diagram,
            bounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
            draw() {
                // Nothing to draw.
            },
        };
    }

    const l = layout(diagram);
    const measureContext = document
        .createElement("canvas")
        .getContext("2d");

    if (!measureContext) {
        throw new Error("Canvas 2D context is not available.");
    }

    measureContext.font = VERTEX_FONT;

    const labels = diagram.vertices.map((vertex, index) => {
        const position = l.positions[index];

        return new Text(
            measureContext,
            vertex.label,
            position.x,
            position.y,
            VERTEX_WIDTH,
        );
    });

    const arcs = l.links.map((link) => {
        const arc = new Arc(
            l.positions[link.from],
            l.midpoints[link.mid],
            l.positions[link.to],
        );

        const sources = intersectArcAndRectangle(arc, labels[link.from].getBoundingRect());
        const source = sources.reduce((best, point) =>
            arc.parameter(point) < arc.parameter(best) ? point : best
        );

        const targets = intersectArcAndRectangle(arc, labels[link.to].getBoundingRect());
        const target = targets.reduce((best, point) =>
            arc.parameter(best) <= arc.parameter(point) ? point : best
        );

        return new Arc(source, l.midpoints[link.mid], target);
    });

    const arrows = arcs.map((arc) => new ArrowHead(arc, arc.end, 9));

    const color = (link: number): string => {
        let c = undefined;
        const definition = diagram.links[link];

        switch (definition.polarity) {
            case "negative":
                c = "#C73544"
                break;
            case "positive":
                c = "#08ABED";
                break;
            default:
                c = "#000000";
        }

        return c;
    };

    const elements: Rectangle[] = [
        ...labels.map((label) => label.getBoundingRect()),
        ...arrows.map((arrow) => arrow.getBoundingRect())
    ];

    const polarities: { link: number, text: Text }[] = [];

    for (let i = 0; i < arrows.length; ++i) {
        const link = diagram.links[i];

        if ("default" === link.polarity)
            continue;

        const candidates = calculatePositionsForLabel(arrows[i]);

        if (!candidates.length)
            continue;

        const symbol = link.polarity === 'negative' ? '-' : '+';

        for (let candidate of candidates) {
            const trial = new Text(measureContext, symbol, candidate.x, candidate.y, 20);
            const bounds = trial.getBoundingRect();

            let exit = false;

            for (let element of elements) {
                if (!hasIntersection(element, bounds)) {
                    polarities.push({ link: i, text: trial });
                    elements.push(bounds);

                    exit = true;

                    break;
                }
            }

            if (exit)
                break;
        }
    }

    console.debug(polarities.length);

    return {
        diagram,
        bounds: computeBounds(l.positions, l.midpoints, labels),
        draw(ctx, viewport) {
            ctx.save();
            viewport.apply(ctx);

            ctx.strokeStyle = "#000000";
            ctx.fillStyle = "#000000";
            ctx.font = VERTEX_FONT;

            ctx.save();

            for (let i = 0; i < arcs.length; ++i) {
                const arc = arcs[i];

                ctx.strokeStyle = ctx.fillStyle = color(i);
                arc.draw(ctx);
            }

            for (let i = 0; i < arrows.length; ++i) {
                const arrow = arrows[i];

                ctx.strokeStyle = ctx.fillStyle = color(i);
                arrow.draw(ctx);
            }

            for (let i = 0; i < arrows.length; ++i) {
                const polarity = polarities[i];

                ctx.strokeStyle = ctx.fillStyle = color(i);
                polarity.text.draw(ctx);
            }

            ctx.restore();

            for (const label of labels) {
                label.draw(ctx);
            }

            ctx.restore();
        },
    };
}
