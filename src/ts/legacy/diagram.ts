import { Bounds, Viewport } from "../canvas/viewport";
import { compile, CompileResult } from "./compile";

const PADDING = 72;

export class LegacyDiagram {
    private readonly canvas = document.createElement("canvas");
    private ready = false;
    private contentWidth = 1;
    private contentHeight = 1;

    compile(
        source: string,
        width: number,
        height: number,
    ): CompileResult {
        const padding = PADDING;

        this.contentWidth = Math.max(1, Math.round(width));
        this.contentHeight = Math.max(1, Math.round(height));
        this.canvas.width = this.contentWidth + 2 * padding;
        this.canvas.height = this.contentHeight + 2 * padding;
        this.ready = false;

        this.canvas
            .getContext("2d")
            ?.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const result = compile(
            source,
            this.canvas,
            this.contentWidth,
            this.contentHeight,
            padding,
            padding,
        );

        if (result.ok) {
            this.ready = true;
        }

        return result;
    }

    get bounds(): Bounds {
        return {
            minX: -PADDING,
            minY: -PADDING,
            maxX: this.contentWidth + PADDING,
            maxY: this.contentHeight + PADDING,
        };
    }

    draw(
        ctx: CanvasRenderingContext2D,
        viewport: Viewport,
    ) {
        if (!this.ready) return;

        ctx.save();
        viewport.apply(ctx);
        ctx.drawImage(this.canvas, -PADDING, -PADDING);
        ctx.restore();
    }

    get isReady(): boolean {
        return this.ready;
    }
}
