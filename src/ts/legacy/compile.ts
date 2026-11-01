// @ts-nocheck
import { Translator, LxLinkHead } from "./lexer";
import { KKLayout } from "../kamada";
import { FRLayout } from "../fruchterman";
import {
    intersectArcAndRectangle,
    distance,
    hasIntersection,
} from "../math";
import {
    Text,
    Arc,
    ArrowHead,
    calculatePositionsForLabel,
    Delay,
} from "../graphics";

const VERTEX_FONT = "20px Sans-Serif";
const VERTEX_BACKGROUND = "rgba(255, 105, 180, 0.4)";
const VERTEX_BORDER = "#c71585";

function arcParameter(arc, point) {
    const phi = Math.atan2(
        point.y - arc.center.y,
        point.x - arc.center.x,
    );

    let delta = arc.counterclockwise
        ? arc.phi1 - phi
        : phi - arc.phi1;

    while (delta < 0) delta += 2 * Math.PI;
    while (delta >= 2 * Math.PI) delta -= 2 * Math.PI;

    return delta;
}

function pickSourcePoint(arc, points) {
    if (points.length === 0) return undefined;

    return points.reduce((best, point) =>
        arcParameter(arc, point) < arcParameter(arc, best)
            ? point
            : best,
    );
}

function pickTargetPoint(arc, points) {
    if (points.length === 0) return undefined;

    return points.reduce((best, point) =>
        arcParameter(arc, point) > arcParameter(arc, best)
            ? point
            : best,
    );
}

export type CompileResult =
    | { ok: true }
    | { ok: false; error: Error };

export function compile(
    str: string,
    canvas: HTMLCanvasElement,
    layoutWidth = canvas.width,
    layoutHeight = canvas.height,
    offsetX = 0,
    offsetY = 0,
): CompileResult {
    const translator = new Translator();

    try {
        translator.translate(str);

        const vertexPool = translator.getVertexPool();
        const linkPool = translator.getLinkPool();

        if (
            vertexPool.getCount() < 1 ||
            linkPool.asArray().length < 1
        ) {
            return {
                ok: false,
                error: new Error("The diagram does not contain any links."),
            };
        }

        const layout = new Layout(
            vertexPool,
            linkPool,
            layoutWidth,
            layoutHeight,
        );
        const edges = layout.getEdges();
        const [x, y] = [layout.getX(), layout.getY()];

        const colorResolver = new EdgeColorResolver(vertexPool, linkPool);
        const delayResolver = new EdgeDelayResolver(vertexPool, linkPool);
        const polarityResolver = new EdgePolarityResolver(
            vertexPool,
            linkPool,
        );

        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return {
                ok: false,
                error: new Error("Canvas 2D context is not available."),
            };
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(offsetX, offsetY);

        const vertexIndices = new Set();

        for (const edge of edges) {
            vertexIndices.add(edge[0]);
            vertexIndices.add(edge[2]);
        }

        const causalVertices = new Map();
        const vertToText = new Map();

        for (const v of vertexIndices) {
            const vertex = vertexPool.getVertexByIndex(v);
            const causalVertex = new CausalVertex(
                ctx,
                vertex.text,
                x[v],
                y[v],
            );

            if (vertex.framed) causalVertex.setFramed();

            causalVertices.set(v, causalVertex);
            vertToText.set(v, causalVertex.getTextElement());
        }

        const trimmedArcs = new Map();

        for (const edge of edges) {
            const source = edge[0];
            const middle = edge[1];
            const target = edge[2];
            const sourceText = vertToText.get(source);
            const targetText = vertToText.get(target);

            const fullArc = new Arc(
                { x: x[source], y: y[source] },
                { x: x[middle], y: y[middle] },
                { x: x[target], y: y[target] },
            );

            let sourcePoint = { x: x[source], y: y[source] };
            let targetPoint = { x: x[target], y: y[target] };
            let drawArc = fullArc;

            if (sourceText && targetText) {
                const sourceRect = sourceText.getBoundingRect();
                const targetRect = targetText.getBoundingRect();
                const overlap =
                    source !== target &&
                    hasIntersection(sourceRect, targetRect);

                if (!overlap) {
                    const sourceHit = pickSourcePoint(
                        fullArc,
                        intersectArcAndRectangle(fullArc, sourceRect),
                    );
                    const targetHit = pickTargetPoint(
                        fullArc,
                        intersectArcAndRectangle(fullArc, targetRect),
                    );

                    if (sourceHit) sourcePoint = sourceHit;
                    if (targetHit) targetPoint = targetHit;

                    if (sourceHit || targetHit) {
                        drawArc = new Arc(
                            sourcePoint,
                            fullArc.mid,
                            targetPoint,
                        );
                    }
                }
            }

            const causalEdge = new CausalEdge(
                ctx,
                colorResolver.resolveColorFor(edge).hex,
                drawArc,
            );

            causalEdge.draw();

            if (delayResolver.resolveDelayFor(edge)) {
                new Delay(fullArc).draw(ctx);
            }

            trimmedArcs.set(edge, {
                arc: drawArc,
                target: targetPoint,
            });
        }

        for (const causalVertex of causalVertices.values()) {
            causalVertex.draw();
        }

        const labelResolver = new LabelResolver(ctx);

        for (const causalVertex of causalVertices.values()) {
            labelResolver.registerElement(causalVertex.getTextElement());
        }

        for (const edge of edges) {
            const color = colorResolver.resolveColorFor(edge).hex;
            const trimmed = trimmedArcs.get(edge);

            if (!trimmed) continue;

            const causalArrowHead = new CausalArrowHead(
                ctx,
                color,
                trimmed.arc,
                trimmed.target,
            );

            causalArrowHead.draw();

            const arrowHead = causalArrowHead.getArrowHead();
            labelResolver.registerElement(arrowHead);

            const symbol = polarityResolver.resolvePolarityFor(edge).symbol;
            const label = labelResolver.resolveLabelFor(
                arrowHead,
                symbol,
                color,
            );

            if (label) label.draw(ctx);
        }

        ctx.restore();

        return { ok: true };
    } catch (e) {
        return {
            ok: false,
            error: e instanceof Error ? e : new Error(String(e)),
        };
    }
}

