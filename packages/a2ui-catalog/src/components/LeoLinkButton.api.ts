import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 文字链接式按钮。
 *
 * 与 LeoButton 的 borderless 变体语义不同：这里表达「跳转 / 打开」，
 * 而非「在当前页执行动作」。因此箭头是关键视觉信号——
 * 带箭头表示会离开当前上下文，后端必须与同屏其它链接按钮保持一致。
 */
export const LeoLinkButtonApi = {
  name: 'LeoLinkButton',
  schema: z.object({
    text: CommonSchemas.DynamicString,
    action: CommonSchemas.Action.optional(),
    /** 是否显示尾部箭头，语义见组件说明 */
    arrow: z.boolean().default(false).optional(),
    disabled: z.boolean().default(false).optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
