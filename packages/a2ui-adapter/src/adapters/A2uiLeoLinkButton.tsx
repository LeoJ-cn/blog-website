import { LeoLinkButtonApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoLinkButton } from '@white55/a2ui-ui'

/**
 * 文字链接按钮适配器。
 *
 * action 在组件实现里已是可调用函数，这里直接转成 onClick；
 * 与 LeoButton 保持同一种回传方式，后端看到的 payload 结构一致。
 */
export const A2uiLeoLinkButton = createComponentImplementation(
  LeoLinkButtonApi,
  ({ props }) => (
    <LeoLinkButton
      arrow={props.arrow === true}
      disabled={props.disabled === true}
      onClick={() => void props.action?.()}
    >
      {typeof props.text === 'string' ? props.text : String(props.text ?? '')}
    </LeoLinkButton>
  ),
)
