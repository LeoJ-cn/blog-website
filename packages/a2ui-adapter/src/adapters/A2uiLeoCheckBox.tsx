import { LeoCheckBoxApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoCheckBox } from '@white55/a2ui-ui'

export const A2uiLeoCheckBox = createComponentImplementation(
  LeoCheckBoxApi,
  ({ props }) => (
    <LeoCheckBox
      label={typeof props.label === 'string' ? props.label : undefined}
      checked={props.value === true}
      indeterminate={props.indeterminate === true}
      onChange={(next) => props.setValue?.(next)}
    />
  ),
)
