import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 文本变体。
 *
 * 与 basic catalog 的 Text 保持同名，但多出 markdown 能力；
 * 这样后端从 basic 迁过来时只需换组件名，字段不用改。
 */
export const TEXT_VARIANTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'body', 'caption'] as const
export type TextVariantName = (typeof TEXT_VARIANTS)[number]

export const LeoTextApi = {
  name: 'LeoText',
  schema: z.object({
    text: CommonSchemas.DynamicString,
    variant: z.enum(TEXT_VARIANTS).default('body').optional(),
    /**
     * 是否按 Markdown 渲染。
     *
     * 默认关闭：正文里出现星号、下划线是常见的（如「A * B」），
     * 一律当 Markdown 会误渲染。需要富文本时由后端显式打开。
     */
    markdown: z.boolean().default(false).optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
