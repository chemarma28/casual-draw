// @ts-nocheck
const UNEXPECTED_TOKEN = (str: string, pos: number) => new Error(`Unexpected token '${str[pos]}' at position: ${pos}.`);
const ALIAS_DEF_EXPECTED = (str: string, pos: number) => new Error(`Expected '@' at position: ${pos}, but '${str[pos]}' 'was met.`);
const CLOSE_PARANTH_EXPECTED = (str: string, pos: number) => new Error(`Expected ')' at position: ${pos}, but '${str[pos]}' was met.`);
const CLOSE_BRACK_EXPECTED = (str: string, pos: number) => new Error(`Expected ']' at position: ${pos}, but '${str[pos]}' was met.`);
const ARROW_DEF_EXPECTED = (str: string, pos: number) => new Error(`Expected arrow definition at position: ${pos}, but '${str[pos]}' was met.`);

class LxVertex {
    public text: string;
    public framed: boolean;

    constructor(text: string) {
        this.text = text;
    }
}

export class LxVertexPool {
    private next: number;
    private name2Vertex: Map<String, LxVertex>;
    private name2Index: Map<String, number>;
    private index2Vertex: Map<number, LxVertex>;

    constructor() {
        this.next = 0;
        this.name2Vertex = new Map();
        this.name2Index = new Map();
        this.index2Vertex = new Map();
    }

    public put(name: string, v: LxVertex) {
        if (this.name2Vertex.has(name))
            throw new Error(`Variable with name '${name}' is already defined.`);

        this.name2Vertex.set(name, v);
        this.name2Index.set(name, this.next);
        this.index2Vertex.set(this.next++, v);
    }

    public getVertexByName(name: string): LxVertex {
        if (!this.name2Vertex.has(name))
            throw new Error(`Variable with name '${name}' is not defined.`);

        return this.name2Vertex.get(name);
    }

    public getVertexByIndex(index: number): LxVertex {
        if (!this.index2Vertex.has(index))
            throw new Error(`Variable with index ${index} is not defined.`);

        return this.index2Vertex.get(index);
    }

    public getIndex(name: string): number {
        if (!this.name2Vertex.has(name))
            throw new Error(`Variable with name '${name}' is not defined.`);

        return this.name2Index.get(name);
    }

    public getCount(): number {
        return this.name2Vertex.size;
    }
}

export enum LxLinkHead {
    DEFAULT,
    POSITIVE,
    NEGATIVE
};

class LxLink {
    private left: string;
    private right: string;
    private head: LxLinkHead;
    private delayed: boolean;

    constructor(left: string, right: string, head: LxLinkHead) {
        this.left = left;
        this.right = right;
        this.head = head;
    }

    public setDelayed() {
        this.delayed = true;
    }
}

export class LxLinkPool {
    private pool: Array<LxLink>;

    constructor() {
        this.pool = [];
    }

    public push(link: LxLink) {
        this.pool.push(link);
    }

    public asArray(): Array<LxLink> {
        return this.pool;
    }
}

interface LxToken {
}

interface LxOperand {
}

interface LxOperation {
    handle(left: LxOperand, right: LxOperand): LxOperand;
    getPriorityValue(): number;
}

class LxName implements LxToken, LxOperand {
    public name: string;

    constructor(name: string) {
        this.name = name;
    }
}

class LxText implements LxToken, LxOperand {
    public text: string;

    constructor(text: string) {
        this.text = text;
    }
}

class LxAlias implements LxToken, LxOperation {
    private pool: LxVertexPool;
    private framed: boolean;

    constructor(pool: LxVertexPool) {
        this.pool = pool;
    }

    public handle(left: LxOperand, right: LxOperand): LxOperand {
        if (!(left instanceof LxName) || !(right instanceof LxText))
            throw new Error(`Unsupported operand types for alias operation.`);

        const lxVertex = new LxVertex(right.text);

        if (this.framed)
            lxVertex.framed = true;

        this.pool.put(left.name, lxVertex);

        return left;
    }

    public getPriorityValue(): number {
        return 2;
    }

    public setFramed() {
        this.framed = true;
    }
}

class LxArrow implements LxToken, LxOperation {
    private head: LxLinkHead;
    private delayed: boolean;
    private linkPool: LxLinkPool;

    constructor(head: LxLinkHead, linkPool: LxLinkPool) {
        this.head = head;
        this.linkPool = linkPool;
    }

    public handle(left: LxOperand, right: LxOperand): LxName {
        if (!(left instanceof LxName) || !(right instanceof LxName))
            throw new Error(`Unsupported operand types for arrow operation.`);

        const link = new LxLink(left.name, right.name, this.head);
        this.linkPool.push(link);

        if (this.delayed)
            link.setDelayed();

        return left;
    }

    public getPriorityValue(): number {
        return 1;
    }

    public setDelayed() {
        this.delayed = true;
    }
}

class SolvingStackMachine {
    private holdingStack: Array<LxOperation>;
    private output: Array<LxToken>;
    private solvingStack: Array<LxOperand>;

    constructor() {
        this.holdingStack = [];
        this.output = [];
        this.solvingStack = [];
    }

    public solve() {
        while (this.holdingStack.length > 0)
            this.output.push(this.holdingStack.pop());

        for (let token of this.output) {
            if (token instanceof LxAlias || token instanceof LxArrow) {
                const right = this.solvingStack.pop();
                const left = this.solvingStack.pop();
                this.solvingStack.push(token.handle(left, right));
            } else
                this.solvingStack.push(token);
        }
    }

