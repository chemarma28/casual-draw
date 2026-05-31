var scale = 1;
var translateX = 0;
var translateY = 0;

var translating = false;
var pivotX: number = undefined;
var pivotY: number = undefined;

export function transform(ctx: CanvasRenderingContext2D) {
    ctx.scale(scale, scale);
    ctx.translate(translateX, translateY);
}

export function zoom(e: WheelEvent) {
    const canvas = e.currentTarget as HTMLCanvasElement;
    const factor = Math.min(
        3,
        Math.max(0.45, scale - Math.sign(e.deltaY) * 0.1),
    );

    const offsets = canvas.getBoundingClientRect();

    const mx = e.clientX - offsets.left;
    const my = e.clientY - offsets.top;

    translateX += mx / factor - mx / scale;
    translateY += my / factor - my / scale;

    scale = factor;
}

export function dispatchTranslatingEvent(e: MouseEvent) {
    translating = true;
    pivotX = e.clientX;
    pivotY = e.clientY;

    e.currentTarget.addEventListener("mousemove", translate);
    e.currentTarget.addEventListener("mouseup", disposeTranslating);
}

function translate(e: MouseEvent) {
    if (!translating) return;

    translateX -= (pivotX - e.clientX) / scale;
    translateY -= (pivotY - e.clientY) / scale;

    pivotX = e.clientX;
    pivotY = e.clientY;
}

export function disposeTranslating(e: MouseEvent) {
    translating = false;

    e.currentTarget.removeEventListener("mousemove", translate);
    e.currentTarget.removeEventListener("mouseup", disposeTranslating);
}

export function isTranslating(): boolean {
    return translating;
}
