import { translateToWorld } from "./graphics";
import { Locator } from "./locator";
import { Boundary } from "./math";

export class Hint {
    element: HTMLDivElement;
    container: HTMLElement;
    visible: boolean = false;
    timeoutid: number = undefined;

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

    top(target: Boundary, timeout = 250) {
        if (this.visible) return;

        this.show();

        requestAnimationFrame(() => {
            const b = this.element.getBoundingClientRect();
            const w = b.width;
            const h = b.height;

            const targetBoundary = target.bound();
            const tx = targetBoundary.x.x;
            const ty = targetBoundary.x.y;
            const tw = targetBoundary.width;
            const th = targetBoundary.height;

            const x = tx + tw / 2;
            const y = ty + th / 2;

            this.element.style.left = `${x}px`;
            this.element.style.top = `${y - th / 2 - h / 2 - 10}px`;
        });

        this.timeoutid = setTimeout(() => {
            this.element.style.visibility = "visible";
        }, timeout);
    }
}

export class Hints {
    container: HTMLElement;
    canvas: HTMLCanvasElement;

    constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
        this.container = container;
        this.canvas = canvas;
    }

    locator(placeholder: string, locator: Locator, timeout = 500): Hint {
        const hint = new Hint(this.container, placeholder);

        this.canvas.addEventListener("mousemove", (e) => {
            const pointer = translateToWorld(this.canvas, {
                x: e.clientX,
                y: e.clientY,
            });

            if (locator.hitBy(pointer) && !locator.fluent)
                hint.top(locator, timeout);
            else hint.hide();
        });

        return hint;
    }
}