    public clear() {
        this.holdingStack = [];
        this.output = [];
        this.solvingStack = [];
    }

    public push(lex: LxToken) {
        if (lex instanceof LxName || lex instanceof LxText)
            this.output.push(lex);

        if (lex instanceof LxAlias || lex instanceof LxArrow) {
            let top = this.holdingStack.pop();

            while (top != null && lex.getPriorityValue() < top.getPriorityValue()) {
                this.output.push(top);
                top = this.holdingStack.pop();
            }

            if (top != null)
                this.holdingStack.push(top);

            this.holdingStack.push(lex);
        }
    }
}

export class Translator {
    private ssm: SolvingStackMachine;
    private vertexPool: LxVertexPool;
    private linkPool: LxLinkPool;

    private isWord(ch: string): boolean {
        if (ch.length > 1)
            throw new Error(`Character expected instead of ${ch}`);

        const t = ch.toLowerCase();

        return 'a' <= t && t <= 'z';
    }

    private isDigit(ch: string): boolean {
        if (ch.length > 1)
            throw new Error(`Character expected instead of ${ch}`);

        return '0' <= ch && ch <= '9';
    }

    private isSeparator(ch: string): boolean {
        if (ch.length > 1)
            throw new Error(`Character expected instead of ${ch}`);

        return ' ' === ch || '\n' === ch || '\t' === ch;
    }

    private isPunctuation(ch: string): boolean {
        if (ch.length > 1)
            throw new Error(`Character expected instead of ${ch}`);

        return ',' === ch || '.' === ch || '!' === ch || '?' === ch || ch === '-' || ';' === ch || ':' === ch;
    }

    private skipSeparator(str: string, pos: number): number {
        let next = pos;

        while (next < str.length && this.isSeparator(str[next])) {
            next += 1;
        }

        return next;
    }

    private lexName(str: string, pos: number): number {
        if (!this.isWord(str[pos]))
            throw UNEXPECTED_TOKEN(str, pos);

        let next = pos;
        let name: string = "";

        do {
            name += str[next];
            next = next + 1;
        } while (this.isWord(str[next]) || this.isDigit(str[next]) || str[next] === '_');

        this.ssm.push(new LxName(name));

        return next;
    }

    private lexText(str: string, pos: number): number {
        let next = pos;
        let text: string = "";

        while (
            this.isWord(str[next])
            || this.isDigit(str[next])
            || this.isSeparator(str[next])
            || this.isPunctuation(str[next])
        ) {
            text += str[next];
            next = next + 1;
        }

        this.ssm.push(new LxText(text));

        return next;
    }

    private lexAlias(str: string, pos: number): number {
        if (str[pos] !== '@')
            throw ALIAS_DEF_EXPECTED(str, pos);

        let next = this.lexName(str, pos + 1);

        next = this.skipSeparator(str, next);

        if (str[next] === '(') {
            next = this.lexText(str, next + 1);

            if (str[next] === ')') {
                this.ssm.push(new LxAlias(this.vertexPool));
                return next + 1;
            }

            throw CLOSE_PARANTH_EXPECTED(str, next);
        } else if (str[next] === '[') {
            next = this.lexText(str, next + 1);

            if (str[next] === ']') {
                const lxAlias = new LxAlias(this.vertexPool);
                lxAlias.setFramed();
                this.ssm.push(lxAlias);
                return next + 1;
            }

            throw CLOSE_BRACK_EXPECTED(str, next);
        }

        throw UNEXPECTED_TOKEN(str, next);
    }

    private lexArrow(str: string, pos: number): number {
        let next = pos;
        let head = LxLinkHead.DEFAULT;
        let delayed = false;

        if (str[next] === '|') {
            next = next + 1

            if (str[next] === '|') {
                delayed = true;
                next = next + 1;
            } else
                throw UNEXPECTED_TOKEN(str, next);
        }

        if (str[next] === '+') {
            next = next + 1;
            head = LxLinkHead.POSITIVE;
        } else if (str[next] === '-') {
            next = next + 1;
            head = LxLinkHead.NEGATIVE;
        }

        if (str[next] === '>') {
            const operation = new LxArrow(head, this.linkPool);

            if (delayed)
                operation.setDelayed();

            this.ssm.push(operation);

            return next + 1;
        }

        throw ARROW_DEF_EXPECTED(str, next);
    }

    private lexVert(str: string, pos: number): number {
        let next = pos;

        try {
            next = this.lexAlias(str, pos);
        } catch (e) {
            next = this.lexName(str, pos);
        }

        return next;
    }

    private lexExpression(str: string, pos: number): number {
        let next = this.lexVert(str, pos);
        next = this.skipSeparator(str, next);

        do {
            next = this.lexArrow(str, next);
            next = this.skipSeparator(str, next);
            next = this.lexVert(str, next);
            next = this.skipSeparator(str, next);
        } while (next < str.length && str[next] !== ';');

        return next + 1;
    }

    public translate(str: string) {
        this.ssm = new SolvingStackMachine();
        this.vertexPool = new LxVertexPool();
        this.linkPool = new LxLinkPool();

        let next = this.skipSeparator(str, 0);

        while (next < str.length) {
            next = this.lexExpression(str, next);

            this.ssm.solve();
            this.ssm.clear();

            next = this.skipSeparator(str, next);
        }
    }

    public getVertexPool(): LxVertexPool {
        return this.vertexPool;
    }

    public getLinkPool(): LxLinkPool {
        return this.linkPool;
    }
}
