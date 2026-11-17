import { TextFieldApi, createComponentImplementation } from '../protocol'
import { TextField } from '@white55/a2ui-ui'

export const A2uiTextField = createComponentImplementation(
  TextFieldApi,
  ({ props }) => (
    <TextField
      label={typeof props.label === 'string' ? props.label : undefined}
      value={typeof props.value === 'string' ? props.value : ''}
      invalid={props.isValid === false}
      onChange={(next) => props.setValue?.(next)}
    />
  ),
)
