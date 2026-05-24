import { translateToWorld, translateToClient, Graphics } from "./graphics";
import { Boundary, distance, Rectangle, Vector } from "./math";

export class Locator implements Boundary {
    x: number;
    y: number;
    r: number = 5;
    background = "rgba(0, 0, 0, 0.3)";
    hover = false;
    fluent = false;

    constructor(x: number, y: number, size?: number) {
        this.x = x;
        this.y = y;
        this.r = size || 7;
    }

    pivot(): Vector {
        return { x: this.x, y: this.y };
    }

    bound(): Rectangle {
        return {
            x: { x: this.x - this.r, y: this.y - this.r },
            width: 2 * this.r,
            height: 2 * this.r,
        };
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.background;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);

        ctx.moveTo(this.x + this.r / 2, this.y);
        ctx.lineTo(this.x + (3 / 2) * this.r, this.y);

        ctx.moveTo(this.x - this.r / 2, this.y);
        ctx.lineTo(this.x - (3 / 2) * this.r, this.y);

        ctx.moveTo(this.x, this.y + this.r / 2);
        ctx.lineTo(this.x, this.y + (3 / 2) * this.r);

        ctx.moveTo(this.x, this.y - this.r / 2);
        ctx.lineTo(this.x, this.y - (3 / 2) * this.r);

        ctx.stroke();
        ctx.fill();
    }

    listening(canvas: HTMLCanvasElement) {
        canvas.addEventListener("mousedown", (e: MouseEvent) => {
            const world = translateToWorld(canvas, {
                x: e.clientX,
                y: e.clientY,
            });

            if (this.hitBy(world)) {
                this.fluent = true;
                this.hover = true;
            }
        });

        canvas.addEventListener("mouseup", (e: MouseEvent) => {
            this.fluent = false;
        });

        canvas.addEventListener("mousemove", (e: MouseEvent) => {
            if (!this.fluent) return;

            const world = translateToWorld(canvas, {
                x: e.clientX,
                y: e.clientY,
            });

            this.x = world.x;
            this.y = world.y;
        });

        return this;
    }

    painting(g: Graphics) {
        g.push(this);

        return this;
    }

    hitBy(p: Vector): boolean {
        const d = distance({ x: this.x - p.x, y: this.y - p.y });

        return d < this.r;
    }
}
