import { OrderCardApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoButton, LeoText } from '@white55/a2ui-ui'

export const A2uiOrderCard = createComponentImplementation(
  OrderCardApi,
  ({ props }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <LeoText variant="h4">{String(props.orderNo ?? '')}</LeoText>
      <LeoText variant="body">¥{String(props.amount ?? '')}</LeoText>
      <LeoButton variant="primary" onClick={() => void props.onView?.()}>
        <LeoText variant="body">查看-A2uiOrderCard</LeoText>
      </LeoButton>
    </div>
  ),
)
