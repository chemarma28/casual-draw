import { AppState } from "../app/state";
import { Viewport } from "../canvas/viewport";
import { Locator } from "./locator";
import { LocatorHints } from "./locator-hints";
import { LocatorStore } from "./locator-store";

export class LocatorController {
    readonly store = new LocatorStore();
    private readonly hints: LocatorHints;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly viewport: Viewport,
        private readonly state: AppState,
        container: HTMLElement,
        private readonly invalidate: () => void,
    ) {
        this.hints = new LocatorHints(container);
    }

    add(locator: Locator, hint: string): Locator {
        this.store.add(locator);
        this.hints.add(locator, hint);

        return locator;
    }

    all(): readonly Locator[] {
        return this.store.all();
    }

    tryBeginDrag(e: MouseEvent): boolean {
        if (this.state.drag.kind !== "idle") return true;

        const locator = this.store.hitTest(this.toWorld(e));

        if (!locator) return false;

        this.hints.clear();
        this.state.drag = { kind: "locator", locator };

        return true;
    }

    drag(e: MouseEvent) {
        const drag = this.state.drag;

        if (drag.kind !== "locator") return;

        const point = this.toWorld(e);

        drag.locator.x = point.x;
        drag.locator.y = point.y;

        this.invalidate();
    }

    endDrag() {
        if (this.state.drag.kind !== "locator") return;

        this.state.drag = { kind: "idle" };
        this.hints.clear();
    }

    hover(e: MouseEvent) {
        if (this.state.drag.kind !== "idle") return;

        const locator = this.store.hitTest(this.toWorld(e));

        if (!locator) {
            this.hints.clear();
            return;
        }

        this.hints.show(locator, this.viewport);
    }

    clearHover() {
        this.hints.clear();
    }

    draw(ctx: CanvasRenderingContext2D) {
        for (const locator of this.store.all()) {
            locator.draw(ctx);
        }
    }

    destroy() {
        this.hints.destroy();
    }

    private toWorld(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();

        return this.viewport.screenToWorld({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    }
}
