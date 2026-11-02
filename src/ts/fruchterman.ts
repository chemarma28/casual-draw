import { distance, normal, dot } from "./math";
import type { Vector } from "./math";

export type FruchtermanReingoldInputLink = {
    from: number;
    to: number;
};

export type FruchtermanReingoldLink = {
    from: number;
    to: number;
    mid: number;
};

export type FruchtermanReingoldParameters = {
    stiffness: number;
    maxIterations?: number;
    initialTemperature?: number;
    coolingFactor?: number;
};

export type FruchtermanReingoldResult = {
    positions: Vector[];
    midpoints: Vector[];
    links: FruchtermanReingoldLink[];
};

type Point = {
    x: number;
    y: number;
    dispX: number;
    dispY: number;
    nx: number;
    ny: number;
};

type CreatedMidpoints = {
    midpoints: Point[];
    graphEdges: Array<[number, number]>;
    links: FruchtermanReingoldLink[];
};

const DEFAULT_MAX_ITERATIONS = 250;
const DEFAULT_INITIAL_TEMPERATURE = 1.5;
const DEFAULT_COOLING_FACTOR = 0.95;

function createMidpoint(
    from: Point,
    to: Point,
    link: FruchtermanReingoldInputLink,
    linkKeys: Set<string>,
): Point {
    if (from.x === to.x && from.y === to.y) {
        return {
            x: from.x,
            y: from.y - 40,
            dispX: 0,
            dispY: 0,
            nx: 0,
            ny: -1,
        };
    }

    const { x: nx, y: ny } = normal(
        { x: from.x, y: from.y },
        { x: to.x, y: to.y },
    );
    const offset = linkKeys.has(`${link.to}:${link.from}`)
        ? 5
        : 0;

    return {
        x: (from.x + to.x) / 2 + nx * offset,
        y: (from.y + to.y) / 2 + ny * offset,
        dispX: 0,
        dispY: 0,
        nx,
        ny,
    };
}

function createMidpoints(
    vertices: Point[],
    links: FruchtermanReingoldInputLink[],
): CreatedMidpoints {
    const midpoints: Point[] = [];
    const graphEdges: Array<[number, number]> = [];
    const linksResult: FruchtermanReingoldLink[] = [];
    const linkKeys = new Set(
        links.map((link) => `${link.from}:${link.to}`),
    );

    for (const link of links) {
        const from = vertices[link.from];
        const to = vertices[link.to];

        if (!from || !to) {
            throw new Error(
                `Link ${link.from} -> ${link.to} references a missing vertex.`,
            );
        }

        const midpoint = createMidpoint(from, to, link, linkKeys);
        const midpointIndex = midpoints.length;
        const pointIndex = vertices.length + midpointIndex;

        midpoints.push(midpoint);
        graphEdges.push(
            [link.from, pointIndex],
            [pointIndex, link.to],
        );
        linksResult.push({
            from: link.from,
            to: link.to,
            mid: midpointIndex,
        });
    }

    return {
        midpoints,
        graphEdges,
        links: linksResult,
    };
}

export function FruchtermanReingoldMethod(
    positions: Vector[],
    links: FruchtermanReingoldInputLink[],
    parameters: FruchtermanReingoldParameters,
): FruchtermanReingoldResult {
    const stiffness = parameters.stiffness;

    if (!Number.isFinite(stiffness) || stiffness <= 0) {
        throw new Error(
            "FruchtermanReingoldMethod stiffness must be positive.",
        );
    }

    const maxIterations = parameters.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    const initialTemperature = parameters.initialTemperature ?? DEFAULT_INITIAL_TEMPERATURE;
    const coolingFactor = parameters.coolingFactor ?? DEFAULT_COOLING_FACTOR;

    if (!Number.isFinite(maxIterations) || maxIterations < 0) {
        throw new Error(
            "FruchtermanReingoldMethod maxIterations must be a non-negative number.",
        );
    }

    if (
        !Number.isFinite(initialTemperature) ||
        initialTemperature <= 0
    ) {
        throw new Error(
            "FruchtermanReingoldMethod initialTemperature must be positive.",
        );
    }

    if (
        !Number.isFinite(coolingFactor) ||
        coolingFactor <= 0 ||
        coolingFactor > 1
    ) {
        throw new Error(
            "FruchtermanReingoldMethod coolingFactor must be in the range (0, 1].",
        );
    }

    const vertices: Point[] = positions.map((position) => ({
        x: position.x,
        y: position.y,
        dispX: 0,
        dispY: 0,
        nx: 0,
        ny: 0,
    }));
    const {
        midpoints: midpointVertices,
        graphEdges,
        links: linksResult,
    } = createMidpoints(vertices, links);
    const points = [...vertices, ...midpointVertices];

    let temperature = initialTemperature;
    const attractiveForce = (x: number) => Math.pow(x, 2) / stiffness;
    const repulsiveForce = (x: number) => Math.pow(stiffness, 2) / x;

    for (let i = 0; i < maxIterations; i++) {
        for (let v of points) {
            v.dispX = 0;
            v.dispY = 0;

            for (let u of points) {
                if (v == u)
                    continue;

                const deltaX = v.x - u.x;
                const deltaY = v.y - u.y;
                const delta = distance({ x: deltaX, y: deltaY });

                if (delta === 0)
                    continue;

                const repulsiveF = repulsiveForce(delta);
                v.dispX += (deltaX / delta) * repulsiveF;
                v.dispY += (deltaY / delta) * repulsiveF;
            }
        }

        for (let [fromIndex, toIndex] of graphEdges) {
            const v = points[fromIndex];
            const u = points[toIndex];

            const deltaX = v.x - u.x;
            const deltaY = v.y - u.y;
            const delta = distance({ x: deltaX, y: deltaY });

            if (delta === 0)
                continue;

            const attractiveF = attractiveForce(delta);

            v.dispX -= (deltaX / delta) * attractiveF;
            v.dispY -= (deltaY / delta) * attractiveF;

            u.dispX += (deltaX / delta) * attractiveF;
            u.dispY += (deltaY / delta) * attractiveF;
        }

        for (let v of midpointVertices) {
            const disp = distance({ x: v.dispX, y: v.dispY });

            if (disp === 0)
                continue;

            v.dispX = (v.dispX / disp) * Math.min(disp, temperature * stiffness);
            v.dispY = (v.dispY / disp) * Math.min(disp, temperature * stiffness);

            const p = dot({ x: v.dispX, y: v.dispY }, { x: v.nx, y: v.ny });

            v.x += p * v.nx;
            v.y += p * v.ny;
        }

        temperature *= coolingFactor;
    }

    return {
        positions: vertices.map(v => ({ x: v.x, y: v.y })),
        midpoints: midpointVertices.map(v => ({ x: v.x, y: v.y })),
        links: linksResult,
    };
}

/**
 * @deprecated Use FruchtermanReingoldMethod.
 */
export class FRLayout {
    private readonly result: FruchtermanReingoldResult;

    constructor(
        positions: Vector[],
        links: FruchtermanReingoldInputLink[],
        parameters: FruchtermanReingoldParameters,
    ) {
        this.result = FruchtermanReingoldMethod(
            positions,
            links,
            parameters,
        );
    }

    run() {
        return this.result;
    }
}
