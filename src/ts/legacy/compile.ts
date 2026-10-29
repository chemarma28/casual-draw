// @ts-nocheck
import { Translator, LxLinkHead } from "./lexer";
import { KKLayout } from "./layout/kamada";
import { distance, hasIntersection } from "./math";
import { FRLayout } from "./layout/fruchterman";
import { Text, Arc, ArrowHead, calculatePositionsForLabel, Delay } from "./graphics";

const VERTEX_FONT = "20px Sans-Serif";

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
        const vertices = new Set();

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

        const delayResolver = new EdgeDelayResolver(vertexPool, linkPool);

        for (let edge of edges) {
            const causalEdge = new CausalEdge(
                ctx,
                colorResolver.resolveColorFor(edge).hex,
                edge.map((v) => [x[v], y[v]]),
            );

            causalEdge.draw();

            if (delayResolver.resolveDelayFor(edge))
                new Delay(ctx, causalEdge.getArc()).draw();

            for (let index of edge) {
                if (!layout.isDummy(index)) {
                    vertices.add(index);
                }
            }
        }

        const vertToText = new Map();
        const labelResolver = new LabelResolver(ctx);

        for (let v of vertices) {
            const text = vertexPool.getVertexByIndex(v).text;
            const causalVertex = new CausalVertex(ctx, text, x[v], y[v]);

            if (vertexPool.getVertexByIndex(v).framed)
                causalVertex.setFramed();

            causalVertex.draw();
            vertToText.set(v, causalVertex.getTextElement());
            labelResolver.registerElement(causalVertex.getTextElement());
        }

        const polarityResolver = new EdgePolarityResolver(
            vertexPool,
            linkPool,
        );

        for (let edge of edges) {
            const color = colorResolver.resolveColorFor(edge).hex;
            const causalArrowHead = new CausalArrowHead(
                ctx,
                color,
                edge.map((v) => [x[v], y[v]]),
                vertToText.get(edge[2]),
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

            if (label) label.draw();
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
                    sum += distance([kx[i] - kx[j], ky[i] - ky[j]]);
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
    constructor(ctx, color, cascade) {
        this.ctx = ctx;
        this.color = color;
        this.arc = new Arc(ctx, cascade);
    }

    getArc() {
        return this.arc;
    }

    draw() {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = 2;
        this.arc.draw();
    }
}

class CausalArrowHead {
    constructor(ctx, color, cascade, stickTo) {
        this.ctx = ctx;
        this.color = color;
        this.arrowHead = new ArrowHead(ctx, new Arc(ctx, cascade), stickTo, 15);
    }

    getArrowHead() {
        return this.arrowHead;
    }

    draw() {
        this.ctx.fillStyle = this.ctx.strokeStyle = this.color;
        this.arrowHead.draw();
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
            this.ctx.strokeStyle = "#ffffff";
        }

        this.ctx.fillStyle = "#ffffff";
        this.ctx.beginPath();
        this.ctx.rect(...this.textElement.getBoundingRect());
        this.ctx.stroke();
        this.ctx.fill();

        this.ctx.fillStyle = "#000000";
        this.textElement.draw();
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
                const newLabel = new Text(this.ctx, symbol, ...attempts[i], 15);
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

            const newLabel = new Text(this.ctx, symbol, ...attempts[0], 15);
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
