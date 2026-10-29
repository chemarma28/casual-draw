import { Viewport } from "../canvas/viewport";
import { circleBoundingRectangle, Rectangle } from "../math";
import { Locator } from "./locator";

class Hint {
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

        this.timeoutid = setTimeout(() => {
            this.element.style.visibility = "visible";
        }, timeout);
    }
}

export class LocatorHints {
    private hints = new Map<Locator, Hint>();
    private active: Hint | undefined = undefined;

    constructor(private readonly container: HTMLElement) {}

    add(locator: Locator, placeholder: string) {
        this.hints.set(locator, new Hint(this.container, placeholder));
    }

    remove(locator: Locator) {
        const hint = this.hints.get(locator);

        if (!hint) return;

        if (this.active === hint) {
            this.active = undefined;
        }

        hint.hide();
        hint.element.remove();
        this.hints.delete(locator);
    }

    show(locator: Locator, viewport: Viewport) {
        const hint = this.hints.get(locator);

        if (!hint) {
            this.clear();
            return;
        }

        if (this.active && this.active !== hint) {
            this.active.hide();
        }

        this.active = hint;

        const bounds = circleBoundingRectangle({
            origin: { x: locator.x, y: locator.y },
            r: locator.r,
        });

        const x0 = viewport.worldToScreen(bounds.x);
        const x1 = viewport.worldToScreen({
            x: bounds.x.x + bounds.width,
            y: bounds.x.y + bounds.height,
        });

        hint.top(
            {
                x: x0,
                width: x1.x - x0.x,
                height: x1.y - x0.y,
            },
            500,
        );
    }

    clear() {
        this.active?.hide();
        this.active = undefined;
    }

    destroy() {
        this.clear();

        for (const hint of this.hints.values()) {
            hint.element.remove();
        }

        this.hints.clear();
    }
}
