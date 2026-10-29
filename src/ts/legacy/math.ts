// @ts-nocheck
export function distance(A: number[]) {
    if (A.length > 2)
        throw new Error("Unsupported operation exception.");

    return Math.sqrt(
        Math.pow(A[0], 2)
        + Math.pow(A[1], 2)
    )
}

export function arg(v: number[]): number {
    if (v.length > 2)
        throw new Error("Unsupported operation exception.");

    const d = distance(v);
    let [x, y] = v;
    x /= d;
    y /= d;

    if (x >= 0 && y >= 0)
        return Math.acos(x);

    if (x <= 0 && y >= 0)
        return Math.acos(x);

    if (x <= 0 && y <= 0)
        return -Math.acos(x);

    if (x >= 0 && y <= 0)
        return Math.asin(y);
}

export function normal(A: number[], B: number[]): number[] {
    if (A.length > 2 || B.length > 2)
        throw new Error("Unsupported operation exception.");

    const a1 = B[0] - A[0];
    const a2 = B[1] - A[1];
    const l = distance([a1, a2]);

    return [-a2 / l, a1 / l];
}

export function dot(v: number[], u: number[]) {
    return v.reduce((accumulator, _, i) => accumulator + v[i] * u[i], 0);
}

export function det(m: number[][]): number {
    if (m.length === 1)
        return m[0][0];

    if (m.length === 2)
        return m[0][0] * m[1][1] - m[1][0] * m[0][1];

    if (m.length === 3)
        return m[0][0] * m[1][1] * m[2][2]
            + m[0][1] * m[1][2] * m[2][0]
            + m[0][2] * m[1][0] * m[2][1]
            - m[0][2] * m[1][1] * m[2][0]
            - m[0][0] * m[1][2] * m[2][1]
            - m[0][1] * m[1][0] * m[2][2];

    throw new Error("Unsupported operation exception.");
}

export function linearSolve(A: number[][], b: number[]): number[] {
    if (A.length > 2 || A[0].length > 2)
        throw new Error("Unsupported operation exception.");

    if (b.length !== A.length)
        throw new Error(`Incompatible shapes. (${A.length}, ${A[0].length}) and (${b.length})`);

    return [
        -(A[1][1] * b[0] - A[0][1] * b[1])
        / (A[0][1] * A[1][0] - A[0][0] * A[1][1]),
        -(-A[1][0] * b[0] + A[0][0] * b[1])
        / (A[0][1] * A[1][0] - A[0][0] * A[1][1])
    ]
}

const INF: number = 1000;

export function floyd(w: number[][]): number[][] {
    const n = w.length;

    let d = [...Array(n)].map((_, row) => {
        return w[row].map((el, col) => col === row || el === 0 ? INF : el);
    });

    for (let k = 0; k < n; k++)
        for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
                d[i][j] = Math.min(
                    d[i][j],
                    d[i][k] + d[k][j]
                );

    return d;
}

export function isLeftTriple(points: number[][]): boolean {
    if (points.length > 3)
        throw new Error("Unsupported operation exception.");

    const [x, y, z] = points;
    const ax = z[0] - x[0];
    const ay = z[1] - x[1];

    return dot([y[0] - x[0], y[1] - x[1]], [ay, -ax]) < 0;
}

export function circleCenter(points: number[][]): number[] {
    if (points.length > 3)
        throw new Error("Unsupported operation exception.");

    let [[x1, y1], [x2, y2], [x3, y3]] = points;

    if (x2 - x1 === 0 || x3 - x2 === 0)
        x2 += 0.1;

    let ma = (y2 - y1) / (x2 - x1);
    const mb = (y3 - y2) / (x3 - x2);

    if (Math.abs(ma) < 0.001)
        ma = Math.sign(ma) * 0.001;

    let x = 0;

    if (mb - ma !== 0)
        x = (ma * mb * (y1 - y3)
            + mb * (x1 + x2)
            - ma * (x2 + x3))
            / (2 * (mb - ma));

    return [
        x,
        (x - (x1 + x2) / 2) / (-ma)
        + (y1 + y2) / 2
    ];
}

export function arcSegmentPoint(points: number[][], line: number[][]): number[] {
    let [[x1, y1], [x2, y2], [x3, y3]] = points;

    const [ax, ay] = [x2 - x1, y2 - y1];

    if (Math.abs(det([[ax, ay], [x3 - x2, y3 - y2]])) < 0.001) {
        const l = distance([ax, ay]);

        [x2, y2] = [x2 - 5 * ay / l, y2 + 5 * ax / l];
    }

    const [x0, y0] = circleCenter([[x1, y1], [x2, y2], [x3, y3]]);
    const r = distance([x0 - x3, y0 - y3]);
    const leftQ1 = isLeftTriple([[x1, y1], [x2, y2], [x3, y3]]);
    const [[xa, ya], [xb, yb]] = line;

    const d = Math.pow(xa - xb, 2) + Math.pow(ya - yb, 2);
    const sqr = Math.pow(r, 2) * d
        - Math.pow(
            - xb * y0
            - x0 * ya
            + xb * ya
            + xa * (y0 - yb)
            + x0 * yb,
            2)

    if (sqr < 0)
        return [];

    const t1 = ((xa - x0) * (xa - xb)
        + Math.pow(ya, 2)
        + y0 * yb
        - ya * (y0 + yb)
        - Math.sqrt(sqr)
    ) / d;

    if (0 <= t1 && t1 <= 1) {
        let [x, y] = [(1 - t1) * xa + t1 * xb, (1 - t1) * ya + t1 * yb];

        let leftQ2 = isLeftTriple([[x1, y1], [x, y], [x3, y3]]);

        if (leftQ1 === leftQ2)
            return [x, y];
    }

    const t2 = ((xa - x0) * (xa - xb)
        + Math.pow(ya, 2)
        + y0 * yb
        - ya * (y0 + yb)
        + Math.sqrt(sqr)
    ) / d;

    if (0 <= t2 && t2 <= 1) {
        let [x, y] = [(1 - t2) * xa + t2 * xb, (1 - t2) * ya + t2 * yb];

        let leftQ2 = isLeftTriple([
            [x1, y1],
            [x, y],
            [x3, y3]
        ]);

        if (leftQ1 === leftQ2)
            return [x, y];
    }

    return [];
}

export function arcRectPoint(arc: number[][], rect: number[]): number[] {
    const [x0, y0, width, height] = rect;
    const lines = [
        [[x0, y0], [x0, y0 + height]],
        [[x0, y0], [x0 + width, y0]],
        [[x0 + width, y0], [x0 + width, y0 + height]],
        [[x0, y0 + height], [x0 + width, y0 + height]]
    ]

    for (let line of lines) {
        const result = arcSegmentPoint(arc, line);

        if (result.length > 0)
            return result
    }

    return [];
}

export function hasIntersection(rect1: number[], rect2: number[]) {
    let [x1, y1, w1, h1] = rect1;
    let [x2, y2, w2, h2] = rect2;

    if ((x2 < x1 && x1 < x2 + w2) || (x2 < x1 + w1 && x1 + w1 < x2 + w2)) {
        return (y2 < y1 && y1 < y2 + h2) || (y2 < y1 + h1 && y1 + h1 < y2 + h2);
    }

    return false;
}
