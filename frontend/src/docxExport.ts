/**
 * 纯前端生成 .docx，逐项对齐 backend/export_docx.py（python-docx 版）。
 * 输入 payload 与原先发往 /api/export 的 JSON 完全一致。
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  LineRuleType,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx'
import type { ParsedLine } from './parser'
import { speechContentStartsWithFullwidthParen } from './docxExportHelpers'

export type DocxTitleStyle = { fontSizePt: number; align: 'left' | 'center' | 'right'; border: boolean }
export type DocxInsertedTitle = { text: string; afterIndex: number }
export type DocxAppearance = {
  bodyFont: string
  speakerFont: string
  bodyFontSizePt: number
  diceFont?: string
  diceFontSizePt?: number
  diceColor?: string
  charColors: Record<string, string>
}
export type DocxBgBlock = { start: number; end: number; color: string }
export type DocxPageLayoutFull = {
  marginTopMm: number
  marginBottomMm: number
  marginLeftMm: number
  marginRightMm: number
  lineSpacingMultiple: number
}
export type DocxExportPayload = {
  titleStyle: DocxTitleStyle
  insertedTitles: DocxInsertedTitle[]
  appearance: DocxAppearance
  lines: ParsedLine[]
  charMap: Record<string, number>
  backgroundBlocks: DocxBgBlock[]
  hiddenLineIndices: number[]
  pageLayout: DocxPageLayoutFull
  parensSpeechRightAlign: boolean
  /** 角色名是否加 < >（仅影响显示，颜色仍按原名查表） */
  speakerBrackets?: boolean
}

const COLORS_HEX = ['7eb8a4', 'e07b5a', '9b84c4', '5a9fd4', 'd4a84b', 'c47a7a']
const DEFAULT_DICE_COLOR = '4A8A4A'

const ALIGN_MAP = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
} as const

const ptToHalf = (pt: number) => Math.round(pt * 2)
const ptToTwip = (pt: number) => Math.round(pt * 20)

