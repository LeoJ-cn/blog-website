import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ReactOrder } from '../legacy-react/ReactOrder'
import { ReactLoadVueOrder } from '../migration/ReactLoadVueOrder'
import { eventBus, subscribeMigrationEvent } from '../shared/event-bus'
import { migrationLog } from '../shared/migration-log'
import { createInitialDemoState, reduceDemoState, type DemoImplementation } from './demo-state'
import './ReactMigrationDemo.css'

function DemoWorkspace() {
  const params = useParams<{ orderId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reduceDemoState, undefined, createInitialDemoState)
  const [readonly, setReadonly] = useState(false)
  const [reactEventMessage, setReactEventMessage] = useState('尚未收到 Vue EventBus 消息')
  const previousOrderIdRef = useRef<string | null>(null)
  const logs = useSyncExternalStore(migrationLog.subscribe, migrationLog.getSnapshot)

  useEffect(() => {
    dispatch({ type: 'route-changed', path: location.pathname })
    const previousOrderId = previousOrderIdRef.current
    if (previousOrderId && previousOrderId !== params.orderId) {
      migrationLog.append({
        source: 'React',
        message: `route changed ${previousOrderId} → ${params.orderId ?? 'unknown'}`,
      })
    } else {
      migrationLog.append({
        source: 'React',
        message: `render order ${params.orderId ?? 'unknown'}`,
      })
    }
    previousOrderIdRef.current = params.orderId ?? null
  }, [location.pathname, params.orderId])

  useEffect(
    () =>
      subscribeMigrationEvent('vue:message', (message) => {
        setReactEventMessage(message.message)
        migrationLog.append({
          source: 'React',
          message: `received Vue EventBus: ${message.message}`,
        })
      }),
    [],
  )

  const selectImplementation = useCallback((implementation: DemoImplementation) => {
    dispatch({ type: 'implementation-selected', value: implementation })
    migrationLog.append({ source: 'React', message: `feature flag → ${implementation}` })
  }, [])

  const handleSuccess = useCallback((payload: { message: string }) => {
    dispatch({ type: 'success-received', message: payload.message })
    migrationLog.append({ source: 'React', message: `received success: ${payload.message}` })
  }, [])

  const handleClose = useCallback(() => {
    dispatch({ type: 'close-received' })
    migrationLog.append({ source: 'React', message: 'received close' })
  }, [])

  const sendReactEventBusMessage = useCallback(() => {
    const message = `React EventBus - order ${state.orderId}`
    migrationLog.append({ source: 'React', message: `EventBus emit: ${message}` })
    eventBus.emit('react:message', { orderId: state.orderId, message })
  }, [state.orderId])

  return (
    <section className="react-vue-migration-demo">
      <header className="react-vue-migration-demo__header">
        <p className="react-vue-migration-demo__eyebrow">FRAMEWORK MIGRATION LAB</p>
        <h2>React → Vue 渐进迁移</h2>
        <p>外层 Vue Blog 仅负责展示；下方真实运行 React Shell，并由 React 加载 Vue 订单模块。</p>
      </header>

      <div className="react-vue-migration-demo__toolbar">
        <fieldset>
          <legend>Implementation</legend>
          <button
            type="button"
            aria-pressed={state.implementation === 'react'}
            onClick={() => selectImplementation('react')}
          >
            React Legacy
          </button>
          <button
            type="button"
            aria-pressed={state.implementation === 'vue'}
            onClick={() => selectImplementation('vue')}
          >
            Vue Migrated
          </button>
        </fieldset>

        <fieldset>
          <legend>React Router Route</legend>
          <button type="button" aria-pressed={state.orderId === '10001'} onClick={() => navigate('/orders/10001')}>
            10001
          </button>
          <button type="button" aria-pressed={state.orderId === '10002'} onClick={() => navigate('/orders/10002')}>
            10002
          </button>
        </fieldset>

        <label className="react-vue-migration-demo__readonly">
          <input type="checkbox" checked={readonly} onChange={(event) => setReadonly(event.target.checked)} />
          readonly
        </label>
      </div>

      {state.routeError ? <p role="alert">{state.routeError}</p> : null}

      <div className="react-vue-migration-demo__workspace">
        <section className="react-vue-migration-demo__business" aria-label="Business Component">
          <div className="react-vue-migration-demo__section-heading">
            <div>
              <span>Business Component</span>
              <strong>{state.implementation === 'vue' ? 'Vue Module' : 'React Legacy'}</strong>
            </div>
            <button type="button" onClick={sendReactEventBusMessage}>React EventBus emit</button>
          </div>

          {state.implementation === 'vue' ? (
            <ReactLoadVueOrder
              orderId={state.orderId}
              readonly={readonly}
              onSuccess={handleSuccess}
              onClose={handleClose}
            />
          ) : (
            <ReactOrder orderId={state.orderId} readonly={readonly} />
          )}

          <div className="react-vue-migration-demo__received">
            <p><strong>React received:</strong> {state.receivedMessage}</p>
            <p><strong>EventBus received:</strong> {reactEventMessage}</p>
          </div>
        </section>

        <aside className="react-vue-migration-demo__log" aria-label="Migration Log">
          <div className="react-vue-migration-demo__section-heading">
            <div>
              <span>Migration Log</span>
              <strong>{logs.length} events</strong>
            </div>
            <button type="button" onClick={migrationLog.clear}>清空</button>
          </div>
          <ol>
            {logs.map((entry) => (
              <li key={entry.id}>
                <span>[{entry.source}]</span> {entry.message}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  )
}

export function ReactMigrationDemo() {
  return (
    <MemoryRouter initialEntries={['/orders/10001']}>
      <Routes>
        <Route path="/orders/:orderId" element={<DemoWorkspace />} />
        <Route path="*" element={<Navigate to="/orders/10001" replace />} />
      </Routes>
    </MemoryRouter>
  )
}
