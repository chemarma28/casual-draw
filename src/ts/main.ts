import { Application } from "./app/application";
import { byId } from "./dom";

const app = new Application({
    canvas: byId<HTMLCanvasElement>("canvas"),
    overlay: byId<HTMLElement>("overlay"),
    resizeHandle: byId<HTMLElement>("rh"),
    leftPane: byId<HTMLElement>("lft-pane"),
    editor: byId<HTMLElement>("editor"),
    status: byId<HTMLElement>("status"),
    compileButton: byId<HTMLButtonElement>("compile-button"),
    fitButton: byId<HTMLButtonElement>("fit-button"),
    zoomInButton: byId<HTMLButtonElement>("zoom-in-button"),
    zoomOutButton: byId<HTMLButtonElement>("zoom-out-button"),
    resetButton: byId<HTMLButtonElement>("reset-button"),
    exportButton: byId<HTMLButtonElement>("export-button"),
});

app.start();