class Layout {
    constructor(vertexPool, linkPool, screenWidth, screenHeight) {
        const l = 750;
        const kklayout = new KKLayout(new AdjacencyMatrix(vertexPool, linkPool).matrix, l, 10);
        kklayout.run();

        const scale = new Scale(screenWidth, screenHeight, l, l);
        const [kx, ky] = [scale.scaleX(kklayout.getX()), scale.scaleY(kklayout.getY())];

        const matrix = new AdjacencyMatrix(vertexPool, linkPool).matrix;
        let sum = 0;
        let count = 0;

        for (let i = 0; i < matrix.length; i++)
            for (let j = 0; j < matrix.length; j++)
                if (matrix[i][j] != 0 && i != j) {
                    sum += distance({
                        x: kx[i] - kx[j],
                        y: ky[i] - ky[j],
                    });
                    count++;
                }

        const k = sum / count / 3.2;
        const frlayout = new FRLayout(new AdjacencyMatrix(vertexPool, linkPool).matrix, kx, ky, k);
        frlayout.run();

        this.layout = frlayout.getLayout();
        [this.x, this.y] = [frlayout.getX(), frlayout.getY()];
        this.dummies = frlayout.getDummiesIndices();
    }

    getEdges() {
        return this.layout;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    isDummy(index) {
        return this.dummies.has(index);
    }
}

class CausalEdge {
    constructor(ctx, color, arc) {
        this.ctx = ctx;
        this.color = color;
        this.arc = arc;
    }

    getArc() {
        return this.arc;
    }

    draw() {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = 2;
        this.arc.draw(this.ctx, 2);
    }
}

class CausalArrowHead {
    constructor(ctx, color, arc, joint) {
        this.ctx = ctx;
        this.color = color;
        this.arrowHead = new ArrowHead(arc, joint, 15);
    }

    getArrowHead() {
        return this.arrowHead;
    }

    draw() {
        this.ctx.fillStyle = this.ctx.strokeStyle = this.color;
        this.arrowHead.draw(this.ctx);
    }
}

class CausalVertex {
    constructor(ctx, text, x, y) {
        this.ctx = ctx;

        ctx.save();
        ctx.font = VERTEX_FONT;
        this.textElement = new Text(ctx, text, x, y, 150);
        ctx.restore();
    }

    getTextElement() {
        return this.textElement;
    }

    setFramed() {
        this.isFramed = true;
    }

    draw() {
        this.ctx.font = VERTEX_FONT;

        if (this.isFramed) {
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = "#000000";
        } else {
            this.ctx.strokeStyle = VERTEX_BORDER;
        }

        this.ctx.fillStyle = VERTEX_BACKGROUND;
        this.ctx.beginPath();

        const rect = this.textElement.getBoundingRect();

        this.ctx.rect(rect.x.x, rect.x.y, rect.width, rect.height);
        this.ctx.stroke();
        this.ctx.fill();

        this.ctx.fillStyle = "#000000";
        this.textElement.draw(this.ctx);
    }
}

class LabelResolver {
    constructor(ctx) {
        this.ctx = ctx;
        this.elements = [];
    }

    registerElement(element) {
        this.elements.push(element);
    }

