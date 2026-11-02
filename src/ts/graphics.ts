import {
    circumcenter,
    clockwise,
    det,
    distance,
    normal,
    Rectangle,
    Vector,
} from "./math";

export class Circumference {
    center!: Vector;
    r!: number;

    constructor(p1: Vector, p2: Vector, p3: Vector) {
        this.circumsribe(p1, p2, p3);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();

        ctx.arc(this.center.x, this.center.y, this.r, 0, 2 * Math.PI);

        ctx.stroke();
    }

    circumsribe(p1: Vector, p2: Vector, p3: Vector) {
        this.center = circumcenter(p1, p2, p3);
        this.r = distance({ x: p1.x - this.center.x, y: p1.y - this.center.y });
    }
}

export class Arc {
    begin: Vector;
    mid: Vector;
    end: Vector;
    counterclockwise: boolean = true;
    center!: Vector;
    r!: number;
    phi1!: number;
    phi2!: number;

    constructor(begin: Vector, mid: Vector, end: Vector) {
        this.begin = begin;
        this.mid = mid;
        this.end = end;

        this.arcscribe(begin, mid, end);
    }

    draw(ctx: CanvasRenderingContext2D, lineWidth = 1.5) {
        ctx.save();

        ctx.beginPath();
        ctx.lineWidth = lineWidth;

        ctx.arc(
            this.center.x,
            this.center.y,
            this.r,
            this.phi1,
            this.phi2,
            this.counterclockwise,
        );

        ctx.stroke();

        ctx.restore();
    }

    arcscribe(begin: Vector, mid: Vector, end: Vector) {
        const chord = distance({
            x: end.x - begin.x,
            y: end.y - begin.y,
        });

        if (chord === 0) {
            this.center = { x: begin.x, y: begin.y };
            this.r = 0;
            this.phi1 = 0;
            this.phi2 = 0;
            this.counterclockwise = true;
            return;
        }

        let adjustedMid = mid;

        if (Number.isNaN(mid.x) || Number.isNaN(mid.y)) {
            const n = normal(begin, end);
            const offset = chord / 12;

            adjustedMid = {
                x: (begin.x + end.x) / 2 + n.x * offset,
                y: (begin.y + end.y) / 2 + n.y * offset,
            };
        }

        const cross = det([
            [adjustedMid.x - begin.x, adjustedMid.y - begin.y],
            [end.x - adjustedMid.x, end.y - adjustedMid.y],
        ]);

        if (Math.abs(cross) < 0.08) {
            const ax = adjustedMid.x - begin.x;
            const ay = adjustedMid.y - begin.y;
            const l = distance({ x: ax, y: ay });

            if (l > 0) {
                adjustedMid = {
                    x: adjustedMid.x + (8 * ay) / l,
                    y: adjustedMid.y - (8 * ax) / l,
                };
            }
        }

        this.mid = adjustedMid;

        const counterclockwise = !clockwise(begin, adjustedMid, end);
        const center = circumcenter(begin, adjustedMid, end);
        const r = distance({
            x: center.x - begin.x,
            y: center.y - begin.y,
        });

        const phi1 = Math.atan2(begin.y - center.y, begin.x - center.x);

        const phi2 = Math.atan2(end.y - center.y, end.x - center.x);

        this.counterclockwise = counterclockwise;
        this.center = center;
        this.r = r;
        this.phi1 = phi1;
        this.phi2 = phi2;
    }

    parameter(point: Vector) {
        const phi = Math.atan2(
            point.y - this.center.y,
            point.x - this.center.x,
        );

        let delta = this.counterclockwise
            ? this.phi1 - phi
            : phi - this.phi1;

        while (delta < 0) delta += 2 * Math.PI;
        while (delta >= 2 * Math.PI) delta -= 2 * Math.PI;

        return delta;
    }
}

export class Text {
    readonly x: number;
    readonly y: number;
    readonly lines: string[];
    readonly widths: number[];
    readonly lineHeight: number;
    readonly height: number;

    private readonly rect: Rectangle;

    constructor(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        expectedWidth: number,
    ) {
        const words = text.trim().split(" ").map((word) => word.trim());
        const lines: string[] = [];

        if (words.length < 1) {
            lines.push("");
        } else {
            lines.push(words[0]);
        }

        for (let i = 1; i < words.length; i++) {
            const line = lines.pop() as string;
            const newLine = line + " " + words[i];
            const width = ctx.measureText(newLine).width;

            if (width <= expectedWidth) {
                lines.push(newLine);
            } else {
                lines.push(line, words[i]);
            }
        }

        this.widths = lines.map((line) => ctx.measureText(line).width);

        const metrics = ctx.measureText(lines[0]);
        const ascent =
            metrics.fontBoundingBoxAscent ??
            metrics.actualBoundingBoxAscent ??
            0;
        const descent =
            metrics.fontBoundingBoxDescent ??
            metrics.actualBoundingBoxDescent ??
            0;

        this.lineHeight = ascent + descent;
        this.height =
            lines.length * this.lineHeight + 5 * (lines.length - 2);

        const maxWidth = Math.max(...this.widths);

        this.rect = {
            x: {
                x: x - maxWidth / 2 - 10,
                y: y - this.height / 2 - 10,
            },
            width: maxWidth + 20,
            height: this.height + 20,
        };

        this.x = x;
        this.y = y;
        this.lines = lines;
    }

