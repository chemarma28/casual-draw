declare module "node:test" {
    export function test(name: string, fn: () => void): void;
}

declare module "node:assert/strict" {
    type Check = (error: unknown) => boolean;

    interface Assert {
        equal(actual: unknown, expected: unknown): void;
        deepEqual(actual: unknown, expected: unknown): void;
        ok(value: unknown): asserts value;
        match(value: string, pattern: RegExp): void;
        throws(fn: () => unknown, check?: Check): void;
    }

    const assert: Assert;

    export default assert;
}
