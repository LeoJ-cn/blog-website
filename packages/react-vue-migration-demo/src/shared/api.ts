export interface Order {
  id: string
  name: string
}

const ORDER_REQUEST_DELAY_MS = 300

export async function getOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ORDER_REQUEST_DELAY_MS)

    const handleAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Order request aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })

  return {
    id: orderId,
    name: `Order ${orderId}`,
  }
}
