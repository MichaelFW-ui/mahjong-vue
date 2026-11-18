export type LayoutPreference = "auto" | "table" | "flat";
export type Four<T> = [T, T, T, T];
export interface GameRules {
  length: "east" | "south";
  startingPoints: number;
  returnPoints: number;
  uma: Four<number>;
  bankruptcy: boolean;
  dealerFinish: boolean;
  extension: boolean;
  kiriage: boolean;
  kazoeYakuman: boolean;
  maxWinners: number;
}
export interface Snapshot {
  scores: Four<number>;
  riichi: Four<boolean>;
  pao?: Four<number>;
  paoYakuman?: Four<number>;
  dealer: number;
  wind: number;
  hand: number;
  honba: number;
  sticks: number;
  finished: boolean;
  finishReason: string;
}
export interface GameEvent {
  id: string;
  type: string;
  label: string;
  createdAt: string;
  deltas: Four<number>;
  before: Snapshot;
  after: Snapshot;
}
export interface Game {
  schemaVersion: 1;
  id: string;
  revision: number;
  names: Four<string>;
  rules: GameRules;
  state: Snapshot;
  events: GameEvent[];
  createdAt: string;
  updatedAt: string;
}
export interface HandValue {
  han: number;
  fu: number;
  yakuman: number;
}
export interface Winner extends HandValue {
  seat: number;
  paoSeat?: number;
  paoYakuman?: number;
  paoHonba?: "liable" | "discarder";
}
export type GameAction =
  | { type: "riichi"; seat: number }
  | { type: "pao"; liabilities: Four<number>; yakuman: Four<number> }
  | { type: "win"; method: "ron" | "tsumo"; from: number; winners: Winner[] }
  | { type: "draw"; tenpai: number[] }
  | { type: "abort"; description: string }
  | { type: "adjust"; deltas: Four<number>; reason: string }
  | { type: "end" };

export const WINDS = ["东", "南", "西", "北"];
export const DEFAULT_RULES: GameRules = {
  length: "south",
  startingPoints: 25000,
  returnPoints: 30000,
  uma: [15, 5, -5, -15],
  bankruptcy: true,
  dealerFinish: true,
  extension: true,
  kiriage: false,
  kazoeYakuman: true,
  maxWinners: 2,
};
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
function id(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function seatValid(seat: number): boolean {
  return Number.isInteger(seat) && seat >= 0 && seat < 4;
}
export function validateRules(rules: GameRules): void {
  requireValue(
    rules && ["east", "south"].includes(rules.length),
    "请选择东风战或半庄战"
  );
  requireValue(
    Number.isInteger(rules.startingPoints) &&
      rules.startingPoints >= 1000 &&
      rules.startingPoints <= 100000 &&
      rules.startingPoints % 100 === 0,
    "起始点请填写 1000 至 100000 之间的整百点"
  );
  requireValue(
    Number.isInteger(rules.returnPoints) &&
      rules.returnPoints >= rules.startingPoints &&
      rules.returnPoints <= 100000 &&
      rules.returnPoints % 100 === 0,
    "返还点应为不低于起始点的整百点"
  );
  requireValue(
    Array.isArray(rules.uma) &&
      rules.uma.length === 4 &&
      rules.uma.every((n) => Number.isInteger(n) && Math.abs(n) <= 1000) &&
      rules.uma.reduce((a, b) => a + b, 0) === 0,
    "四个马点请填写整数，合计为 0"
  );
  requireValue([1, 2, 3].includes(rules.maxWinners), "多家和人数设置无效");
  for (const key of [
    "bankruptcy",
    "dealerFinish",
    "extension",
    "kiriage",
    "kazoeYakuman",
  ] as const) {
    requireValue(typeof rules[key] === "boolean", "规则设置格式无效");
  }
}
export function createGame(
  names: string[],
  rules: GameRules = DEFAULT_RULES
): Game {
  validateRules(rules);
  requireValue(
    names.length === 4 &&
      new Set(names.map((name) => name.trim())).size === 4 &&
      names.every(
        (name) =>
          typeof name === "string" &&
          name.trim().length > 0 &&
          name.trim().length <= 24
      ),
    "请选择四位不同的玩家，每个名字最多 24 字"
  );
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: id(),
    revision: 0,
    names: names.map((name) => name.trim()) as Four<string>,
    rules: clone(rules),
    createdAt: now,
    updatedAt: now,
    events: [],
    state: {
      scores: [
        rules.startingPoints,
        rules.startingPoints,
        rules.startingPoints,
        rules.startingPoints,
      ],
      riichi: [false, false, false, false],
      dealer: 0,
      wind: 0,
      hand: 0,
      honba: 0,
      sticks: 0,
      finished: false,
      finishReason: "",
    },
  };
}
export function roundTitle(state: Snapshot): string {
  return `${WINDS[state.wind] || "延长"}${
    ["一", "二", "三", "四"][state.hand]
  }局`;
}
export function seatWind(state: Snapshot, seat: number): string {
  return WINDS[(seat - state.dealer + 4) % 4];
}
export function rankedSeats(state: Snapshot): number[] {
  return [0, 1, 2, 3].sort(
    (a, b) => state.scores[b] - state.scores[a] || a - b
  );
}

