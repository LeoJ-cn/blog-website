import { LeoOrderCardApi } from '@white55/a2ui-catalog'
import { createComponentImplementation } from '../protocol'
import { LeoButton, LeoCard, LeoText } from '@white55/a2ui-ui'

/**
 * 订单卡片。
 *
 * 用 LeoCard 承载纵向排布，而不是自己写 div + 内联 flex：
 * 适配层只做字段翻译，不承担样式职责；间距与圆角由卡片组件统一决定。
 */
export const A2uiLeoOrderCard = createComponentImplementation(
  LeoOrderCardApi,
  ({ props }) => (
    <LeoCard>
      <LeoText variant="h4">{String(props.orderNo ?? '')}</LeoText>
      <LeoText variant="body">¥{String(props.amount ?? '')}</LeoText>
      <LeoButton variant="primary" onClick={() => void props.onView?.()}>
        <LeoText variant="body">查看</LeoText>
      </LeoButton>
    </LeoCard>
  ),
)
