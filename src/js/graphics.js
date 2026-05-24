// Legacy. Preparing to remove

import {
    circleCenter,
    distance,
    det,
    arg,
    isLeftTriple,
    arcRectPoint,
    normal,
} from "../ts/math";

export class Arc {
    constructor(carcass) {
        let [[x1, y1], [x2, y2], [x3, y3]] = carcass;

        if (isNaN(x2) || isNaN(y2)) {
            const [nx, ny] = normal([x1, y1], [x3, y3]);
            const l = distance([x3 - x1, y3 - y1]) / 12;
            [x2, y2] = [(x1 + x3) / 2 + l * nx, (y1 + y3) / 2 + l * ny];
        }

        const [ax, ay] = [x2 - x1, y2 - y1];

        if (
            Math.abs(
                det([
                    [ax, ay],
                    [x3 - x2, y3 - y2],
                ]),
            ) < 0.08
        ) {
            const l = distance([ax, ay]);

            [x2, y2] = [x2 + (8 * ay) / l, y2 - (8 * ax) / l];
        }

        [this.x, this.y] = circleCenter([
            [x1, y1],
            [x2, y2],
            [x3, y3],
        ]);
        this.isNearStraightLine =
            Math.abs(this.x) > 1000000 && Math.abs(this.y) > 1000000;

        if (!this.isNearStraightLine) {
            this.r = distance([this.x - x1, this.y - y1]);
            this.counterclockwise = !isLeftTriple([
                [x1, y1],
                [x2, y2],
                [x3, y3],
            ]);

            this.theta1 = arg([x3 - this.x, y3 - this.y]);
            this.theta2 = arg([x1 - this.x, y1 - this.y]);

            if (this.counterclockwise) {
                let t = this.theta1;
                this.theta1 = this.theta2;
                this.theta2 = t;
            }

            if (this.theta2 < this.theta1) {
                this.theta2 += 2 * Math.PI;
            }
        }

        this.carcass = [
            [x1, y1],
            [x2, y2],
            [x3, y3],
        ];
    }

    draw(ctx) {
        ctx.beginPath();

        if (this.isNearStraightLine) {
            ctx.moveTo(this.carcass[0][0], this.carcass[0][1]);
            lineTo(this.carcass[1][0], this.carcass[1][1]);
        } else {
            ctx.arc(this.x, this.y, this.r, this.theta1, this.theta2);
        }

        ctx.stroke();
    }
}

export class Arrow {
    constructor(arc, area, l) {
        this.arc = arc;
        this.l = l;

        const [x0, y0] = [arc.x, arc.y];
        const r = arc.r;

        const deltaPhi = l / r;
        const sign = arc.counterclockwise ? -1 : 1;

        const [jx, jy] = this.bind(area);

        const t = arg([jx - x0, jy - y0]) + sign * deltaPhi;
        const cost = Math.cos(t);
        const sint = Math.sin(t);
        const [x, y] = [x0 + r * cost, y0 + r * sint];
        const [nx, ny] = [-cost, -sint];

        [this.A, this.B, this.C] = [
            [x - (l * nx) / 2, y - (l * ny) / 2],
            [x + (l * nx) / 2, y + (l * ny) / 2],
            [jx, jy],
        ];

        this.arcX = x;
        this.arcY = y;
    }

    bind(area) {
        const b = area.boundary();
        const intersection = arcRectPoint(this.arc.carcass, b);

        return intersection.length > 0
            ? intersection
            : [this.arc.carcass[2][0], this.arc.carcass[2][1]];
    }

    boundary() {
        const minX = Math.min(this.A[0], this.B[0], this.C[0]);
        const maxX = Math.max(this.A[0], this.B[0], this.C[0]);
        const minY = Math.min(this.A[1], this.B[1], this.C[1]);
        const maxY = Math.max(this.A[1], this.B[1], this.C[1]);

        return [minX, minY, maxX - minX, maxY - minY];
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.lineTo(...this.A);
        ctx.lineTo(...this.B);
        ctx.lineTo(...this.C);
        ctx.stroke();
        ctx.fill();
    }
}

