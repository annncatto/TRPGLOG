import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  composeMergedLog,
  rawLineCount,
  stripFileBaseName,
  type LogInsertChunk,
  type LogSlot,
} from './logSlots'
import mammoth from 'mammoth'
import './App.css'
import { FloatingPanel } from './FloatingPanel'
import { LogEditorWithGutter } from './LogEditorWithGutter'
import {
  DockIconButton,
  IconBg,
  IconDice,
  IconExport,
  IconFile,
  IconFont,
  IconTitle,
  SettingsToolBody,
  toolLabel,
  type SettingsToolId,
} from './settingsUi'
import { CharTags, Preview, type BackgroundBlock, type InsertedTitle, type TitleStyle } from './Preview'
import { DEFAULT_BODY_FONT_ID, getFontPresetById, SPEAKER_FONT_PRESET } from './fontPresets'
import {
  applyDisplayNamesToLines,
  buildDocxCharMapsForAliases,
  DEFAULT_DOCX_PAGE_LAYOUT,
  type DocxPageLayout,
} from './docxExportHelpers'
import {
  extractBracketSpeakerNames,
  lineStats,
  parseRawLog,
  type DiceSpeakerConfig,
  type ParsedLine,
} from './parser'

const SAMPLE = `<无限流河>:然后那男子眼睛一闭，就死去了。
<约书亚·沃特金斯>:"这……"看着人在面前死去还是第一次，在浓雾弥漫的街道上，寒意好像已经渗入骨髓，最后也只能叹口气。
不能让他就在这里躺着，我把手帕盖在他的脸上，回旅馆喊人。在路上，思考着那句遗言……
<约书亚·沃特金斯>:.ra 法语
<Abyss（元梦之星版）>:曾为流动的深渊包裹，<约书亚·沃特金斯>的"法语"结果显露:
D100=83/36 ●失败
Abyss全身的毛炸起，它见到了可怖、无法理解、无法摆脱的绿色长条物体。`

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

const LOG_PLACEHOLDER = `将骰子导出的 log 粘贴到这里…

支持格式：
<角色名>:发言内容
<骰子角色>:骰点结果（在左侧「骰子角色」中指定）
没有尖括号的行视为续行

多份 Log：非主 Log 在编辑窗拖选文字后制作为插入块（按字符，非换行显示）；每份可开独立浮窗。预览与导出 = 合并结果。

导入：.txt / .docx（旧版 .doc 请先另存为 .docx）`

