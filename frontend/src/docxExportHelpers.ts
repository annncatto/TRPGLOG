import type { ParsedLine } from './parser'

/** 与导出 Word 一致的页边距与正文行距（倍数） */
export type DocxPageLayout = {
  marginTopMm: number
  marginBottomMm: number
  marginLeftMm: number
  marginRightMm: number
  /** 正文段落多倍行距，如 1.15、1.5 */
  lineSpacingMultiple: number
}

export const DEFAULT_DOCX_PAGE_LAYOUT: DocxPageLayout = {
  marginTopMm: 25.4,
  marginBottomMm: 25.4,
  marginLeftMm: 25.4,
  marginRightMm: 25.4,
  lineSpacingMultiple: 1.0,
}

/** 首行（含续行合并后的第一行）以全角「（」开头 */
export function speechContentStartsWithFullwidthParen(content: string): boolean {
  const firstLine = content.split('\n')[0] ?? ''
  return firstLine.trimStart().startsWith('（')
}

export function displayNameForChar(original: string, aliases: Record<string, string>): string {
  const a = aliases[original]?.trim()
  return a || original
}

export function buildDocxCharMapsForAliases(
  charMap: Record<string, number>,
  charColors: Record<string, string>,
  aliases: Record<string, string>,
): { charMap: Record<string, number>; charColors: Record<string, string> } {
  const outMap: Record<string, number> = {}
  const outColors: Record<string, string> = {}
  for (const k of Object.keys(charMap)) {
    outMap[displayNameForChar(k, aliases)] = charMap[k]!
  }
  for (const k of Object.keys(charColors)) {
    const v = charColors[k]?.trim()
    if (v && /^#[0-9A-Fa-f]{6}$/.test(v)) {
      outColors[displayNameForChar(k, aliases)] = v
    }
  }
  return { charMap: outMap, charColors: outColors }
}

export function applyDisplayNamesToLines(lines: ParsedLine[], aliases: Record<string, string>): ParsedLine[] {
  if (Object.keys(aliases).length === 0) return lines
  return lines.map((l) => {
    if (l.type === 'speech' || l.type === 'dice') {
      const d = displayNameForChar(l.name, aliases)
      return d === l.name ? l : { ...l, name: d }
    }
    return l
  })
}
