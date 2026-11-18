import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAction,
  calculatePoints,
  createGame,
  DEFAULT_RULES,
  standings,
  undoAction,
  validateGame,
} from "../src/scoreboard/game.ts";

const fresh = (rules = {}) =>
  createGame(["一", "二", "三", "四"], { ...DEFAULT_RULES, ...rules });
const win = (seat, han, fu, method = "ron", from = 3) => ({
  type: "win",
  method,
  from,
  winners: [{ seat, han, fu, yakuman: 0 }],
});
const total = (game) =>
  game.state.scores.reduce((a, b) => a + b, game.state.sticks * 1000);

test("ordinary and limit payments use actual han, including high-fu dealer tsumo", () => {
  assert.equal(
    calculatePoints(
      { han: 2, fu: 100, yakuman: 0 },
      true,
      "tsumo",
      DEFAULT_RULES
    ).tsumoOther,
    3200
  );
  assert.equal(
    calculatePoints(
      { han: 2, fu: 110, yakuman: 0 },
      true,
      "tsumo",
      DEFAULT_RULES
    ).tsumoOther,
    3600
  );
  for (const [han, expected] of [
    [7, 12000],
    [9, 16000],
    [12, 24000],
  ]) {
    assert.equal(
      calculatePoints({ han, fu: 30, yakuman: 0 }, false, "ron", DEFAULT_RULES)
        .ron,
      expected
    );
  }
  assert.equal(
    calculatePoints({ han: 4, fu: 30, yakuman: 0 }, false, "ron", DEFAULT_RULES)
      .ron,
    7700
  );
  assert.equal(
    calculatePoints({ han: 4, fu: 30, yakuman: 0 }, false, "ron", {
      ...DEFAULT_RULES,
      kiriage: true,
    }).ron,
    8000
  );
  assert.equal(
    calculatePoints({ han: 13, fu: 30, yakuman: 0 }, false, "ron", {
      ...DEFAULT_RULES,
      kazoeYakuman: false,
    }).ron,
    24000
  );
  assert.equal(
    calculatePoints({ han: 1, fu: 30, yakuman: 2 }, true, "ron", DEFAULT_RULES)
      .ron,
    96000
  );
});
test("invalid combinations are rejected before a game is changed", () => {
  for (const [han, fu, method] of [
    [1, 20, "tsumo"],
    [3, 20, "ron"],
    [2, 25, "tsumo"],
    [1, 110, "ron"],
  ]) {
    assert.throws(() =>
      calculatePoints({ han, fu, yakuman: 0 }, false, method, DEFAULT_RULES)
    );
  }
  const game = fresh();
  assert.throws(() => applyAction(game, win(3, 1, 30, "ron", 3)));
  assert.deepEqual(game.state.scores, [25000, 25000, 25000, 25000]);
});
test("riichi deposits are collected once and undo restores the complete snapshot", () => {
  const original = fresh();
  const declared = applyAction(original, { type: "riichi", seat: 0 });
  assert.equal(declared.state.sticks, 1);
  assert.equal(total(declared), 100000);
  assert.throws(() => applyAction(declared, { type: "riichi", seat: 0 }));
  const settled = applyAction(declared, win(1, 3, 40));
  assert.deepEqual(settled.state.scores, [24000, 31200, 25000, 19800]);
  assert.equal(settled.state.sticks, 0);
  assert.deepEqual(undoAction(settled).state, declared.state);
  assert.deepEqual(undoAction(undoAction(settled)).state, original.state);
});
test("honba payments and child tsumo are assigned to the correct players", () => {
  let game = applyAction(fresh(), { type: "abort", description: "九种九牌" });
  game = applyAction(game, { type: "riichi", seat: 2 });
  game = applyAction(game, { type: "riichi", seat: 3 });
  const ron = applyAction(game, win(1, 3, 40));
  assert.deepEqual(ron.events.at(-1).deltas, [0, 7500, 0, -5500]);
  const tsumo = applyAction(fresh(), win(1, 3, 40, "tsumo"));
  assert.deepEqual(tsumo.state.scores, [22400, 30200, 23700, 23700]);
  assert.equal(total(ron), 100000);
});
test("draws distribute noten payments for every tenpai count", () => {
  const expected = [
    [25000, 25000, 25000, 25000],
    [28000, 24000, 24000, 24000],
    [26500, 26500, 23500, 23500],
    [26000, 26000, 26000, 22000],
    [25000, 25000, 25000, 25000],
  ];
  for (let count = 0; count <= 4; count++) {
    const game = applyAction(fresh(), {
      type: "draw",
      tenpai: [0, 1, 2, 3].slice(0, count),
    });
    assert.deepEqual(game.state.scores, expected[count]);
    assert.equal(game.state.honba, 1);
    assert.equal(game.state.dealer, count > 0 ? 0 : 1);
  }
});
test("multi ron is atomic and nearest winner collects the pool", () => {
  let game = applyAction(fresh(), { type: "riichi", seat: 3 });
  const action = {
    type: "win",
    method: "ron",
    from: 0,
    winners: [
      { seat: 2, han: 1, fu: 30, yakuman: 0 },
      { seat: 1, han: 2, fu: 30, yakuman: 0 },
    ],
  };
  const settled = applyAction(game, action);
  assert.deepEqual(settled.state.scores, [22000, 28000, 26000, 24000]);
  assert.equal(settled.events.length, 2);
  assert.deepEqual(undoAction(settled).state, game.state);
  assert.throws(() =>
    applyAction(game, {
      ...action,
      winners: [action.winners[0], action.winners[0]],
    })
  );
});
test("manual ending awards the pool and final results sum to zero", () => {
  let game = applyAction(fresh(), { type: "riichi", seat: 1 });
  const ended = applyAction(game, { type: "end" });
  assert.equal(ended.state.finished, true);
  assert.deepEqual(ended.state.scores, [26000, 24000, 25000, 25000]);
  assert.equal(
    standings(ended).reduce((a, row) => a + row.final, 0),
    0
  );
  assert.equal(total(ended), 100000);
  assert.equal(undoAction(ended).state.finished, false);
});
test("dealer rotation, extension and bankruptcy respect game rules", () => {
  let game = fresh({ length: "east", extension: false });
  for (let hand = 0; hand < 4; hand++)
    game = applyAction(game, { type: "draw", tenpai: [] });
  assert.equal(game.state.finished, true);
  let extended = fresh({ length: "east", extension: true });
  for (let hand = 0; hand < 4; hand++)
    extended = applyAction(extended, { type: "draw", tenpai: [] });
  assert.equal(extended.state.wind, 1);
  assert.equal(extended.state.finished, false);
  const bankrupt = applyAction(fresh(), {
    type: "adjust",
    deltas: [-25100, 25100, 0, 0],
    reason: "罚点",
  });
  assert.equal(bankrupt.state.finished, true);
  assert.throws(() =>
    applyAction(fresh(), {
      type: "adjust",
      deltas: [1000, 0, 0, 0],
      reason: "修正",
    })
  );
});
test("backup validation preserves chronology and rejects manipulated scores", () => {
  let game = applyAction(fresh(), { type: "riichi", seat: 0 });
  game = applyAction(game, win(1, 1, 30));
  assert.deepEqual(validateGame(JSON.parse(JSON.stringify(game))), game);
  const damaged = JSON.parse(JSON.stringify(game));
  damaged.state.scores[0] += 100;
  assert.throws(() => validateGame(damaged));
  const brokenHistory = JSON.parse(JSON.stringify(game));
  brokenHistory.events[1].before.honba = 99;
  assert.throws(() => validateGame(brokenHistory));
  assert.deepEqual(validateGame(undoAction(game)).state, game.events[0].after);
});
test("a long game records more than one thousand actions without a fixed array limit", () => {
  let game = fresh();
  for (let index = 0; index < 1005; index++)
    game = applyAction(game, { type: "abort", description: "测试连庄" });
  assert.equal(game.events.length, 1005);
  assert.equal(game.state.honba, 1005);
  assert.equal(total(game), 100000);
  assert.deepEqual(validateGame(game), game);
});

