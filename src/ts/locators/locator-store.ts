import { Vector } from "../math";
import { Locator } from "./locator";

export class LocatorStore {
    private locators: Locator[] = [];

    add(locator: Locator): Locator {
        this.locators.push(locator);

        return locator;
    }

    remove(locator: Locator) {
        const index = this.locators.indexOf(locator);

        if (index >= 0) {
            this.locators.splice(index, 1);
        }
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
