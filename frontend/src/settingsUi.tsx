import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { BackgroundBlock, InsertedTitle, TitleAlign, TitleStyle } from './Preview'
import type { DocxPageLayout } from './docxExportHelpers'
import { displayNameForChar } from './docxExportHelpers'
import { FONT_PRESETS } from './fontPresets'
import type { LogInsertChunk, LogSlot } from './logSlots'
import { chunkPreviewOneLine, rawLineCount } from './logSlots'
import { resolveCharColorHex } from './parser'
import {
  bgDisplayLineToIndex,
  bgIndexToDisplayLine,
  titleAfterIndexToUiK,
  titleUiKToAfterIndex,
} from './previewLineUi'

export type SettingsToolId = 'file' | 'dice' | 'titles' | 'fonts' | 'bg' | 'export'

const TOOL_LABELS: Record<SettingsToolId, string> = {
  file: '文件',
  dice: '骰子&角色',
  titles: '插入标题',
  fonts: '字体&颜色',
  bg: '背景块',
  export: '导出',
}

export function toolLabel(id: SettingsToolId): string {
  return TOOL_LABELS[id]
}

export function DockIconButton({
  id,
  title,
  active,
  onClick,
  children,
}: {
  id: SettingsToolId
  title: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`dock-icon-btn${active ? ' dock-icon-btn-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      data-tool={id}
    >
      {children}
    </button>
  )
}

export function IconFile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export function IconDice() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconTitle() {
  return (
    <span
      aria-hidden
      style={{
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        fontFamily: '"SimSun", "Noto Serif SC", serif',
        userSelect: 'none',
      }}
    >
      标
    </span>
  )
}

export function IconFont() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 20L12 4l8 16M9 14h6" />
    </svg>
  )
}

export function IconBg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 15h18" opacity="0.5" />
    </svg>
  )
}

export function IconExport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}

type PanelCommon = {
  bracketSpeakers: string[]
  diceExactNames: string[]
  toggleDiceExact: (name: string) => void
  diceCustomInput: string
  setDiceCustomInput: (v: string) => void
  addDiceCustom: () => void
  charDisplayNames: Record<string, string>
  setCharDisplayAlias: (original: string, display: string) => void
  insertedTitles: InsertedTitle[]
  addSectionTitle: () => void
  updateSectionTitle: (id: string, patch: Partial<InsertedTitle>) => void
  removeSectionTitle: (id: string) => void
  titleStyle: TitleStyle
  setTitleStyle: Dispatch<SetStateAction<TitleStyle>>
  bodyFontId: string
  setBodyFontId: (id: string) => void
  speakerFontId: string
  setSpeakerFontId: (id: string) => void
  speakerBrackets: boolean
  setSpeakerBrackets: Dispatch<SetStateAction<boolean>>
  bodyFontSizePt: number
  setBodyFontSizePt: Dispatch<SetStateAction<number>>
  diceFontId: string
  setDiceFontId: (id: string) => void
  diceFontSizePt: number
  setDiceFontSizePt: Dispatch<SetStateAction<number>>
  diceColor: string
  setDiceColor: Dispatch<SetStateAction<string>>
  charOrder: string[]
  charMap: Record<string, number>
  charColorOverrides: Record<string, string>
  setCharColor: (name: string, hex7: string) => void
  resetCharColor: (name: string) => void
  lineCount: number
  backgroundBlocks: BackgroundBlock[]
  addBgBlock: () => void
  updateBgBlock: (id: string, patch: Partial<BackgroundBlock>) => void
  removeBgBlock: (id: string) => void
  logSlots: LogSlot[]
  mainLogId: string
  setMainLogId: (id: string) => void
  openEditorIds: string[]
  openLogEditor: (id: string) => void
  closeLogEditor: (id: string) => void
  updateLogSlot: (id: string, patch: Partial<LogSlot>) => void
  removeLogSlot: (id: string) => void
  addLogInsertChunk: (slotId: string) => void
  makeChunkFromEditorSelection: (slotId: string) => void
  updateLogInsertChunk: (slotId: string, chunkId: string, patch: Partial<LogInsertChunk>) => void
  removeLogInsertChunk: (slotId: string, chunkId: string) => void
  mainRawLineCount: number
  mergedRawLog: string
  exporting: boolean
  downloadDocx: () => void
  docxPageLayout: DocxPageLayout
  setDocxPageLayout: Dispatch<SetStateAction<DocxPageLayout>>
  parensSpeechRightAlign: boolean
  setParensSpeechRightAlign: Dispatch<SetStateAction<boolean>>
  exportFileName: string
  setExportFileName: Dispatch<SetStateAction<string>>
  fileRef: RefObject<HTMLInputElement | null>
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  loadSample: () => void
}

export function SettingsToolBody({ tool, p }: { tool: SettingsToolId; p: PanelCommon }) {
  switch (tool) {
    case 'file':
      return (
        <div className="control-body settings-tool-body">
          <p className="hint">支持 .txt、.docx；旧版 .doc 请先在 Word 中另存为 .docx。</p>
          <input ref={p.fileRef} type="file" accept=".txt,.docx" hidden onChange={p.onPickFile} />
          <div className="settings-tool-actions">
            <button type="button" className="btn btn-primary" onClick={() => p.fileRef.current?.click()}>
              导入文件
            </button>
            <button type="button" className="btn btn-ghost" onClick={p.loadSample}>
              载入示例
            </button>
          </div>

          <div className="log-slots-section">
            <p className="hint log-slots-section-title">多份 Log（不同群聊可先分别导入，再合并导出）</p>
            <p className="hint">
              指定一份为<strong>主 Log</strong>。非主 Log 的插入块在<strong>编辑浮窗里用鼠标拖选文字</strong>后点击「将选区制作为插入块」（按字符下标截取，与自动换行无关）；也可「整块为一块」。每块可设插入到主 Log 第几行之后（0=文首）。无块时整份插在下方「整份」位置。
            </p>

            <ul className="log-slot-list">
              {p.logSlots.map((s) => {
                const isMain = s.id === p.mainLogId
                const editorOpen = p.openEditorIds.includes(s.id)
                return (
                  <li key={s.id} className="log-slot-row">
                    <div className="log-slot-row-top">
                      <input
                        type="text"
                        className="settings-flex-input log-slot-name-input"
                        value={s.name}
                        onChange={(e) => p.updateLogSlot(s.id, { name: e.target.value })}
                        aria-label="分卷名称"
                      />
                      {isMain ? (
                        <span className="log-slot-badge-main">主 Log</span>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-tiny" onClick={() => p.setMainLogId(s.id)}>
                          设为主
                        </button>
                      )}
                      {editorOpen ? (
                        <button type="button" className="btn btn-ghost btn-tiny" onClick={() => p.closeLogEditor(s.id)}>
                          关编辑窗
                        </button>
                      ) : (
                        <button type="button" className="btn btn-primary btn-tiny" onClick={() => p.openLogEditor(s.id)}>
                          开编辑窗
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-tiny"
                        disabled={p.logSlots.length <= 1}
                        onClick={() => p.removeLogSlot(s.id)}
                        title={p.logSlots.length <= 1 ? '至少保留一份' : '移除此份'}
                      >
                        移除
                      </button>
                    </div>
                    {!isMain ? (
                      <div className="log-slot-chunks-wrap">
                        <div className="log-slot-chunk-toolbar">
                          <span className="hint" style={{ margin: 0 }}>
                            逻辑行 {rawLineCount(s.text)}（按换行）· 字符 {s.text.length}
                          </span>
                          <div className="log-slot-chunk-btns">
                            <button
                              type="button"
                              className="btn btn-primary btn-tiny"
                              onClick={() => p.makeChunkFromEditorSelection(s.id)}
                            >
                              选区制块
                            </button>
                            <button type="button" className="btn btn-ghost btn-tiny" onClick={() => p.addLogInsertChunk(s.id)}>
                              整块为一块
                            </button>
                          </div>
                        </div>
                        {(s.insertChunks ?? []).length > 0 ? (
                          <ul className="log-chunk-list">
                            {(s.insertChunks ?? []).map((c) => (
                              <li key={c.id} className="log-chunk-row log-chunk-row-preview">
                                <div className="log-chunk-preview">
                                  <span className="log-chunk-label">片段</span>
                                  <span className="log-chunk-preview-text" title={s.text.slice(c.sourceStartChar, c.sourceEndChar)}>
                                    {chunkPreviewOneLine(s.text, c)}
                                  </span>
                                </div>
                                <div className="log-chunk-row-controls">
                                  <span className="log-chunk-mid">→ 主 Log 第</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={p.mainRawLineCount}
                                    className="log-chunk-num"
                                    value={c.afterMainLine}
                                    onChange={(e) =>
                                      p.updateLogInsertChunk(s.id, c.id, {
                                        afterMainLine: Math.max(
                                          0,
                                          Math.min(p.mainRawLineCount, Math.floor(Number(e.target.value) || 0)),
                                        ),
                                      })
                                    }
                                    aria-label="插在主 Log 第几行之后"
                                  />
                                  <span className="hint log-chunk-tail">行之后</span>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-tiny"
                                    onClick={() => p.removeLogInsertChunk(s.id, c.id)}
                                  >
                                    删块
                                  </button>
                                </div>
                                <p className="hint log-chunk-meta">
                                  字符 [{c.sourceStartChar}, {c.sourceEndChar}) · 需在编辑窗重新选区可删后重做
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="hint log-chunk-fallback-hint">
                            当前无插入块：整份插在主 Log 第 {s.insertAfterLine} 行之后。请打开编辑窗拖选文字后点「选区制块」或「整块为一块」。
                          </p>
                        )}
                        {(s.insertChunks ?? []).length === 0 ? (
                          <div className="field-row log-slot-insert-row">
                            <label htmlFor={`ins-${s.id}`}>整份 · 主 Log 第</label>
                            <input
                              id={`ins-${s.id}`}
                              type="number"
                              min={0}
                              max={p.mainRawLineCount}
                              value={s.insertAfterLine}
                              onChange={(e) =>
                                p.updateLogSlot(s.id, {
                                  insertAfterLine: Math.max(
                                    0,
                                    Math.min(p.mainRawLineCount, Math.floor(Number(e.target.value) || 0)),
                                  ),
                                })
                              }
                              style={{ width: 64 }}
                            />
                            <span className="hint" style={{ margin: 0 }}>
                              行之后
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )
    case 'dice':
      return (
        <div className="control-body settings-tool-body">
          <p className="hint">
            勾选「骰子」的发言会按骰点样式显示；也可在下方手动添加全名。「显示为」可改预览与 Word 中的角色名（颜色仍按原名）。
          </p>
          {p.bracketSpeakers.length === 0 ? (
            <p className="hint">粘贴 log 后，这里会列出所有 &lt;名&gt;: 中的名字供勾选。</p>
          ) : (
            <div className="dice-speaker-list">
              {p.bracketSpeakers.map((name) => (
                <div key={name} className="dice-speaker-row">
                  <label className="checkbox-row dice-speaker-item dice-speaker-check">
                    <input type="checkbox" checked={p.diceExactNames.includes(name)} onChange={() => p.toggleDiceExact(name)} />
                    <span className="dice-speaker-label" title={name}>
                      {name}
                    </span>
                  </label>
                  <input
                    type="text"
                    className="settings-inline-input dice-speaker-alias-input"
                    placeholder="显示为…"
                    value={p.charDisplayNames[name] ?? ''}
                    onChange={(e) => p.setCharDisplayAlias(name, e.target.value)}
                    aria-label={`${name} 显示为`}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="field-row" style={{ marginTop: 8 }}>
            <input
              type="text"
              placeholder="手动添加骰子全名…"
              value={p.diceCustomInput}
              onChange={(e) => p.setDiceCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && p.addDiceCustom()}
              className="settings-inline-input"
            />
            <button type="button" className="btn btn-ghost btn-tiny" onClick={p.addDiceCustom}>
              添加
            </button>
          </div>
          {p.diceExactNames.length > 0 && <p className="hint">已指定（含手动）：{p.diceExactNames.join('、')}</p>}
        </div>
      )
    case 'titles':
      return (
        <div className="control-body settings-tool-body">
          <p className="hint">
            插入位置填数字，与预览「解析 N」一致：<strong>0</strong>=文首，<strong>1～{p.lineCount}</strong>=插在解析该行之后，<strong>{p.lineCount + 1}</strong>=全文末尾。
          </p>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={p.addSectionTitle}>
            添加一条标题
          </button>
          <div className="image-list" style={{ marginTop: 10 }}>
            {p.insertedTitles.map((t) => (
              <div key={t.id} className="image-item title-row-with-num" style={{ flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="如：第一日"
                  value={t.text}
                  onChange={(e) => p.updateSectionTitle(t.id, { text: e.target.value })}
                  className="settings-flex-input"
                />
                <label className="title-insert-num-label">
                  插在
                  <input
                    type="number"
                    className="log-chunk-num title-insert-num-input"
                    min={0}
                    max={Math.max(0, p.lineCount) + 1}
                    value={titleAfterIndexToUiK(t.afterIndex, p.lineCount)}
                    onChange={(e) =>
                      p.updateSectionTitle(t.id, {
                        afterIndex: titleUiKToAfterIndex(Number(e.target.value), p.lineCount),
                      })
                    }
                    aria-label="标题插入位置"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => p.removeSectionTitle(t.id)}
                >
                  移除
                </button>
              </div>
            ))}
          </div>
          <div className="field-row" style={{ marginTop: 12 }}>
            <label>字号（磅）</label>
            <input
              type="number"
              min={8}
              max={72}
              step={0.5}
              value={p.titleStyle.fontSizePt}
              onChange={(e) => p.setTitleStyle((s) => ({ ...s, fontSizePt: Number(e.target.value) || 14 }))}
            />
          </div>
          <div className="field-row">
            <label>对齐</label>
            <div className="align-btns">
              {(['left', 'center', 'right'] as TitleAlign[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={p.titleStyle.align === a ? 'active' : ''}
                  onClick={() => p.setTitleStyle((s) => ({ ...s, align: a }))}
                >
                  {a === 'left' ? '左' : a === 'center' ? '中' : '右'}
                </button>
              ))}
            </div>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={p.titleStyle.border}
              onChange={(e) => p.setTitleStyle((s) => ({ ...s, border: e.target.checked }))}
            />
            标题边框装饰
          </label>
        </div>
      )
    case 'fonts':
      return (
        <div className="control-body settings-tool-body">
          <div className="field-row">
            <label>正文字体</label>
            <select value={p.bodyFontId} onChange={(e) => p.setBodyFontId(e.target.value)} className="settings-select settings-select-grow">
              {FONT_PRESETS.map((fp) => (
                <option key={fp.id} value={fp.id}>
                  {fp.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label>角色名字体</label>
            <select value={p.speakerFontId} onChange={(e) => p.setSpeakerFontId(e.target.value)} className="settings-select settings-select-grow">
              {FONT_PRESETS.map((fp) => (
                <option key={fp.id} value={fp.id}>
                  {fp.label}
                </option>
              ))}
            </select>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={p.speakerBrackets}
              onChange={(e) => p.setSpeakerBrackets(e.target.checked)}
            />
            给角色名加上 &lt; &gt;（如 &lt;凯&gt;，预览与导出一致）
          </label>
          <div className="field-row">
            <label htmlFor="body-font-size-pt">正文字号（磅）</label>
            <input
              id="body-font-size-pt"
              type="number"
              min={6}
              max={36}
              step={0.5}
              value={p.bodyFontSizePt}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                p.setBodyFontSizePt(Math.max(6, Math.min(36, n)))
              }}
              style={{ width: 72 }}
              aria-describedby="body-font-size-hint"
            />
          </div>
          <p id="body-font-size-hint" className="hint" style={{ marginTop: 0 }}>
            预览与导出 Word 的正文、对话、角色名一致。
          </p>
          <div className="field-row">
            <label>骰点字体</label>
            <select value={p.diceFontId} onChange={(e) => p.setDiceFontId(e.target.value)} className="settings-select settings-select-grow">
              {FONT_PRESETS.map((fp) => (
                <option key={fp.id} value={fp.id}>
                  {fp.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="dice-font-size-pt">骰点字号（磅）</label>
            <input
              id="dice-font-size-pt"
              type="number"
              min={6}
              max={36}
              step={0.5}
              value={p.diceFontSizePt}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (!Number.isFinite(n)) return
                p.setDiceFontSizePt(Math.max(6, Math.min(36, n)))
              }}
              style={{ width: 72 }}
            />
          </div>
          <div className="field-row">
            <label>骰点颜色</label>
            <input
              type="color"
              value={p.diceColor}
              onChange={(e) => p.setDiceColor(e.target.value)}
              aria-label="骰点颜色"
            />
          </div>
          {p.charOrder.length === 0 ? (
            <p className="hint">解析 log 后出现对话角色，可在此改颜色。</p>
          ) : (
            <div className="char-color-list">
              {p.charOrder.map((name) => {
                const hex6 = resolveCharColorHex(name, p.charMap, p.charColorOverrides)
                const pickerVal = `#${hex6}`
                const shown = displayNameForChar(name, p.charDisplayNames)
                return (
                  <div key={name} className="char-color-row">
                    <span className="char-color-name" title={shown !== name ? `原名：${name}` : name}>
                      {shown}
                    </span>
                    <input type="color" value={pickerVal} onChange={(e) => p.setCharColor(name, e.target.value)} aria-label={`${name} 颜色`} />
                    <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => p.resetCharColor(name)}>
                      默认
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    case 'bg':
      return (
        <div className="control-body settings-tool-body">
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={p.addBgBlock}>
            添加色块
          </button>
          <p className="hint">
            起止行号与预览「解析 N」相同（1～{Math.max(1, p.lineCount)}），闭区间。当前共 {p.lineCount} 条解析行。
          </p>
          <div className="block-list">
            {p.backgroundBlocks.map((b) => (
              <div key={b.id} className="block-item">
                <span className="block-item-label">解析</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, p.lineCount)}
                  title="起始解析行"
                  value={bgIndexToDisplayLine(b.start, p.lineCount)}
                  onChange={(e) =>
                    p.updateBgBlock(b.id, { start: bgDisplayLineToIndex(Number(e.target.value), p.lineCount) })
                  }
                />
                <span className="block-item-label">—</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, p.lineCount)}
                  title="结束解析行"
                  value={bgIndexToDisplayLine(b.end, p.lineCount)}
                  onChange={(e) =>
                    p.updateBgBlock(b.id, { end: bgDisplayLineToIndex(Number(e.target.value), p.lineCount) })
                  }
                />
                <input type="color" value={b.color.length === 7 ? b.color : '#cccccc'} onChange={(e) => p.updateBgBlock(b.id, { color: e.target.value })} />
                <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => p.removeBgBlock(b.id)}>
                  删
                </button>
              </div>
            ))}
          </div>
        </div>
      )
    case 'export':
      return (
        <div className="control-body settings-tool-body">
          <p className="hint">在浏览器中直接生成与预览一致的 .docx，无需后端。页边距与行距仅作用于 Word 导出。</p>
          <div className="export-layout-grid">
            <span className="hint export-layout-label">页边距（mm）</span>
            <label className="export-layout-field">
              上
              <input
                type="number"
                min={5}
                max={60}
                step={0.1}
                value={p.docxPageLayout.marginTopMm}
                onChange={(e) =>
                  p.setDocxPageLayout((s) => ({ ...s, marginTopMm: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <label className="export-layout-field">
              下
              <input
                type="number"
                min={5}
                max={60}
                step={0.1}
                value={p.docxPageLayout.marginBottomMm}
                onChange={(e) =>
                  p.setDocxPageLayout((s) => ({ ...s, marginBottomMm: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <label className="export-layout-field">
              左
              <input
                type="number"
                min={5}
                max={60}
                step={0.1}
                value={p.docxPageLayout.marginLeftMm}
                onChange={(e) =>
                  p.setDocxPageLayout((s) => ({ ...s, marginLeftMm: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <label className="export-layout-field">
              右
              <input
                type="number"
                min={5}
                max={60}
                step={0.1}
                value={p.docxPageLayout.marginRightMm}
                onChange={(e) =>
                  p.setDocxPageLayout((s) => ({ ...s, marginRightMm: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <label className="export-layout-field export-layout-span2">
              正文行距（倍）
              <input
                type="number"
                min={1}
                max={3}
                step={0.05}
                value={p.docxPageLayout.lineSpacingMultiple}
                onChange={(e) =>
                  p.setDocxPageLayout((s) => ({ ...s, lineSpacingMultiple: Number(e.target.value) || 1 }))
                }
              />
            </label>
          </div>
          <label className="checkbox-row" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={p.parensSpeechRightAlign}
              onChange={(e) => p.setParensSpeechRightAlign(e.target.checked)}
            />
            将以「（」开头的发言正文右对齐（预览与导出一致）
          </label>
          <div className="field-row" style={{ marginTop: 10 }}>
            <label htmlFor="export-file-name">文件名</label>
            <input
              id="export-file-name"
              type="text"
              className="settings-flex-input"
              placeholder="留空则用首个标题，否则「跑团log」"
              value={p.exportFileName}
              onChange={(e) => p.setExportFileName(e.target.value)}
            />
            <span className="hint" style={{ margin: 0 }}>.docx</span>
          </div>
          <button
            type="button"
            className="btn btn-primary settings-export-btn"
            disabled={!p.mergedRawLog.trim() && !p.insertedTitles.some((t) => t.text.trim())}
            onClick={p.downloadDocx}
          >
            {p.exporting ? '生成中…' : '导出 Word'}
          </button>
        </div>
      )
    default:
      return null
  }
}
