import "./splitpane";
import { CanvasView } from "./canvas/canvas-view";
import { drawGrid } from "./canvas/grid";
import { Bounds } from "./canvas/viewport";
import { demo1 } from "./demos/demo1";
import { byId } from "./dom";
import { Arc, drawRectlinearLayout } from "./graphics";
import { dispatchHintEvent, disposeHintCapture, hintLocator } from "./hints";
import { dispatchLocatorEvent, Locator, locatorCapture } from "./locator";

const canvas = byId<HTMLCanvasElement>("canvas");

const p1 = hintLocator(new Locator(200, 200), "p1");
const p2 = hintLocator(new Locator(500, 235), "p2");
const p3 = hintLocator(new Locator(600, 450), "p3");

const arc = new Arc(p1.origin(), p2.origin(), p3.origin());

const canvasView = new CanvasView(canvas, (ctx, viewport, size) => {
    drawGrid(ctx, viewport, size);

    ctx.save();
    viewport.apply(ctx);

    arc.arcscribe(p1.origin(), p2.origin(), p3.origin());
    arc.draw(ctx);

    p1.draw(ctx);
    p2.draw(ctx);
    p3.draw(ctx);

    drawRectlinearLayout(ctx, demo1);

    ctx.restore();
});

const viewport = canvasView.viewport;

let panning = false;
let lastX = 0;
let lastY = 0;
let fitted = false;

canvas.addEventListener(
    "wheel",
    (e: WheelEvent) => {
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        const factor = Math.exp(-e.deltaY * 0.0015);

        viewport.zoomAt(point, factor);
        canvasView.invalidate();
    },
    { passive: false },
);

canvas.addEventListener("mousedown", (e: MouseEvent) => {
    dispatchLocatorEvent(e, viewport);

    if (locatorCapture()) return;

    panning = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener("mousemove", (e: MouseEvent) => {
    if (!panning) return;

    viewport.panBy(e.clientX - lastX, e.clientY - lastY);

    lastX = e.clientX;
    lastY = e.clientY;

    canvasView.invalidate();
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
    if (panning) {
        disposeHintCapture();
        return;
    }

    if (locatorCapture()) {
        disposeHintCapture();
        canvasView.invalidate();
        return;
    }

    dispatchHintEvent(e, viewport);
});

canvas.addEventListener("mouseleave", () => {
    disposeHintCapture();
});

window.addEventListener("mouseup", () => {
    panning = false;
});

function getSceneBounds(): Bounds {
    const xs = [demo1.xs, p1.x, p2.x, p3.x].flat();
    const ys = [demo1.ys, p1.y, p2.y, p3.y].flat();
    const padding = 20;

    return {
        minX: Math.min(...xs) - padding,
        minY: Math.min(...ys) - padding,
        maxX: Math.max(...xs) + padding,
        maxY: Math.max(...ys) + padding,
    };
}

function fitScene() {
    const size = canvasView.size;

    if (fitted || size.width < 10 || size.height < 10) return;

    viewport.fit(getSceneBounds(), 48, size);
    fitted = true;
    canvasView.draw();
}

canvasView.resize();

window.addEventListener("load", () => {
    canvasView.resize();
    fitScene();
});

window.addEventListener("resize", () => {
    if (!fitted) fitScene();
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !fitted) {
        canvasView.resize();
        fitScene();
    }
});
