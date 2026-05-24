import { compile } from "../js/compile.js";
import { exportCanvasAsPNG } from "../js/export.js";

class Errors {
    ERRORS = document.getElementById("error-container");
    ERRORS_OUTPUT = document.getElementById("error-window");
    messages = [];

    write(line: string) {
        const element = document.createElement("div");
        element.innerText = line;

        this.ERRORS.appendChild(element);
    }

    clear() {
        while (this.ERRORS.firstChild)
            this.ERRORS.removeChild(this.ERRORS.lastChild);
    }

    visible(visible: boolean) {
        const value = visible ? "visible" : "hidden";

        this.ERRORS.style.visibility = value;
    }

    errorAt(source: string, e: Error) {
        const message = e.message;
        this.messages = [message];

        this.write(message);
    }
}

const EDITOR = document.getElementById("editor");
const CANVAS = document.getElementById("canvas");
const COMPILATION_BUTTON = document.getElementById("compile-button");
const EXPORT_BUTTON = document.getElementById("export-button");
const EXPORT_BUTTON_TOOLTIP = document.getElementById("export-button-tooltip");

const ERRORS = new Errors();

COMPILATION_BUTTON?.addEventListener("click", (e) => {
    requestCompilation();
});

EXPORT_BUTTON?.addEventListener("mouseover", (e) => {
    if (undefined == EXPORT_BUTTON_TOOLTIP) return;

    EXPORT_BUTTON_TOOLTIP.style.visibility = "visible";
    EXPORT_BUTTON_TOOLTIP.style.opacity = "0.8";
});

EXPORT_BUTTON?.addEventListener("mouseout", (e) => {
    if (undefined == EXPORT_BUTTON_TOOLTIP) return;

    EXPORT_BUTTON_TOOLTIP.style.visibility = "hidden";
    EXPORT_BUTTON_TOOLTIP.style.opacity = "0";
});

EXPORT_BUTTON?.addEventListener("click", (e) => {
    const now = new Date();
    const out = `cld-${now.getDay()}-${now.getHours()}-${now.getSeconds()}`;

    exportCanvasAsPNG(CANVAS, out);
});

function requestCompilation() {
    const source = "diagram text";
    compile(source, (error: Error) => ERRORS.errorAt(source, error));
}
