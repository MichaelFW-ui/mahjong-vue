import { validateGame } from "./game";
import type { Game } from "./game";

const DATABASE = "mahjong-scoreboard";
const STORE = "games";
const PLAYERS = "players";
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 3);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE))
          request.result.createObjectStore(STORE, { keyPath: "id" });
        if (request.result.objectStoreNames.contains("deleted-games"))
          request.result.deleteObjectStore("deleted-games");
        if (!request.result.objectStoreNames.contains(PLAYERS)) {
          const players = request.result.createObjectStore(PLAYERS, {
            keyPath: "name",
          });
          const cursor = request.transaction!.objectStore(STORE).openCursor();
          cursor.onsuccess = () => {
            const row = cursor.result;
            if (!row) return;
            for (const name of (row.value as Game).names) players.put({ name });
            row.continue();
          };
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          connection = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        connection = undefined;
        reject(new Error("暂时无法打开本地记录，请检查浏览器的存储权限"));
      };
      request.onblocked = () => {
        connection = undefined;
        reject(new Error("请关闭其他记分页面后重新打开"));
      };
    });
  return connection;
}
export async function loadGames(): Promise<Game[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    transaction.oncomplete = () => {
      try {
        resolve(
          request.result
            .map(validateGame)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        );
      } catch (error) {
        reject(error);
      }
    };
    transaction.onerror = () => reject(new Error("读取对局失败，请刷新后重试"));
  });
}
export async function saveGame(
  game: Game,
  expectedRevision: number | null
): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get(game.id);
    let conflict = false;
    request.onsuccess = () => {
      const existing = request.result as Game | undefined;
      if (
        (existing && existing.revision !== expectedRevision) ||
        (!existing && expectedRevision !== null)
      ) {
        conflict = true;
        transaction.abort();
        return;
      }
      store.put(JSON.parse(JSON.stringify(game)));
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(
        new Error(
          conflict
            ? "另一页面已更新这场对局，请重新载入记录后继续"
            : "保存失败，当前操作尚未生效，请重试"
        )
      );
    transaction.onerror = () =>
      reject(new Error("保存失败，请检查设备可用空间"));
  });
}
export async function deleteGame(
  gameId: string,
  expectedRevision: number
): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get(gameId);
    let message = "删除失败，请重试";
    request.onsuccess = () => {
      const existing = request.result as Game | undefined;
      if (!existing || existing.revision !== expectedRevision) {
        message = "这场对局已更新，请重新打开对局记录后再删除";
        transaction.abort();
        return;
      }
      store.delete(gameId);
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(new Error(message));
    transaction.onerror = () => reject(new Error(message));
  });
}
export async function loadPlayers(): Promise<string[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLAYERS, "readonly");
    const request = transaction.objectStore(PLAYERS).getAll();
    transaction.oncomplete = () =>
      resolve(
        request.result
          .map((player: { name: string }) => player.name)
          .sort((a, b) => a.localeCompare(b, "zh-CN"))
      );
    transaction.onerror = () => reject(new Error("读取玩家名单失败"));
  });
}
export async function savePlayers(names: string[]): Promise<void> {
  if (names.some((name) => !name.trim() || name.trim().length > 24))
    throw new Error("姓名请填写 1 至 24 字");
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PLAYERS, "readwrite");
    const store = transaction.objectStore(PLAYERS);
    store.clear();
    for (const name of new Set(names.map((name) => name.trim())))
      store.put({ name });
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(new Error("保存玩家名单失败"));
    transaction.onerror = () => reject(new Error("保存玩家名单失败"));
  });
}
export function exportGames(games: Game[]): string {
  return JSON.stringify(
    {
      format: "mahjong-vue/scoreboard",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      games,
    },
    null,
    2
  );
}
export function parseBackup(text: string): Game[] {
  if (text.length > MAX_BACKUP_BYTES)
    throw new Error("备份文件请控制在 25 MB 以内");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("文件内容无法识别，请选择面麻记分的 JSON 备份");
  }
  if (
    value?.format !== "mahjong-vue/scoreboard" ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.games) ||
    value.games.length > 1000
  )
    throw new Error("请选择有效的面麻记分备份文件");
  const games = value.games.map(validateGame);
  if (new Set(games.map((game: Game) => game.id)).size !== games.length)
    throw new Error("备份中存在重复的对局编号");
  return games;
}

// 同一份备份作为一个事务导入，已有编号保留，失败时整批回滚。
export async function importGames(games: Game[]): Promise<number> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, PLAYERS], "readwrite");
    const store = transaction.objectStore(STORE);
    let added = 0;
    for (const game of games) {
      const request = store.get(game.id);
      request.onsuccess = () => {
        if (!request.result) {
          store.add(game);
          for (const name of game.names)
            transaction.objectStore(PLAYERS).put({ name });
          added++;
        }
      };
    }
    transaction.oncomplete = () => resolve(added);
    transaction.onabort = () =>
      reject(new Error("导入未完成，原有记录已保留，请重试"));
    transaction.onerror = () =>
      reject(new Error("导入失败，请检查设备可用空间"));
  });
}
