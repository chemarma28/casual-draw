import { floyd, linearSolve } from "./math";

export class KKLayout {
    private l: number[][];
    private k: number[][];
    private x: number[];
    private y: number[];
    private epsilon: number = 0.1;

    constructor(adjacency: number[][], L0: number, K: number) {
        const n = adjacency.length;

        for (let i = 0; i < n; i++)
            for (let j = 0; j < i; j++)
                if (i !== j)
                    adjacency[i][j] = adjacency[j][i] = Math.max(adjacency[i][j], adjacency[j][i]);

        let d = floyd(adjacency);
        let max = d[0][0];

        for (let j = 0; j < n; j++)
            for (let i = 0; i < j; i++)
                max = Math.max(d[i][j], max);

        const L = L0 / max;

        this.l = [...Array(n)].map((_, row) => {
            return d[row].map(el => L * el);
        });

        this.k = [...Array(n)].map((_, row) => {
            return d[row].map(el => K / Math.pow(el, 2));
        });

        this.x = Array(n);
        this.y = Array(n);

        for (let i = 1; i <= n; i++) {
            this.x[i - 1] = L0 * Math.cos(2 * Math.PI * i / n);
            this.y[i - 1] = L0 * Math.sin(2 * Math.PI * i / n);
        }
    }

    public run() {
        const n = this.x.length;
        let maxDelta = 0;
        let m = 0;

        do {
            maxDelta = 0;
            m = 0;

            for (let i = 0; i < n; i++) {
                let delta = Math.sqrt(
                    Math.pow(this.partialX(i), 2)
                    + Math.pow(this.partialY(i), 2)
                );

                if (delta > maxDelta) {
                    maxDelta = delta;
                    m = i;
                }
            }

            this.optimize(m);
        } while (maxDelta > this.epsilon);
    }

    public getX() {
        return this.x;
    }

    public getY() {
        return this.y;
    }

    private optimize(m: number) {
        let delta = 0;

        do {
            const [dx, dy] = linearSolve([
                [this.partialX_2(m), this.partialXY(m)],
                [this.partialXY(m), this.partialY_2(m)]
            ], [
                -this.partialX(m),
                -this.partialY(m)
            ]);

            this.x[m] += dx;
            this.y[m] += dy;

            delta = Math.sqrt(
                Math.pow(this.partialX(m), 2)
                + Math.pow(this.partialY(m), 2)
            );
        } while (delta > this.epsilon);
    }

    private partialX(m: number): number {
        let sum = 0;
        const x = this.x;
        const y = this.y;
        const k = this.k;
        const l = this.l;

        for (let i = 0; i < this.k.length; i++) {
            if (i === m)
                continue;

            sum += k[m][i] * (
                x[m] - x[i]
                - l[m][i] * (x[m] - x[i])
                / Math.sqrt(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2)
                )
            );
        }

        return sum;
    }

    private partialY(m: number): number {
        let sum = 0;
        const x = this.x;
        const y = this.y;
        const k = this.k;
        const l = this.l;

        for (let i = 0; i < this.k.length; i++) {
            if (i === m)
                continue;

            sum += k[m][i] * (
                y[m] - y[i]
                - l[m][i] * (y[m] - y[i])
                / Math.sqrt(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2)
                )
            );
        }

        return sum;
    }

    private partialX_2(m: number): number {
        let sum = 0;
        const x = this.x;
        const y = this.y;
        const k = this.k;
        const l = this.l;

        for (let i = 0; i < this.k.length; i++) {
            if (i === m)
                continue;

            sum += k[m][i] * (
                1 - l[m][i]
                * Math.pow(y[m] - y[i], 2)
                / Math.pow(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                    3 / 2
                )
            );
        }

        return sum;
    }

    private partialY_2(m: number): number {
        let sum = 0;
        const x = this.x;
        const y = this.y;
        const k = this.k;
        const l = this.l;

        for (let i = 0; i < this.k.length; i++) {
            if (i === m)
                continue;

            sum += k[m][i] * (
                1 - l[m][i]
                * Math.pow(x[m] - x[i], 2)
                / Math.pow(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                    3 / 2
                )
            );
        }

        return sum;
    }

    private partialXY(m: number): number {
        let sum = 0;
        const x = this.x;
        const y = this.y;
        const k = this.k;
        const l = this.l;

        for (let i = 0; i < this.k.length; i++) {
            if (i === m)
                continue;

            sum += k[m][i] * (
                l[m][i]
                * (x[m] - x[i])
                * (y[m] - y[i])
                / Math.pow(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                    3 / 2
                )
            );
        }

        return sum;
    }
}