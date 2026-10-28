import { Application } from "./app/application";
import { byId } from "./dom";

const app = new Application({
    canvas: byId<HTMLCanvasElement>("canvas"),
    overlay: byId<HTMLElement>("overlay"),
    resizeHandle: byId<HTMLElement>("rh"),
    leftPane: byId<HTMLElement>("lft-pane"),
});

app.start();
