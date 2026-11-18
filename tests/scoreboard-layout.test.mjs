import test from "node:test";
import assert from "node:assert/strict";
import { tableBoxes } from "../src/scoreboard/layout.ts";

test("table player bounds and center do not overlap at phone, iPad Mini and desktop sizes", () => {
  for (const [width, height] of [
    [308, 435],
    [378, 690],
    [744, 880],
    [796, 1030],
    [1000, 620],
    [1254, 574],
    [1414, 854],
  ]) {
    const layout = tableBoxes(width, height);
    const boxes = [...layout.players, layout.center];
    for (const box of boxes) {
      assert.ok(
        box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= width &&
          box.y + box.height <= height
      );
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        assert.ok(
          a.x + a.width <= b.x ||
            b.x + b.width <= a.x ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
          `${width}×${height}: areas ${i} and ${j}`
        );
      }
    assert.deepEqual(
      layout.players.map((box) => box.rotation),
      [0, -90, 180, 90]
    );
  }
});
