import { floyd, linearSolve, Vector } from "./math";

export type KamadaKawaiParameters = {
    length: number;
    strength: number;
    epsilon?: number;
    maxIterations?: number;
    maxOptimizeIterations?: number;
};

const DEFAULT_EPSILON = 0.1;
const DEFAULT_MAX_ITERATIONS = 500;
const DEFAULT_MAX_OPTIMIZE_ITERATIONS = 100;

export function KamadaKawaiMethod(
    adjacency: number[][],
    parameters: KamadaKawaiParameters,
): Vector[] {
    const n = adjacency.length;

    if (n === 0) return [];

    const L0 = parameters.length;
    const K = parameters.strength;
    const epsilon = parameters.epsilon ?? DEFAULT_EPSILON;
    const maxIterations =
        parameters.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    const maxOptimizeIterations =
        parameters.maxOptimizeIterations ??
        DEFAULT_MAX_OPTIMIZE_ITERATIONS;

    const matrix = adjacency.map((row) => [...row]);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (i !== j) {
                matrix[i][j] = matrix[j][i] = Math.max(
                    matrix[i][j],
                    matrix[j][i],
                );
            }
        }
    }

    const d = floyd(matrix);
    let max = d[0][0];

    for (let j = 0; j < n; j++) {
        for (let i = 0; i < j; i++) {
            max = Math.max(d[i][j], max);
        }
    }

    const L = L0 / max;
    const idealLengths = [...Array(n)].map((_, row) => {
        return d[row].map((el) => L * el);
    });
    const weights = [...Array(n)].map((_, row) => {
        return d[row].map((el) => K / Math.pow(el, 2));
    });

    const x = Array(n);
    const y = Array(n);

    for (let i = 1; i <= n; i++) {
        x[i - 1] = L0 * Math.cos((2 * Math.PI * i) / n);
        y[i - 1] = L0 * Math.sin((2 * Math.PI * i) / n);
    }

    const partialX = (m: number): number => {
        let sum = 0;

        for (let i = 0; i < weights.length; i++) {
            if (i === m) continue;

            sum += weights[m][i] * (
                x[m] - x[i]
                - idealLengths[m][i] * (x[m] - x[i])
                / Math.sqrt(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                )
            );
        }

        return sum;
    };

    const partialY = (m: number): number => {
        let sum = 0;

        for (let i = 0; i < weights.length; i++) {
            if (i === m) continue;

            sum += weights[m][i] * (
                y[m] - y[i]
                - idealLengths[m][i] * (y[m] - y[i])
                / Math.sqrt(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                )
            );
        }

        return sum;
    };

    const partialX_2 = (m: number): number => {
        let sum = 0;

        for (let i = 0; i < weights.length; i++) {
            if (i === m) continue;

            sum += weights[m][i] * (
                1 - idealLengths[m][i]
                * Math.pow(y[m] - y[i], 2)
                / Math.pow(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                    3 / 2,
                )
            );
        }

        return sum;
    };

    const partialY_2 = (m: number): number => {
        let sum = 0;

        for (let i = 0; i < weights.length; i++) {
            if (i === m) continue;

            sum += weights[m][i] * (
                1 - idealLengths[m][i]
                * Math.pow(x[m] - x[i], 2)
                / Math.pow(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                    3 / 2,
                )
            );
        }

        return sum;
    };

    const partialXY = (m: number): number => {
        let sum = 0;

        for (let i = 0; i < weights.length; i++) {
            if (i === m) continue;

            sum += weights[m][i] * (
                idealLengths[m][i]
                * (x[m] - x[i])
                * (y[m] - y[i])
                / Math.pow(
                    Math.pow(x[m] - x[i], 2)
                    + Math.pow(y[m] - y[i], 2),
                    3 / 2,
                )
            );
        }

        return sum;
    };

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let maxDelta = 0;
        let maxIndex = 0;

        for (let i = 0; i < n; i++) {
            const delta = Math.sqrt(
                Math.pow(partialX(i), 2)
                + Math.pow(partialY(i), 2),
            );

            if (delta > maxDelta) {
                maxDelta = delta;
                maxIndex = i;
            }
        }

        if (maxDelta <= epsilon) break;

        for (let i = 0; i < maxOptimizeIterations; i++) {
            const [dx, dy] = linearSolve([
                [partialX_2(maxIndex), partialXY(maxIndex)],
                [partialXY(maxIndex), partialY_2(maxIndex)],
            ], [
                -partialX(maxIndex),
                -partialY(maxIndex),
            ]);

            x[maxIndex] += dx;
            y[maxIndex] += dy;

            const delta = Math.sqrt(
                Math.pow(partialX(maxIndex), 2)
                + Math.pow(partialY(maxIndex), 2),
            );

            if (delta <= epsilon) break;
        }
    }

    return x.map((value, index) => ({
        x: value,
        y: y[index],
    }));
}
