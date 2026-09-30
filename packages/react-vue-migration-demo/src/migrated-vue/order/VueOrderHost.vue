<script setup lang="ts">
import { provide } from 'vue'
import { migrationPlatformKey, type MigrationPlatform } from '../../migration/platform'
import VueOrder from './VueOrder.vue'
import type { OrderModuleEvents, OrderModuleProps } from './contract'

const props = defineProps<{
  moduleProps: OrderModuleProps
  platform: MigrationPlatform
  events: OrderModuleEvents
}>()

provide(migrationPlatformKey, props.platform)
</script>

<template>
  <VueOrder
    :order-id="moduleProps.orderId"
    :readonly="moduleProps.readonly"
    @success="events.success"
    @close="events.close"
  />
</template>
