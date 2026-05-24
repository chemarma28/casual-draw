import { Translator, LxLinkHead } from "../ts/lexer";
import { KKLayout } from "../ts/kamada";
import { distance, hasIntersection } from "../ts/math";
import { FRLayout } from "../ts/fruchterman";
import {
    TextArea,
    Arc,
    Arrow,
    calculatePositionsForLabel,
    Delay,
} from "./graphics.js";

export function compile(source, canvas, errorCallback) {
    const traslator = new Translator();

    try {
        traslator.translate(source);
    } catch (e) {
        errorCallback.call(null, e);
        return;
    }

    // Pool of vertecies
    const vertecies = traslator.getVertexPool();
    // Pool of links
    const links = traslator.getLinkPool();

    if (!vertecies || !links || vertecies.length < 1 || links.length < 1)
        return;

    draw(canvas, vertecies, links);
}

export function draw(canvas, vertecies, links) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const layout = new Layout(vertecies, links, canvas.width, canvas.height);
    const colors = new EdgeColorResolver(vertecies, links);
    const delays = new EdgeDelayResolver(vertecies, links);
    const labels = new LabelResolver(ctx);
    const polarities = new EdgePolarityResolver(vertecies, links);

    // list of vertecies [v1, v2, v3]
    const edges = [layout.getEdges()];
    // example: coordinates of v1 are xcoords[1], ycoords[1]
    const [xcoords, ycoords] = [layout.getX(), layout.getY()];
    // vertecies to be drawn
    const joints = new Set();

    // wtf? label element of each vertex
    const v2t = new Map();

    edges.forEach((edge) => {
        const arch = new Edge(
            ctx,
            colors.resolveColorFor(edge).hex,
            edge.map((v) => [xcoords[v], ycoords[v]]),
        );

        arch.draw();

        if (delays.resolveDelayFor(edge)) new Delay(ctx, arch.getArc()).draw();

        edge.forEach((v) => {
            if (layout.isDummy(v)) return;

            joints.add(v);
        });
    });

    joints.forEach((v) => {
        const text = vertecies.getVertexByIndex(v).text;
        const label = new CausalVertex(ctx, text, xcoords[v], ycoords[v]);

        if (vertecies.getVertexByIndex(v).framed) label.setFramed();

        label.draw();

        v2t.set(v, label.getTextElement());
        labels.registerElement(label.getTextElement());
    });

    edges.forEach((edge) => {
        const color = colors.resolveColorFor(edge).hex;

        const head = new CausalArrowHead(
            ctx,
            color,
            edge.map((v) => [x[v], y[v]]),
            v2t.get(edge[2]),
        );

        head.draw();

        const headElement = head.getArrowHead();
        labels.registerElement(headElement);

        const char = polarities.resolvePolarityFor(edge).symbol;
        const label = labels.resolveLabelFor(headElement, char, color);

        if (label) label.draw();
    });
}

class Layout {
    constructor(vertexPool, linkPool, screenWidth, screenHeight) {
        const l = 750;
        const kklayout = new KKLayout(
            new AdjacencyMatrix(vertexPool, linkPool).matrix,
            l,
            10,
        );
        kklayout.run();

        const scale = new Scale(screenWidth, screenHeight, l, l);
        const [kx, ky] = [
            scale.scaleX(kklayout.getX()),
            scale.scaleY(kklayout.getY()),
        ];

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
        const frlayout = new FRLayout(
            new AdjacencyMatrix(vertexPool, linkPool).matrix,
            kx,
            ky,
            k,
        );
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
                const newLabel = new TextArea(this.ctx, symbol, ...attempts[i], 15);
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

            const newLabel = new TextArea(this.ctx, symbol, ...attempts[0], 15);
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

        return x.map((xx) => x0 + k * (xx - x0) + dx);
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

        if (head === LxLinkHead["DEFAULT"]) this.hex = "#000000";
        else if (head === LxLinkHead["POSITIVE"]) this.hex = "#08ABED";
        else if (head === LxLinkHead["NEGATIVE"]) this.hex = "#C73544";
    }
}

class EdgeColorResolver {
    constructor(vertexPool, linkPool) {
        this.edge2Color = new Map();

        for (let link of linkPool.asArray()) {
            const left = vertexPool.getIndex(link.left);
            const right = vertexPool.getIndex(link.right);

            this.edge2Color.set(
                this.hash(left, right),
                new LinkColor(link.head),
            );
        }
    }

    hash(left, right) {
        return (100 + left) * 100 + right;
    }

    resolveColorFor(edge) {
        const hash = this.hash(edge[0], edge[2]);

        if (this.edge2Color.has(hash)) return this.edge2Color.get(hash);

        throw new Error(`Unknown color for ${hash}`);
    }
}

class LinkPolarity {
    constructor(head) {
        this.symbol = null;

        if (head === LxLinkHead["POSITIVE"]) this.symbol = "+";
        if (head === LxLinkHead["NEGATIVE"]) this.symbol = "-";
    }
}

class EdgePolarityResolver {
    constructor(vertexPool, linkPool) {
        this.edge2Polarity = new Map();

        for (let link of linkPool.asArray()) {
            const left = vertexPool.getIndex(link.left);
            const right = vertexPool.getIndex(link.right);

            this.edge2Polarity.set(
                this.hash(left, right),
                new LinkPolarity(link.head),
            );
        }
    }

    hash(left, right) {
        return (100 + left) * 100 + right;
    }

    resolvePolarityFor(edge) {
        const hash = this.hash(edge[0], edge[2]);

        if (this.edge2Polarity.has(hash)) return this.edge2Polarity.get(hash);

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

        if (this.edge2Delay.has(hash)) return this.edge2Delay.get(hash);

        throw new Error(`Unknown delay for ${hash}`);
    }
}
