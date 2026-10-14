import type { EventLevel, EventStatus, InspectionEvent } from '../../types/inspection-event'

const STATUS_SCORE: Readonly<Record<EventStatus, number>> = {
  PENDING: 3,
  PROCESSING: 2,
  DONE: 0,
}

const LEVEL_SCORE: Readonly<Record<EventLevel, number>> = {
  HIGH: 5,
  MEDIUM: 3,
  LOW: 1,
}

/** 不同调度等级的演示 SLA 时限，单位为毫秒。 */
const SLA_DURATION_MS: Readonly<Record<EventLevel, number>> = {
  HIGH: 2 * 60 * 60 * 1000,
  MEDIUM: 4 * 60 * 60 * 1000,
  LOW: 8 * 60 * 60 * 1000,
}

/** 高风险阈值；8 分覆盖“待处理 HIGH”或叠加超时后的高风险事件。 */
export const HIGH_RISK_SCORE_THRESHOLD = 8

/** 计算单事件演示风险分；已完成事件不再叠加 SLA 超时分。 */
export function calculateEventRiskScore(event: InspectionEvent, nowTimestamp: number): number {
  if (!Number.isFinite(nowTimestamp)) throw new TypeError('风险评分基准时间必须是有限毫秒时间戳')
  const createdTimestamp = Date.parse(event.createdAt)
  const isOverdue =
    event.status !== 'DONE' &&
    Number.isFinite(createdTimestamp) &&
    nowTimestamp > createdTimestamp + SLA_DURATION_MS[event.level]
  return STATUS_SCORE[event.status] + LEVEL_SCORE[event.level] + (isOverdue ? 4 : 0)
}
