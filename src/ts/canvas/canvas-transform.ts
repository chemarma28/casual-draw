import { AppState } from "../app/state";
import { LocatorController } from "../locators/locator-controller";
import { Vector } from "../math";
import { Viewport } from "./viewport";

export class CanvasTransform {
    private attached = false;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly viewport: Viewport,
        private readonly state: AppState,
        private readonly locators: LocatorController,
        private readonly invalidate: () => void,
    ) {}

    attach() {
        if (this.attached) return;

        this.attached = true;

        this.canvas.addEventListener("mousedown", this.onMouseDown);
        this.canvas.addEventListener("mousemove", this.onMouseMove);
        this.canvas.addEventListener("mouseleave", this.onMouseLeave);
        this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
        window.addEventListener("mousemove", this.onWindowMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
        window.addEventListener("blur", this.onWindowBlur);
    }

    detach() {
        if (!this.attached) return;

        this.attached = false;

        this.canvas.removeEventListener("mousedown", this.onMouseDown);
        this.canvas.removeEventListener("mousemove", this.onMouseMove);
        this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
        this.canvas.removeEventListener("wheel", this.onWheel);
        window.removeEventListener("mousemove", this.onWindowMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        window.removeEventListener("blur", this.onWindowBlur);
    }

    destroy() {
        this.detach();
        this.locators.endDrag();
        this.locators.clearHover();

        if (this.state.drag.kind !== "idle") {
            this.state.drag = { kind: "idle" };
        }
    }

    private onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;

        e.preventDefault();

        if (this.locators.tryBeginDrag(this.toWorld(e))) return;

        this.state.drag = {
            kind: "pan",
            lastX: e.clientX,
            lastY: e.clientY,
        };
        this.locators.clearHover();
    };

    private onMouseMove = (e: MouseEvent) => {
        if (this.state.drag.kind !== "idle") return;

        this.locators.hover(this.toWorld(e));
    };

    private onWindowMouseMove = (e: MouseEvent) => {
        const drag = this.state.drag;

        if (drag.kind === "pan") {
            this.viewport.panBy(e.clientX - drag.lastX, e.clientY - drag.lastY);

            drag.lastX = e.clientX;
            drag.lastY = e.clientY;

            this.invalidate();
        } else if (drag.kind === "locator") {
            this.locators.drag(this.toWorld(e));
        }
    };

    private onMouseUp = () => {
        if (this.state.drag.kind === "locator") {
            this.locators.endDrag();
            return;
        }

        if (this.state.drag.kind === "pan") {
            this.state.drag = { kind: "idle" };
        }
    };

    private onMouseLeave = () => {
        this.locators.clearHover();
    };

    private onWindowBlur = () => {
        this.locators.endDrag();
        this.locators.clearHover();

        if (this.state.drag.kind !== "idle") {
            this.state.drag = { kind: "idle" };
        }
    };

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        const factor = Math.exp(-e.deltaY * 0.0015);

        this.viewport.zoomAt(point, factor);
        this.invalidate();
    };

    private toWorld(e: MouseEvent): Vector {
        const rect = this.canvas.getBoundingClientRect();

        return this.viewport.screenToWorld({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    }
}
