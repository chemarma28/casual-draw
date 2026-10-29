import { CanvasView } from "../canvas/canvas-view";
import { CanvasTransform } from "../canvas/canvas-transform";
import { drawGrid } from "../canvas/grid";
import { Viewport } from "../canvas/viewport";
import { DemoDiagram } from "../demo/demo-diagram";
import { CodeFlaskEditor, EditorHost } from "../editor/codeflask-editor";
import { exportCanvasAsPNG } from "../export";
import { LegacyDiagram } from "../legacy/diagram";
import { LocatorController } from "../locators/locator-controller";
import { SplitPane } from "../splitpane";
import { createAppState, AppState } from "./state";

type EditorMode = "live" | "demo";

type SavedViewport = {
    scale: number;
    tx: number;
    ty: number;
};

const DEFAULT_SOURCE = [
    "@Population[Population] +> @Births(Births) ||+> Population;",
    "Population +> @Deaths(Deaths) -> Population;",
    "Population -> @Food(Food supply);",
    "Food +> @BirthRate(Birth rate) +> Births;",
    "Food -> @DeathRate(Death rate) +> Deaths;",
    "@Disease(Disease) +> DeathRate;",
    "Population +> Disease;",
].join("\n");

export type ApplicationElements = {
    canvas: HTMLCanvasElement;
    overlay: HTMLElement;
    resizeHandle: HTMLElement;
    leftPane: HTMLElement;
    editorPanel: HTMLElement;
    editor: HTMLElement;
    status: HTMLElement;
    compileButton: HTMLButtonElement;
    fitButton: HTMLButtonElement;
    zoomInButton: HTMLButtonElement;
    zoomOutButton: HTMLButtonElement;
    resetButton: HTMLButtonElement;
    exportButton: HTMLButtonElement;
    modeLiveButton: HTMLButtonElement;
    modeDemoButton: HTMLButtonElement;
};

export class Application {
    readonly state: AppState = createAppState();
    readonly viewport = new Viewport();

    private readonly canvas: HTMLCanvasElement;
    private readonly editorPanel: HTMLElement;
    private readonly editor: EditorHost;
    private readonly status: HTMLElement;
    private readonly compileButton: HTMLButtonElement;
    private readonly fitButton: HTMLButtonElement;
    private readonly zoomInButton: HTMLButtonElement;
    private readonly zoomOutButton: HTMLButtonElement;
    private readonly resetButton: HTMLButtonElement;
    private readonly exportButton: HTMLButtonElement;
    private readonly modeLiveButton: HTMLButtonElement;
    private readonly modeDemoButton: HTMLButtonElement;
    private readonly diagram = new LegacyDiagram();
    private readonly demo: DemoDiagram;
    private readonly locators: LocatorController;
    private readonly canvasView: CanvasView;
    private readonly transform: CanvasTransform;
    private readonly splitPane: SplitPane;

    private started = false;
    private initialCompileDone = false;
    private resizeTimer: number | undefined = undefined;
    private mode: EditorMode = "live";
    private liveViewport: SavedViewport = { scale: 1, tx: 0, ty: 0 };

    constructor(elements: ApplicationElements) {
        this.canvas = elements.canvas;
        this.editorPanel = elements.editorPanel;
        this.status = elements.status;
        this.compileButton = elements.compileButton;
        this.fitButton = elements.fitButton;
        this.zoomInButton = elements.zoomInButton;
        this.zoomOutButton = elements.zoomOutButton;
        this.resetButton = elements.resetButton;
        this.exportButton = elements.exportButton;
        this.modeLiveButton = elements.modeLiveButton;
        this.modeDemoButton = elements.modeDemoButton;

        this.editor = new CodeFlaskEditor(elements.editor, DEFAULT_SOURCE);
        this.editor.onChange(() => {
            if (this.mode === "live") {
                this.setStatus("Edited");
            }
        });

        this.locators = new LocatorController(
            this.viewport,
            this.state,
            elements.overlay,
            () => this.canvasView.invalidate(),
        );

        this.canvasView = new CanvasView(
            elements.canvas,
            this.viewport,
            (ctx, view, size) => this.render(ctx, view, size),
        );

        this.demo = new DemoDiagram();

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
            () => {
                this.canvasView.resize();
                this.scheduleRecompile();
            },
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
        this.modeLiveButton.addEventListener("click", this.setLiveMode);
        this.modeDemoButton.addEventListener("click", this.setDemoMode);
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
        clearTimeout(this.resizeTimer);

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
        this.modeLiveButton.removeEventListener("click", this.setLiveMode);
        this.modeDemoButton.removeEventListener("click", this.setDemoMode);
        this.transform.destroy();
        this.splitPane.destroy();
        this.locators.destroy();
        this.editor.destroy();
        this.canvasView.destroy();

        this.started = false;
    }

