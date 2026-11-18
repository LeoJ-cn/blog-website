import { LeoButtonApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoButton } from '@white55/a2ui-ui'

/**
 * 契约与组件库的变体名现在是一一对应的，不需要映射表 ——
 * 这正是把 Button 改成 LeoButton 新增（而非覆盖 basic）换来的自由度。
 */
export const A2uiLeoButton = createComponentImplementation(LeoButtonApi, ({ props, buildChild }) => (
  <LeoButton
    variant={props.variant ?? 'default'}
    size={props.size ?? 'md'}
    onClick={() => void props.action?.()}
  >
    {props.child ? buildChild(props.child) : null}
  </LeoButton>
))
