import { circumcenter, clockwise, distance, Vector } from "./math";

export type Graphics = Array<{
    draw(ctx: CanvasRenderingContext2D): void;
}>;

export function translateToWorld(
    canvas: HTMLCanvasElement,
    client: Vector,
): Vector {
    const b = canvas.getBoundingClientRect();

    return { x: client.x - b.left, y: client.y - b.top };
}

export function translateToClient(
    canvas: HTMLCanvasElement,
    world: Vector,
): Vector {
    const b = canvas.getBoundingClientRect();

    return { x: b.left + world.x, y: b.top + world.y };
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
        ctx.beginPath();
        ctx.arc(
            this.center.x,
            this.center.y,
            this.r,
            this.phi1,
            this.phi2,
            this.counterclockwise,
        );
        ctx.stroke();
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
