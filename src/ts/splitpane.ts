window.addEventListener("load", () => {
    const resizeHandle = document.getElementById("rh");
    const leftPane = document.getElementById("lft-pane");

    var resizingEnabled = false;

    function resizing(e: MouseEvent) {
        const pane = leftPane.getBoundingClientRect();

        const offsetX = pane.x;
        const w = Math.max(240, e.clientX - offsetX);

        leftPane.style.width = `${w}px`;
    }

    function dispose(e: MouseEvent) {
        resizingEnabled = false;

        document.removeEventListener("mousemove", resizing);
        document.removeEventListener("mouseup", dispose);
    }

    resizeHandle.addEventListener("mousedown", () => {
        resizingEnabled = true;

        document.addEventListener("mousemove", resizing);
        document.addEventListener("mouseup", dispose);
    });
});
