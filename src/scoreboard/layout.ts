export interface BoardBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
// 四个矩形沿边缘首尾相接，中心区域单独保留给场况与公共操作。
export function tableBoxes(
  width: number,
  height: number
): { players: BoardBox[]; center: BoardBox } {
  const side = width * 0.29;
  const end = height * 0.28;
  const gap = 6;
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    rotation = 0
  ): BoardBox => ({
    x: x + gap / 2,
    y: y + gap / 2,
    width: Math.max(0, w - gap),
    height: Math.max(0, h - gap),
    rotation,
  });
  return {
    players: [
      box(side, height - end, width - side, end),
      box(width - side, 0, side, height - end, -90),
      box(0, 0, width - side, end, 180),
      box(0, end, side, height - end, 90),
    ],
    center: box(side, end, width - side * 2, height - end * 2),
  };
}
