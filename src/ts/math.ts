const INF: number = 1000;

export type Vector = { x: number; y: number };

export type Rectangle = {
    x: Vector;
    width: number;
    height: number;
};

export type Arc = {
    begin: Vector;
    mid: Vector;
    end: Vector;
};

export type RectangleEdges = {
    north: [Vector, Vector];
    west: [Vector, Vector];
    south: [Vector, Vector];
    east: [Vector, Vector];
};

export interface Boundary {
    bound(): Rectangle;
}

type Matrix2d = [[number, number], [number, number]];
type Matrix3d = [
    [number, number, number],
    [number, number, number],
    [number, number, number],
];
type VectorColumn = [number, number];

function edges(b: Rectangle): RectangleEdges {
    const { x: x0, width, height } = b;
    const { x, y } = x0;

    const x00 = { x, y };
    const x01 = { x: x, y: y + height };
    const x11 = { x: x + width, y: y + height };
    const x10 = { x: x + width, y: y };

    return {
        north: [x10, x00],
        west: [x00, x01],
        south: [x01, x11],
        east: [x11, x10],
    };
}

export function distance(A: Vector) {
    return Math.sqrt(Math.pow(A.x, 2) + Math.pow(A.y, 2));
}

export function arg(v: Vector): number {
    const d = distance(v);

    let { x, y } = v;

    x /= d;
    y /= d;

    if (x >= 0 && y >= 0) return Math.acos(x);

    if (x <= 0 && y >= 0) return Math.acos(x);

    if (x <= 0 && y <= 0) return -Math.acos(x);

    if (x >= 0 && y <= 0) return Math.asin(y);
}

export function normal(A: Vector, B: Vector): Vector {
    const x = B.x - A.x;
    const y = B.y - A.y;

    const l = distance({ x, y });

    return { x: -y / l, y: x / l };
}

export function dot(v: Vector, u: Vector): number {
    return v.x * u.x + v.y + u.y;
}

export function det(m: [[number]] | Matrix3d | Matrix2d): number {
    if (m.length === 1) return m[0][0];

    if (m.length === 2) return m[0][0] * m[1][1] - m[1][0] * m[0][1];

    if (m.length === 3)
        return (
            m[0][0] * m[1][1] * m[2][2] +
            m[0][1] * m[1][2] * m[2][0] +
            m[0][2] * m[1][0] * m[2][1] -
            m[0][2] * m[1][1] * m[2][0] -
            m[0][0] * m[1][2] * m[2][1] -
            m[0][1] * m[1][0] * m[2][2]
        );

    return 0;
}

export function linearSolve(A: Matrix2d, b: VectorColumn): number[] {
    return [
        -(A[1][1] * b[0] - A[0][1] * b[1]) /
            (A[0][1] * A[1][0] - A[0][0] * A[1][1]),
        -(-A[1][0] * b[0] + A[0][0] * b[1]) /
            (A[0][1] * A[1][0] - A[0][0] * A[1][1]),
    ];
}

export function floyd(w: number[][]): number[][] {
    const n = w.length;

    let d = [...Array(n)].map((_, row) => {
        return w[row].map((el, col) => (col === row || el === 0 ? INF : el));
    });

    for (let k = 0; k < n; k++)
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                d[i][j] = Math.min(d[i][j], d[i][k] + d[k][j]);

    return d;
}

export function clockwise(begin: Vector, mid: Vector, end: Vector): boolean {
    const v = { x: mid.x - begin.x, y: mid.y - begin.y };
    const u = { x: end.x - mid.x, y: end.y - mid.y };

    return 0 < v.x * u.y - u.x * v.y;
}

// rename to counterclockwise
export function isLeftTriple(points: Vector[]): boolean {
    const [p1, p2, p3] = points;
    const ax = p3.x - p1.x;
    const ay = p3.y - p1.y;

    return dot({ x: p2.x - p1.x, y: p2.y - p1.y }, { x: ay, y: -ax }) < 0;
}

export function circumcenter(A: Vector, B: Vector, C: Vector): Vector {
    const m1 = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const m2 = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };

    const n1 = { x: A.y - B.y, y: B.x - A.x };
    const n2 = { x: B.y - C.y, y: C.x - B.x };

    const t =
        (n1.x * (m2.y - m1.y) - n1.y * (m2.x - m1.x)) /
        (n1.y * n2.x - n1.x * n2.y);

    const x = m2.x + n2.x * t;
    const y = m2.y + n2.y * t;

    return { x, y };
}

// remove later
export function circleCenter() {
    return [0, 0];
}

// renamte to arcAndSegmentIntersection
export function arcSegmentPoint(
    arc: Arc,
    segment: [Vector, Vector],
): Vector | undefined {
    return undefined;
}

// rename to arcAndBoundaryIntersection
export function arcRectPoint(arc: Arc, b: Rectangle): Vector | null {
    const { north, west, south, east } = edges(b);

    const intersections = [];

    for (let bound of [north, west, south, east]) {
        const intersection = arcSegmentPoint(arc, bound);

        if (undefined != intersection) intersections.push(intersection);
    }

    const min = 0;
    let index = -1;

    for (let i = 0; i < intersections.length; ++i) {
        const point = intersections[i];
        const d = distance({
            x: point.x - arc.begin.x,
            y: point.y - arc.begin.y,
        });

        if (d < min) index = i;
    }

    return -1 < index ? intersections[index] : null;
}

// rename to intersects
export function hasIntersection(b1: Rectangle, b2: Rectangle): boolean {
    const { x: x10, width: w1, height: h1 } = b1;
    const { x: x20, width: w2, height: h2 } = b2;
    const { x: x1, y: y1 } = x10;
    const { x: x2, y: y2 } = x20;

    return (
        Math.max(x1, x2) <= Math.min(x1 + w1, x2 + w2) ||
        Math.max(y1, y2) <= Math.min(y1 + h1, y2 + h2)
    );
}
