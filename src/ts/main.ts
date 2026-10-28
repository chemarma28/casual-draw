import "./splitpane";
import { demo1 } from "./demos/demo1";
import { byId, require2DContext } from "./dom";
import { Arc, drawRectlinearLayout, grid } from "./graphics";
import { dispatchHintEvent, disposeHintCapture, hintLocator } from "./hints";
import { dispatchLocatorEvent, Locator, locatorCapture } from "./locator";
import {
    dispatchTranslatingEvent,
    disposeTranslating,
    isTranslating,
    transform,
    zoom,
} from "./transforms";

const canvas = byId<HTMLCanvasElement>("canvas");
const ctx = require2DContext(canvas);

var width = 320;
var height = 270;

const resizeObserver = new ResizeObserver(() => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
});

resizeObserver.observe(canvas);

const p1 = hintLocator(new Locator(200, 200), "p1");
const p2 = hintLocator(new Locator(500, 235), "p2");
const p3 = hintLocator(new Locator(600, 450), "p3");

const arc = new Arc(p1.origin(), p2.origin(), p3.origin());

canvas.addEventListener("wheel", (e: WheelEvent) => {
    zoom(e);
});

canvas.addEventListener("mousedown", (e: MouseEvent) => {
    dispatchLocatorEvent(e);

    if (locatorCapture()) return;

    dispatchTranslatingEvent(e);
});

canvas.addEventListener("mousemove", (e: MouseEvent) => {
    if (isTranslating() || locatorCapture()) disposeHintCapture();

    dispatchHintEvent(e);
});

canvas.addEventListener("mouseleave", (e: MouseEvent) => {
    disposeTranslating(e);
});

function lifecycle() {
    canvas.width = width;
    canvas.height = height;

    transform(ctx);

    ctx.save();

    grid(canvas);

    arc.arcscribe(p1.origin(), p2.origin(), p3.origin());
    arc.draw(ctx);

    p1.draw(ctx);
    p2.draw(ctx);
    p3.draw(ctx);

    drawRectlinearLayout(ctx, demo1);

    ctx.restore();

    requestAnimationFrame(lifecycle);
}

window.addEventListener("load", () => {
    lifecycle();
});
