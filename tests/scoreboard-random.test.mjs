import test from "node:test";
import assert from "node:assert/strict";
import {
  randomIndex,
  rollDicePair,
  randomStartingSeats,
} from "../src/scoreboard/random.ts";

test("two dice cover every face combination with separate samples", () => {
  for (let first = 0; first < 6; first++)
    for (let second = 0; second < 6; second++) {
      const samples = [first, second];
      let used = 0;
      assert.deepEqual(
        rollDicePair(() => samples[used++]),
        [first + 1, second + 1]
      );
      assert.equal(used, 2);
    }
});
test("dice reject the uneven tail of the random range before choosing a face", () => {
  const samples = [0xffffffff, 5, 0];
  let used = 0;
  assert.deepEqual(
    rollDicePair(() => samples[used++]),
    [6, 1]
  );
  assert.equal(used, 3);
  assert.throws(() => randomIndex(6, () => -1));
  assert.throws(() => randomIndex(0, () => 0));
});
test("random East rotates all four seats while preserving their cyclic order and the original list", () => {
  const names = ["甲", "乙", "丙", "丁"];
  for (let offset = 0; offset < 4; offset++) {
    const seats = randomStartingSeats(names, () => offset);
    assert.equal(seats[0], names[offset]);
    for (let seat = 0; seat < 4; seat++)
      assert.equal(seats[seat], names[(offset + seat) % 4]);
    assert.notEqual(seats, names);
  }
  assert.deepEqual(names, ["甲", "乙", "丙", "丁"]);
  assert.throws(() => randomStartingSeats(["甲", "乙", "", "丁"], () => 0));
  assert.throws(() => randomStartingSeats(["甲", "甲", "丙", "丁"], () => 0));
});
