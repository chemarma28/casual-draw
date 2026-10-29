import { Locator } from "../locators/locator";
import { Vector } from "../math";

const HIT_PADDING = 6;

export class NodeLocator extends Locator {
    width = 0;
    height = 0;

    constructor(x: number, y: number) {
        super(x, y);
    }

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.r = Math.max(width, height) / 2;
    }

    isPointInLocator(point: Vector): boolean {
        return (
            Math.abs(point.x - this.x) <= this.width / 2 + HIT_PADDING &&
            Math.abs(point.y - this.y) <= this.height / 2 + HIT_PADDING
        );
    }

    draw(_ctx: CanvasRenderingContext2D) {
        // DemoDiagram renders the node itself.
    }
}
