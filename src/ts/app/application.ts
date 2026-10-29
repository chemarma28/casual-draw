import { CanvasView } from "../canvas/canvas-view";
import { CanvasTransform } from "../canvas/canvas-transform";
import { drawGrid } from "../canvas/grid";
import { Bounds, Viewport } from "../canvas/viewport";
import { demo1 } from "../demos/demo1";
import { CodeFlaskEditor, EditorHost } from "../editor/codeflask-editor";
import { exportCanvasAsPNG } from "../export";
import { Arc, drawRectlinearLayout } from "../graphics";
import { Locator } from "../locators/locator";
import { LocatorController } from "../locators/locator-controller";
import { SplitPane } from "../splitpane";
import { createAppState, AppState } from "./state";

const DEFAULT_SOURCE = [
    "@A1(1) > @A5(5) > @A2(2) +> A1;",
    "@A3(3) > @A4(4) > @A6(6) +> A3;",
    "A4 -> A2;",
].join("\n");

export type ApplicationElements = {
    canvas: HTMLCanvasElement;
    overlay: HTMLElement;
    resizeHandle: HTMLElement;
    leftPane: HTMLElement;
    editor: HTMLElement;
    status: HTMLElement;
    compileButton: HTMLButtonElement;
    fitButton: HTMLButtonElement;
    zoomInButton: HTMLButtonElement;
    zoomOutButton: HTMLButtonElement;
    resetButton: HTMLButtonElement;
    exportButton: HTMLButtonElement;
};

export class Application {
    readonly state: AppState = createAppState();
    readonly viewport = new Viewport();

    private readonly canvas: HTMLCanvasElement;
    private readonly editor: EditorHost;
    private readonly status: HTMLElement;
    private readonly compileButton: HTMLButtonElement;
    private readonly fitButton: HTMLButtonElement;
    private readonly zoomInButton: HTMLButtonElement;
    private readonly zoomOutButton: HTMLButtonElement;
    private readonly resetButton: HTMLButtonElement;
    private readonly exportButton: HTMLButtonElement;
    private readonly locators: LocatorController;
    private readonly canvasView: CanvasView;
    private readonly transform: CanvasTransform;
    private readonly splitPane: SplitPane;
    private readonly p1: Locator;
    private readonly p2: Locator;
    private readonly p3: Locator;
    private readonly arc: Arc;

    private started = false;

    constructor(elements: ApplicationElements) {
        this.canvas = elements.canvas;
        this.status = elements.status;
        this.compileButton = elements.compileButton;
        this.fitButton = elements.fitButton;
        this.zoomInButton = elements.zoomInButton;
        this.zoomOutButton = elements.zoomOutButton;
        this.resetButton = elements.resetButton;
        this.exportButton = elements.exportButton;

        this.editor = new CodeFlaskEditor(elements.editor, DEFAULT_SOURCE);
        this.editor.onChange(() => this.setStatus("Edited"));

        this.locators = new LocatorController(
            elements.canvas,
            this.viewport,
            this.state,
            elements.overlay,
            () => this.canvasView.invalidate(),
        );

        this.p1 = this.locators.add(new Locator(200, 200), "p1");
        this.p2 = this.locators.add(new Locator(500, 235), "p2");
        this.p3 = this.locators.add(new Locator(600, 450), "p3");

        this.arc = new Arc(
            this.p1.origin(),
            this.p2.origin(),
            this.p3.origin(),
        );

        this.canvasView = new CanvasView(
            elements.canvas,
            this.viewport,
            (ctx, view, size) => this.render(ctx, view, size),
        );

        this.transform = new CanvasTransform(
            elements.canvas,
            this.viewport,
            this.state,
            this.locators,
            () => this.canvasView.invalidate(),
        );

        this.splitPane = new SplitPane(
            elements.resizeHandle,
            elements.leftPane,
            () => this.canvasView.resize(),
        );
    }

