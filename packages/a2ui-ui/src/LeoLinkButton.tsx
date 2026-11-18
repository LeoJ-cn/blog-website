import type { ReactNode } from 'react'
import './LeoLinkButton.css'

export interface LeoLinkButtonProps {
  children: ReactNode
  onClick?: () => void
  /**
   * 是否显示尾部箭头。
   *
   * 截图里「打开工作 →」「打开 MES」带箭头，而「查看数据」不带；
   * 箭头表示「会离开当前上下文」，同一屏里必须一致，否则会误导点击预期。
   */
  arrow?: boolean
  disabled?: boolean
}

/**
 * 文字链接式按钮。
 *
 * 与 LeoButton 的 borderless 变体的区别：这里语义是「跳转/打开」而非「执行动作」，
 * 用金色文字 + 可选箭头表达，且不占按钮盒模型，便于嵌在卡片角落。
 */
export function LeoLinkButton({
  children,
  onClick,
  arrow = false,
  disabled,
}: LeoLinkButtonProps) {
  return (
    <button
      type="button"
      className="leo-link-btn"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {arrow ? (
        <span className="leo-link-btn__arrow" aria-hidden="true">
          →
        </span>
      ) : null}
    </button>
  )
}
