import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 卡片描边语义。
 *
 * default  —— 常规卡片，浅描边
 * warning  —— 需要留意，如「有风险」的任务卡
 * danger   —— 强提示，如违规项
 * brand    —— 高亮，用于当前关注项
 */
export const CARD_TONES = ['default', 'warning', 'danger', 'brand'] as const

export const LeoCardApi = {
  name: 'LeoCard',
  schema: z.object({
    child: CommonSchemas.ComponentId.optional(),
    tone: z.enum(CARD_TONES).default('default').optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
