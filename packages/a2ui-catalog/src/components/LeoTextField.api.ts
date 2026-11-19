import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

export const LEO_TEXT_FIELD_VARIANTS = ['text', 'textarea'] as const

export const LeoTextFieldApi = {
  name: 'LeoTextField',
  schema: z.object({
    label: CommonSchemas.DynamicString.optional(),
    value: CommonSchemas.DynamicString,
    variant: z.enum(LEO_TEXT_FIELD_VARIANTS).default('text').optional(),
    /** 正则校验：不匹配时组件进入非法态。不在 Checkable 机制内，由适配层自行求值 */
    validationRegexp: z.string().optional(),
    /**
     * 校验规则列表，任一条 error 即视为非法。
     *
     * 复用官方 CheckRule：它带 REF 标注，binder 才会走 Checkable 分支，
     * 把结果汇总成 isValid / validationErrors / validationResults 三个派生 prop。
     * 自建 schema 即使字段同名也会被判为 STATIC，拿不到结构化结果与 severity。
     */
    checks: z.array(CommonSchemas.CheckRule).optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
