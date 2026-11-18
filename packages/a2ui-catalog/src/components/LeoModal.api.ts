import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 弹窗。
 *
 * 与 basic catalog 的 Modal 的关键差别：去掉 trigger。
 *
 * basic 的 trigger 指向「点击后打开弹窗的组件 id」，但渲染器的 buildChild 只能按 id
 * 解析子树、无法给子节点注入 onClick，这个字段在实际渲染中无法实现。
 * 与其留一个名义上支持、实则降级的字段，不如让弹窗自己带一个触发按钮：
 * 后端给 label 与 content，适配层负责渲染入口。
 */
export const LeoModalApi = {
  name: 'LeoModal',
  schema: z.object({
    /** 触发按钮上的文字 */
    label: CommonSchemas.DynamicString.default('打开').optional(),
    /** 弹窗标题 */
    title: CommonSchemas.DynamicString.default('详情').optional(),
    /** 弹窗正文的组件 id */
    content: CommonSchemas.ComponentId,
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
