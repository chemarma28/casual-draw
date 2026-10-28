import { Locator } from "../locators/locator";

export type DragState =
    | { kind: "idle" }
    | { kind: "pan"; lastX: number; lastY: number }
    | { kind: "locator"; locator: Locator };

export type AppState = {
    drag: DragState;
    fitted: boolean;
};

export function createAppState(): AppState {
    return {
        drag: { kind: "idle" },
        fitted: false,
    };
}
