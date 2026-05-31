import {
    circumcenter,
    clockwise,
    distance,
    IndexedVerticesGraph,
    Vector,
} from "./math";

var screenWidth = window.screen.width;
var screenHeight = window.screen.height;

export function translateToWorld(
    canvas: HTMLCanvasElement,
    client: Vector,
): Vector {
    const offsets = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    const relative = new DOMMatrixReadOnly().translate(
        client.x - offsets.left,
        client.y - offsets.top,
        1,
    );

    const m = ctx.getTransform().inverse().multiply(relative);
    const x = m.e;
    const y = m.f;

    return { x, y };
}

export function translateToClient(
    canvas: HTMLCanvasElement,
    world: Vector,
): Vector {
    const offsets = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    const relative = new DOMMatrixReadOnly().translate(world.x, world.y, 1);

    const m = ctx.getTransform().multiply(relative);

    const x = m.e + offsets.left;
    const y = m.f + offsets.top;

    return { x, y };
}

export function grid(canvas: HTMLCanvasElement, s = 25) {
    const gw = Math.ceil(screenWidth / (3 * s)) * 3 * s;
    const gh = Math.ceil(screenHeight / (3 * s)) * 3 * s;

    const size = 0.7 * Math.max(gw, gh);
    const count = 1;

    const x0 = Math.floor(-count * s - size / 2);
    let x1 = Math.ceil(count * s + size);
    const y0 = Math.floor(-count * s - size / 2);
    let y1 = Math.ceil(count * s + size);

    x1 = x0 + Math.ceil((x1 - x0) / (3 * s)) * 3 * s;
    y1 = x0 + Math.ceil((y1 - y0) / (3 * s)) * 3 * s;

    const ctx = canvas.getContext("2d");

    ctx.save();

    ctx.strokeStyle = "rgba(200, 200, 200)";
    ctx.lineWidth = 0.4;

    ctx.beginPath();

    for (let x = x0; x <= x1; x += s) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
    }

    for (let y = y0; y <= y1; y += s) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
    }

    ctx.stroke();

    ctx.lineWidth = 0.5;
    ctx.beginPath();

    for (let x = x0; x <= x1; x += 3 * s) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
    }

    for (let y = y0; y <= y1; y += 3 * s) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
    }

    ctx.stroke();

    ctx.restore();
}

export class Circumference {
    center: Vector;
    r: number;

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
    center: Vector;
    r: number;
    phi1: number;
    phi2: number;

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
