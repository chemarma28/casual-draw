import { distance2, Vector } from "../math";

export class Locator {
    x: number;
    y: number;
    _r!: number;
    _r2!: number;
    background = "rgba(0, 0, 0, 0.3)";

    constructor(x: number, y: number, size?: number) {
        this.x = x;
        this.y = y;
        this.r = size || 7;
    }

    set r(r: number) {
        this._r = r;
        this._r2 = Math.pow(r, 2);
    }

    get r(): number {
        return this._r;
    }

    get r2(): number {
        return this._r2;
    }

    origin(): Vector {
        return { x: this.x, y: this.y };
    }

    isPointInLocator(p: Vector): boolean {
        const d = distance2({ x: this.x - p.x, y: this.y - p.y });

        return d <= this.r2;
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
}
