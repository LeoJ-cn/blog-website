import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, type NavigateFunction, type NavigateOptions, type To } from 'react-router-dom'
import { mountVueOrder } from '../migrated-vue/order/bootstrap'
import type {
  OrderModuleEvents,
  OrderModuleProps,
  OrderSuccessPayload,
} from '../migrated-vue/order/contract'
import { migrationLog } from '../shared/migration-log'
import { createBridgeLifecycle } from './bridge-lifecycle'
import { createReactMigrationPlatform } from './react-platform'

export interface ReactLoadVueOrderProps extends OrderModuleProps {
  onSuccess(payload: OrderSuccessPayload): void
  onClose(): void
}

export function ReactLoadVueOrder({
  orderId,
  readonly,
  onSuccess,
  onClose,
}: ReactLoadVueOrderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const successRef = useRef(onSuccess)
  const closeRef = useRef(onClose)
  const lifecycleRef = useRef<ReturnType<typeof createBridgeLifecycle> | null>(null)
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  // MemoryRouter 会在 location 变化时更换 navigate 引用；稳定代理可确保路由更新只走
  // bootstrap.update，而不会触发负责 mount/unmount 的 effect 重建 Vue App。
  const platform = useMemo(() => {
    const stableNavigate = ((to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigateRef.current(to)
        return
      }
      navigateRef.current(to, options)
    }) as NavigateFunction

    return createReactMigrationPlatform(stableNavigate)
  }, [])

  successRef.current = onSuccess
  closeRef.current = onClose
  if (!lifecycleRef.current) {
    lifecycleRef.current = createBridgeLifecycle(mountVueOrder)
  }

  useEffect(() => {
    const container = containerRef.current
    const lifecycle = lifecycleRef.current
    if (!container || !lifecycle) return

    const events: OrderModuleEvents = {
      success(payload) {
        migrationLog.append({ source: 'Bridge', message: 'forward success' })
        successRef.current(payload)
      },
      close() {
        migrationLog.append({ source: 'Bridge', message: 'forward close' })
        closeRef.current()
      },
    }

    lifecycle.attach({
      container,
      props: { orderId, readonly },
      platform,
      events,
    })

    return () => {
      lifecycle.detach()
    }
  }, [platform])

  useEffect(() => {
    lifecycleRef.current?.update({ orderId, readonly })
  }, [orderId, readonly])

  return (
    <div className="react-vue-migration-demo__bridge-slot">
      <div className="react-vue-migration-demo__bridge-lane" aria-label="临时迁移桥接链路">
        <span>临时迁移桥接</span>
        <code>ReactLoadVueOrder.tsx → bootstrap.mount / update / unmount</code>
      </div>
      <div ref={containerRef} className="react-vue-migration-demo__vue-host" />
    </div>
  )
}
