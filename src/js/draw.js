import { Arc, Arrow } from "./graphics";

class Edge {
    constructor(ctx, color, carcass) {
        this.ctx = ctx;
        this.color = color;
        this.arc = new Arc(carcass);
    }

    arch() {
        return this.arc;
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;

        this.arc.draw(ctx);
    }
}

class CausalArrowHead {
    constructor(color, carcass, boundary) {
        this.color = color;
        this.arrow = new Arrow(new Arc(ctx, carcass), boundary, 15);
    }

    getArrowHead() {
        return this.arrow;
    }

    draw(ctx) {
        ctx.fillStyle = ctx.strokeStyle = this.color;
        this.arrow.draw(ctx);
    }
}

class CausalVertex {
    constructor(text, x, y) {
        this.text = text;
        this.area = new TextArea(ctx, text, x, y, 150);
        this.outline = false;
    }

    getTextElement() {
        return this.area;
    }

    outline() {
        this.outline = true;
    }

    drawOutline(ctx) {
        if (this.outline) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#000000";
        } else ctx.strokeStyle = "#ffffff";
    }

    draw(ctx) {
        ctx.font = "20px Sans-Serif";

        this.drawOutline(ctx);

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.rect(...this.area.getBoundingRect());
        ctx.stroke();
        ctx.fill();

        ctx.fillStyle = "#000000";
        this.area.draw(ctx);
    }
}
