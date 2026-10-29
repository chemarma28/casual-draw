import { AppState } from "../app/state";
import { Viewport } from "../canvas/viewport";
import { Vector } from "../math";
import { Locator } from "./locator";
import { LocatorHints } from "./locator-hints";
import { LocatorStore } from "./locator-store";

export class LocatorController {
    readonly store = new LocatorStore();
    private readonly hints: LocatorHints;

    constructor(
        private readonly viewport: Viewport,
        private readonly state: AppState,
        container: HTMLElement,
        private readonly invalidate: () => void,
    ) {
        this.hints = new LocatorHints(container);
    }

    add(locator: Locator, hint?: string): Locator {
        this.store.add(locator);

        if (hint) {
            this.hints.add(locator, hint);
        }

        return locator;
    }

    remove(locator: Locator) {
        if (this.state.drag.kind === "locator") {
            if (this.state.drag.locator === locator) {
                this.endDrag();
            }
        }

        this.store.remove(locator);
        this.hints.remove(locator);
    }

    all(): readonly Locator[] {
        return this.store.all();
    }

    tryBeginDrag(point: Vector): boolean {
        if (this.state.drag.kind !== "idle") return true;

        const locator = this.store.hitTest(point);

        if (!locator) return false;

        this.hints.clear();
        this.state.drag = { kind: "locator", locator };

        return true;
    }

    drag(point: Vector) {
        const drag = this.state.drag;

        if (drag.kind !== "locator") return;

        drag.locator.x = point.x;
        drag.locator.y = point.y;

        this.invalidate();
    }

    endDrag() {
        if (this.state.drag.kind !== "locator") return;

        this.state.drag = { kind: "idle" };
        this.hints.clear();
    }

    hover(point: Vector) {
        if (this.state.drag.kind !== "idle") return;

        const locator = this.store.hitTest(point);

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
        this.endDrag();
        this.hints.destroy();
    }
}