function normHex6(color: string): string {
  const c = (color ?? '').trim().replace(/^#/, '')
  if (c.length >= 6) return c.slice(0, 6).toUpperCase()
  return '5A4A3A'
}

/** 将填充色冲淡，接近预览里半透明底效果（与 _mix_white 一致，tint=0.18）。 */
function mixWhite(hex6: string, tint = 0.18): string {
  const h = normHex6(hex6)
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const t = Math.max(0, Math.min(1, tint))
  const m = (x: number) => Math.trunc(x * t + 255 * (1 - t))
  const hh = (x: number) => m(x).toString(16).padStart(2, '0').toUpperCase()
  return `${hh(r)}${hh(g)}${hh(b)}`
}

function lineShadeFill(lineIndex: number, blocks: DocxBgBlock[]): string | null {
  for (const b of blocks) {
    const lo = Math.min(Math.trunc(b.start), Math.trunc(b.end))
    const hi = Math.max(Math.trunc(b.start), Math.trunc(b.end))
    if (lo <= lineIndex && lineIndex <= hi) return mixWhite(b.color ?? '#5a4a3a')
  }
  return null
}

function rgbForCharacter(
  name: string,
  charMap: Record<string, number>,
  charColors: Record<string, string>,
): string {
  const raw = String(charColors[name] ?? '').trim().replace(/^#/, '')
  if (raw.length >= 6) {
    const h6 = raw.slice(0, 6)
    if (/^[0-9A-Fa-f]{6}$/.test(h6)) return h6.toUpperCase()
  }
  const ci = (Math.trunc(charMap[name] ?? 0) % COLORS_HEX.length + COLORS_HEX.length) % COLORS_HEX.length
  return COLORS_HEX[ci].toUpperCase()
}

/** 统一构造带东亚字体（ascii/hAnsi/eastAsia 同名）的 run，对齐 _set_run_east_asia。 */
function eaRun(
  text: string,
  opts: { font: string; sizePt: number; color: string; bold?: boolean },
): TextRun {
  return new TextRun({
    text,
    bold: opts.bold,
    size: ptToHalf(opts.sizePt),
    color: opts.color,
    font: { ascii: opts.font, hAnsi: opts.font, eastAsia: opts.font },
  })
}

/** 段落间距 + 正文多倍行距（mult<=1 时不写行距规则，与 _apply_body_line_spacing 一致）。 */
function bodySpacing(mult: number, beforePt: number, afterPt: number) {
  const s: { before: number; after: number; line?: number; lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType] } = {
    before: ptToTwip(beforePt),
    after: ptToTwip(afterPt),
  }
  const m = Math.max(1, Math.min(3, mult))
  if (m > 1 + 1e-6) {
    s.line = Math.round(m * 240)
    s.lineRule = LineRuleType.AUTO
  }
  return s
}

function shadingFor(fill: string | null) {
  return fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined
}

function titleParagraph(text: string, ts: DocxTitleStyle): Paragraph {
  const align = ALIGN_MAP[ts.align] ?? AlignmentType.CENTER
  const side = { style: BorderStyle.SINGLE, size: 6, space: 4, color: '8B6F4A' }
  return new Paragraph({
    alignment: align,
    spacing: { before: 0, after: ptToTwip(12) },
    border: ts.border ? { top: side, bottom: side, left: side, right: side } : undefined,
    children: [
      new TextRun({
        text,
        bold: true,
        size: ptToHalf(ts.fontSizePt),
        color: '2C1F0F',
        font: { ascii: '宋体', hAnsi: '宋体', eastAsia: '宋体' },
      }),
    ],
  })
}

const NO_BORDERS = (() => {
  const nil = { style: BorderStyle.NIL, size: 0, color: 'auto' }
  return { top: nil, bottom: nil, left: nil, right: nil, insideHorizontal: nil, insideVertical: nil }
})()

export async function buildDocxBlob(payload: DocxExportPayload): Promise<Blob> {
  const titleStyle = payload.titleStyle
  const lines = payload.lines ?? []
  const charMap = payload.charMap ?? {}
  const bgBlocks = payload.backgroundBlocks ?? []
  const hiddenSet = new Set<number>((payload.hiddenLineIndices ?? []).map((x) => Math.trunc(x)))

  const appearance = payload.appearance ?? ({} as DocxAppearance)
  const bodyFont = appearance.bodyFont || '宋体'
  const speakerFont = appearance.speakerFont || '黑体'
  const diceFont = appearance.diceFont || bodyFont
  const charColors = appearance.charColors ?? {}

  let bodyPt = Number(appearance.bodyFontSizePt)
  if (!Number.isFinite(bodyPt)) bodyPt = 11
  bodyPt = Math.max(6, Math.min(36, bodyPt))
  let dicePt = Number(appearance.diceFontSizePt)
  if (!Number.isFinite(dicePt)) dicePt = (bodyPt * 10) / 11
  dicePt = Math.max(6, Math.min(36, dicePt))
  const diceColor = normHex6(appearance.diceColor || DEFAULT_DICE_COLOR)

  const pl = payload.pageLayout ?? ({} as DocxPageLayoutFull)
  const clampMm = (x: number, d: number) => {
    const v = Number(x)
    return Math.max(5, Math.min(60, Number.isFinite(v) ? v : d))
  }
  const lineSpacingMult = Number.isFinite(Number(pl.lineSpacingMultiple)) ? Number(pl.lineSpacingMultiple) : 1.0
  const parensRight = !!payload.parensSpeechRightAlign
  const speakerBrackets = !!payload.speakerBrackets

  // 标题按 afterIndex 归类（-1..n），与 titles_by 一致
  const n = lines.length
  const titlesBy = new Map<number, DocxInsertedTitle[]>()
  for (const tit of payload.insertedTitles ?? []) {
    const idx = Math.max(-1, Math.min(Math.trunc(tit.afterIndex ?? -1), n))
    if (!titlesBy.has(idx)) titlesBy.set(idx, [])
    titlesBy.get(idx)!.push(tit)
  }

  const children: (Paragraph | Table)[] = []
  const flushAfter = (afterIdx: number) => {
    for (const tit of titlesBy.get(afterIdx) ?? []) {
      const ttxt = (tit.text ?? '').trim()
      if (ttxt) children.push(titleParagraph(ttxt, titleStyle))
    }
  }

  flushAfter(-1)

  lines.forEach((l, i) => {
    if (hiddenSet.has(i)) {
      flushAfter(i)
      return
    }
    const shade = lineShadeFill(i, bgBlocks)

    if (l.type === 'narration') {
      children.push(
        new Paragraph({
          spacing: bodySpacing(lineSpacingMult, 3, 3),
          indent: { left: convertMillimetersToTwip(3.5) },
          shading: shadingFor(shade),
          children: [eaRun(String(l.content ?? ''), { font: bodyFont, sizePt: bodyPt, color: '6B5F52' })],
        }),
      )
      flushAfter(i)
      return
    }

    if (l.type === 'dice') {
      children.push(
        new Paragraph({
          spacing: bodySpacing(lineSpacingMult, 2, 2),
          indent: { left: convertMillimetersToTwip(3.5) },
          shading: shadingFor(shade),
          children: [
            eaRun(`[${String(l.name ?? '')}] `, { font: diceFont, sizePt: dicePt, color: diceColor, bold: true }),
            eaRun(String(l.content ?? ''), { font: diceFont, sizePt: dicePt, color: diceColor }),
          ],
        }),
      )
      flushAfter(i)
      return
    }

    if (l.type === 'speech') {
      const name = String(l.name ?? '')
      const content = String(l.content ?? '')
      const rgb = rgbForCharacter(name, charMap, charColors)

      const nameShown = speakerBrackets ? `<${name}>` : name
      const namePara = new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: bodySpacing(lineSpacingMult, 2, 2),
        children: [eaRun(nameShown, { font: speakerFont, sizePt: bodyPt, color: rgb, bold: true })],
      })

      const parts = content ? content.split('\n') : ['']
      const contentRight = parensRight && speechContentStartsWithFullwidthParen(content)
      const contentParas = parts.map(
        (txt) =>
          new Paragraph({
            spacing: bodySpacing(lineSpacingMult, 2, 2),
            alignment: contentRight ? AlignmentType.RIGHT : undefined,
            children: [eaRun(txt, { font: bodyFont, sizePt: bodyPt, color: rgb })],
          }),
      )

      const c0 = new TableCell({
        width: { size: convertMillimetersToTwip(22), type: WidthType.DXA },
        margins: { marginUnitType: WidthType.DXA, right: 140 },
        verticalAlign: VerticalAlign.TOP,
        shading: shadingFor(shade),
        children: [namePara],
      })
      const c1 = new TableCell({
        width: { size: convertMillimetersToTwip(136), type: WidthType.DXA },
        margins: { marginUnitType: WidthType.DXA, left: 60 },
        verticalAlign: VerticalAlign.TOP,
        shading: shadingFor(shade),
        children: contentParas,
      })

      children.push(
        new Table({
          alignment: AlignmentType.LEFT,
          layout: TableLayoutType.FIXED,
          width: { size: 8504, type: WidthType.DXA },
          columnWidths: [convertMillimetersToTwip(22), convertMillimetersToTwip(136)],
          borders: NO_BORDERS,
          rows: [new TableRow({ children: [c0, c1] })],
        }),
      )
      flushAfter(i)
      return
    }

    flushAfter(i)
  })

  flushAfter(n)

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
            margin: {
              top: convertMillimetersToTwip(clampMm(pl.marginTopMm, 25.4)),
              bottom: convertMillimetersToTwip(clampMm(pl.marginBottomMm, 25.4)),
              left: convertMillimetersToTwip(clampMm(pl.marginLeftMm, 25.4)),
              right: convertMillimetersToTwip(clampMm(pl.marginRightMm, 25.4)),
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}
