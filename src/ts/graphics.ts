import {
    circumcenter,
    clockwise,
    distance,
    IndexedVerticesGraph,
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

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();

        ctx.beginPath();
        ctx.lineWidth = 1.5;

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
        const counterclockwise = !clockwise(begin, mid, end);
        const center = circumcenter(begin, mid, end);
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
}

export type Layout = {
    g: IndexedVerticesGraph;
    xs: number[];
    ys: number[];
};

export function circular(
    g: IndexedVerticesGraph,
    origin: Vector,
    r: number,
): Layout {
    const xs = Array(g.size());
    const ys = Array(g.size());

    const count = g.size();

    const delta = (2 * Math.PI) / count;
    let angle = 0;

    for (let v = 0; v < count; ++v) {
        xs[v] = origin.x + r * Math.cos(angle);
        ys[v] = origin.y + r * Math.sin(angle);

        angle += delta;
    }

    return { g, xs, ys };
}

export function drawRectlinearLayout(
    ctx: CanvasRenderingContext2D,
    layout: Layout,
    r = 7,
) {
    const g = layout.g;
    const edges = layout.g.edges;
    const xs = layout.xs;
    const ys = layout.ys;

    ctx.save();

    ctx.beginPath();
    ctx.lineWidth = 1.5;

    edges.forEach((e) => {
        const u = g.index(e.begin);
        const v = g.index(e.end);

        ctx.moveTo(xs[u], ys[u]);
        ctx.lineTo(xs[v], ys[v]);
    });

    ctx.stroke();

    ctx.font = "bold 22px serif";
    
    for (let v = 0; v < g.size(); ++v) {
        ctx.beginPath();
        ctx.fillStyle = "lightblue";
        ctx.arc(xs[v], ys[v], r, 0, 2 * Math.PI);

        ctx.fill();
        ctx.stroke();

        const text = g.vertex(v).toString();
        const measure = ctx.measureText(text);
        const w = measure.width;

        ctx.fillStyle = "grey";
        ctx.fillText(text, xs[v] - w / 2, ys[v] - 2 * r);
    }

    ctx.restore();
}
