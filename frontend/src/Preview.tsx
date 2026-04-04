import type { CSSProperties } from 'react'
import type { ParsedLine } from './parser'
import { resolveCharColorHex } from './parser'
import { SPEAKER_FONT_PRESET } from './fontPresets'
import { displayNameForChar, speechContentStartsWithFullwidthParen } from './docxExportHelpers'

export type TitleAlign = 'left' | 'center' | 'right'

/** 所有分段标题共用的外观（字号、对齐、边框） */
export type TitleStyle = {
  fontSizePt: number
  align: TitleAlign
  border: boolean
}

export type InsertedTitle = {
  id: string
  text: string
  /** -1 = 文首（所有 log 行之前）；0..n-1 = 该行之后；n = 全文末尾 */
  afterIndex: number
}

export function ptToCssPx(pt: number) {
  return (pt * 96) / 72
}

export type BackgroundBlock = {
  id: string
  start: number
  end: number
  color: string
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function blockStyleForLine(
  lineIndex: number,
  blocks: BackgroundBlock[],
): CSSProperties | undefined {
  for (const b of blocks) {
    const lo = Math.min(b.start, b.end)
    const hi = Math.max(b.start, b.end)
    if (lineIndex >= lo && lineIndex <= hi) {
      return { backgroundColor: `${b.color}33`, borderRadius: 6, padding: '4px 8px', margin: '0 -8px' }
    }
  }
  return undefined
}

function titlesAt(titles: InsertedTitle[], afterIndex: number) {
  return titles
    .filter((t) => t.afterIndex === afterIndex)
    .sort((a, b) => a.id.localeCompare(b.id))
}

type PreviewProps = {
  lines: ParsedLine[]
  charMap: Record<string, number>
  charColorOverrides: Record<string, string>
  bodyFontCss: string
  /** 正文主字号（磅），与导出 Word 一致 */
  bodyFontSizePt: number
  titleStyle: TitleStyle
  insertedTitles: InsertedTitle[]
  backgroundBlocks: BackgroundBlock[]
  /** 按稳定解析行号（0-based）隐藏；标题与背景块仍按原行号锚定 */
  hiddenLineIndices: ReadonlySet<number>
  onToggleLineHidden: (lineIndex: number) => void
  /** 原文角色名 → 预览/导出显示名（空则用原名） */
  charDisplayNames: Record<string, string>
  /** 首行以全角「（」开头的发言：正文格右对齐 */
  parensSpeechRightAlign: boolean
}

function renderTitleBlocks(text: string, titleStyle: TitleStyle) {
  const titleAlignClass =
    titleStyle.align === 'left'
      ? 'preview-title-left'
      : titleStyle.align === 'right'
        ? 'preview-title-right'
        : 'preview-title-center'
  const trimmed = text.trim()
  if (!trimmed) return null
  return (
    <div
      className={`preview-doc-title ${titleAlignClass} ${titleStyle.border ? 'preview-doc-title-bordered' : ''}`}
      style={{ fontSize: `${ptToCssPx(titleStyle.fontSizePt)}px` }}
    >
      {trimmed}
    </div>
  )
}

export function Preview({
  lines,
  charMap,
  charColorOverrides,
  bodyFontCss,
  bodyFontSizePt,
  titleStyle,
  insertedTitles,
  backgroundBlocks,
  hiddenLineIndices,
  onToggleLineHidden,
  charDisplayNames,
  parensSpeechRightAlign,
}: PreviewProps) {
  const hasLog = lines.length > 0
  const headTitles = titlesAt(insertedTitles, -1).map((t) => (
    <div key={t.id}>{renderTitleBlocks(t.text, titleStyle)}</div>
  ))

  return (
    <div className="preview-inner">
      {headTitles}

      {!hasLog ? (
        <div className="preview-empty">
          {insertedTitles.some((t) => t.text.trim())
            ? '← 可在上方添加文首标题；粘贴 log 后会在所选行之间显示更多标题'
            : '← 粘贴 log 后这里会实时显示排版预览'}
        </div>
      ) : (
        lines.map((l, i) => {
          const hidden = hiddenLineIndices.has(i)
          return (
            <div key={i} className="preview-row-block">
              {hidden ? (
                <div
                  className="preview-line-wrap preview-line-hidden-row"
                  title="此行已从预览与导出中隐藏；分段标题与背景块行号不变，仍按「解析 N」对应。"
                >
                  <div className="preview-line-toolbar preview-line-toolbar-always">
                    <span className="preview-line-hint preview-line-hint-static">解析 {i + 1}</span>
                    <span className="preview-hidden-label">已隐藏</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-tiny preview-line-remove-btn"
                      onClick={() => onToggleLineHidden(i)}
                    >
                      还原
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="preview-line-wrap"
                  title={`解析后第 ${i + 1} 行（标题/背景块请填此序号）。移除预览不改变这些行号。`}
                >
                  <div className="preview-line-toolbar">
                    <span className="preview-line-hint preview-line-hint-static">解析 {i + 1}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-tiny preview-line-remove-btn"
                      onClick={() => onToggleLineHidden(i)}
                      aria-label={`移除解析第 ${i + 1} 行预览`}
                    >
                      移除
                    </button>
                  </div>
                  <div className="preview-line-body" style={blockStyleForLine(i, backgroundBlocks)}>
                    {renderLine(
                      l,
                      charMap,
                      charColorOverrides,
                      bodyFontCss,
                      bodyFontSizePt,
                      charDisplayNames,
                      parensSpeechRightAlign,
                    )}
                  </div>
                </div>
              )}
              {titlesAt(insertedTitles, i).map((t) => (
                <div key={t.id}>{renderTitleBlocks(t.text, titleStyle)}</div>
              ))}
            </div>
          )
        })
      )}

      {hasLog
        ? titlesAt(insertedTitles, lines.length).map((t) => (
            <div key={t.id}>{renderTitleBlocks(t.text, titleStyle)}</div>
          ))
        : null}
    </div>
  )
}

function renderLine(
  l: ParsedLine,
  charMap: Record<string, number>,
  charColorOverrides: Record<string, string>,
  bodyFontCss: string,
  bodyFontSizePt: number,
  charDisplayNames: Record<string, string>,
  parensSpeechRightAlign: boolean,
) {
  const bodyPx = ptToCssPx(bodyFontSizePt)
  const diceBotPx = ptToCssPx((bodyFontSizePt * 9) / 11)
  const diceContentPx = ptToCssPx((bodyFontSizePt * 10) / 11)

  if (l.type === 'narration') {
    return (
      <div className="log-narration" style={{ fontFamily: bodyFontCss, fontSize: `${bodyPx}px` }}>
        {esc(l.content)}
      </div>
    )
  }
  const shownName = displayNameForChar(l.name, charDisplayNames)
  if (l.type === 'dice') {
    return (
      <div className="log-dice" style={{ fontFamily: bodyFontCss, fontSize: `${diceContentPx}px` }}>
        <span className="dice-bot" style={{ fontSize: `${diceBotPx}px` }}>
          [{esc(shownName)}]
        </span>{' '}
        <span>{esc(l.content)}</span>
      </div>
    )
  }
  const hex = resolveCharColorHex(l.name, charMap, charColorOverrides)
  const color = `#${hex}`
  const contentHtml = esc(l.content).split('\n').map((line, i) => (
    <span key={i}>
      {i > 0 ? <br /> : null}
      {line}
    </span>
  ))
  const contentRight = parensSpeechRightAlign && speechContentStartsWithFullwidthParen(l.content)
  return (
    <div className="log-line" style={{ fontSize: `${bodyPx}px` }}>
      <span
        className="speaker"
        style={{
          color,
          fontFamily: SPEAKER_FONT_PRESET.cssStack,
        }}
        title={shownName !== l.name ? l.name : undefined}
      >
        {esc(shownName)}
      </span>
      <span
        className={`content${contentRight ? ' log-line-content-parens-right' : ''}`}
        style={{ color, fontFamily: bodyFontCss }}
      >
        {contentHtml}
      </span>
    </div>
  )
}

export function CharTags({
  charOrder,
  charMap,
  charColorOverrides,
  charDisplayNames = {},
}: {
  charOrder: string[]
  charMap: Record<string, number>
  charColorOverrides: Record<string, string>
  charDisplayNames?: Record<string, string>
}) {
  if (charOrder.length === 0) return null
  return (
    <div className="char-tags">
      {charOrder.map((name) => {
        const hex = resolveCharColorHex(name, charMap, charColorOverrides)
        const label = displayNameForChar(name, charDisplayNames)
        return (
          <div
            key={name}
            className="char-tag"
            style={{
              color: `#${hex}`,
              borderColor: `#${hex}40`,
              background: `#${hex}12`,
            }}
            title={label !== name ? `原名：${name}` : name}
          >
            <span className="tag-label">{esc(label)}</span>
          </div>
        )
      })}
    </div>
  )
}
