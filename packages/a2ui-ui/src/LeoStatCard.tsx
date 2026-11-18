import type { ReactNode } from 'react'
import './LeoStatCard.css'

export interface LeoStatCardProps {
  /** 指标名，如「08:00 前产出」 */
  label: string
  /** 主数值。用字符串而不是 number：千分位、百分号、单位的格式差异太大，交给调用方 */
  value: string
  /** 数值下方的补充说明，如「计划 19,680」「目标 85%」 */
  caption?: ReactNode
  /**
   * 高亮描边。
   *
   * 截图里「机加工 OEE」用金色边框标出，表示这是当前关注项；
   * 它是视觉强调而非语义状态，因此不用 tone 枚举。
   */
  highlight?: boolean
}

/**
 * 单个 KPI 指标卡。
 *
 * 数值用等宽数字（font-variant-numeric: tabular-nums），
 * 让同一行里多张卡的位数对齐，扫读时不需要重新找小数点。
 */
export function LeoStatCard({ label, value, caption, highlight = false }: LeoStatCardProps) {
  return (
    <div className={`leo-stat-card${highlight ? ' leo-stat-card--highlight' : ''}`}>
      <span className="leo-stat-card__label">{label}</span>
      <span className="leo-stat-card__value">{value}</span>
      {caption ? <span className="leo-stat-card__caption">{caption}</span> : null}
    </div>
  )
}
