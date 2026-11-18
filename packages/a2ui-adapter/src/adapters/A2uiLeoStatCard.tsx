import { LeoStatCardApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoStatCard } from '@white55/a2ui-ui'

/**
 * 指标卡适配器。
 *
 * value 与 caption 在契约里已经是字符串，绑定值由 web_core 解析后传入，
 * 这里不再做数值格式化——千分位与单位由后端决定。
 */
export const A2uiLeoStatCard = createComponentImplementation(LeoStatCardApi, ({ props }) => (
  <LeoStatCard
    label={typeof props.label === 'string' ? props.label : String(props.label ?? '')}
    value={typeof props.value === 'string' ? props.value : String(props.value ?? '')}
    caption={
      props.caption === undefined
        ? undefined
        : typeof props.caption === 'string'
          ? props.caption
          : String(props.caption)
    }
    highlight={props.highlight === true}
  />
))