    start() {
        if (this.started) return;

        this.started = true;

        this.compileButton.addEventListener("click", this.compile);
        this.fitButton.addEventListener("click", this.fit);
        this.zoomInButton.addEventListener("click", this.zoomIn);
        this.zoomOutButton.addEventListener("click", this.zoomOut);
        this.resetButton.addEventListener("click", this.reset);
        this.exportButton.addEventListener("click", this.exportImage);
        this.transform.attach();
        this.splitPane.attach();

        window.addEventListener("load", this.onLoad);
        window.addEventListener("resize", this.onResize);
        document.addEventListener(
            "visibilitychange",
            this.onVisibilityChange,
        );

        this.setStatus("Ready");
        this.onLoad();
    }

    destroy() {
        window.removeEventListener("load", this.onLoad);
        window.removeEventListener("resize", this.onResize);
        document.removeEventListener(
            "visibilitychange",
            this.onVisibilityChange,
        );

        this.compileButton.removeEventListener("click", this.compile);
        this.fitButton.removeEventListener("click", this.fit);
        this.zoomInButton.removeEventListener("click", this.zoomIn);
        this.zoomOutButton.removeEventListener("click", this.zoomOut);
        this.resetButton.removeEventListener("click", this.reset);
        this.exportButton.removeEventListener("click", this.exportImage);
        this.transform.destroy();
        this.splitPane.destroy();
        this.locators.destroy();
        this.editor.destroy();
        this.canvasView.destroy();

        this.started = false;
    }

    private compile = () => {
        this.canvasView.draw();
        this.setStatus("Ready");
    };

    private fit = () => {
        this.fitToView();
        this.setStatus("Fit to view");
    };

    private zoomIn = () => {
        this.zoom(1.2);
    };

    private zoomOut = () => {
        this.zoom(1 / 1.2);
    };

    private reset = () => {
        this.resetView();
        this.setStatus("View reset");
    };

    private exportImage = () => {
        this.exportPng();
        this.setStatus("PNG exported");
    };

    private zoom(factor: number) {
        const size = this.canvasView.size;

        this.viewport.zoomAt(
            { x: size.width / 2, y: size.height / 2 },
            factor,
        );
        this.canvasView.invalidate();
        this.setStatus(`Zoom ${Math.round(this.viewport.scale * 100)}%`);
    }

    private exportPng() {
        exportCanvasAsPNG(
            this.canvas,
            `causal-loop-${Date.now()}.png`,
        );
    }

    private setStatus(message: string) {
        this.status.textContent = message;
    }

    private render(
        ctx: CanvasRenderingContext2D,
        view: Viewport,
        size: { width: number; height: number },
    ) {
        drawGrid(ctx, view, size);

        ctx.save();
        view.apply(ctx);

        this.arc.arcscribe(
            this.p1.origin(),
            this.p2.origin(),
            this.p3.origin(),
        );
        this.arc.draw(ctx);

        this.locators.draw(ctx);

        drawRectlinearLayout(ctx, demo1);

        ctx.restore();
    }

    private onLoad = () => {
        this.canvasView.resize();
        this.fitScene();
    };

    private onResize = () => {
        if (!this.state.fitted) {
            this.fitScene();
        }
    };

    private onVisibilityChange = () => {
        if (!document.hidden && !this.state.fitted) {
            this.canvasView.resize();
            this.fitScene();
        }
    };

    private getSceneBounds(): Bounds {
        const locators = this.locators.all();
        const xs = [
            demo1.xs,
            ...locators.map((locator) => locator.x),
        ].flat();
        const ys = [
            demo1.ys,
            ...locators.map((locator) => locator.y),
        ].flat();
        const padding = 20;

        return {
            minX: Math.min(...xs) - padding,
            minY: Math.min(...ys) - padding,
            maxX: Math.max(...xs) + padding,
            maxY: Math.max(...ys) + padding,
        };
    }

    private fitToView() {
        const size = this.canvasView.size;

        if (size.width < 10 || size.height < 10) return;

        this.viewport.fit(this.getSceneBounds(), 48, size);
        this.state.fitted = true;
        this.canvasView.draw();
    }

    private fitScene() {
        if (this.state.fitted) return;

        this.fitToView();
    }

    private resetView() {
        this.state.fitted = false;
        this.fitToView();
    }
}