    private compile = () => {
        this.runCompile();
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
        if (this.mode === "demo") {
            this.demo.reset();
            this.fitToView();
            this.setStatus("Demo reset");
            return;
        }

        this.fitToView();
        this.setStatus("View reset");
    };

    private exportImage = () => {
        this.exportPng();
        this.setStatus("PNG exported");
    };

    private setLiveMode = () => {
        this.setMode("live");
    };

    private setDemoMode = () => {
        this.setMode("demo");
    };

    private setMode(mode: EditorMode) {
        if (this.mode === mode) return;

        if (mode === "demo") {
            this.liveViewport = {
                scale: this.viewport.scale,
                tx: this.viewport.tx,
                ty: this.viewport.ty,
            };
            this.mode = "demo";
            this.demo.attach(this.locators);
            this.editor.setReadonly(true);
            this.editorPanel.classList.add("is-demo");
            this.compileButton.disabled = true;
            this.updateModeButtons();
            this.fitToView();
            this.setStatus("Demo: drag nodes");
            return;
        }

        this.mode = "live";
        this.demo.detach(this.locators);
        this.editor.setReadonly(false);
        this.editorPanel.classList.remove("is-demo");
        this.compileButton.disabled = false;
        this.updateModeButtons();

        this.viewport.scale = this.liveViewport.scale;
        this.viewport.tx = this.liveViewport.tx;
        this.viewport.ty = this.liveViewport.ty;
        this.canvasView.draw();
        this.setStatus("Ready");
    }

    private updateModeButtons() {
        const isLive = this.mode === "live";

        this.modeLiveButton.setAttribute("aria-pressed", `${isLive}`);
        this.modeDemoButton.setAttribute("aria-pressed", `${!isLive}`);
    }

    private runCompile(fitAfterCompile = false) {
        if (this.mode !== "live") return;

        clearTimeout(this.resizeTimer);

        const size = this.canvasView.size;
        const result = this.diagram.compile(
            this.editor.getValue(),
            size.width,
            size.height,
        );

        if (!result.ok) {
            this.setStatus(result.error.message);
            this.canvasView.draw();
            return;
        }

        this.initialCompileDone = true;

        if (fitAfterCompile) {
            this.fitToView();
        } else {
            this.canvasView.draw();
        }

        this.setStatus("Ready");
    }

    private scheduleRecompile() {
        if (this.mode !== "live" || !this.diagram.isReady) return;

        clearTimeout(this.resizeTimer);

        this.resizeTimer = window.setTimeout(() => {
            this.runCompile();
        }, 150);
    }

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

        if (this.mode === "demo") {
            this.demo.draw(ctx, view);
        } else {
            this.diagram.draw(ctx, view);
        }
    }

    private onLoad = () => {
        this.canvasView.resize();

        if (!this.initialCompileDone) {
            this.initialCompileDone = true;
            this.runCompile(true);
        }
    };

    private onResize = () => {
        this.canvasView.resize();
        this.scheduleRecompile();
    };

    private onVisibilityChange = () => {
        if (!document.hidden) {
            this.canvasView.resize();
            this.scheduleRecompile();
        }
    };

    private fitToView() {
        const size = this.canvasView.size;

        if (this.mode === "demo") {
            this.viewport.fit(this.demo.bounds, 0, size);
        } else if (this.diagram.isReady) {
            this.viewport.fit(this.diagram.bounds, 0, size);
        } else {
            this.viewport.reset();
        }

        this.state.fitted = true;
        this.canvasView.draw();
    }
}