// 依据翻符公式独立计算；役满倍数与普通翻数分别建模。
export function calculatePoints(
  value: HandValue,
  dealer: boolean,
  method: "ron" | "tsumo",
  rules: GameRules
) {
  requireValue(["ron", "tsumo"].includes(method), "和牌方式无效");
  requireValue(
    Number.isInteger(value.yakuman) && value.yakuman >= 0 && value.yakuman <= 6,
    "役满倍数应为 0 至 6"
  );
  let base: number;
  let label: string;
  if (value.yakuman > 0) {
    base = 8000 * value.yakuman;
    label = value.yakuman === 1 ? "役满" : `${value.yakuman} 倍役满`;
  } else {
    requireValue(
      Number.isInteger(value.han) && value.han >= 1 && value.han <= 13,
      "翻数应为 1 至 13"
    );
    if (value.han < 5) {
      requireValue(
        [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110].includes(value.fu),
        "请选择有效符数"
      );
      requireValue(
        !(value.fu === 20 && (method === "ron" || value.han < 2)),
        "20 符适用于至少 2 翻的自摸"
      );
      requireValue(
        !(value.fu === 25 && value.han < (method === "tsumo" ? 3 : 2)),
        "七对子荣和至少 2 翻，自摸至少 3 翻"
      );
      requireValue(
        !(value.fu === 110 && value.han === 1),
        "110 符请填写至少 2 翻"
      );
    }
    if (value.han >= 13 && rules.kazoeYakuman) base = 8000;
    else if (value.han >= 11) base = 6000;
    else if (value.han >= 8) base = 4000;
    else if (value.han >= 6) base = 3000;
    else if (value.han >= 5) base = 2000;
    else {
      base = Math.min(2000, value.fu * 2 ** (value.han + 2));
      if (rules.kiriage && base === 1920) base = 2000;
    }
    const limit =
      base >= 8000
        ? "累计役满"
        : base >= 6000
        ? "三倍满"
        : base >= 4000
        ? "倍满"
        : base >= 3000
        ? "跳满"
        : base >= 2000
        ? "满贯"
        : "";
    label = `${value.han} 翻${value.han < 5 ? ` ${value.fu} 符` : ""}${
      limit ? ` · ${limit}` : ""
    }`;
  }
  const ceil100 = (points: number) => Math.ceil(points / 100) * 100;
  const ron = ceil100(base * (dealer ? 6 : 4));
  const tsumoDealer = ceil100(base * 2);
  const tsumoOther = ceil100(base * (dealer ? 2 : 1));
  return {
    ron,
    tsumoDealer,
    tsumoOther,
    total: method === "ron" ? ron : tsumoDealer + tsumoOther * 2,
    label,
  };
}

