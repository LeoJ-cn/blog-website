import { LeoTextFieldApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoTextField } from '@white55/a2ui-ui'

/**
 * 校验状态有两个来源，任一不通过即为非法：
 *
 *   checks           —— 由 binder 的 Checkable 机制求值，结果已汇总到
 *                       isValid / validationErrors / validationResults；
 *                       这里只消费，不重新遍历规则，否则会丢掉 severity 与结构化 message
 *   validationRegexp —— 不在 Checkable 机制内（web_core 未处理该字段），
 *                       由适配层自行用 RegExp 求值
 */
export const A2uiLeoTextField = createComponentImplementation(
  LeoTextFieldApi,
  ({ props }) => {
    const raw = typeof props.value === 'string' ? props.value : ''

    const regexFailed =
      typeof props.validationRegexp === 'string' &&
      props.validationRegexp.length > 0 &&
      (() => {
        try {
          return !new RegExp(props.validationRegexp as string).test(raw)
        } catch {
          // 非法正则是消息本身的问题，不该让整个输入框变红
          return false
        }
      })()

    // validationErrors 只含 severity 为 error 的条目；warning/info 留在 validationResults 里
    const checkErrors = props.validationErrors ?? []
    const checksFailed = props.isValid === false

    // 正则与 checks 可能同时失败；优先展示 checks 的文案，它更贴近业务规则
    const errorText = checkErrors[0] ?? (regexFailed ? '格式不正确' : undefined)

    return (
      <LeoTextField
        label={typeof props.label === 'string' ? props.label : undefined}
        value={raw}
        variant={props.variant}
        invalid={checksFailed || regexFailed}
        errorText={errorText}
        onChange={(next) => props.setValue?.(next)}
      />
    )
  },
)
