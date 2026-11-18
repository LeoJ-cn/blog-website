import { LeoTextApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoText, type TextViewVariant } from '@white55/a2ui-ui'

export const A2uiLeoText = createComponentImplementation(LeoTextApi, ({ props }) => (
  <LeoText variant={(props.variant ?? 'body') as TextViewVariant}>
    {props.text}
  </LeoText>
))
