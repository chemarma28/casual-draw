import { byId } from "./dom";

window.addEventListener("load", () => {
    const resizeHandle = byId<HTMLElement>("rh");
    const leftPane = byId<HTMLElement>("lft-pane");

    function resizing(e: Event) {
        const event = e as MouseEvent;
        const pane = leftPane.getBoundingClientRect();

        const offsetX = pane.x;
        const width = Math.max(240, event.clientX - offsetX);

        leftPane.style.width = `${width}px`;
    }

    function dispose() {
        document.removeEventListener("mousemove", resizing);
        document.removeEventListener("mouseup", dispose);
    }

    resizeHandle.addEventListener("mousedown", () => {
        document.addEventListener("mousemove", resizing);
        document.addEventListener("mouseup", dispose);
    });
});
