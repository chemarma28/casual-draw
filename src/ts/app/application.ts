import { CanvasView } from "../canvas/canvas-view";
import { CanvasTransform } from "../canvas/canvas-transform";
import { drawGrid } from "../canvas/grid";
import { Bounds, Viewport } from "../canvas/viewport";
import { demo1 } from "../demos/demo1";
import { Arc, drawRectlinearLayout } from "../graphics";
import { Locator } from "../locators/locator";
import { LocatorController } from "../locators/locator-controller";
import { SplitPane } from "../splitpane";
import { createAppState, AppState } from "./state";

export type ApplicationElements = {
    canvas: HTMLCanvasElement;
    overlay: HTMLElement;
    resizeHandle: HTMLElement;
    leftPane: HTMLElement;
};

export class Application {
    readonly state: AppState = createAppState();
    readonly viewport = new Viewport();

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

        this.transform.attach();
        this.splitPane.attach();

        window.addEventListener("load", this.onLoad);
        window.addEventListener("resize", this.onResize);
        document.addEventListener(
            "visibilitychange",
            this.onVisibilityChange,
        );

        this.onLoad();
    }

    destroy() {
        window.removeEventListener("load", this.onLoad);
        window.removeEventListener("resize", this.onResize);
        document.removeEventListener(
            "visibilitychange",
            this.onVisibilityChange,
        );

        this.transform.destroy();
        this.splitPane.destroy();
        this.locators.destroy();
        this.canvasView.destroy();

        this.started = false;
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

    private fitScene() {
        const size = this.canvasView.size;

        if (this.state.fitted || size.width < 10 || size.height < 10) {
            return;
        }

        this.viewport.fit(this.getSceneBounds(), 48, size);
        this.state.fitted = true;
        this.canvasView.draw();
    }
}
