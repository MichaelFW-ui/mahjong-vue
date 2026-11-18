import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import "fake-indexeddb/auto";
import { createGame, applyAction } from "../src/scoreboard/game.ts";

const original = applyAction(createGame(["一", "二", "三", "四"]), {
  type: "riichi",
  seat: 0,
});
// 从上一版本的数据库升级，保留真实对象存储的事务语义。
await new Promise((resolve, reject) => {
  const request = indexedDB.open("mahjong-scoreboard", 2);
  request.onupgradeneeded = () => {
    request.result.createObjectStore("games", { keyPath: "id" }).put(original);
    request.result.createObjectStore("deleted-games", { keyPath: "id" }).put({
      id: "old-deleted",
      game: original,
      deletedAt: new Date().toISOString(),
    });
  };
  request.onsuccess = () => {
    request.result.close();
    resolve();
  };
  request.onerror = () => reject(request.error);
});
// 只转译待测源码，Node 与 Vue 使用相同的存储实现。
const source = await readFile(
  new URL("../src/scoreboard/storage.ts", import.meta.url),
  "utf8"
);
const gameUrl = new URL("../src/scoreboard/game.ts", import.meta.url).href;
const output = ts.transpileModule(
  source.replace(/from (['"])\.\/game\1/g, `from '${gameUrl}'`),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
    },
  }
).outputText;
const storage = await import(
  `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
);

test("database migration retains games and seeds reusable players while removing the old trash store", async () => {
  assert.deepEqual(await storage.loadGames(), [original]);
  assert.deepEqual(
    new Set(await storage.loadPlayers()),
    new Set(original.names)
  );
  await new Promise((resolve, reject) => {
    const request = indexedDB.open("mahjong-scoreboard", 3);
    request.onsuccess = () => {
      assert.equal(
        request.result.objectStoreNames.contains("deleted-games"),
        false
      );
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
});
test("player roster accepts more than four people and changes preserve historical names", async () => {
  await storage.savePlayers(["一", "二", "三", "四", "五", "六"]);
  assert.equal((await storage.loadPlayers()).length, 6);
  await storage.savePlayers(["二", "三", "四", "五", "六"]);
  assert.deepEqual((await storage.loadGames())[0].names, original.names);
  assert.equal((await storage.loadPlayers()).includes("一"), false);
});
test("permanent deletion checks revisions and leaves no game or recovery record", async () => {
  await assert.rejects(() =>
    storage.deleteGame(original.id, original.revision - 1)
  );
  assert.equal((await storage.loadGames()).length, 1);
  await storage.deleteGame(original.id, original.revision);
  assert.deepEqual(await storage.loadGames(), []);
  assert.deepEqual(await storage.loadGames(), []);
  assert.equal((await storage.loadPlayers()).length, 5);
  await assert.rejects(() =>
    storage.saveGame(
      applyAction(original, { type: "riichi", seat: 1 }),
      original.revision
    )
  );
  assert.deepEqual(await storage.loadGames(), []);
});

test("import restores selected backup games and adds their players atomically", async () => {
  const imported = createGame(["甲", "乙", "丙", "丁"]);
  assert.equal(await storage.importGames([imported]), 1);
  assert.equal(await storage.importGames([imported]), 0);
  assert.deepEqual(await storage.loadGames(), [imported]);
  const names = await storage.loadPlayers();
  assert.ok(imported.names.every((name) => names.includes(name)));
});
