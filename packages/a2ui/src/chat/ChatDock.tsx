import { type ReactNode } from 'react'

/**
 * 内容区右侧的 AI 对话面板。
 *
 * 两种形态：
 *   展开 —— 作为一个常驻列排在内容区右侧，与内容区同高，不遮挡内容
 *   收起 —— 掉出文档流，改成一个固定在视口右侧的展开按钮
 *
 * 之所以不做悬浮可拖拽窗口：对话面板需要和内容区并排阅读，
 * 悬浮窗会盖住正在生成的界面，尤其在全屏或窄屏下更明显。
 */
export function ChatDock({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  if (!open) {
    return (
      <button
        type="button"
        className="dock__launcher"
        onClick={() => onOpenChange(true)}
        aria-label={`打开${title}`}
      >
        <span aria-hidden="true">✦</span>
        {title}
      </button>
    )
  }

  return (
    <section className="dock" aria-label={title}>
      <header className="dock__header">
        <span className="dock__title">{title}</span>
        <button
          type="button"
          className="dock__close"
          onClick={() => onOpenChange(false)}
          aria-label={`关闭${title}`}
        >
          ×
        </button>
      </header>
      <div className="dock__body">{children}</div>
    </section>
  )
}