function finish(state: Snapshot, reason: string): void {
  // 终局余下供托交给一位，同分按起始座位排序。
  state.scores[rankedSeats(state)[0]] += state.sticks * 1000;
  state.sticks = 0;
  state.riichi = [false, false, false, false];
  state.pao = [-1, -1, -1, -1];
  state.paoYakuman = [1, 1, 1, 1];
  state.finished = true;
  state.finishReason = reason;
}
function advance(
  state: Snapshot,
  rules: GameRules,
  keepDealer: boolean,
  draw: boolean
): void {
  state.riichi = [false, false, false, false];
  state.pao = [-1, -1, -1, -1];
  state.paoYakuman = [1, 1, 1, 1];
  if (rules.bankruptcy && state.scores.some((score) => score < 0)) {
    finish(state, "负点终局");
    return;
  }
  const finalWind = rules.length === "south" ? 1 : 0;
  const scheduledEnd = state.wind >= finalWind && state.hand === 3;
  const inExtension = state.wind > finalWind;
  const targetReached = state.scores.some(
    (score) => score >= rules.returnPoints
  );
  if (keepDealer) {
    if (
      !draw &&
      rules.dealerFinish &&
      (scheduledEnd || inExtension) &&
      rankedSeats(state)[0] === state.dealer &&
      state.scores[state.dealer] >= rules.returnPoints
    ) {
      finish(state, "末亲一位和了止");
      return;
    }
    state.honba++;
    return;
  }
  if (
    (scheduledEnd || inExtension) &&
    (targetReached ||
      !rules.extension ||
      (state.wind > finalWind && state.hand === 3))
  ) {
    finish(state, "对局结束");
    return;
  }
  state.dealer = (state.dealer + 1) % 4;
  state.hand = (state.hand + 1) % 4;
  if (state.hand === 0) state.wind++;
  state.honba = draw ? state.honba + 1 : 0;
}