test("last dealer can finish in first place and draw deposits carry forward", () => {
  let game = fresh({ length: "east" });
  for (let index = 0; index < 3; index++)
    game = applyAction(game, { type: "draw", tenpai: [] });
  game = applyAction(game, {
    type: "adjust",
    deltas: [-6000, 0, 0, 6000],
    reason: "点数修正",
  });
  const ended = applyAction(game, win(3, 1, 30, "ron", 0));
  assert.equal(ended.state.finished, true);
  assert.equal(ended.state.finishReason, "末亲一位和了止");
  assert.equal(standings(ended)[0].seat, 3);
  assert.deepEqual(validateGame(ended), ended);

  const declared = applyAction(fresh(), { type: "riichi", seat: 1 });
  const draw = applyAction(declared, { type: "draw", tenpai: [1] });
  assert.equal(draw.state.sticks, 1);
  assert.deepEqual(draw.state.riichi, [false, false, false, false]);
  assert.equal(draw.state.dealer, 1);
  assert.equal(total(draw), 100000);
  assert.deepEqual(undoAction(draw).state, declared.state);
});

test("new-game rules are independent snapshots and ties keep initial seat order", () => {
  const rules = { ...DEFAULT_RULES, uma: [15, 5, -5, -15] };
  const game = fresh(rules);
  rules.uma[0] = 99;
  assert.equal(game.rules.uma[0], 15);
  assert.deepEqual(
    standings(game).map((row) => row.seat),
    [0, 1, 2, 3]
  );
  assert.throws(() => fresh({ uma: [15, 5, -5, 0] }));
  assert.throws(() => fresh({ startingPoints: 25001 }));
});