export default function App() {
  const initLogUi = useMemo(() => {
    const id = crypto.randomUUID()
    return {
      logSlots: [{ id, name: '主 Log', text: '', insertAfterLine: 0, insertChunks: [] }],
      mainId: id,
      openEditorIds: [id],
      logEditorZMap: { [id]: 100 } as Record<string, number>,
    }
  }, [])

  const [logSlots, setLogSlots] = useState<LogSlot[]>(() => initLogUi.logSlots)
  const [mainLogId, setMainLogId] = useState<string>(() => initLogUi.mainId)
  const [openEditorIds, setOpenEditorIds] = useState<string[]>(() => initLogUi.openEditorIds)
  const [logEditorZMap, setLogEditorZMap] = useState<Record<string, number>>(() => initLogUi.logEditorZMap)
  const [titleStyle, setTitleStyle] = useState<TitleStyle>({
    fontSizePt: 14,
    align: 'center',
    border: true,
  })
  const [insertedTitles, setInsertedTitles] = useState<InsertedTitle[]>([])
  const [backgroundBlocks, setBackgroundBlocks] = useState<BackgroundBlock[]>([])
  const [bodyFontId, setBodyFontId] = useState(DEFAULT_BODY_FONT_ID)
  const [speakerFontId, setSpeakerFontId] = useState(SPEAKER_FONT_PRESET.id)
  const [speakerBrackets, setSpeakerBrackets] = useState(false)
  const [bodyFontSizePt, setBodyFontSizePt] = useState(11)
  const [diceFontId, setDiceFontId] = useState(DEFAULT_BODY_FONT_ID)
  const [diceFontSizePt, setDiceFontSizePt] = useState(10)
  const [diceColor, setDiceColor] = useState('#4a8a4a')
  const [charColorOverrides, setCharColorOverrides] = useState<Record<string, string>>({})
  const [diceExactNames, setDiceExactNames] = useState<string[]>([])
  const [diceCustomInput, setDiceCustomInput] = useState('')
  const [charDisplayNames, setCharDisplayNames] = useState<Record<string, string>>({})
  const [docxPageLayout, setDocxPageLayout] = useState<DocxPageLayout>(() => ({ ...DEFAULT_DOCX_PAGE_LAYOUT }))
  const [parensSpeechRightAlign, setParensSpeechRightAlign] = useState(false)
  const [exportFileName, setExportFileName] = useState('')
  const [exporting, setExporting] = useState(false)
  /** 预览/导出中隐藏的解析行（0-based）；合并 log 变更时重置 */
  const [hiddenLineIndices, setHiddenLineIndices] = useState(() => new Set<number>())
  const fileRef = useRef<HTMLInputElement>(null)
  const logTextareaRefMap = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const zRef = useRef(100)
  const [zPreview, setZPreview] = useState(101)
  const [activeSettingsTool, setActiveSettingsTool] = useState<SettingsToolId | null>(null)

  const bumpLogEditor = useCallback((id: string) => {
    zRef.current += 1
    setLogEditorZMap((m) => ({ ...m, [id]: zRef.current }))
  }, [])

  const openLogEditor = useCallback((id: string) => {
    setOpenEditorIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    zRef.current += 1
    setLogEditorZMap((m) => ({ ...m, [id]: zRef.current }))
  }, [])

  const closeLogEditor = useCallback((id: string) => {
    setOpenEditorIds((prev) => prev.filter((x) => x !== id))
  }, [])

  const bumpPreviewZ = useCallback(() => {
    zRef.current += 1
    setZPreview(zRef.current)
  }, [])

  const bodyFontCss = useMemo(() => getFontPresetById(bodyFontId).cssStack, [bodyFontId])
  const speakerFontCss = useMemo(() => getFontPresetById(speakerFontId).cssStack, [speakerFontId])
  const bodyFontSizePtClamped = useMemo(() => clamp(bodyFontSizePt, 6, 36), [bodyFontSizePt])
  const diceFontCss = useMemo(() => getFontPresetById(diceFontId).cssStack, [diceFontId])
  const diceFontSizePtClamped = useMemo(() => clamp(diceFontSizePt, 6, 36), [diceFontSizePt])
  const diceColorSafe = useMemo(
    () => (/^#[0-9A-Fa-f]{6}$/.test(diceColor.trim()) ? diceColor.trim() : '#4a8a4a'),
    [diceColor],
  )

  const diceConfig: DiceSpeakerConfig = useMemo(
    () => ({ exactNames: diceExactNames }),
    [diceExactNames],
  )

  const mergedRawLog = useMemo(() => composeMergedLog(logSlots, mainLogId), [logSlots, mainLogId])

  const mainSlot = useMemo(() => logSlots.find((s) => s.id === mainLogId), [logSlots, mainLogId])
  const mainRawLineCount = rawLineCount(mainSlot?.text ?? '')

  const { lines, charMap, charOrder } = useMemo(
    () => parseRawLog(mergedRawLog, diceConfig),
    [mergedRawLog, diceConfig],
  )
  const bracketSpeakers = useMemo(() => extractBracketSpeakerNames(mergedRawLog), [mergedRawLog])

  useEffect(() => {
    setHiddenLineIndices(new Set())
  }, [mergedRawLog])

  const toggleLineHidden = useCallback((lineIndex: number) => {
    setHiddenLineIndices((prev) => {
      const next = new Set(prev)
      if (next.has(lineIndex)) next.delete(lineIndex)
      else next.add(lineIndex)
      return next
    })
  }, [])

  const stats = useMemo(() => {
    const visible = lines.filter((_, i) => !hiddenLineIndices.has(i))
    return lineStats(visible)
  }, [lines, hiddenLineIndices])
  const statsText = `${stats.speech} 条对话  ${stats.narr} 条旁白  ${stats.dice} 条骰点`

  const maxIdx = Math.max(0, lines.length - 1)
  const lineCount = lines.length

  const loadSample = useCallback(() => {
    const id = crypto.randomUUID()
    zRef.current += 1
    setLogSlots([{ id, name: '示例', text: SAMPLE, insertAfterLine: 0, insertChunks: [] }])
    setMainLogId(id)
    setOpenEditorIds([id])
    setLogEditorZMap({ [id]: zRef.current })
  }, [])

  const updateLogSlot = useCallback((id: string, patch: Partial<LogSlot>) => {
    setLogSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const addLogInsertChunk = useCallback((slotId: string) => {
    setLogSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s
        const chunks = [...(s.insertChunks ?? [])]
        const refAfter = chunks.length > 0 ? chunks[chunks.length - 1]!.afterMainLine : s.insertAfterLine
        chunks.push({
          id: crypto.randomUUID(),
          sourceStartChar: 0,
          sourceEndChar: s.text.length,
          afterMainLine: refAfter,
        })
        return { ...s, insertChunks: chunks }
      }),
    )
  }, [])

  const makeChunkFromEditorSelection = useCallback((slotId: string) => {
    const ta = logTextareaRefMap.current[slotId]
    if (!ta) {
      alert('请先打开该份的编辑窗口')
      return
    }
    const a = ta.selectionStart
    const b = ta.selectionEnd
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    if (lo === hi) {
      alert('请先在编辑框中用鼠标拖选一段文字，再制作为插入块')
      return
    }
    setLogSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s
        const chunks = [...(s.insertChunks ?? [])]
        const refAfter = chunks.length > 0 ? chunks[chunks.length - 1]!.afterMainLine : s.insertAfterLine
        chunks.push({
          id: crypto.randomUUID(),
          sourceStartChar: lo,
          sourceEndChar: hi,
          afterMainLine: refAfter,
        })
        return { ...s, insertChunks: chunks }
      }),
    )
  }, [])

  const updateLogInsertChunk = useCallback(
    (slotId: string, chunkId: string, patch: Partial<LogInsertChunk>) => {
      setLogSlots((prev) =>
        prev.map((s) => {
          if (s.id !== slotId) return s
          return {
            ...s,
            insertChunks: (s.insertChunks ?? []).map((c) => (c.id === chunkId ? { ...c, ...patch } : c)),
          }
        }),
      )
    },
    [],
  )

  const removeLogInsertChunk = useCallback((slotId: string, chunkId: string) => {
    setLogSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s
        return { ...s, insertChunks: (s.insertChunks ?? []).filter((c) => c.id !== chunkId) }
      }),
    )
  }, [])

  const removeLogSlot = useCallback((id: string) => {
    setLogSlots((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((s) => s.id !== id)
      setMainLogId((mid) => (mid === id ? next[0]!.id : mid))
      setOpenEditorIds((oids) => oids.filter((x) => x !== id))
      setLogEditorZMap((m) => {
        const { [id]: _, ...rest } = m
        return rest
      })
      return next
    })
  }, [])

  const toggleDiceExact = useCallback((name: string) => {
    setDiceExactNames((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]))
  }, [])

  const addDiceCustom = useCallback(() => {
    const t = diceCustomInput.trim()
    if (!t) return
    setDiceExactNames((prev) => (prev.includes(t) ? prev : [...prev, t]))
    setDiceCustomInput('')
  }, [diceCustomInput])

  const onPickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (!f) return
      const name = f.name.toLowerCase()
      const baseLabel = stripFileBaseName(f.name)
      let text = ''
      try {
        if (name.endsWith('.txt')) {
          text = await f.text()
        } else if (name.endsWith('.docx')) {
          const buf = await f.arrayBuffer()
          const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
          text = value
        } else if (name.endsWith('.doc')) {
          alert('暂不支持旧版 .doc 格式，请在 Word 中另存为 .docx 后再导入。')
          return
        } else {
          alert('请上传 .txt 或 .docx 文件')
          return
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : '读取文件失败')
        return
      }

      let replacedOnlyEmpty = false
      const newId = crypto.randomUUID()
      setLogSlots((prev) => {
        const onlyOneEmpty = prev.length === 1 && prev[0].text.trim() === ''
        if (onlyOneEmpty) {
          replacedOnlyEmpty = true
          return [{ ...prev[0], name: baseLabel, text, insertChunks: prev[0].insertChunks ?? [] }]
        }
        const main = prev.find((s) => s.id === mainLogId) ?? prev[0]
        const insertAfter = rawLineCount(main.text)
        const firstChunkId = crypto.randomUUID()
        return [
          ...prev,
          {
            id: newId,
            name: baseLabel,
            text,
            insertAfterLine: insertAfter,
            insertChunks:
              text.length === 0
                ? []
                : [{ id: firstChunkId, sourceStartChar: 0, sourceEndChar: text.length, afterMainLine: insertAfter }],
          },
        ]
      })
      if (!replacedOnlyEmpty) {
        zRef.current += 1
        setOpenEditorIds((prev) => [...prev, newId])
        setLogEditorZMap((m) => ({ ...m, [newId]: zRef.current }))
      }
    },
    [mainLogId],
  )

  const addBgBlock = useCallback(() => {
    const id = crypto.randomUUID()
    setBackgroundBlocks((prev) => [
      ...prev,
      { id, start: 0, end: clamp(maxIdx, 0, maxIdx), color: '#cccccc' },
    ])
  }, [maxIdx])

  const updateBgBlock = useCallback((id: string, patch: Partial<BackgroundBlock>) => {
    setBackgroundBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    )
  }, [])

  const removeBgBlock = useCallback((id: string) => {
    setBackgroundBlocks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const addSectionTitle = useCallback(() => {
    const id = crypto.randomUUID()
    // 默认插在文首（-1），新加的标题立即显示在预览最上方，避免「看起来没生效」
    setInsertedTitles((prev) => [...prev, { id, text: '', afterIndex: -1 }])
  }, [])

  const updateSectionTitle = useCallback((id: string, patch: Partial<InsertedTitle>) => {
    setInsertedTitles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const removeSectionTitle = useCallback((id: string) => {
    setInsertedTitles((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const setCharColor = useCallback((name: string, hex7: string) => {
    setCharColorOverrides((prev) => ({ ...prev, [name]: hex7 }))
  }, [])

  const resetCharColor = useCallback((name: string) => {
    setCharColorOverrides((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const setCharDisplayAlias = useCallback((original: string, display: string) => {
    const t = display.trim()
    setCharDisplayNames((prev) => {
      const next = { ...prev }
      if (!t) delete next[original]
      else next[original] = t
      return next
    })
  }, [])

  const downloadDocx = useCallback(async () => {
    const hasAnyTitle = insertedTitles.some((t) => t.text.trim())
    if (lines.length === 0 && !hasAnyTitle) return
    setExporting(true)
    try {
      const blocks = backgroundBlocks.map((b) => ({
        start: clamp(Math.min(b.start, b.end), 0, Math.max(0, lines.length - 1)),
        end: clamp(Math.max(b.start, b.end), 0, Math.max(0, lines.length - 1)),
        color: b.color,
      }))

      const titlePayload = insertedTitles
        .filter((t) => t.text.trim())
        .map((t) => ({
          text: t.text.trim(),
          afterIndex: clamp(t.afterIndex, -1, lines.length),
        }))

      const bodyPreset = getFontPresetById(bodyFontId)
      const charColorsOut: Record<string, string> = {}
      for (const name of Object.keys(charColorOverrides)) {
        const v = charColorOverrides[name]?.trim()
        if (v && /^#[0-9A-Fa-f]{6}$/.test(v)) charColorsOut[name] = v
      }
      const { charMap: charMapOut, charColors: charColorsExport } = buildDocxCharMapsForAliases(
        charMap,
        charColorsOut,
        charDisplayNames,
      )
      const linesOut = applyDisplayNamesToLines(lines as ParsedLine[], charDisplayNames)

      // 按需加载 docx 生成模块，避免把库打进首屏主包
      const { buildDocxBlob } = await import('./docxExport')
      const blob = await buildDocxBlob({
        titleStyle: {
          fontSizePt: titleStyle.fontSizePt,
          align: titleStyle.align,
          border: titleStyle.border,
        },
        insertedTitles: titlePayload,
        appearance: {
          bodyFont: bodyPreset.docxName,
          speakerFont: getFontPresetById(speakerFontId).docxName,
          bodyFontSizePt: bodyFontSizePtClamped,
          diceFont: getFontPresetById(diceFontId).docxName,
          diceFontSizePt: diceFontSizePtClamped,
          diceColor: diceColorSafe,
          charColors: charColorsExport,
        },
        lines: linesOut,
        charMap: charMapOut,
        backgroundBlocks: blocks,
        hiddenLineIndices: [...hiddenLineIndices].sort((a, b) => a - b),
        pageLayout: {
          marginTopMm: docxPageLayout.marginTopMm,
          marginBottomMm: docxPageLayout.marginBottomMm,
          marginLeftMm: docxPageLayout.marginLeftMm,
          marginRightMm: docxPageLayout.marginRightMm,
          lineSpacingMultiple: docxPageLayout.lineSpacingMultiple,
        },
        parensSpeechRightAlign,
        speakerBrackets,
      })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      const firstTitle = insertedTitles.find((t) => t.text.trim())?.text.trim()
      const customName = exportFileName.trim().replace(/\.docx$/i, '')
      a.download = (customName || firstTitle || '跑团log') + '.docx'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }, [
    backgroundBlocks,
    bodyFontId,
    bodyFontSizePtClamped,
    charColorOverrides,
    charDisplayNames,
    charMap,
    docxPageLayout,
    diceColorSafe,
    diceFontId,
    diceFontSizePtClamped,
    exportFileName,
    hiddenLineIndices,
    insertedTitles,
    lines,
    parensSpeechRightAlign,
    speakerBrackets,
    speakerFontId,
    titleStyle,
  ])

  const toggleSettingsTool = useCallback((id: SettingsToolId) => {
    setActiveSettingsTool((cur) => (cur === id ? null : id))
  }, [])

  const panelProps = useMemo(
    () => ({
      bracketSpeakers,
      diceExactNames,
      toggleDiceExact,
      diceCustomInput,
      setDiceCustomInput,
      addDiceCustom,
      charDisplayNames,
      setCharDisplayAlias,
      insertedTitles,
      addSectionTitle,
      updateSectionTitle,
      removeSectionTitle,
      titleStyle,
      setTitleStyle,
      bodyFontId,
      setBodyFontId,
      speakerFontId,
      setSpeakerFontId,
      speakerBrackets,
      setSpeakerBrackets,
      bodyFontSizePt,
      setBodyFontSizePt,
      diceFontId,
      setDiceFontId,
      diceFontSizePt,
      setDiceFontSizePt,
      diceColor: diceColorSafe,
      setDiceColor,
      charOrder,
      charMap,
      charColorOverrides,
      setCharColor,
      resetCharColor,
      lineCount,
      backgroundBlocks,
      addBgBlock,
      updateBgBlock,
      removeBgBlock,
      logSlots,
      mainLogId,
      setMainLogId,
      openEditorIds,
      openLogEditor,
      closeLogEditor,
      updateLogSlot,
      removeLogSlot,
      addLogInsertChunk,
      makeChunkFromEditorSelection,
      updateLogInsertChunk,
      removeLogInsertChunk,
      mainRawLineCount,
      mergedRawLog,
      exporting,
      downloadDocx,
      docxPageLayout,
      setDocxPageLayout,
      parensSpeechRightAlign,
      setParensSpeechRightAlign,
      exportFileName,
      setExportFileName,
      fileRef,
      onPickFile,
      loadSample,
    }),
    [
      bracketSpeakers,
      diceExactNames,
      toggleDiceExact,
      diceCustomInput,
      addDiceCustom,
      charDisplayNames,
      setCharDisplayAlias,
      insertedTitles,
      addSectionTitle,
      updateSectionTitle,
      removeSectionTitle,
      titleStyle,
      bodyFontId,
      speakerFontId,
      speakerBrackets,
      bodyFontSizePt,
      setBodyFontSizePt,
      diceFontId,
      diceFontSizePt,
      diceColorSafe,
      charOrder,
      charMap,
      charColorOverrides,
      setCharColor,
      resetCharColor,
      lineCount,
      backgroundBlocks,
      addBgBlock,
      updateBgBlock,
      removeBgBlock,
      logSlots,
      mainLogId,
      openEditorIds,
      openLogEditor,
      closeLogEditor,
      updateLogSlot,
      removeLogSlot,
      addLogInsertChunk,
      makeChunkFromEditorSelection,
      updateLogInsertChunk,
      removeLogInsertChunk,
      mainRawLineCount,
      mergedRawLog,
      exporting,
      downloadDocx,
      docxPageLayout,
      parensSpeechRightAlign,
      exportFileName,
      onPickFile,
      loadSample,
    ],
  )

  return (
    <div className="app-trpg">
      <div className="desk">
        <nav className="settings-dock" aria-label="排版工具（点击图标打开设置，再点一次关闭）">
          <DockIconButton id="file" title="文件" active={activeSettingsTool === 'file'} onClick={() => toggleSettingsTool('file')}>
            <IconFile />
          </DockIconButton>
          <DockIconButton id="dice" title="骰子角色" active={activeSettingsTool === 'dice'} onClick={() => toggleSettingsTool('dice')}>
            <IconDice />
          </DockIconButton>
          <DockIconButton id="titles" title="分段标题" active={activeSettingsTool === 'titles'} onClick={() => toggleSettingsTool('titles')}>
            <IconTitle />
          </DockIconButton>
          <DockIconButton id="fonts" title="字体与颜色" active={activeSettingsTool === 'fonts'} onClick={() => toggleSettingsTool('fonts')}>
            <IconFont />
          </DockIconButton>
          <DockIconButton id="bg" title="背景块" active={activeSettingsTool === 'bg'} onClick={() => toggleSettingsTool('bg')}>
            <IconBg />
          </DockIconButton>
          <DockIconButton id="export" title="导出 Word" active={activeSettingsTool === 'export'} onClick={() => toggleSettingsTool('export')}>
            <IconExport />
          </DockIconButton>
        </nav>

        {activeSettingsTool ? (
          <aside className="settings-panel-card" aria-live="polite">
            <div className="settings-panel-card-header">
              <h2 className="settings-panel-title">{toolLabel(activeSettingsTool)}</h2>
              <button
                type="button"
                className="settings-panel-close btn btn-ghost btn-tiny"
                aria-label="关闭"
                onClick={() => setActiveSettingsTool(null)}
              >
                ✕
              </button>
            </div>
            <div className="settings-panel-card-body">
              <SettingsToolBody tool={activeSettingsTool} p={panelProps} />
            </div>
          </aside>
        ) : null}

        {openEditorIds.map((slotId, i) => {
          const s = logSlots.find((x) => x.id === slotId)
          if (!s) return null
          const isMain = s.id === mainLogId
          return (
            <FloatingPanel
              key={slotId}
              title={`原始 Log · ${s.name}${isMain ? '（主）' : ''}`}
              defaultX={72 + (i % 5) * 26}
              defaultY={24 + Math.floor(i / 5) * 30}
              defaultWidth={440}
              defaultHeight={380}
              zIndex={logEditorZMap[slotId] ?? 100}
              onFocus={() => bumpLogEditor(slotId)}
              onClose={() => closeLogEditor(slotId)}
            >
              {!isMain ? (
                <div className="log-floating-toolbar">
                  <button
                    type="button"
                    className="btn btn-primary btn-tiny"
                    onClick={() => makeChunkFromEditorSelection(slotId)}
                  >
                    将选区制作为插入块
                  </button>
                  <span className="hint log-floating-toolbar-hint">
                    在下方框内拖选文字后点上方；按字符位置截取，与自动换行无关
                  </span>
                </div>
              ) : null}
              <LogEditorWithGutter
                ref={(el) => {
                  logTextareaRefMap.current[slotId] = el
                }}
                value={s.text}
                onChange={(text) => updateLogSlot(slotId, { text })}
                placeholder={LOG_PLACEHOLDER}
              />
            </FloatingPanel>
          )
        })}

        <FloatingPanel
          title={`预览${mergedRawLog.trim() ? ` · ${statsText}` : ''}${logSlots.length > 1 ? ` · ${logSlots.length} 份合并` : ''}`}
          defaultX={520}
          defaultY={24}
          defaultWidth={480}
          defaultHeight={420}
          zIndex={zPreview}
          onFocus={bumpPreviewZ}
        >
          <div className="float-preview-stack">
            <CharTags
              charOrder={charOrder}
              charMap={charMap}
              charColorOverrides={charColorOverrides}
              charDisplayNames={charDisplayNames}
            />
            <div className="float-preview-scroll">
              <Preview
                lines={lines}
                charMap={charMap}
                charColorOverrides={charColorOverrides}
                bodyFontCss={bodyFontCss}
                speakerFontCss={speakerFontCss}
                speakerBrackets={speakerBrackets}
                bodyFontSizePt={bodyFontSizePtClamped}
                diceFontCss={diceFontCss}
                diceFontSizePt={diceFontSizePtClamped}
                diceColor={diceColorSafe}
                titleStyle={titleStyle}
                insertedTitles={insertedTitles}
                backgroundBlocks={backgroundBlocks}
                hiddenLineIndices={hiddenLineIndices}
                onToggleLineHidden={toggleLineHidden}
                charDisplayNames={charDisplayNames}
                parensSpeechRightAlign={parensSpeechRightAlign}
              />
            </div>
          </div>
        </FloatingPanel>
      </div>
    </div>
  )
}
