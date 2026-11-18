import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * 悬浮式 AI 聊天窗。
 *
 * 收起与展开两种形态都从左上角浮出，且都能拖拽：
 *   收起 —— 一个小胶囊按钮，拖动它改变锚点，点击（未拖动的短按）才展开
 *   展开 —— 标题栏是拖拽把手，面板跟着锚点走
 *
 * 位置用 left/top 一组坐标存储，两种形态共用同一个锚点，
 * 所以收起后再展开，窗口还停在上次拖到的地方。
 */
const DEFAULT_POS = { x: 16, y: 16 }

/** 拖拽后至少要露出的像素，避免窗口被拖到只剩一条边还点不到 */
const MIN_VISIBLE = 48

/** 位移小于这个阈值视为点击而非拖拽，否则轻微抖动会让按钮点不开 */
const DRAG_THRESHOLD = 4

export function ChatDock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(DEFAULT_POS)
  const [dragging, setDragging] = useState(false)

  const anchorRef = useRef<HTMLElement | null>(null)
  /** 本次按下到抬起的累计位移，用来区分「点击」与「拖拽」 */
  const moved = useRef(false)
  const origin = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 })

  const clamp = useCallback((x: number, y: number, el: HTMLElement | null) => {
    const width = el?.offsetWidth ?? 160
    const height = el?.offsetHeight ?? 40
    return {
      // 左/上允许拖出屏幕，但要留 MIN_VISIBLE 露在外面
      x: Math.min(window.innerWidth - MIN_VISIBLE, Math.max(-(width - MIN_VISIBLE), x)),
      y: Math.min(window.innerHeight - MIN_VISIBLE, Math.max(-(height - MIN_VISIBLE), y)),
    }
  }, [])

  const beginDrag = (e: React.PointerEvent<HTMLElement>) => {
    // 关闭按钮不参与拖拽，否则点关闭会先触发一次位移
    if ((e.target as HTMLElement).closest('.dock__close')) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // 指针已在别处释放（或合成事件无真实指针）时忽略，
      // 拖拽仍靠 pointermove 事件继续工作，只是失去边界外的持续捕获
    }
    origin.current = { pointerX: e.clientX, pointerY: e.clientY, x: pos.x, y: pos.y }
    moved.current = false
    setDragging(true)
  }

  const onDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragging) return
    const dx = e.clientX - origin.current.pointerX
    const dy = e.clientY - origin.current.pointerY
    if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    moved.current = true
    setPos(clamp(origin.current.x + dx, origin.current.y + dy, anchorRef.current))
  }

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragging) return
    setDragging(false)
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // 捕获已不存在时释放会抛错，忽略即可
    }
  }

  // 撤销时把指针捕获释放掉，否则下次按下会直接进入拖拽态
  useEffect(() => {
    if (!dragging) return
    const reset = () => setDragging(false)
    window.addEventListener('pointercancel', reset)
    return () => window.removeEventListener('pointercancel', reset)
  }, [dragging])

  // 视口尺寸变化后原坐标可能越界，重新钳一次
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y, anchorRef.current))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [clamp])

  const style = { left: pos.x, top: pos.y }
  // 拖拽中禁用过渡，否则位置会「追不上」指针
  const dragClass = dragging ? ' dock--dragging' : ''

  if (!open) {
    return (
      <button
        ref={(el) => {
          anchorRef.current = el
        }}
        type="button"
        className={`dock__launcher${dragClass}`}
        style={style}
        onPointerDown={beginDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onClick={() => {
          // 拖拽结束时浏览器仍会派发 click，靠 moved 标记挡掉
          if (!moved.current) setOpen(true)
          moved.current = false
        }}
        aria-label="打开 AI 对话"
      >
        <span aria-hidden="true">✦</span> AI 对话
      </button>
    )
  }

  return (
    <section
      ref={(el) => {
        anchorRef.current = el
      }}
      className={`dock${dragClass}`}
      style={style}
      aria-label={title}
    >
      <header
        className="dock__header"
        onPointerDown={beginDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="dock__title">{title}</span>
        <button
          type="button"
          className="dock__close"
          onClick={() => setOpen(false)}
          aria-label="关闭 AI 对话"
        >
          ×
        </button>
      </header>
      <div className="dock__body">{children}</div>
    </section>
  )
}
