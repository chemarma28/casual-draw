import { Vector } from "../math";
import { Locator } from "./locator";

export class LocatorStore {
    private locators: Locator[] = [];

    add(locator: Locator): Locator {
        this.locators.push(locator);

        return locator;
    }

    all(): readonly Locator[] {
        return this.locators;
    }

    hitTest(point: Vector): Locator | undefined {
        for (let locator of this.locators) {
            if (locator.isPointInLocator(point)) return locator;
        }

        return undefined;
    }
}
