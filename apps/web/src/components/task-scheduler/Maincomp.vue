<script setup>
import Left from './Left.vue'
import Right from './Right.vue'
import { useDeferRegister } from './useDeferRegister'

const { isReady: readyA } = useDeferRegister({
  priority: 8,
  meta: {
    name: '模块A',
    page: 'home',
    remark: '首页卡片模块',
  },
})

const { isReady: readyB } = useDeferRegister({
  priority: 12,
  meta: {
    name: '模块B',
  },
})
</script>

<template>
  <div class="main-container">
    <div class="main-header">
      <div>
        <span>DEFERRED RENDERING</span>
        <h2>📊 协作式任务编排器</h2>
      </div>
      <small>优先级越小越先渲染</small>
    </div>
    <div class="main-body" aria-live="polite">
      <Left v-if="readyA" />
      <Right v-if="readyB" />
    </div>
  </div>
</template>

<style scoped>
.main-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px 24px;
  border: 1px solid #344c82;
  border-radius: 12px;
  background: linear-gradient(135deg, #243d82 0%, #563783 100%);
  color: white;
}

.main-header span {
  color: #b7c6ef;
  font-family: monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
}

.main-header h2 {
  margin: 5px 0 0;
  font-size: 22px;
  font-weight: 600;
}

.main-header small {
  color: rgba(255, 255, 255, 0.72);
}

.main-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: 180px;
}

@media (max-width: 768px) {
  .main-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .main-body {
    grid-template-columns: 1fr;
  }
}
</style>
