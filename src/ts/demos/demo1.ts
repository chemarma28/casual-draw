import { circular } from "../graphics";
import { GraphDefinition, IndexedVerticesGraph } from "../math";

const d = new GraphDefinition();

d.join(1, 2);
d.join(2, 3);
d.join(3, 4);
d.join(4, 5);
d.join(5, 1);

const g = new IndexedVerticesGraph(d);

export const demo1 = circular(g, { x: 550, y: 650 }, 150);
