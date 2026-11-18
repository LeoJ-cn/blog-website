import type { ReactNode } from 'react'
import './LeoButton.css'

/**
 * 按钮视觉变体。
 *
 * dark     —— 近黑实心，页面主行动（截图里的「添加任务」）
 * primary  —— 品牌金实心，次级行动
 * default  —— 白底描边，普通行动（「切换角色」）
 * outline  —— 透明底描边，与 default 同形但更轻，用于密集工具栏
 * borderless —— 无边框文字按钮，用于卡片内的轻量操作
 *
 * 保留 dark 与 primary 两个实心变体是有必要的：一屏里同时出现
 * 「主行动」与「次行动」时，靠颜色深浅区分优先级，比只改描边更清晰。
 */
export const BUTTON_VARIANTS = ['dark', 'primary', 'default', 'outline', 'borderless'] as const
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number]

export interface LeoButtonProps {
  variant?: ButtonVariant
  /** 小尺寸，用于卡片头部等紧凑位置 */
  size?: 'sm' | 'md'
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
}

export function LeoButton({
  variant = 'default',
  size = 'md',
  disabled,
  onClick,
  children,
}: LeoButtonProps) {
  return (
    <button
      type="button"
      className={`leo-btn leo-btn--${variant} leo-btn--${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
