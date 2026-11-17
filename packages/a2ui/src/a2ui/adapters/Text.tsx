import { TextApi, createComponentImplementation } from '../protocol'
import { Text as UiText, type TextViewVariant } from '@white55/a2ui-ui'

export const A2uiText = createComponentImplementation(
  TextApi,
  ({ props }) => (
    <UiText variant={(props.variant ?? 'body') as TextViewVariant}>
      {props.text}
    </UiText>
  ),
)
