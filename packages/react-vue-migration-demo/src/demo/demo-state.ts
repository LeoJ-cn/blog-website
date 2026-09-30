export type DemoImplementation = 'react' | 'vue'

export interface DemoState {
  implementation: DemoImplementation
  orderId: '10001' | '10002'
  routeError: string | null
  receivedMessage: string
}

export type DemoAction =
  | { type: 'implementation-selected'; value: DemoImplementation }
  | { type: 'route-changed'; path: string }
  | { type: 'success-received'; message: string }
  | { type: 'close-received' }

export function createInitialDemoState(): DemoState {
  return {
    implementation: 'vue',
    orderId: '10001',
    routeError: null,
    receivedMessage: '尚未收到组件事件',
  }
}

export function reduceDemoState(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'implementation-selected':
      return { ...state, implementation: action.value }
    case 'route-changed': {
      const match = /^\/orders\/(10001|10002)$/.exec(action.path)
      if (!match) {
        return { ...state, routeError: `Unsupported order route: ${action.path}` }
      }

      return {
        ...state,
        orderId: match[1] as DemoState['orderId'],
        routeError: null,
      }
    }
    case 'success-received':
      return { ...state, receivedMessage: action.message }
    case 'close-received':
      return { ...state, receivedMessage: 'Vue close' }
  }
}
