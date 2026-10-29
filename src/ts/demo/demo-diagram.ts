import { Bounds, Viewport } from "../canvas/viewport";
import { require2DContext } from "../dom";
import { Arc } from "../graphics";
import { LocatorController } from "../locators/locator-controller";
import { Locator } from "../locators/locator";
import { createDemoGraph, DemoLink, DemoNode } from "./demo-graph";
import { NodeLocator } from "./node-locator";

const VERTEX_FONT = "20px Sans-Serif";
const VERTEX_HEIGHT = 40;
const VERTEX_PADDING = 14;
const DEMO_MARGIN = 48;
const MIDPOINT_RADIUS = 6;
const MIDPOINT_BACKGROUND = "rgba(47, 58, 76, 0.35)";
const EDGE_COLOR = "#2f3a4c";
const MIN_CURVATURE = 12;

type MeasuredNode = {
    id: string;
    label: string;
    width: number;
    height: number;
    locator: NodeLocator;
};

type MeasuredLink = {
    from: string;
    to: string;
    mid: Locator;
};

export class DemoDiagram {
    private readonly initialNodes: DemoNode[];
    private readonly initialLinks: DemoLink[];
    private readonly measureContext: CanvasRenderingContext2D;
    private nodes: MeasuredNode[];
    private links: MeasuredLink[];
    private attached = false;

    constructor() {
        const graph = createDemoGraph();

        this.initialNodes = graph.nodes;
        this.initialLinks = graph.links;
        this.nodes = this.toMeasured(graph.nodes);
        this.links = graph.links.map((link) => ({
            from: link.from,
            to: link.to,
            mid: this.createMidpoint(link.mid.x, link.mid.y),
        }));

        const measureCanvas = document.createElement("canvas");
        this.measureContext = require2DContext(measureCanvas);
        this.measureNodes();
    }

    attach(controller: LocatorController) {
        if (this.attached) return;

        this.attached = true;

        for (const node of this.nodes) {
            controller.add(node.locator);
        }

        for (const link of this.links) {
            controller.add(link.mid);
        }
    }

    detach(controller: LocatorController) {
        if (!this.attached) return;

        controller.endDrag();

        for (const node of this.nodes) {
            controller.remove(node.locator);
        }

        for (const link of this.links) {
            controller.remove(link.mid);
        }

        this.attached = false;
    }

    reset() {
        for (const node of this.nodes) {
            const initial = this.initialNodes.find(
                (candidate) => candidate.id === node.id,
            );

            if (!initial) continue;

            node.locator.x = initial.x;
            node.locator.y = initial.y;
        }

        for (let i = 0; i < this.links.length; i++) {
            const initial = this.initialLinks[i];

            if (!initial) continue;

            this.links[i].mid.x = initial.mid.x;
            this.links[i].mid.y = initial.mid.y;
        }
    }

    get bounds(): Bounds {
        if (this.nodes.length === 0) {
            return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const node of this.nodes) {
            const x = node.locator.x;
            const y = node.locator.y;

            minX = Math.min(minX, x - node.width / 2);
            minY = Math.min(minY, y - node.height / 2);
            maxX = Math.max(maxX, x + node.width / 2);
            maxY = Math.max(maxY, y + node.height / 2);
        }

        for (const link of this.links) {
            minX = Math.min(minX, link.mid.x - link.mid.r);
            minY = Math.min(minY, link.mid.y - link.mid.r);
            maxX = Math.max(maxX, link.mid.x + link.mid.r);
            maxY = Math.max(maxY, link.mid.y + link.mid.r);
        }

        return {
            minX: minX - DEMO_MARGIN,
            minY: minY - DEMO_MARGIN,
            maxX: maxX + DEMO_MARGIN,
            maxY: maxY + DEMO_MARGIN,
        };
    }

    draw(ctx: CanvasRenderingContext2D, viewport: Viewport) {
        ctx.save();
        viewport.apply(ctx);
        ctx.font = VERTEX_FONT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.strokeStyle = EDGE_COLOR;

        for (const link of this.links) {
            const from = this.findNode(link.from);
            const to = this.findNode(link.to);

            if (!from || !to) continue;

            this.createArc(from, to, link).draw(ctx);
        }

        for (const node of this.nodes) {
            const x = node.locator.x;
            const y = node.locator.y;

            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = EDGE_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(
                x - node.width / 2,
                y - node.height / 2,
                node.width,
                node.height,
            );
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#000000";
            ctx.fillText(node.label, x, y);
        }

        ctx.strokeStyle = EDGE_COLOR;
        ctx.lineWidth = 1;

        for (const link of this.links) {
            link.mid.draw(ctx);
        }

        ctx.restore();
    }

    private toMeasured(nodes: DemoNode[]): MeasuredNode[] {
        return nodes.map((node) => ({
            id: node.id,
            label: node.label,
            width: 0,
            height: 0,
            locator: new NodeLocator(node.x, node.y),
        }));
    }

    private measureNodes() {
        this.measureContext.save();
        this.measureContext.font = VERTEX_FONT;

        for (const node of this.nodes) {
            const width =
                this.measureContext.measureText(node.label).width +
                VERTEX_PADDING * 2;

            node.width = width;
            node.height = VERTEX_HEIGHT;
            node.locator.setSize(width, VERTEX_HEIGHT);
        }

        this.measureContext.restore();
    }

    private findNode(id: string): MeasuredNode | undefined {
        return this.nodes.find((node) => node.id === id);
    }

    private createMidpoint(x: number, y: number): Locator {
        const locator = new Locator(x, y, MIDPOINT_RADIUS);

        locator.background = MIDPOINT_BACKGROUND;

        return locator;
    }

    private createArc(
        from: MeasuredNode,
        to: MeasuredNode,
        link: MeasuredLink,
    ): Arc {
        const begin = { x: from.locator.x, y: from.locator.y };
        const end = { x: to.locator.x, y: to.locator.y };
        const dx = end.x - begin.x;
        const dy = end.y - begin.y;
        const length = Math.hypot(dx, dy) || 1;
        const cross =
            (link.mid.x - begin.x) * dy -
            (link.mid.y - begin.y) * dx;
        const distanceToLine = Math.abs(cross) / length;

        if (distanceToLine >= MIN_CURVATURE) {
            return new Arc(begin, { x: link.mid.x, y: link.mid.y }, end);
        }

        const sign = cross >= 0 ? 1 : -1;
        const offset =
            (MIN_CURVATURE - distanceToLine + 0.01) * sign;
        const nx = -dy / length;
        const ny = dx / length;

        return new Arc(
            begin,
            {
                x: link.mid.x + nx * offset,
                y: link.mid.y + ny * offset,
            },
            end,
        );
    }
}
