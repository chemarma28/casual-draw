// @ts-nocheck
import { distance, normal, dot } from "../math.js";

class FRVertex {
    public x: number;
    public y: number;
    public dispX: number;
    public dispY: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

class FRDummyVertex extends FRVertex {
    public nx: number;
    public ny: number;

    constructor(x: number, y: number, nx: number, ny: number) {
        super(x, y);

        const l = distance([nx, ny]);

        this.nx = nx / l;
        this.ny = ny / l;
    }
}

class FREdge {
    public from: FRVertex;
    public to: FRVertex;

    constructor(from: FRVertex, to: FRVertex) {
        this.from = from;
        this.to = to;
    }
}

export class FRLayout {
    private k: number;
    private maxIterations: number = 250;
    private vertices: Array<FRVertex>;
    private edges: Array<FREdge>;
    private layout: number[][];
    private dummiesIndices: Set<number>;

    constructor(adjacency: number[][], x: number[], y: number[], k: number) {
        this.k = k;
        this.vertices = [];
        this.edges = [];
        this.layout = [];
        this.dummiesIndices = new Set();
        const n = adjacency.length;

        let lastVertexIndex = 0;

        for (let i = 0; i < n; i++) {
            const v = new FRVertex(x[i], y[i]);
            this.vertices.push(v);
            lastVertexIndex += 1;
        }

        for (let i = 0; i < n; i++) {
            const v = this.vertices[i];
            for (let j = 0; j < n; j++) {
                if (adjacency[i][j] !== 0 && i !== j) {
                    const u = this.vertices[j];
                    const [nx, ny] = normal([v.x, v.y], [u.x, u.y]);

                    const dummy = new FRDummyVertex(
                        (v.x + u.x) / 2,
                        (v.y + u.y) / 2,
                        nx, ny
                    );

                    this.edges.push(new FREdge(v, dummy), new FREdge(dummy, u));
                    this.vertices.push(dummy);
                    this.dummiesIndices.add(lastVertexIndex);
                    this.layout.push([i, lastVertexIndex++, j]);

                    if (adjacency[j][i] !== 0) {
                        const d = new FRDummyVertex(
                            (v.x + u.x) / 2 - 5 * nx,
                            (v.y + u.y) / 2 - 5 * ny,
                            -nx, -ny
                        );

                        this.edges.push(new FREdge(v, d), new FREdge(d, u));
                        this.vertices.push(d);
                        this.dummiesIndices.add(lastVertexIndex);
                        this.layout.push([j, lastVertexIndex++, i]);

                        adjacency[j][i] = 0;
                    }
                }
            }
        }
    }

    public run() {
        let temperature = 1.5;

        for (let i = 0; i < this.maxIterations; i++) {
            this.calculateRepulsiveForces();
            this.calculateAttractiveForces();

            for (let v of this.vertices) {
                if (v instanceof FRDummyVertex) {
                    const disp = distance([v.dispX, v.dispY]);

                    v.dispX = (v.dispX / disp) * Math.min(disp, temperature * this.k);
                    v.dispY = (v.dispY / disp) * Math.min(disp, temperature * this.k);

                    const p = dot([v.dispX, v.dispY], [v.nx, v.ny]);

                    v.x += p * v.nx;
                    v.y += p * v.ny;
                }
            }

            temperature = 0.95 * temperature;
        }
    }

    public getX() {
        return this.vertices.map(v => v.x);
    }

    public getY() {
        return this.vertices.map(v => v.y);
    }

    public getLayout() {
        return this.layout;
    }

    public getDummiesIndices() {
        return this.dummiesIndices;
    }

    private attrativeForce(x: number): number {
        return Math.pow(x, 2) / this.k;
    }

    private repulsiveForce(x: number): number {
        return Math.pow(this.k, 2) / x;
    }

    private calculateRepulsiveForces() {
        for (let v of this.vertices) {
            v.dispX = 0;
            v.dispY = 0;

            for (let u of this.vertices) {
                if (v == u)
                    continue;

                const deltaX = v.x - u.x;
                const deltaY = v.y - u.y;
                const delta = distance([deltaX, deltaY]);

                const repulsiveF = this.repulsiveForce(delta);
                v.dispX += (deltaX / delta) * repulsiveF;
                v.dispY += (deltaY / delta) * repulsiveF;
            }
        }
    }

    private calculateAttractiveForces() {
        for (let edge of this.edges) {
            const v = edge.from;
            const u = edge.to;

            const deltaX = v.x - u.x;
            const deltaY = v.y - u.y;
            const delta = distance([deltaX, deltaY]);
            const attractiveF = this.attrativeForce(delta);

            v.dispX -= (deltaX / delta) * attractiveF;
            v.dispY -= (deltaY / delta) * attractiveF;

            u.dispX += (deltaX / delta) * attractiveF;
            u.dispY += (deltaY / delta) * attractiveF
        }
    }
}