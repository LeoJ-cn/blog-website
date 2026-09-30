<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { migrationPlatformKey } from '../../migration/platform'
import { getOrder } from '../../shared/api'
import { eventBus, subscribeMigrationEvent } from '../../shared/event-bus'
import { migrationLog } from '../../shared/migration-log'
import { formatOrderId } from '../../shared/utils'
import type { OrderModuleProps, OrderSuccessPayload } from './contract'
import { createOrderState } from './order-state'

const props = defineProps<OrderModuleProps>()
const emit = defineEmits<{
  success: [payload: OrderSuccessPayload]
  close: []
}>()

const platform = inject(migrationPlatformKey)
if (!platform) {
  throw new Error('MigrationPlatform is required to mount VueOrder')
}
const migrationPlatform = platform

const count = ref(0)
const receivedReactMessage = ref('尚未收到 React EventBus 消息')
const orderState = createOrderState(getOrder)
let unsubscribeReactMessage: (() => void) | null = null

watch(
  () => props.orderId,
  (orderId, previousOrderId) => {
    if (previousOrderId !== undefined && previousOrderId !== orderId) {
      migrationLog.append({
        source: 'Vue',
        message: `props changed ${previousOrderId} → ${orderId}`,
      })
    }
    void orderState.load(orderId)
  },
  { immediate: true },
)

onMounted(() => {
  migrationLog.append({ source: 'Vue', message: 'mounted' })
  unsubscribeReactMessage = subscribeMigrationEvent('react:message', (message) => {
    receivedReactMessage.value = message.message
    migrationLog.append({
      source: 'Vue',
      message: `received React EventBus: ${message.message}`,
    })
  })
})

onBeforeUnmount(() => {
  unsubscribeReactMessage?.()
  unsubscribeReactMessage = null
  orderState.dispose()
  migrationLog.append({ source: 'Vue', message: 'unmounted' })
})

function emitSuccess() {
  migrationLog.append({ source: 'Vue', message: `emit success for order ${props.orderId}` })
  emit('success', {
    orderId: props.orderId,
    message: `Vue success - order ${props.orderId}`,
  })
}

function emitClose() {
  migrationLog.append({ source: 'Vue', message: 'emit close' })
  emit('close')
}

function emitEventBusMessage() {
  const message = `Vue EventBus - order ${props.orderId}`
  migrationLog.append({ source: 'Vue', message: `EventBus emit: ${message}` })
  eventBus.emit('vue:message', { orderId: props.orderId, message })
}

function navigate(method: 'push' | 'replace', orderId: string) {
  const path = `/orders/${orderId}`
  migrationLog.append({ source: 'Vue', message: `platform.router.${method}('${path}')` })
  migrationPlatform.router[method](path)
}
</script>

<template>
  <article class="react-vue-migration-demo__vue-order">
    <div
      class="react-vue-migration-demo__boundary-label react-vue-migration-demo__boundary-label--vue-component"
    >
      <span>Vue 业务组件</span>
      <code>VueOrder.vue</code>
    </div>
    <p class="react-vue-migration-demo__eyebrow">Vue 迁移版实现</p>
    <h3>Vue Order {{ formatOrderId(orderId) }}</h3>
    <dl>
      <div>
        <dt>orderId</dt>
        <dd>{{ orderId }}</dd>
      </div>
      <div>
        <dt>readonly</dt>
        <dd>{{ readonly }}</dd>
      </div>
      <div>
        <dt>name</dt>
        <dd>{{ orderState.order.value?.name ?? '加载中…' }}</dd>
      </div>
      <div>
        <dt>count</dt>
        <dd>{{ count }}</dd>
      </div>
    </dl>
    <p v-if="orderState.error.value" role="alert">{{ orderState.error.value }}</p>
    <p>{{ receivedReactMessage }}</p>
    <div class="react-vue-migration-demo__actions">
      <button type="button" @click="count += 1">内部状态 +1</button>
      <button type="button" @click="emitSuccess">发送 success</button>
      <button type="button" @click="emitClose">发送 close</button>
      <button type="button" @click="navigate('push', '10001')">router.push → 10001</button>
      <button type="button" @click="navigate('push', '10002')">router.push → 10002</button>
      <button type="button" @click="navigate('replace', '10002')">router.replace → 10002</button>
      <button type="button" @click="migrationPlatform.router.back()">router.back</button>
      <button type="button" @click="emitEventBusMessage">EventBus 发送</button>
    </div>
  </article>
</template>
