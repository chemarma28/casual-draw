import CodeFlask from "codeflask";

export type EditorDiagnostic = {
    message: string;
    line?: number;
    column?: number;
};

export interface EditorHost {
    getValue(): string;
    setValue(code: string): void;
    onChange(callback: (code: string) => void): void;
    setDiagnostics(diagnostics: EditorDiagnostic[]): void;
    destroy(): void;
}

const CLD_GRAMMAR = {
    name: [/@\w[\w\d]*/],
    text: [/\([\w\d\ ]*\)/, /\[[\w\d\ ]*\]/],
    positive: [/(\|\|)?\+>/],
    negative: [/(\|\|)?->/],
    default: [/(\|\|)?>/],
};

export class CodeFlaskEditor implements EditorHost {
    private readonly flask: CodeFlask;
    private readonly listeners: Array<(code: string) => void> = [];
    private readonly element: HTMLElement;
    private updateTimer: number | undefined = undefined;
    private firstUpdate = true;

    constructor(element: HTMLElement, initialCode: string) {
        this.element = element;
        this.flask = new CodeFlask(element, {
            language: "cldlang",
            lineNumbers: true,
            defaultTheme: false,
        });

        this.flask.addLanguage("cldlang", CLD_GRAMMAR);
        this.flask.onUpdate(this.handleUpdate);
        this.flask.updateCode(initialCode);
    }

    getValue(): string {
        return this.flask.getCode();
    }

    setValue(code: string) {
        this.flask.updateCode(code);
    }

    onChange(callback: (code: string) => void) {
        this.listeners.push(callback);
    }

    setDiagnostics(_diagnostics: EditorDiagnostic[]) {
        // Parser diagnostics will be rendered here in the next stage.
    }

    destroy() {
        clearTimeout(this.updateTimer);
        this.listeners.length = 0;
        this.element.innerHTML = "";
    }

    private handleUpdate = (code: string) => {
        if (this.firstUpdate) {
            this.firstUpdate = false;
            return;
        }

        clearTimeout(this.updateTimer);

        this.updateTimer = window.setTimeout(() => {
            for (const listener of this.listeners) {
                listener(code);
            }
        }, 150);
    };
}
