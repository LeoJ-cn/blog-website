import { ButtonApi, createComponentImplementation } from '../protocol'
import { LeoButton } from '@white55/a2ui-ui'

export const A2uiButton = createComponentImplementation(
  ButtonApi,
  ({ props, buildChild }) => (
    <LeoButton
      variant={props.variant}
      disabled={props.isValid === false}
      onClick={() => void props.action()}
    >
      {props.child ? buildChild(props.child) : null}
    </LeoButton>
  ),
)
