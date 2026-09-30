import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react'
import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { ReactOrder } from '../legacy-react/ReactOrder'
import { ReactLoadVueOrder } from '../migration/ReactLoadVueOrder'
import { eventBus, subscribeMigrationEvent } from '../shared/event-bus'
import { migrationLog } from '../shared/migration-log'
import { createInitialDemoState, reduceDemoState, type DemoImplementation } from './demo-state'
import './ReactMigrationDemo.css'

// 仅在展示层中文化日志，底层结构化消息保持稳定，避免界面文案影响跨框架协议和诊断测试。
function localizeLogMessage(message: string) {
  const exactMessages: Record<string, string> = {
    mounted: 'Vue 已挂载',
    unmounted: 'Vue 已卸载',
    'mount VueOrder': '挂载 VueOrder',
    unmount: '卸载 VueOrder',
    'update props': '更新 Props',
    'ignored update after unmount': '卸载后忽略 update',
    'forward success': '转发 success 事件',
    'forward close': '转发 close 事件',
    'received close': '已收到 close 事件',
  }

  const exactMessage = exactMessages[message]
  if (exactMessage) return exactMessage

  return message
    .replace(/^render order (.+)$/, '渲染订单 $1')
    .replace(/^route changed (.+) → (.+)$/, '路由已变更 $1 → $2')
    .replace(/^feature flag → react$/, 'Feature Flag → React 旧版')
    .replace(/^feature flag → vue$/, 'Feature Flag → Vue 迁移版')
    .replace(/^received Vue EventBus: (.+)$/, '已收到 Vue EventBus：$1')
    .replace(/^received React EventBus: (.+)$/, '已收到 React EventBus：$1')
    .replace(/^received success: Vue success - order (.+)$/, '已收到 success 事件：Vue 订单 $1')
    .replace(/^props changed (.+) → (.+)$/, 'Props 已变更 $1 → $2')
    .replace(/^emit success for order (.+)$/, '发送 success 事件，订单 $1')
    .replace(/^emit close$/, '发送 close 事件')
    .replace(/^EventBus emit: (React|Vue) EventBus - order (.+)$/, 'EventBus 已发送：$1 订单 $2')
    .replace(/(React|Vue) EventBus - order (.+)$/, '$1 EventBus - 订单 $2')
}

function localizeReceivedMessage(message: string) {
  return message
    .replace(/^Vue success - order (.+)$/, 'Vue 已发送 success 事件，订单 $1')
    .replace(/^Vue close$/, 'Vue 已发送 close 事件')
    .replace(/^(React|Vue) EventBus - order (.+)$/, '$1 EventBus - 订单 $2')
}

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
        message: `route changed ${previousOrderId} → ${params.orderId ?? '未知'}`,
      })
    } else {
      migrationLog.append({
        source: 'React',
        message: `render order ${params.orderId ?? '未知'}`,
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
        <p className="react-vue-migration-demo__eyebrow">框架迁移实验室</p>
        <h2>React → Vue 渐进迁移</h2>
        <p>外层 Vue Blog 仅负责展示；下方真实运行 React Shell，并由 React 加载 Vue 订单模块。</p>
      </header>

      <div className="react-vue-migration-demo__toolbar">
        <fieldset>
          <legend>实现版本</legend>
          <button
            type="button"
            aria-pressed={state.implementation === 'react'}
            onClick={() => selectImplementation('react')}
          >
            React 旧版
          </button>
          <button
            type="button"
            aria-pressed={state.implementation === 'vue'}
            onClick={() => selectImplementation('vue')}
          >
            Vue 迁移版
          </button>
        </fieldset>

        <fieldset>
          <legend>React Router 路由</legend>
          <button
            type="button"
            aria-pressed={state.orderId === '10001'}
            onClick={() => navigate('/orders/10001')}
          >
            10001
          </button>
          <button
            type="button"
            aria-pressed={state.orderId === '10002'}
            onClick={() => navigate('/orders/10002')}
          >
            10002
          </button>
        </fieldset>

        <label className="react-vue-migration-demo__readonly">
          <input
            type="checkbox"
            checked={readonly}
            onChange={(event) => setReadonly(event.target.checked)}
          />
          readonly
        </label>
      </div>

      {state.routeError ? (
        <p role="alert">
          {state.routeError.replace('Unsupported order route:', '不支持的订单路由：')}
        </p>
      ) : null}

      <div className="react-vue-migration-demo__workspace">
        <section className="react-vue-migration-demo__business" aria-label="业务组件">
          <div className="react-vue-migration-demo__section-heading">
            <div>
              <span>业务组件</span>
              <strong>{state.implementation === 'vue' ? 'Vue 模块' : 'React 旧版'}</strong>
            </div>
            <button type="button" onClick={sendReactEventBusMessage}>
              React EventBus 发送
            </button>
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
            <p>
              <strong>React 已接收：</strong> {localizeReceivedMessage(state.receivedMessage)}
            </p>
            <p>
              <strong>EventBus 已接收：</strong> {localizeReceivedMessage(reactEventMessage)}
            </p>
          </div>
        </section>

        <aside className="react-vue-migration-demo__log" aria-label="迁移日志">
          <div className="react-vue-migration-demo__section-heading">
            <div>
              <span>迁移日志</span>
              <strong>{logs.length} 条事件</strong>
            </div>
            <button type="button" onClick={migrationLog.clear}>
              清空
            </button>
          </div>
          <ol>
            {logs.map((entry) => (
              <li key={entry.id}>
                <span>[{entry.source}]</span> {localizeLogMessage(entry.message)}
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
