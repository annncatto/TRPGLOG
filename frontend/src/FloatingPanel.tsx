import { useCallback, useEffect, useRef, useState } from 'react'

type FloatingPanelProps = {
  title: string
  defaultX: number
  defaultY: number
  defaultWidth: number
  defaultHeight: number
  zIndex: number
  onFocus: () => void
  /** 传入时在标题栏显示关闭，点击后从界面移除面板（由父组件处理） */
  onClose?: () => void
  children: React.ReactNode
  className?: string
}

export function FloatingPanel({
  title,
  defaultX,
  defaultY,
  defaultWidth,
  defaultHeight,
  zIndex,
  onFocus,
  onClose,
  children,
  className = '',
}: FloatingPanelProps) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY })
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight })
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      onFocus()
      drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    },
    [onFocus, pos.x, pos.y],
  )

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!drag.current) return
      const nx = e.clientX - drag.current.dx
      const ny = e.clientY - drag.current.dy
      const maxX = Math.max(0, window.innerWidth - 80)
      const maxY = Math.max(0, window.innerHeight - 48)
      setPos({
        x: Math.min(maxX, Math.max(0, nx)),
        y: Math.min(maxY, Math.max(0, ny)),
      })
    }
    const up = () => {
      drag.current = null
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  return (
    <div
      className={`floating-panel ${className}`.trim()}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        zIndex,
      }}
      onMouseDown={onFocus}
    >
      <div className="floating-panel-header" onMouseDown={onHeaderMouseDown}>
        <span className="floating-panel-title">{title}</span>
        <span className="floating-panel-header-right">
          <span className="floating-panel-drag-hint" aria-hidden>
            拖动
          </span>
          {onClose ? (
            <button
              type="button"
              className="floating-panel-close"
              aria-label="关闭窗口"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✕
            </button>
          ) : null}
        </span>
      </div>
      <div className="floating-panel-body">{children}</div>
      <div
        className="floating-panel-resize"
        role="presentation"
        onMouseDown={(e) => {
          e.preventDefault()
          onFocus()
          const startX = e.clientX
          const startY = e.clientY
          const startW = size.w
          const startH = size.h
          const onMove = (ev: MouseEvent) => {
            setSize({
              w: Math.max(280, Math.min(window.innerWidth - pos.x - 8, startW + ev.clientX - startX)),
              h: Math.max(160, Math.min(window.innerHeight - pos.y - 8, startH + ev.clientY - startY)),
            })
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
      />
    </div>
  )
}
