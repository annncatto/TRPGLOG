/** 预览用 CSS font-family 与 Word 导出用中文字体名 */
export type FontPreset = {
  id: string
  label: string
  /** 传给 style.fontFamily */
  cssStack: string
  /** python-docx  eastAsia 字体名 */
  docxName: string
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'simsun', label: '宋体', cssStack: '"SimSun", "Noto Serif SC", "Songti SC", serif', docxName: '宋体' },
  { id: 'simhei', label: '黑体', cssStack: '"SimHei", "Heiti SC", "STHeiti", "Microsoft YaHei", sans-serif', docxName: '黑体' },
  { id: 'yahei', label: '微软雅黑', cssStack: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif', docxName: '微软雅黑' },
  { id: 'kaiti', label: '楷体', cssStack: '"KaiTi", "STKaiti", "Kaiti SC", serif', docxName: '楷体' },
  { id: 'fangsong', label: '仿宋', cssStack: '"FangSong", "STFangSong", "FangSong SC", serif', docxName: '仿宋' },
  { id: 'noto-sans', label: 'Noto Sans SC', cssStack: '"Noto Sans SC", "PingFang SC", sans-serif', docxName: 'Noto Sans SC' },
]

export const DEFAULT_BODY_FONT_ID = 'simsun'

export const SPEAKER_FONT_PRESET: FontPreset = {
  id: 'simhei',
  label: '黑体',
  cssStack: '"SimHei", "Heiti SC", "STHeiti", "Microsoft YaHei", sans-serif',
  docxName: '黑体',
}

export function getFontPresetById(id: string): FontPreset {
  return FONT_PRESETS.find((p) => p.id === id) ?? FONT_PRESETS[0]
}
