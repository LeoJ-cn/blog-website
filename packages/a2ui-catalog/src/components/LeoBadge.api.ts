import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 徽标语义色。
 *
 * 与 `a2ui-ui` 的 BADGE_TONES 一一对应；每个值在实现层映射为一组
 * 「浅底 + 深字」，因此后端只能选语义，不能传任意颜色。
 */
export const LEO_BADGE_TONES = [
  'neutral',
  'warning',
  'danger',
  'success',
  'brand',
  'outline',
] as const

export const LeoBadgeApi = {
  name: 'LeoBadge',
  schema: z.object({
    text: CommonSchemas.DynamicString,
    tone: z.enum(LEO_BADGE_TONES).default('neutral').optional(),
    /**
     * 虚线描边。
     *
     * 表示「这不是真实数据」的标记，语义上不同于任何实心 tone，
     * 因此独立成一个开关而不是新增 tone 值。
     */
    dashed: z.boolean().default(false).optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
