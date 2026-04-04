/**
 * 与预览「解析 N」一致的 1-based 行号，与内部 0-based 行下标互转。
 * 背景块：起止均为「解析」行号（闭区间）。
 */

export function bgIndexToDisplayLine(idx: number, lineCount: number): number {
  if (lineCount <= 0) return 1
  return Math.min(lineCount, Math.max(1, idx + 1))
}

export function bgDisplayLineToIndex(displayLine: number, lineCount: number): number {
  if (lineCount <= 0) return 0
  const n = Math.floor(Number.isFinite(displayLine) ? displayLine : 1)
  return Math.max(0, Math.min(lineCount - 1, n - 1))
}

/**
 * 分段标题插入位置：UI 整数 k
 * - 0 = 文首
 * - 1 .. lineCount = 插在「解析 k」该行之后
 * - lineCount + 1 = 全文末尾
 */
export function titleAfterIndexToUiK(afterIndex: number, lineCount: number): number {
  if (afterIndex === -1) return 0
  if (afterIndex >= lineCount) return lineCount + 1
  return afterIndex + 1
}

export function titleUiKToAfterIndex(k: number, lineCount: number): number {
  const kk = Math.floor(Number.isFinite(k) ? k : 0)
  if (kk <= 0) return -1
  if (kk >= lineCount + 1) return lineCount
  return kk - 1
}
