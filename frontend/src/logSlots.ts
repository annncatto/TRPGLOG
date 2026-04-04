/** 从非主 log 按字符选区截取片段，插入到主 log 的指定位置之后（与编辑框选区一致） */
export type LogInsertChunk = {
  id: string
  /** 该份 log 原文中的起止字符下标（0-based，结束为 exclusive，与 textarea selection 一致） */
  sourceStartChar: number
  sourceEndChar: number
  /** 插在主 Log 第几行之后（0 = 文首） */
  afterMainLine: number
}

export type LogSlot = {
  id: string
  name: string
  text: string
  /** 无 insertChunks（或空数组）时：整份 text 插在此位置之后 */
  insertAfterLine: number
  /** 非主 log：有内容时优先；按块依次插入主 log */
  insertChunks: LogInsertChunk[]
}

export function rawLineCount(text: string): number {
  if (text === '') return 0
  return text.split('\n').length
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

/** 按字符区间截取，再按换行拆成插入行（与 text.slice 一致） */
export function linesFromCharRange(text: string, startChar: number, endChar: number): string[] {
  const len = text.length
  const lo = clamp(Math.min(startChar, endChar), 0, len)
  const hi = clamp(Math.max(startChar, endChar), lo, len)
  const slice = text.slice(lo, hi)
  if (slice === '') return []
  return slice.split('\n')
}

type InsertOp = { after: number; lines: string[]; seq: number }

/** 将主 log 与多份插入（整份或分块）合并为单一文本，供解析与导出 */
export function composeMergedLog(slots: LogSlot[], mainId: string): string {
  const main = slots.find((s) => s.id === mainId)
  if (!main) return ''
  const mainLines = main.text === '' ? [] : main.text.split('\n')
  const maxMain = mainLines.length

  const ops: InsertOp[] = []
  let seq = 0

  for (const s of slots) {
    if (s.id === mainId) continue
    const chunks = s.insertChunks ?? []
    if (chunks.length > 0) {
      for (const c of chunks) {
        const lines = linesFromCharRange(s.text, c.sourceStartChar, c.sourceEndChar)
        if (lines.length === 0) continue
        const after = clamp(Math.floor(Number.isFinite(c.afterMainLine) ? c.afterMainLine : 0), 0, maxMain)
        ops.push({ after, lines, seq: seq++ })
      }
    } else if (s.text !== '') {
      const lines = s.text.split('\n')
      const after = clamp(Math.floor(Number.isFinite(s.insertAfterLine) ? s.insertAfterLine : 0), 0, maxMain)
      ops.push({ after, lines, seq: seq++ })
    }
  }

  ops.sort((a, b) => (a.after === b.after ? a.seq - b.seq : a.after - b.after))

  const byAfter = new Map<number, InsertOp[]>()
  for (const op of ops) {
    const arr = byAfter.get(op.after) ?? []
    arr.push(op)
    byAfter.set(op.after, arr)
  }

  const out: string[] = []
  for (let i = 0; i <= mainLines.length; i++) {
    for (const op of byAfter.get(i) ?? []) {
      out.push(...op.lines)
    }
    if (i < mainLines.length) out.push(mainLines[i])
  }
  return out.join('\n')
}

export function stripFileBaseName(filename: string): string {
  const base = filename.replace(/.*[/\\]/, '')
  return base.replace(/\.[^.]+$/, '') || base || '导入'
}

/** 插入块在原文中的预览（单行折叠显示） */
export function chunkPreviewOneLine(text: string, c: LogInsertChunk, maxLen = 72): string {
  const len = text.length
  const lo = clamp(Math.min(c.sourceStartChar, c.sourceEndChar), 0, len)
  const hi = clamp(Math.max(c.sourceStartChar, c.sourceEndChar), lo, len)
  const raw = text.slice(lo, hi).replace(/\s+/g, ' ').trim()
  if (!raw) return '（空选区）'
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw
}