test("pao tsumo shifts only the liable yakuman and all honba to the liable player", () => {
  const game = applyAction(fresh({ bankruptcy: false }), {
    type: "abort",
    description: "九种九牌",
  });
  const settled = applyAction(game, {
    type: "win",
    method: "tsumo",
    from: 0,
    winners: [
      { seat: 1, han: 1, fu: 30, yakuman: 2, paoSeat: 2, paoYakuman: 1 },
    ],
  });
  assert.deepEqual(
    settled.events.at(-1).deltas,
    [-16000, 64300, -40300, -8000]
  );
  assert.equal(total(settled), 100000);
  assert.deepEqual(undoAction(settled).state, game.state);
  assert.deepEqual(validateGame(settled), settled);
});
test("pao ron splits the liable yakuman, supports honba allocation and the same discarder", () => {
  const game = applyAction(fresh({ bankruptcy: false }), {
    type: "abort",
    description: "九种九牌",
  });
  const action = {
    type: "win",
    method: "ron",
    from: 0,
    winners: [
      { seat: 1, han: 1, fu: 30, yakuman: 2, paoSeat: 2, paoYakuman: 1 },
    ],
  };
  const settled = applyAction(game, action);
  assert.deepEqual(settled.events.at(-1).deltas, [-48000, 64300, -16300, 0]);
  const alternate = applyAction(game, {
    ...action,
    winners: [{ ...action.winners[0], paoHonba: "discarder" }],
  });
  assert.deepEqual(alternate.events.at(-1).deltas, [-48300, 64300, -16000, 0]);
  const same = applyAction(game, { ...action, from: 2 });
  assert.deepEqual(same.events.at(-1).deltas, [0, 64300, -64300, 0]);
});
test("pao settings survive reload validation, feed settlement, clear on a new hand and undo", () => {
  const game = fresh({ bankruptcy: false });
  const configured = applyAction(game, {
    type: "pao",
    liabilities: [-1, 2, -1, -1],
    yakuman: [1, 1, 1, 1],
  });
  assert.deepEqual(validateGame(configured), configured);
  const settled = applyAction(configured, {
    type: "win",
    method: "tsumo",
    from: 0,
    winners: [{ seat: 1, han: 1, fu: 30, yakuman: 1 }],
  });
  assert.deepEqual(settled.events.at(-1).deltas, [0, 32000, -32000, 0]);
  assert.deepEqual(settled.state.pao, [-1, -1, -1, -1]);
  assert.deepEqual(undoAction(settled).state, configured.state);
  assert.throws(() =>
    applyAction(game, {
      type: "pao",
      liabilities: [0, -1, -1, -1],
      yakuman: [1, 1, 1, 1],
    })
  );
  assert.throws(() =>
    applyAction(configured, {
      type: "win",
      method: "ron",
      from: 0,
      winners: [{ seat: 1, han: 5, fu: 30, yakuman: 0 }],
    })
  );
});
test("pao rejects self liability and liability greater than the hand before committing", () => {
  const game = fresh();
  for (const winner of [
    { seat: 1, han: 1, fu: 30, yakuman: 1, paoSeat: 1, paoYakuman: 1 },
    { seat: 1, han: 1, fu: 30, yakuman: 1, paoSeat: 2, paoYakuman: 2 },
  ]) {
    assert.throws(() =>
      applyAction(game, {
        type: "win",
        method: "ron",
        from: 0,
        winners: [winner],
      })
    );
  }
  assert.throws(() => createGame(["同名", "同名", "三", "四"]));
  assert.deepEqual(game.state.scores, [25000, 25000, 25000, 25000]);
});
