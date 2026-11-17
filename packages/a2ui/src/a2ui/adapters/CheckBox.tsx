import { CheckBoxApi, createComponentImplementation } from '../protocol'
import { CheckBox } from '@white55/a2ui-ui'

export const A2uiCheckBox = createComponentImplementation(
  CheckBoxApi,
  ({ props }) => (
    <CheckBox
      label={typeof props.label === 'string' ? props.label : undefined}
      checked={props.value === true}
      onChange={(next) => props.setValue?.(next)}
    />
  ),
)
