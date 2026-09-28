import type { Method } from '../../types/method'

let methodCreator: (method: Method) => Method = (method) => method
let methodsProvider: () => Method[] = () => []
let currentMethod: Method | undefined
let currentMethodId: string | undefined

export function setMethodCreator(creator: (method: Method) => Method): void {
  methodCreator = creator
}

export function setMethodsProvider(provider: () => Method[]): void {
  methodsProvider = provider
}

export default {
  addMethod: (method: Method) => methodCreator(method),
  getMethodById: (id: string) => methodsProvider().find((method) => method.id === id),
  changeMethodById: (id: string, patch: Partial<Method>) => {
    const method = methodsProvider().find((item) => item.id === id)
    if (method) Object.assign(method, patch)
  },
  changeCurMethodId: (id?: string) => { currentMethodId = id },
  changeCurMethod: (method?: Method) => { currentMethod = method },
  getCurMethodId: () => currentMethodId,
  getCurMethod: () => currentMethod,
}
