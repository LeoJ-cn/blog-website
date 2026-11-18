import { LeoBadgeApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoBadge } from '@white55/a2ui-ui'

/**
 * 徽标适配器。
 *
 * 实现层的 LeoBadge 接收 children，而协议里统一用 text 字段表达内容，
 * 因此这里做一次 text → children 的转换。
 */
export const A2uiLeoBadge = createComponentImplementation(LeoBadgeApi, ({ props }) => (
  <LeoBadge
    tone={props.tone ?? 'neutral'}
    dashed={props.dashed === true}
  >
    {typeof props.text === 'string' ? props.text : String(props.text ?? '')}
  </LeoBadge>
))
