import { translateToWorld } from "./graphics";
import { distance2, Vector } from "./math";

var locators: Array<Locator> = [];
var capture: Locator = undefined;

export class Locator {
    x: number;
    y: number;
    _r: number;
    _r2: number;
    background = "rgba(0, 0, 0, 0.3)";

    constructor(x: number, y: number, size?: number) {
        this.x = x;
        this.y = y;
        this.r = size || 7;

        locators.push(this);
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

    isPointInLocator(p: Vector) {
        const d = distance2({ x: this.x - p.x, y: this.y - p.y });

        return d <= this.r2;
    }

    enable() {
        capture = this;
    }

    disable() {
        capture = undefined;
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

export function getLocatorByPoint(p: Vector): Locator {
    for (let locator of locators)
        if (locator.isPointInLocator(p)) return locator;

    return undefined;
}

export function locatorCapture(): Locator {
    return capture;
}

export function dispatchLocatorEvent(e: MouseEvent) {
    const point = translateToWorld(e.currentTarget as HTMLCanvasElement, {
        x: e.clientX,
        y: e.clientY,
    });

    const locator = getLocatorByPoint(point);

    if (!locatorCapture()) locator?.enable();

    e.currentTarget.addEventListener("mousemove", changeLocatorOrigin);
    e.currentTarget.addEventListener("mouseup", dispose);
}

function changeLocatorOrigin(e: MouseEvent) {
    if (!capture) return;

    const point = translateToWorld(e.currentTarget as HTMLCanvasElement, {
        x: e.clientX,
        y: e.clientY,
    });

    capture.x = point.x;
    capture.y = point.y;
}

function dispose(e: MouseEvent) {
    if (!capture) return;

    capture.disable();

    e.currentTarget.removeEventListener("mousemove", changeLocatorOrigin);
    e.currentTarget.removeEventListener("mouseup", dispose);
}
