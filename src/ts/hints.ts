import { byId } from "./dom";
import { translateToClient, translateToWorld } from "./graphics";
import { getLocatorByPoint, Locator } from "./locator";
import { circleBoundingRectangle, Rectangle } from "./math";

export class Hint {
    element: HTMLDivElement;
    visible: boolean = false;
    timeoutid: number | undefined = undefined;

    constructor(container: HTMLElement, placeholder: string) {
        const element = document.createElement("div");
        const content = document.createElement("span");

        element.classList.add("tooltip");
        content.innerText = placeholder;
        element.appendChild(content);

        this.element = element;
        this.element.classList.add("hidden");

        container.appendChild(element);
    }

    hide() {
        this.element.classList.add("hidden");
        this.visible = false;
        clearTimeout(this.timeoutid);
    }

    show() {
        this.element.classList.remove("hidden");
        this.element.style.visibility = "hidden";
        this.visible = true;
    }

    top(target: Rectangle, timeout = 250) {
        if (this.visible) return;

        this.show();

        requestAnimationFrame(() => {
            const b = this.element.getBoundingClientRect();
            const w = b.width;
            const h = b.height;

            const tx = target.x.x;
            const ty = target.x.y;
            const tw = target.width;
            const th = target.height;

            const x = tx + tw / 2;
            const y = ty + th / 2;

            this.element.style.left = `${x - w / 2}px`;
            this.element.style.top = `${y - th / 2 - h - 10}px`;
        });

        this.timeoutid = setTimeout(() => {
            this.element.style.visibility = "visible";
        }, timeout);
    }
}

var canvas = byId<HTMLCanvasElement>("canvas");
var container = byId<HTMLElement>("overlay");

var hints: Map<Locator, Hint> = new Map();
var hintCapture: Hint | undefined = undefined;

export function hintLocator(
    locator: Locator,
    placeholder: string,
    timeout = 500,
): Locator {
    const hint = new Hint(container, placeholder);

    hints.set(locator, hint);

    return locator;
}

export function dispatchHintEvent(e: MouseEvent) {
    const point = translateToWorld(canvas, { x: e.clientX, y: e.clientY });

    const locator = getLocatorByPoint(point);

    if (!locator) {
        disposeHintCapture();
        return;
    }

    hintCapture = hints.get(locator);

    if (!hintCapture) return;

    const bounds = circleBoundingRectangle({
        origin: { x: locator.x, y: locator.y },
        r: locator.r,
    });

    const x0 = translateToClient(canvas, bounds.x);
    const x1 = translateToClient(canvas, {
        x: bounds.x.x + bounds.width,
        y: bounds.x.y + bounds.height,
    });

    const target = {
        x: x0,
        width: x1.x - x0.x,
        height: x1.y - x0.y,
    };

    hintCapture.top(target, 500);
}

export function disposeHintCapture() {
    hintCapture?.hide();
    hintCapture = undefined;
}