    getBoundingRect(): Rectangle {
        return this.rect;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const maxWidth = Math.max(...this.widths);

        for (let i = 0; i < this.lines.length; i++) {
            const width = this.widths[i];
            const x = this.x - maxWidth / 2 + (maxWidth - width) / 2;
            const y =
                this.y -
                this.height / 2 +
                i * this.lineHeight +
                i * 5 +
                15;

            ctx.fillText(this.lines[i], x, y);
        }
    }
}

export class ArrowHead {
    readonly A: Vector;
    readonly B: Vector;
    readonly C: Vector;
    readonly arcX: number;
    readonly arcY: number;

    constructor(arc: Arc, joint: Vector, length: number) {
        const center = arc.center;
        const r = arc.r;
        const deltaPhi = r > 0 ? length / r : 0;

        // `Arc.counterclockwise` follows the canvas flag: a
        // counterclockwise arc decreases its angle from begin to end,
        // so step back along it by increasing the angle.
        const sign = arc.counterclockwise ? 1 : -1;

        const t =
            Math.atan2(joint.y - center.y, joint.x - center.x) +
            sign * deltaPhi;

        const cost = Math.cos(t);
        const sint = Math.sin(t);
        const x = center.x + r * cost;
        const y = center.y + r * sint;
        const nx = -cost;
        const ny = -sint;

        this.A = {
            x: x - (length * nx) / 2,
            y: y - (length * ny) / 2,
        };
        this.B = {
            x: x + (length * nx) / 2,
            y: y + (length * ny) / 2,
        };
        this.C = joint;
        this.arcX = x;
        this.arcY = y;
    }

    getBoundingRect(): Rectangle {
        const minX = Math.min(this.A.x, this.B.x, this.C.x);
        const maxX = Math.max(this.A.x, this.B.x, this.C.x);
        const minY = Math.min(this.A.y, this.B.y, this.C.y);
        const maxY = Math.max(this.A.y, this.B.y, this.C.y);

        return {
            x: { x: minX, y: minY },
            width: maxX - minX,
            height: maxY - minY,
        };
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.moveTo(this.A.x, this.A.y);
        ctx.lineTo(this.B.x, this.B.y);
        ctx.lineTo(this.C.x, this.C.y);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }
}

export class Delay {
    private readonly line1: [Vector, Vector];
    private readonly line2: [Vector, Vector];

    constructor(arc: Arc) {
        const { begin, mid, end } = arc;

        let ax = end.x - begin.x;
        let ay = end.y - begin.y;
        const la = distance({ x: ax, y: ay });

        if (la === 0) {
            ax = 1;
            ay = 0;
        } else {
            ax /= la;
            ay /= la;
        }

        const n =
            la === 0 ? { x: 0, y: 1 } : normal(begin, end);

        const x4 = mid.x + 10 * n.x;
        const y4 = mid.y + 10 * n.y;
        const x5 = mid.x - 10 * n.x;
        const y5 = mid.y - 10 * n.y;

        this.line1 = [
            { x: x4 + 2 * ax, y: y4 + 2 * ay },
            { x: x5 + 2 * ax, y: y5 + 2 * ay },
        ];

        this.line2 = [
            { x: x4 - 2 * ax, y: y4 - 2 * ay },
            { x: x5 - 2 * ax, y: y5 - 2 * ay },
        ];
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.moveTo(this.line1[0].x, this.line1[0].y);
        ctx.lineTo(this.line1[1].x, this.line1[1].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.line2[0].x, this.line2[0].y);
        ctx.lineTo(this.line2[1].x, this.line2[1].y);
        ctx.stroke();
    }
}

export function calculatePositionsForLabel(
    arrowHead: ArrowHead,
): Vector[] {
    const ax1 = arrowHead.A.x - arrowHead.C.x;
    const ay1 = arrowHead.A.y - arrowHead.C.y;
    const ax2 = arrowHead.B.x - arrowHead.C.x;
    const ay2 = arrowHead.B.y - arrowHead.C.y;

    const x = arrowHead.arcX;
    const y = arrowHead.arcY;
    const ax3 = arrowHead.B.x - x;
    const ay3 = arrowHead.B.y - y;
    const ax4 = arrowHead.B.x - x;
    const ay4 = arrowHead.B.y - y;

    return [
        {
            x: arrowHead.C.x + 2.5 * ax1,
            y: arrowHead.C.y + 2.5 * ay1,
        },
        {
            x: arrowHead.C.x + 2.5 * ax2,
            y: arrowHead.C.y + 2.5 * ay2,
        },
        { x: x + 3.5 * ax3, y: y + 3.5 * ay3 },
        { x: x + 3.5 * ax4, y: y + 3.5 * ay4 },
    ];
}
