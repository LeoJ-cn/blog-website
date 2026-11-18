import { z } from 'zod'
import { CommonSchemas } from '@a2ui/web_core/v0_9'

/**
 * 单条校验规则。
 *
 * condition 的三种形态与 A2UI 一致：
 *   boolean       —— 结论已知，直接下发
 *   { path }      —— 绑定数据模型路径，前端就地求值
 *   函数调用       —— 前端 catalog 里注册的校验函数
 *
 * 三者都在前端执行，不经过网络；需要服务端确认的校验应在函数实现内部发起请求。
 */
const CheckRule = z.object({
  condition: z.union([
    z.boolean(),
    z.object({ path: z.string() }),
    CommonSchemas.FunctionCall,
  ]),
  /** 校验不通过时展示给用户的文案 */
  message: z.string(),
})

export const LEO_TEXT_FIELD_VARIANTS = ['text', 'textarea'] as const

export const LeoTextFieldApi = {
  name: 'LeoTextField',
  schema: z.object({
    label: CommonSchemas.DynamicString.optional(),
    value: CommonSchemas.DynamicString,
    variant: z.enum(LEO_TEXT_FIELD_VARIANTS).default('text').optional(),
    /** 正则校验：不匹配时组件进入非法态 */
    validationRegexp: z.string().optional(),
    /** 校验规则列表，任一条不通过即视为非法 */
    checks: z.array(CheckRule).optional(),
    accessibility: CommonSchemas.AccessibilityAttributes.optional(),
  }),
}
