import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

export const LeoStatCardApi = {
  name: 'LeoStatCard',
  schema: z.object({
    /** 指标名，如「08:00 前产出」 */
    label: CommonSchemas.DynamicString,
    /**
     * 主数值。
     *
     * 用字符串而不是数字：千分位、百分号、单位各不相同，
     * 交由后端格式化后下发，前端不做数值解释。
     */
    value: CommonSchemas.DynamicString,
    /** 数值下方的补充说明，如「计划 19,680」；不是数值，因此同属展示文本 */
    caption: CommonSchemas.DynamicString.optional(),
    /**
     * 高亮描边。
     *
     * 表示「当前关注项」，是视觉强调而非语义状态，
     * 所以用布尔而非 tone 枚举。
     */
    highlight: z.boolean().default(false).optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