export function applyAction(game: Game, action: GameAction): Game {
  requireValue(!game.state.finished, "这场对局已经结束，可开始新对局");
  requireValue(
    game.events.length < 10000,
    "本场记录已达 10000 条，请导出保存后开始新对局"
  );
  const result = clone(game);
  const before = clone(game.state);
  const state = result.state;
  let label = "";
  if (action.type === "riichi") {
    requireValue(seatValid(action.seat), "请选择玩家");
    requireValue(!state.riichi[action.seat], "这位玩家本局已经立直");
    requireValue(state.scores[action.seat] >= 1000, "点数不足 1000，无法立直");
    state.scores[action.seat] -= 1000;
    state.sticks++;
    state.riichi[action.seat] = true;
    label = `${game.names[action.seat]} 立直`;
  } else if (action.type === "pao") {
    requireValue(
      action.liabilities.length === 4 &&
        action.yakuman.length === 4 &&
        action.liabilities.every(
          (seat, winner) => seat === -1 || (seatValid(seat) && seat !== winner)
        ) &&
        action.yakuman.every(
          (count) => Number.isInteger(count) && count >= 1 && count <= 6
        ),
      "包牌设置无效"
    );
    state.pao = clone(action.liabilities);
    state.paoYakuman = clone(action.yakuman);
    const assignments = action.liabilities
      .map((seat, winner) =>
        seat < 0
          ? ""
          : `${game.names[seat]} 包 ${game.names[winner]} ${action.yakuman[winner]}倍役满`
      )
      .filter(Boolean);
    label = assignments.length
      ? `包牌 · ${assignments.join(" / ")}`
      : "取消包牌";
  } else if (action.type === "win") {
    requireValue(["ron", "tsumo"].includes(action.method), "和牌方式无效");
    requireValue(
      action.winners.length >= 1 &&
        action.winners.length <=
          (action.method === "tsumo" ? 1 : game.rules.maxWinners),
      "和牌人数超出本场规则"
    );
    const seats = action.winners.map((winner) => winner.seat);
    requireValue(
      seats.every(seatValid) && new Set(seats).size === seats.length,
      "和牌玩家选择无效"
    );
    if (action.method === "ron")
      requireValue(
        seatValid(action.from) && !seats.includes(action.from),
        "放铳者与和牌者需要分别选择"
      );
    const descriptions: string[] = [];
    for (const entry of action.winners) {
      const winner = {
        ...entry,
        paoSeat: entry.paoSeat ?? state.pao?.[entry.seat] ?? -1,
        paoYakuman: entry.paoYakuman ?? state.paoYakuman?.[entry.seat] ?? 1,
      };
      const points = calculatePoints(
        winner,
        winner.seat === state.dealer,
        action.method,
        game.rules
      );
      const hasPao = winner.paoSeat !== undefined && winner.paoSeat !== -1;
      if (hasPao) {
        requireValue(
          seatValid(winner.paoSeat as number) && winner.paoSeat !== winner.seat,
          "包牌者须为和牌者以外的玩家"
        );
        requireValue(
          winner.yakuman > 0 &&
            Number.isInteger(winner.paoYakuman) &&
            (winner.paoYakuman as number) >= 1 &&
            (winner.paoYakuman as number) <= winner.yakuman,
          "包牌役满倍数须在本次役满倍数以内"
        );
      }
      descriptions.push(
        `${game.names[winner.seat]} ${points.label}${
          hasPao
            ? ` · ${game.names[winner.paoSeat as number]} 包${
                winner.paoYakuman
              }倍役满`
            : ""
        }`
      );
      const liable = hasPao ? (winner.paoSeat as number) : -1;
      const paoPoints = hasPao
        ? calculatePoints(
            { han: 1, fu: 30, yakuman: winner.paoYakuman as number },
            winner.seat === state.dealer,
            action.method,
            game.rules
          )
        : null;
      if (action.method === "ron") {
        const amount = points.ron + state.honba * 300;
        state.scores[action.from] -= amount;
        state.scores[winner.seat] += amount;
        if (paoPoints && liable !== action.from) {
          const liability =
            paoPoints.ron / 2 +
            (winner.paoHonba === "discarder" ? 0 : state.honba * 300);
          state.scores[action.from] += liability;
          state.scores[liable] -= liability;
        }
      } else {
        for (let seat = 0; seat < 4; seat++) {
          if (seat === winner.seat) continue;
          const payment =
            (seat === state.dealer ? points.tsumoDealer : points.tsumoOther) -
            (paoPoints
              ? seat === state.dealer
                ? paoPoints.tsumoDealer
                : paoPoints.tsumoOther
              : 0) +
            (paoPoints ? 0 : state.honba * 100);
          state.scores[seat] -= payment;
          state.scores[winner.seat] += payment;
        }
        if (paoPoints) {
          const amount = paoPoints.total + state.honba * 300;
          state.scores[liable] -= amount;
          state.scores[winner.seat] += amount;
        }
      }
    }
    const stickWinner =
      action.method === "ron"
        ? seats
            .slice()
            .sort(
              (a, b) =>
                ((a - action.from + 4) % 4) - ((b - action.from + 4) % 4)
            )[0]
        : seats[0];
    state.scores[stickWinner] += state.sticks * 1000;
    state.sticks = 0;
    label = `${
      action.method === "ron" ? `${game.names[action.from]} 放铳 → ` : "自摸 · "
    }${descriptions.join(" / ")}`;
    advance(state, game.rules, seats.includes(before.dealer), false);
  } else if (action.type === "draw") {
    requireValue(
      action.tenpai.every(seatValid) &&
        new Set(action.tenpai).size === action.tenpai.length,
      "听牌玩家选择无效"
    );
    const count = action.tenpai.length;
    if (count > 0 && count < 4) {
      for (let seat = 0; seat < 4; seat++)
        state.scores[seat] += action.tenpai.includes(seat)
          ? 3000 / count
          : -3000 / (4 - count);
    }
    label = `流局 · ${
      count
        ? action.tenpai.map((seat) => game.names[seat]).join("、") + " 听牌"
        : "四家未听"
    }`;
    advance(state, game.rules, action.tenpai.includes(before.dealer), true);
  } else if (action.type === "abort") {
    state.honba++;
    state.riichi = [false, false, false, false];
    state.pao = [-1, -1, -1, -1];
    state.paoYakuman = [1, 1, 1, 1];
    label = `途中流局 · ${action.description.trim().slice(0, 40) || "连庄"}`;
  } else if (action.type === "adjust") {
    requireValue(
      action.deltas.length === 4 &&
        action.deltas.every(
          (n) => Number.isInteger(n) && n % 100 === 0 && Math.abs(n) <= 1000000
        ),
      "调整点数请填写整百点"
    );
    requireValue(
      action.deltas.reduce((a, b) => a + b, 0) === 0,
      "四家调整点数合计应为 0"
    );
    requireValue(
      action.deltas.some((n) => n !== 0),
      "请填写需要调整的点数"
    );
    requireValue(
      action.reason.trim().length > 0 && action.reason.length <= 100,
      "请填写调整原因，最多 100 字"
    );
    state.scores = state.scores.map(
      (score, seat) => score + action.deltas[seat]
    ) as Four<number>;
    label = `点数调整 · ${action.reason.trim()}`;
    if (game.rules.bankruptcy && state.scores.some((score) => score < 0))
      finish(state, "负点终局");
  } else if (action.type === "end") {
    finish(state, "手动结束");
    label = "结束对局";
  } else throw new Error("暂不支持此操作");
  requireValue(
    state.scores.reduce((a, b) => a + b, state.sticks * 1000) ===
      game.rules.startingPoints * 4,
    "点数总和校验未通过"
  );
  const now = new Date().toISOString();
  result.events.push({
    id: id(),
    type: action.type,
    label,
    createdAt: now,
    before,
    after: clone(state),
    deltas: state.scores.map(
      (score, seat) => score - before.scores[seat]
    ) as Four<number>,
  });
  result.revision++;
  result.updatedAt = now;
  return result;
}
export function undoAction(game: Game): Game {
  requireValue(game.events.length > 0, "还没有可以撤销的操作");
  const result = clone(game);
  const event = result.events.pop() as GameEvent;
  result.state = clone(event.before);
  result.revision++;
  result.updatedAt = new Date().toISOString();
  return result;
}
export function standings(game: Game) {
  const seats = rankedSeats(game.state);
  const oka =
    ((game.rules.returnPoints - game.rules.startingPoints) * 4) / 1000;
  return seats.map((seat, rank) => ({
    seat,
    name: game.names[seat],
    score: game.state.scores[seat],
    rank: rank + 1,
    final: Number(
      (
        (game.state.scores[seat] - game.rules.returnPoints) / 1000 +
        game.rules.uma[rank] +
        (rank === 0 ? oka : 0)
      ).toFixed(1)
    ),
  }));
}

