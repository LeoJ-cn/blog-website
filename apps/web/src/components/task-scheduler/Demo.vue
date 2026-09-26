<script setup>
import { ref } from 'vue'
import Left from './Left.vue'
import Right from './Right.vue'
import { useDeferRegister } from './useDeferRegister'

const showMain = ref(true)

const { isReady: readyA, restart: restartA } = useDeferRegister({
  priority: 8,
  meta: {
    name: '模块A',
    page: 'home',
    remark: '首页卡片模块',
  },
})

const { isReady: readyB, restart: restartB } = useDeferRegister({
  priority: 12,
  meta: {
    name: '模块B',
  },
})

function toggleMain() {
  if (showMain.value) {
    showMain.value = false
    return
  }

  restartA()
  restartB()
  showMain.value = true
}
</script>

<template>
  <div class="scheduler-test-shell">
    <button class="main-toggle" type="button" @click="toggleMain">
      {{ showMain ? '隐藏主组件' : '显示主组件' }}
    </button>

    <div class="main-container">
      <div class="main-header">
        <div>
          <span>DEFERRED RENDERING</span>
          <h2>📊 协作式任务编排器</h2>
        </div>
        <small>优先级越小越先渲染</small>
      </div>
      <div v-if="showMain" class="main-body" aria-live="polite">
        <Left v-if="readyA" />
        <Right v-if="readyB" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduler-test-shell {
  position: relative;
  min-height: 760px;
}

.main-toggle {
  position: absolute;
  top: 38px;
  right: 44px;
  z-index: 2;
  padding: 10px 20px;
  border: 0;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  box-shadow: 0 6px 18px rgb(0 0 0 / 24%);
}

.main-toggle:hover {
  background: #43a047;
}

.main-toggle:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.main-container {
  box-sizing: border-box;
  min-height: 760px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px 180px 16px 24px;
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
  height: 620px;
}

.main-body > * {
  min-width: 0;
}

@media (max-width: 768px) {
  .scheduler-test-shell,
  .main-container {
    min-height: 1400px;
  }

  .main-toggle {
    top: 36px;
    right: 32px;
  }

  .main-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding-right: 150px;
  }

  .main-body {
    grid-template-columns: 1fr;
    height: 1280px;
  }
}
</style>
