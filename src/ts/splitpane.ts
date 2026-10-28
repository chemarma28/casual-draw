export class SplitPane {
    private readonly pane: HTMLElement;
    private readonly minWidth = 240;

    private attached = false;
    private active = false;
    private startX = 0;
    private startWidth = 0;

    constructor(
        private readonly handle: HTMLElement,
        private readonly leftPane: HTMLElement,
        private readonly onResize: () => void,
    ) {
        const pane = leftPane.parentElement;

        if (!pane) {
            throw new Error("Split pane container was not found.");
        }

        this.pane = pane;
    }

    attach() {
        if (this.attached) return;

        this.attached = true;

        this.handle.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("resize", this.updateAria);

        this.updateAria();
    }

    detach() {
        if (!this.attached) return;

        this.attached = false;

        this.handle.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("resize", this.updateAria);

        this.stopDragging();
    }

    destroy() {
        this.detach();
    }

    private maxWidth(): number {
        return Math.max(this.minWidth, this.pane.clientWidth * 0.5);
    }

    private setWidth(width: number) {
        const clamped = Math.min(
            this.maxWidth(),
            Math.max(this.minWidth, width),
        );

        this.leftPane.style.width = `${clamped}px`;
        this.updateAria();
        this.onResize();
    }

    private updateAria = () => {
        const width = this.leftPane.getBoundingClientRect().width;

        this.handle.setAttribute("aria-valuemin", `${this.minWidth}`);
        this.handle.setAttribute("aria-valuemax", `${Math.round(this.maxWidth())}`);
        this.handle.setAttribute("aria-valuenow", `${Math.round(width)}`);
    };

    private onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;

        e.preventDefault();

        this.active = true;
        this.startX = e.clientX;
        this.startWidth = this.leftPane.getBoundingClientRect().width;

        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
        window.addEventListener("blur", this.onMouseUp);
    };

    private onMouseMove = (e: MouseEvent) => {
        if (!this.active) return;

        this.setWidth(this.startWidth + e.clientX - this.startX);
    };

    private onMouseUp = () => {
        this.stopDragging();
    };

    private stopDragging() {
        if (!this.active) return;

        this.active = false;

        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        window.removeEventListener("blur", this.onMouseUp);
    }

}
