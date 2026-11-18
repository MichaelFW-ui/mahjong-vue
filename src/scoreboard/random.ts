type RandomSample = () => number;
const RANGE = 0x100000000;
const randomSample: RandomSample = () =>
  crypto.getRandomValues(new Uint32Array(1))[0];

// 丢弃不能均分的尾部，供骰子与随机东家共用。
export function randomIndex(
  count: number,
  sample: RandomSample = randomSample
): number {
  if (!Number.isInteger(count) || count < 1 || count > RANGE)
    throw new Error("随机范围无效");
  const ceiling = RANGE - (RANGE % count);
  let value: number;
  do {
    value = sample();
    if (!Number.isInteger(value) || value < 0 || value >= RANGE)
      throw new Error("随机数无效");
  } while (value >= ceiling);
  return value % count;
}
export function rollDicePair(
  sample: RandomSample = randomSample
): [number, number] {
  return [randomIndex(6, sample) + 1, randomIndex(6, sample) + 1];
}
export function randomStartingSeats(
  names: readonly string[],
  sample: RandomSample = randomSample
): string[] {
  if (
    names.length !== 4 ||
    names.some((name) => !name.trim()) ||
    new Set(names).size !== 4
  )
    throw new Error("请先选择四位不同的玩家");
  const offset = randomIndex(4, sample);
  return [...names.slice(offset), ...names.slice(0, offset)];
}
