import { formatOrderId } from '../shared/utils'

export interface ReactOrderProps {
  orderId: string
  readonly: boolean
}

export function ReactOrder({ orderId, readonly }: ReactOrderProps) {
  return (
    <article className="react-vue-migration-demo__legacy-order">
      <p className="react-vue-migration-demo__eyebrow">Legacy React Implementation</p>
      <h3>React Order {formatOrderId(orderId)}</h3>
      <dl>
        <div>
          <dt>orderId</dt>
          <dd>{orderId}</dd>
        </div>
        <div>
          <dt>readonly</dt>
          <dd>{String(readonly)}</dd>
        </div>
      </dl>
      <p>该组件代表迁移前仍可通过 Feature Flag 回滚的 React 实现。</p>
    </article>
  )
}
