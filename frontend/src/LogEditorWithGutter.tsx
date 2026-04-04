import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'

type LogEditorWithGutterProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export const LogEditorWithGutter = forwardRef<HTMLTextAreaElement, LogEditorWithGutterProps>(
  function LogEditorWithGutter({ value, onChange, placeholder }, ref) {
    const taRef = useRef<HTMLTextAreaElement>(null)
    const gutterRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => taRef.current as HTMLTextAreaElement, [])

    const lineCount = Math.max(1, value.split('\n').length)
    const lines = Array.from({ length: lineCount }, (_, i) => i + 1)

    const syncScroll = useCallback(() => {
      const ta = taRef.current
      const g = gutterRef.current
      if (ta && g) g.scrollTop = ta.scrollTop
    }, [])

    return (
      <div className="log-gutter-root">
        <div
          ref={gutterRef}
          className="log-gutter"
          aria-hidden
          onScroll={() => {
            const ta = taRef.current
            const g = gutterRef.current
            if (ta && g) ta.scrollTop = g.scrollTop
          }}
        >
          {lines.map((n) => (
            <div key={n} className="log-gutter-line" title={`逻辑行 ${n}（仅按换行符计，与自动换行无关）`}>
              {n}
            </div>
          ))}
        </div>
        <div className="log-textarea-shell">
          <textarea
            ref={taRef}
            className="log-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
          />
        </div>
      </div>
    )
  },
)
