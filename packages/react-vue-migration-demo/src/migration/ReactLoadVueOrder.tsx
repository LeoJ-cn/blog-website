import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const platform = useMemo(() => createReactMigrationPlatform(navigate), [navigate])

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

  return <div ref={containerRef} className="react-vue-migration-demo__vue-host" />
}
