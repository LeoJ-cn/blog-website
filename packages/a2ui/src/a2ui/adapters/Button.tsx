import { ButtonApi, createComponentImplementation } from '../protocol'
import { Button } from '@white55/a2ui-ui'

export const A2uiButton = createComponentImplementation(
  ButtonApi,
  ({ props, buildChild }) => (
    <Button
      variant={props.variant}
      disabled={props.isValid === false}
      onClick={() => void props.action()}
    >
      {props.child ? buildChild(props.child) : null}
    </Button>
  ),
)
