import { CanvasSize, Viewport } from "./viewport";

export type GridOptions = {
    minorStep?: number;
    majorEvery?: number;
    minorColor?: string;
    majorColor?: string;
    minorOpacity?: number;
    lineWidth?: number;
    minMinorSpacing?: number;
    minMajorSpacing?: number;
};

const DEFAULT_OPTIONS: Required<GridOptions> = {
    minorStep: 20,
    majorEvery: 4,
    minorColor: "#e6e6e6",
    majorColor: "#e6e6e6",
    minorOpacity: 0.2,
    lineWidth: 1,
    minMinorSpacing: 4,
    minMajorSpacing: 8,
};

export function drawGrid(
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    size: CanvasSize,
    options: GridOptions = {},
) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const minorSpacing = config.minorStep * viewport.scale;
    const majorStep = config.minorStep * config.majorEvery;
    const majorSpacing = majorStep * viewport.scale;

    if (majorSpacing < config.minMajorSpacing) return;

    const bounds = viewport.visibleWorldBounds(size);
    const startX = Math.floor(bounds.minX / config.minorStep);
    const endX = Math.ceil(bounds.maxX / config.minorStep);
    const startY = Math.floor(bounds.minY / config.minorStep);
    const endY = Math.ceil(bounds.maxY / config.minorStep);

    ctx.save();
    ctx.lineWidth = config.lineWidth;

    if (minorSpacing >= config.minMinorSpacing) {
        ctx.strokeStyle = config.minorColor;
        ctx.globalAlpha = config.minorOpacity;
        ctx.beginPath();

        for (let i = startX; i <= endX; i++) {
            if (i % config.majorEvery === 0) continue;

            const x = screenCoordinate(viewport.worldToScreen({
                x: i * config.minorStep,
                y: 0,
            }).x);

            ctx.moveTo(x, 0);
            ctx.lineTo(x, size.height);
        }

        for (let i = startY; i <= endY; i++) {
            if (i % config.majorEvery === 0) continue;

            const y = screenCoordinate(viewport.worldToScreen({
                x: 0,
                y: i * config.minorStep,
            }).y);

            ctx.moveTo(0, y);
            ctx.lineTo(size.width, y);
        }

        ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = config.majorColor;
    ctx.beginPath();

    for (let i = Math.floor(bounds.minX / majorStep); i <= Math.ceil(bounds.maxX / majorStep); i++) {
        const x = screenCoordinate(viewport.worldToScreen({
            x: i * majorStep,
            y: 0,
        }).x);

        ctx.moveTo(x, 0);
        ctx.lineTo(x, size.height);
    }

    for (let i = Math.floor(bounds.minY / majorStep); i <= Math.ceil(bounds.maxY / majorStep); i++) {
        const y = screenCoordinate(viewport.worldToScreen({
            x: 0,
            y: i * majorStep,
        }).y);

        ctx.moveTo(0, y);
        ctx.lineTo(size.width, y);
    }

    ctx.stroke();
    ctx.restore();
}

function screenCoordinate(value: number): number {
    return Math.round(value) + 0.5;
}
