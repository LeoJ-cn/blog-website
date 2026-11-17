import { TextApi, createComponentImplementation } from '../protocol'
import { LeoText, type TextViewVariant } from '@white55/a2ui-ui'

export const A2uiText = createComponentImplementation(
  TextApi,
  ({ props }) => (
    <LeoText variant={(props.variant ?? 'body') as TextViewVariant}>
      {props.text}
    </LeoText>
  ),
)
