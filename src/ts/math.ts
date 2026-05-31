const INF: number = 1000;

export type Vector = { x: number; y: number };

export type Circumference = {
    origin: Vector;
    r: number;
};

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

export type Bounds = {
    north: [Vector, Vector];
    west: [Vector, Vector];
    south: [Vector, Vector];
    east: [Vector, Vector];
};

type Matrix2 = [[number, number], [number, number]];

type Matrix3 = [
    [number, number, number],
    [number, number, number],
    [number, number, number],
];

export function rectangleBounds(b: Rectangle): Bounds {
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

export function circleBoundingRectangle(c: Circumference): Rectangle {
    return {
        x: { x: c.origin.x - c.r, y: c.origin.y - c.r },
        width: 2 * c.r,
        height: 2 * c.r,
    };
}

export function distance(v: Vector) {
    return Math.sqrt(distance2(v));
}

export function distance2(v: Vector) {
    return Math.pow(v.x, 2) + Math.pow(v.y, 2);
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

export function det(m: [[number]] | Matrix3 | Matrix2): number {
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

export function linearSolve(A: Matrix2, b: [number, number]): number[] {
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

export type Vertex = number | string;

export type Edge = {
    begin: Vertex;
    end: Vertex;
    weight: number;
};

export class GraphDefinition {
    vertices = new Set<Vertex>();
    edges = new Set<Edge>();

    join(v: Vertex, u: Vertex, weight = 1) {
        this.vertices.add(v);
        this.vertices.add(u);

        this.edges.add({ begin: v, end: u, weight });
    }

    bijoin(v: Vertex, u: Vertex, weight = 1) {
        this.join(u, v, weight);
        this.join(v, u, weight);
    }
}

export class IndexedVerticesGraph {
    edges: Set<Edge>;
    // purpose is to fast obtain index by vertex
    private vertices: Map<Vertex, number>;
    // purpose is to fast obtain vertex by index
    verts: Vertex[];

    constructor(source: GraphDefinition) {
        const size = source.vertices.size;

        this.vertices = new Map<Vertex, number>();
        this.verts = new Array<Vertex>(size);

        let index = 0;

        for (let v of source.vertices) {
            this.vertices.set(v, index);
            this.verts[index] = v;
            ++index;
        }

        this.edges = source.edges;
    }

    vertex(index: number) {
        return this.verts[index];
    }

    index(v: Vertex): number {
        return this.vertices.get(v);
    }

    size(): number {
        return this.verts.length;
    }

    adjacency(): number[][] {
        const size = this.vertices.size;

        const matrix = [...Array(size)].map(() => {
            const row = [...Array(size)];

            for (let col = 0; col < size; ++col) row[col] = 0;

            return row;
        });

        for (let edge of this.edges) {
            const begin = this.vertices.get(edge.begin);
            const end = this.vertices.get(edge.end);

            matrix[begin][end] = edge.weight;
        }

        return matrix;
    }
}
