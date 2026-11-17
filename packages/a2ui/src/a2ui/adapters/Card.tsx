import { CardApi, createComponentImplementation } from '../protocol'
import { Card } from '@white55/a2ui-ui'

export const A2uiCard = createComponentImplementation(
  CardApi,
  ({ props, buildChild }) => <Card>{props.child ? buildChild(props.child) : null}</Card>,
)
