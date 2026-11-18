import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 标签页外观。
 *
 * line —— 下划线式，与 basic catalog 的 Tabs 视觉一致
 * pill —— 药丸式，截图里「今天 / 绩效 / 重点」那种
 *
 * 截图里两种都有，所以这必须是可配置项而不是固定样式。
 */
export const TABS_VARIANTS = ['line', 'pill'] as const

export const LeoTabsApi = {
  name: 'LeoTabs',
  schema: z.object({
    variant: z.enum(TABS_VARIANTS).default('line').optional(),
    tabs: z
      .array(
        z.object({
          title: CommonSchemas.DynamicString,
          /** 面板内容的组件 id，由适配层 buildChild 解析 */
          child: CommonSchemas.ComponentId,
        }),
      )
      .min(1),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
