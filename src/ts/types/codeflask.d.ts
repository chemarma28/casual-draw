declare module "codeflask" {
    export type CodeFlaskOptions = {
        language?: string;
        lineNumbers?: boolean;
        defaultTheme?: boolean;
        rtl?: boolean;
        tabSize?: number;
        enableAutocorrect?: boolean;
        areaId?: string;
        ariaLabelledby?: string;
        readonly?: boolean;
        handleTabs?: boolean;
        handleSelfClosingCharacters?: boolean;
        handleNewLineIndentation?: boolean;
        styleParent?: HTMLElement;
    };

    export default class CodeFlask {
        constructor(
            element: HTMLElement | string,
            options: CodeFlaskOptions,
        );

        addLanguage(name: string, grammar: unknown): void;
        updateLanguage(name: string): void;
        updateCode(code: string): void;
        getCode(): string;
        onUpdate(callback: (code: string) => void): void;
        enableReadonlyMode(): void;
        disableReadonlyMode(): void;
    }
}