    resolveLabelFor(arrowHead, symbol, color) {
        this.ctx.strokeStyle = color;

        if (symbol != null) {
            const attempts = calculatePositionsForLabel(arrowHead);

            for (let i = 0; i < attempts.length; i++) {
                const attempt = attempts[i];
                const newLabel = new Text(
                    this.ctx,
                    symbol,
                    attempt.x,
                    attempt.y,
                    15,
                );
                let intersectionFound = false;

                for (let element of this.elements) {
                    const rect1 = element.getBoundingRect();
                    const rect2 = newLabel.getBoundingRect();

                    if (hasIntersection(rect1, rect2)) {
                        intersectionFound = true;
                        break;
                    }
                }

                if (!intersectionFound) {
                    this.registerElement(newLabel);
                    return newLabel;
                }
            }

            const fallback = attempts[0];
            const newLabel = new Text(
                this.ctx,
                symbol,
                fallback.x,
                fallback.y,
                15,
            );
            this.registerElement(newLabel);

            return newLabel;
        }
    }
}

class Scale {
    constructor(screenWidth, screenHeight, width, height) {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.width = width;
        this.height = height;
    }

    scale(x, w, W) {
        const x0 = Math.min(...x);
        const k = w / (Math.max(...x) - x0);
        const X0 = (W - w) / 2;
        const dx = X0 - x0;

        return x.map(xx => x0 + k * (xx - x0) + dx);
    }

    scaleX(x) {
        return this.scale(x, this.width, this.screenWidth);
    }

    scaleY(y) {
        return this.scale(y, this.height, this.screenHeight);
    }
}

class AdjacencyMatrix {
    constructor(vertexPool, linkPool) {
        const n = vertexPool.getCount();

        this.matrix = [...Array(n)].map(() => {
            const row = [...Array(n)];

            for (let col = 0; col < n; col++) {
                row[col] = 0;
            }

            return row;
        });

        for (let link of linkPool.asArray()) {
            const left = vertexPool.getIndex(link.left);
            const right = vertexPool.getIndex(link.right);

            this.matrix[left][right] = 1;
        }
    }
}

class LinkColor {
    constructor(head) {
        this.hex = "yellow";

        if (head === LxLinkHead["DEFAULT"])
            this.hex = "#000000";
        else if (head === LxLinkHead["POSITIVE"])
            this.hex = "#08ABED";
        else if (head === LxLinkHead["NEGATIVE"])
            this.hex = "#C73544";
    }
}

class EdgeColorResolver {
    constructor(vertexPool, linkPool) {
        this.edge2Color = new Map();

        for (let link of linkPool.asArray()) {
            const left = vertexPool.getIndex(link.left);
            const right = vertexPool.getIndex(link.right);

            this.edge2Color.set(this.hash(left, right), new LinkColor(link.head));
        }
    }

    hash(left, right) {
        return (100 + left) * 100 + right;
    }

    resolveColorFor(edge) {
        const hash = this.hash(edge[0], edge[2]);

        if (this.edge2Color.has(hash))
            return this.edge2Color.get(hash);

        throw new Error(`Unknown color for ${hash}`);
    }
}

class LinkPolarity {
    constructor(head) {
        this.symbol = null;

        if (head === LxLinkHead["POSITIVE"])
            this.symbol = "+";
        if (head === LxLinkHead["NEGATIVE"])
            this.symbol = "-";
    }
}

class EdgePolarityResolver {
    constructor(vertexPool, linkPool) {
        this.edge2Polarity = new Map();

        for (let link of linkPool.asArray()) {
            const left = vertexPool.getIndex(link.left);
            const right = vertexPool.getIndex(link.right);

            this.edge2Polarity.set(this.hash(left, right), new LinkPolarity(link.head));
        }
    }

    hash(left, right) {
        return (100 + left) * 100 + right;
    }

    resolvePolarityFor(edge) {
        const hash = this.hash(edge[0], edge[2]);

        if (this.edge2Polarity.has(hash))
            return this.edge2Polarity.get(hash);

        throw new Error(`Unknown polarity for ${hash}`);
    }
}

class EdgeDelayResolver {
    constructor(vertexPool, linkPool) {
        this.edge2Delay = new Map();

        for (let link of linkPool.asArray()) {
            const left = vertexPool.getIndex(link.left);
            const right = vertexPool.getIndex(link.right);

            this.edge2Delay.set(this.hash(left, right), link.delayed);
        }
    }

    hash(left, right) {
        return (100 + left) * 100 + right;
    }

    resolveDelayFor(edge) {
        const hash = this.hash(edge[0], edge[2]);

        if (this.edge2Delay.has(hash))
            return this.edge2Delay.get(hash);

        throw new Error(`Unknown delay for ${hash}`);
    }
}
