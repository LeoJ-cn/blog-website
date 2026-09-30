import { ref, type Ref } from 'vue'
import type { Order } from '../../shared/api'

export type OrderLoader = (orderId: string, signal: AbortSignal) => Promise<Order>

export interface OrderState {
  order: Ref<Order | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  load(orderId: string): Promise<void>
  dispose(): void
}

export function createOrderState(loader: OrderLoader): OrderState {
  const order = ref<Order | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let activeController: AbortController | null = null
  let requestSequence = 0

  async function load(orderId: string): Promise<void> {
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    requestSequence += 1
    const currentRequest = requestSequence
    loading.value = true
    error.value = null

    try {
      const nextOrder = await loader(orderId, controller.signal)
      if (currentRequest === requestSequence && !controller.signal.aborted) {
        order.value = nextOrder
      }
    } catch (reason) {
      if (
        currentRequest === requestSequence &&
        !(reason instanceof DOMException && reason.name === 'AbortError')
      ) {
        error.value = reason instanceof Error ? reason.message : 'Unknown order loading error'
      }
    } finally {
      if (currentRequest === requestSequence) {
        loading.value = false
      }
    }
  }

  function dispose() {
    requestSequence += 1
    activeController?.abort()
    activeController = null
    loading.value = false
  }

  return { order, loading, error, load, dispose }
}
