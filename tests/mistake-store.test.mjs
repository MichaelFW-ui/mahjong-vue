import test from 'node:test';
import assert from 'node:assert/strict';
import { MistakeStore } from '../src/store/mistake.ts';

const records = [
  { timestamp: 100, userAnswer: 'old', info: '东一局 东家 荣和', flag: 17 },
  { timestamp: 200, userAnswer: 'new', info: '南一局 南家 自摸', flag: 34 },
];

test('deleting the first displayed mistake removes the newest record', () => {
  const store = new MistakeStore();
  store.fromJSON(JSON.stringify(records));
  assert.equal(store.getAll()[0].userAnswer, 'new');
  store.remove(0);
  assert.deepEqual(store.getAll().map(record => record.userAnswer), ['old']);
});

test('deleting an invalid displayed index preserves all mistakes', () => {
  const store = new MistakeStore();
  store.fromJSON(JSON.stringify(records));
  store.remove(-1);
  store.remove(5);
  assert.deepEqual(store.getAll().map(record => record.userAnswer), ['new', 'old']);
});

test('export and import preserve the situation needed to retry a mistake', () => {
  const store = new MistakeStore();
  store.fromJSON(JSON.stringify(records));
  const restored = new MistakeStore();
  restored.fromJSON(store.toJSON());
  assert.deepEqual(restored.getAll(), store.getAll());
  assert.equal(restored.getAll()[0].info, records[1].info);
  assert.equal(restored.getAll()[0].flag, records[1].flag);
});
