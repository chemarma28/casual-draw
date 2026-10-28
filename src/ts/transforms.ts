var scale = 1;
var translateX = 0;
var translateY = 0;

var translating = false;
var pivotX: number | undefined = undefined;
var pivotY: number | undefined = undefined;

export function transform(ctx: CanvasRenderingContext2D) {
    ctx.scale(scale, scale);
    ctx.translate(translateX, translateY);
}

export function zoom(e: WheelEvent) {
    const canvas = e.currentTarget as HTMLCanvasElement | null;

    if (!canvas) return;

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
    const target = e.currentTarget as HTMLCanvasElement | null;

    if (!target) return;

    translating = true;
    pivotX = e.clientX;
    pivotY = e.clientY;

    target.addEventListener("mousemove", translate);
    target.addEventListener("mouseup", disposeTranslating);
}

function translate(e: Event) {
    if (!translating || pivotX === undefined || pivotY === undefined) return;

    const event = e as MouseEvent;

    translateX -= (pivotX - event.clientX) / scale;
    translateY -= (pivotY - event.clientY) / scale;

    pivotX = event.clientX;
    pivotY = event.clientY;
}

export function disposeTranslating(e: Event) {
    const target = e.currentTarget as HTMLCanvasElement | null;

    translating = false;

    if (!target) return;

    target.removeEventListener("mousemove", translate);
    target.removeEventListener("mouseup", disposeTranslating);
}

export function isTranslating(): boolean {
    return translating;
}
