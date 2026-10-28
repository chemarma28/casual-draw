import { Vector } from "../math";

export type CanvasSize = {
    width: number;
    height: number;
};

export type Bounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

export class Viewport {
    scale = 1;
    tx = 0;
    ty = 0;

    readonly minScale = 0.1;
    readonly maxScale = 8;

    worldToScreen(point: Vector): Vector {
        return {
            x: point.x * this.scale + this.tx,
            y: point.y * this.scale + this.ty,
        };
    }

    screenToWorld(point: Vector): Vector {
        return {
            x: (point.x - this.tx) / this.scale,
            y: (point.y - this.ty) / this.scale,
        };
    }

    panBy(dx: number, dy: number) {
        this.tx += dx;
        this.ty += dy;
    }

    zoomAt(point: Vector, factor: number) {
        const nextScale = this.clampScale(this.scale * factor);

        if (nextScale === this.scale) return;

        const world = this.screenToWorld(point);

        this.scale = nextScale;
        this.tx = point.x - world.x * nextScale;
        this.ty = point.y - world.y * nextScale;
    }

    fit(bounds: Bounds, padding: number, size: CanvasSize) {
        const width = Math.max(bounds.maxX - bounds.minX, 1);
        const height = Math.max(bounds.maxY - bounds.minY, 1);
        const availableWidth = Math.max(size.width - 2 * padding, 1);
        const availableHeight = Math.max(size.height - 2 * padding, 1);

        this.scale = this.clampScale(
            Math.min(availableWidth / width, availableHeight / height),
        );

        this.tx =
            size.width / 2 -
            ((bounds.minX + bounds.maxX) / 2) * this.scale;
        this.ty =
            size.height / 2 -
            ((bounds.minY + bounds.maxY) / 2) * this.scale;
    }

    reset() {
        this.scale = 1;
        this.tx = 0;
        this.ty = 0;
    }

    apply(ctx: CanvasRenderingContext2D) {
        ctx.translate(this.tx, this.ty);
        ctx.scale(this.scale, this.scale);
    }

    visibleWorldBounds(size: CanvasSize): Bounds {
        const topLeft = this.screenToWorld({ x: 0, y: 0 });
        const bottomRight = this.screenToWorld({
            x: size.width,
            y: size.height,
        });

        return {
            minX: topLeft.x,
            minY: topLeft.y,
            maxX: bottomRight.x,
            maxY: bottomRight.y,
        };
    }

    private clampScale(scale: number): number {
        return Math.min(this.maxScale, Math.max(this.minScale, scale));
    }
}
