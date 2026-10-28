import { rm } from "node:fs/promises";

const targets = ["dist", ".parcel-cache"];

for (const target of targets) {
    await rm(new URL(`../${target}`, import.meta.url), {
        recursive: true,
        force: true,
    });
}