export function validateGame(value: unknown): Game {
  const game = value as Game;
  requireValue(
    game &&
      game.schemaVersion === 1 &&
      typeof game.id === "string" &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(game.id),
    "对局格式或版本不受支持"
  );
  validateRules(game.rules);
  requireValue(
    Array.isArray(game.names) &&
      game.names.length === 4 &&
      game.names.every(
        (name) =>
          typeof name === "string" &&
          name.trim().length > 0 &&
          name.length <= 24
      ),
    "玩家信息格式无效"
  );
  requireValue(
    Number.isSafeInteger(game.revision) && game.revision >= 0,
    "对局版本无效"
  );
  requireValue(
    [game.createdAt, game.updatedAt].every(
      (date) => typeof date === "string" && Number.isFinite(Date.parse(date))
    ),
    "对局时间无效"
  );
  const validState = (state: Snapshot) => {
    if (state.pao !== undefined || state.paoYakuman !== undefined) {
      requireValue(
        Array.isArray(state.pao) &&
          state.pao.length === 4 &&
          state.pao.every(
            (seat, winner) =>
              seat === -1 || (seatValid(seat) && seat !== winner)
          ) &&
          Array.isArray(state.paoYakuman) &&
          state.paoYakuman.length === 4 &&
          state.paoYakuman.every(
            (count) => Number.isInteger(count) && count >= 1 && count <= 6
          ),
        "包牌状态无效"
      );
    }
    requireValue(
      state &&
        Array.isArray(state.scores) &&
        state.scores.length === 4 &&
        state.scores.every(
          (score) =>
            Number.isSafeInteger(score) &&
            Math.abs(score) <= 10000000 &&
            score % 100 === 0
        ),
      "点数格式无效"
    );
    requireValue(
      Array.isArray(state.riichi) &&
        state.riichi.length === 4 &&
        state.riichi.every((flag) => typeof flag === "boolean"),
      "立直状态无效"
    );
    requireValue(
      seatValid(state.dealer) &&
        seatValid(state.hand) &&
        Number.isInteger(state.wind) &&
        state.wind >= 0 &&
        state.wind <= 3,
      "场次信息无效"
    );
    requireValue(
      [state.honba, state.sticks].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 10000
      ),
      "本场或供托无效"
    );
    requireValue(
      typeof state.finished === "boolean" &&
        typeof state.finishReason === "string" &&
        state.finishReason.length <= 100,
      "对局状态无效"
    );
    requireValue(
      state.scores.reduce((a, b) => a + b, state.sticks * 1000) ===
        game.rules.startingPoints * 4,
      "导入点数总和不一致"
    );
  };
  validState(game.state);
  requireValue(
    Array.isArray(game.events) && game.events.length <= 10000,
    "对局记录数量无效"
  );
  const sameState = (a: Snapshot, b: Snapshot) =>
    [
      "scores",
      "riichi",
      "dealer",
      "wind",
      "hand",
      "honba",
      "sticks",
      "finished",
      "finishReason",
    ].every(
      (key) =>
        JSON.stringify(a[key as keyof Snapshot]) ===
        JSON.stringify(b[key as keyof Snapshot])
    ) &&
    JSON.stringify(a.pao || [-1, -1, -1, -1]) ===
      JSON.stringify(b.pao || [-1, -1, -1, -1]) &&
    JSON.stringify(a.paoYakuman || [1, 1, 1, 1]) ===
      JSON.stringify(b.paoYakuman || [1, 1, 1, 1]);
  let previous = createGame(game.names, game.rules).state;
  for (const event of game.events) {
    requireValue(
      event &&
        typeof event.id === "string" &&
        typeof event.type === "string" &&
        typeof event.label === "string" &&
        event.label.length <= 500 &&
        typeof event.createdAt === "string" &&
        Number.isFinite(Date.parse(event.createdAt)),
      "操作记录格式无效"
    );
    validState(event.before);
    validState(event.after);
    requireValue(sameState(previous, event.before), "操作记录的前后状态不连续");
    requireValue(
      Array.isArray(event.deltas) &&
        event.deltas.length === 4 &&
        event.deltas.every(
          (n, i) => n === event.after.scores[i] - event.before.scores[i]
        ),
      "操作点数变化不一致"
    );
    previous = event.after;
  }
  requireValue(sameState(previous, game.state), "当前状态与操作记录不一致");
  return clone(game);
}
