import { OrderCardApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { Button, Text } from '@white55/a2ui-ui'

export const A2uiOrderCard = createComponentImplementation(
  OrderCardApi,
  ({ props }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text variant="h4">{String(props.orderNo ?? '')}</Text>
      <Text variant="body">¥{String(props.amount ?? '')}</Text>
      <Button variant="primary" onClick={() => void props.onView?.()}>
        <Text variant="body">查看</Text>
      </Button>
    </div>
  ),
)
