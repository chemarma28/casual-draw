import { require2DContext } from "../dom";
import { CanvasSize, Viewport } from "./viewport";

export type RenderCallback = (
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    size: CanvasSize,
) => void;

export class CanvasView {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly resizeObserver: ResizeObserver;
    private readonly onWindowResize = () => this.resize();
    private readonly onVisibilityChange = () => {
        if (!document.hidden) this.resize();
    };

    private width = 1;
    private height = 1;
    private dpr = 1;
    private frame: number | null = null;
    private disposed = false;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly viewport: Viewport,
        private readonly render: RenderCallback,
    ) {
        this.ctx = require2DContext(canvas);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas);

        window.addEventListener("resize", this.onWindowResize);
        document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    get size(): CanvasSize {
        return { width: this.width, height: this.height };
    }

    resize() {
        if (this.disposed) return;

        const rect = this.canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        this.width = width;
        this.height = height;
        this.dpr = dpr;

        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));

        if (this.canvas.width !== pixelWidth) {
            this.canvas.width = pixelWidth;
        }

        if (this.canvas.height !== pixelHeight) {
            this.canvas.height = pixelHeight;
        }

        this.draw();
    }

    invalidate() {
        if (this.disposed || this.frame !== null) return;

        this.frame = requestAnimationFrame(() => {
            this.frame = null;
            this.draw();
        });
    }

    draw() {
        if (this.disposed) return;

        this.cancelFrame();

        const ctx = this.ctx;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        this.render(ctx, this.viewport, this.size);
    }

    destroy() {
        if (this.disposed) return;

        this.disposed = true;

        this.cancelFrame();

        this.resizeObserver.disconnect();
        window.removeEventListener("resize", this.onWindowResize);
        document.removeEventListener(
            "visibilitychange",
            this.onVisibilityChange,
        );
    }

    private cancelFrame() {
        if (this.frame === null) return;

        cancelAnimationFrame(this.frame);
        this.frame = null;
    }
}
