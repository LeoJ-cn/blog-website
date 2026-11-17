import { CardApi, createComponentImplementation } from '../protocol'
import { LeoCard } from '@white55/a2ui-ui'

export const A2uiCard = createComponentImplementation(
  CardApi,
  ({ props, buildChild }) => <LeoCard>{props.child ? buildChild(props.child) : null}</LeoCard>,
)
