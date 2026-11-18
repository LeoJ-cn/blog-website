import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 按钮变体。
 *
 * 与 basic catalog 的 Button 不同，这里保留组件库的完整表达力：
 *   default    —— 主行动，近黑实心（截图里的「添加任务」）
 *   primary    —— 次行动，品牌金实心
 *   outline    —— 普通行动，透明底描边
 *   borderless —— 轻量操作，纯文字
 *
 * 不用 dark：那只是主题层面的深浅，由 tokens 的 [data-theme] 处理，
 * 不该成为一个需要后端下发的变体值。
 */
export const BUTTON_VARIANTS = ['default', 'primary', 'outline', 'borderless'] as const
export type ButtonVariantName = (typeof BUTTON_VARIANTS)[number]

export const BUTTON_SIZES = ['md', 'sm'] as const

export const LeoButtonApi = {
  name: 'LeoButton',
  schema: z.object({
    variant: z.enum(BUTTON_VARIANTS).default('default').optional(),
    size: z.enum(BUTTON_SIZES).default('md').optional(),
    /** 按钮内容通常是 Text 子组件；没有 child 时渲染空按钮 */
    child: CommonSchemas.ComponentId.optional(),
    action: CommonSchemas.Action.optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