export class TextArea {
    constructor(str, x, y, limit, ctx) {
        this.words = this.words(str);
        this.limit = limit;

        this.x = x;
        this.y = y;

        this.measure(ctx);
    }

    measure(ctx) {
        this.lines = this.wrap((s) => ctx.measureText(s).width, this.limit);

        const w = this.lines.map((line) => ctx.measureText(line).width);
        const m = ctx.measureText(lines[0]);
        const lh = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;

        this.linew = w;
        this.w = Math.max(...w);
        this.h = this.lines.length * lh + 5 * (this.lines.length - 2);
        this.lh = lh;

        this.boundaries = [
            this.x - this.w / 2 - 10,
            y - this.h / 2 - 10,
            this.w + 20,
            this.h + 20,
        ];
    }

    words(str) {
        if (!str) return [""];

        return str
            .trim()
            .split(" ")
            .map((w) => w.trim());
    }

    boundary() {
        return this.boundaries;
    }

    wrap(measureCallback, limit) {
        const lines = this.words?.length < 1 ? [""] : [this.words[0]];

        this.words.forEach((word) => {
            const line = lines.pop();
            const bf = line + " " + word;

            const w = measureCallback.call(null, bf);

            if (w <= limit) lines.push(bf);
            else lines.push(line, word);
        });

        return lines;
    }

    draw(ctx) {
        const maxw = this.w;

        this.lines.forEach((line, i) => {
            const width = this.linew[i];
            const x = this.x - maxw / 2 + (maxw - width) / 2;
            const y = this.y - this.h / 2 + i * this.lh + i * 5 + 15;

            ctx.fillText(line, x, y);
        });
    }
}

export function calculatePositionsForLabel(arrowHead) {
    const [ax1, ay1] = [
        arrowHead.A[0] - arrowHead.C[0],
        arrowHead.A[1] - arrowHead.C[1],
    ];
    const [ax2, ay2] = [
        arrowHead.B[0] - arrowHead.C[0],
        arrowHead.B[1] - arrowHead.C[1],
    ];

    const [x, y] = [arrowHead.arcX, arrowHead.arcY];
    const [ax3, ay3] = [arrowHead.B[0] - x, arrowHead.B[1] - y];
    const [ax4, ay4] = [arrowHead.B[0] - x, arrowHead.B[1] - y];

    return [
        [arrowHead.C[0] + 2.5 * ax1, arrowHead.C[1] + 2.5 * ay1],
        [arrowHead.C[0] + 2.5 * ax2, arrowHead.C[1] + 2.5 * ay2],
        [x + 3.5 * ax3, y + 3.5 * ay3],
        [x + 3.5 * ax4, y + 3.5 * ay4],
    ];
}

export class Delay {
    constructor(ctx, arc) {
        this.ctx = ctx;
        this.arc = arc;

        const [[x1, y1], [x2, y2], [x3, y3]] = arc.cascade;

        let [ax, ay] = [x3 - x1, y3 - y1];
        const la = distance([ax, ay]);
        [ax, ay] = [ax / la, ay / la];

        const [nx, ny] = normal([x1, y1], [x3, y3]);
        const [x4, y4] = [x2 + 10 * nx, y2 + 10 * ny];
        const [x5, y5] = [x2 - 10 * nx, y2 - 10 * ny];

        this.line1 = [
            [x4 + 2 * ax, y4 + 2 * ay],
            [x5 + 2 * ax, y5 + 2 * ay],
        ];

        this.line2 = [
            [x4 - 2 * ax, y4 - 2 * ay],
            [x5 - 2 * ax, y5 - 2 * ay],
        ];
    }

    draw() {
        this.ctx.beginPath();
        this.ctx.moveTo(...this.line1[0]);
        this.ctx.lineTo(...this.line1[1]);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(...this.line2[0]);
        this.ctx.lineTo(...this.line2[1]);
        this.ctx.stroke();
    }
}
