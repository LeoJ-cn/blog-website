import { LeoCardApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoCard } from '@white55/a2ui-ui'

export const A2uiLeoCard = createComponentImplementation(LeoCardApi, ({ props, buildChild }) => (
  <LeoCard borderColor={props.tone === 'default' ? undefined : props.tone}>
    {props.child ? buildChild(props.child) : null}
  </LeoCard>
))
