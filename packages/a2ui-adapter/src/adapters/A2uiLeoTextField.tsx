import { LeoTextFieldApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoTextField } from '@white55/a2ui-ui'

/**
 * 校验失败与否由两套机制决定，任一不通过即为非法：
 *   validationRegexp —— 正则不匹配
 *   checks           —— 任一条 condition 为 false
 *
 * 注意 condition 已经在 web_core 里解析过：绑定路径的会解成布尔值，
 * 所以这里只需要处理布尔结果，不必再关心它原本是 path 还是字面量。
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

    const checkFailed = (props.checks ?? []).some((c) => c.condition === false)

    return (
      <LeoTextField
        label={typeof props.label === 'string' ? props.label : undefined}
        value={raw}
        invalid={regexFailed || checkFailed}
        onChange={(next) => props.setValue?.(next)}
      />
    )
  },
)
