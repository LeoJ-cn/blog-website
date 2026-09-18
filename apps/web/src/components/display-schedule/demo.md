<template>
  <div class="main-container">
    <div class="main-header">
      <h2>📊 Main 组件</h2>
    </div>
    <div class="main-body">
      <Left v-if="readyA" />
      <Right v-if="readyB" />
      <!-- <Left v-if="readyA" />
      <Right v-if="readyB" />
      <Left v-if="readyA" />
      <Right v-if="readyB" />
      <Left v-if="readyA" />
      <Right v-if="readyB" /> -->

     <!-- <Left />
      <Right />  -->
    </div>
  </div>
</template>

<script setup>
import Left from './Left.vue'
import Right from './Right.vue'
import { useDeferRegister } from './useDeferRegister';


const { isReady: readyA } = useDeferRegister({
  priority: 8,
  meta: {
    name: "模块A",
    page: "home",
    remark: "首页卡片模块",
  },
});

// 模块B
const { isReady: readyB } = useDeferRegister({
  priority: 12,
  meta: {
    name: "模块B",
  },
});

</script>

<style scoped>
.main-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  margin-bottom: 20px;
}

.main-header h2 {
  margin: 0;
  font-weight: 600;
}

.main-header span {
  color: rgba(255, 255, 255, 0.9);
}

.main-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .main-body {
    grid-template-columns: 1fr;
  }
}
</style>
