import { Arc, Graphics } from "./graphics";
import { Locator } from "./locator";
import { Hint, Hints } from "./hints";
import { translateToWorld } from "./graphics";

const FRAME = document.getElementById("frame");
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

var width = 320;
var height = 270;

const resizeObserver = new ResizeObserver(() => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
});

resizeObserver.observe(canvas);

const g = [] as Graphics;

const p1 = new Locator(150, 160).listening(canvas).painting(g);
const p2 = new Locator(220, 185).listening(canvas).painting(g);
const p3 = new Locator(250, 250).listening(canvas).painting(g);

const hint = new Hints(FRAME, canvas);

hint.locator("p1", p1);
hint.locator("p2", p2);
hint.locator("p3", p3);

const line = { begin: p1.pivot(), end: p3.pivot() };
// const circumference = new Circumference(p1.origin(), p3.origin(), p2.origin());
const arc = new Arc(p1.pivot(), p2.pivot(), p3.pivot());

function lifecycle() {
    arc.arcscribe(p1.pivot(), p2.pivot(), p3.pivot());

    canvas.width = width;
    canvas.height = height;

    ctx.save();

    ctx.beginPath();

    ctx.stroke();

    arc.draw(ctx);

    for (let el of g) el.draw(ctx);

    ctx.restore();

    requestAnimationFrame(lifecycle);
}

lifecycle();
