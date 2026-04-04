export type ParsedLine =
  | { type: 'speech'; name: string; content: string }
  | { type: 'dice'; name: string; content: string }
  | { type: 'narration'; content: string }

export const COLORS_CSS = [
  'color-0',
  'color-1',
  'color-2',
  'color-3',
  'color-4',
  'color-5',
] as const

export const COLORS_HEX = [
  '7eb8a4',
  'e07b5a',
  '9b84c4',
  '5a9fd4',
  'd4a84b',
  'c47a7a',
] as const

/** 仅将勾选或手动添加的完整发言名视为骰子（尖括号内全文） */
export type DiceSpeakerConfig = {
  exactNames: string[]
}

export const DEFAULT_DICE_CONFIG: DiceSpeakerConfig = {
  exactNames: [],
}

export function isDiceSpeakerName(name: string, cfg: DiceSpeakerConfig): boolean {
  return cfg.exactNames.includes(name)
}

/** 从原文按出现顺序提取所有 `<名>:` 里的名（含骰子） */
export function extractBracketSpeakerNames(raw: string): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const line of raw.split('\n')) {
    const m = line.match(/^<([^>]+)>:/)
    if (m) {
      const n = m[1].trim()
      if (n && !seen.has(n)) {
        seen.add(n)
        order.push(n)
      }
    }
  }
  return order
}

/** 6 位十六进制，不含 #，小写 */
export function resolveCharColorHex(
  name: string,
  charMap: Record<string, number>,
  overrides: Record<string, string | undefined>,
): string {
  const raw = overrides[name]?.trim()
  if (raw) {
    const m = raw.match(/^#?([0-9A-Fa-f]{6})$/)
    if (m) return m[1].toLowerCase()
  }
  const ci = charMap[name] ?? 0
  return COLORS_HEX[ci % COLORS_HEX.length]
}

function parseLineOne(
  raw: string,
  isDice: (name: string) => boolean,
): ParsedLine | { type: 'continuation'; content: string } | null {
  const m = raw.match(/^<([^>]+)>:([\s\S]*)$/)
  if (m) {
    const name = m[1].trim()
    const content = m[2].trim()
    return isDice(name)
      ? { type: 'dice', name, content }
      : { type: 'speech', name, content }
  }
  const stripped = raw.trim()
  if (stripped) return { type: 'continuation', content: stripped }
  return null
}

function mergeContinuations(
  parsed: Array<ParsedLine | { type: 'continuation'; content: string }>,
): ParsedLine[] {
  const merged: ParsedLine[] = []
  for (const l of parsed) {
    if (l.type === 'continuation') {
      const prev = [...merged].reverse().find((x) => x.type === 'speech' || x.type === 'dice')
      if (prev) prev.content += '\n' + l.content
      else merged.push({ type: 'narration', content: l.content })
    } else {
      merged.push(l)
    }
  }
  return merged
}

function buildCharMap(lines: ParsedLine[]): {
  charMap: Record<string, number>
  charOrder: string[]
} {
  const charMap: Record<string, number> = {}
  const charOrder: string[] = []
  const assign = (name: string) => {
    if (!(name in charMap)) {
      charMap[name] = charOrder.length % COLORS_CSS.length
      charOrder.push(name)
    }
  }
  for (const l of lines) {
    if (l.type === 'speech') assign(l.name)
  }
  return { charMap, charOrder }
}

export function parseRawLog(
  raw: string,
  diceConfig: DiceSpeakerConfig = DEFAULT_DICE_CONFIG,
): {
  lines: ParsedLine[]
  charMap: Record<string, number>
  charOrder: string[]
} {
  if (!raw.trim()) {
    return { lines: [], charMap: {}, charOrder: [] }
  }
  const isDice = (name: string) => isDiceSpeakerName(name, diceConfig)
  const linesRaw = raw.split('\n')
  const parsed = linesRaw.map((ln) => parseLineOne(ln, isDice)).filter(Boolean) as Array<
    ParsedLine | { type: 'continuation'; content: string }
  >
  const lines = mergeContinuations(parsed)
  const { charMap, charOrder } = buildCharMap(lines)
  return { lines, charMap, charOrder }
}

export function lineStats(lines: ParsedLine[]) {
  return {
    speech: lines.filter((l) => l.type === 'speech').length,
    narr: lines.filter((l) => l.type === 'narration').length,
    dice: lines.filter((l) => l.type === 'dice').length,
  }
}
