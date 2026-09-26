<script setup>
import HeavyDemo from './heavy-demo.vue'
</script>

<template>
  <article class="scheduled-card scheduled-card--primary" data-testid="scheduled-module-a">
    <span class="scheduled-card__priority">PRIORITY 8</span>
    <h3>模块 A</h3>
    <p>首页卡片模块已进入渲染阶段。</p>
    <div class="heavy-demo-shell">
      <HeavyDemo :count="1000" />
    </div>
  </article>
</template>

<style scoped>
.scheduled-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 620px;
  min-width: 0;
  padding: 24px;
  border: 1px solid #394d78;
  border-radius: 12px;
  background: #14213d;
  color: #f4f7ff;
}

.scheduled-card--primary {
  box-shadow: inset 3px 0 #62e6b5;
}

.scheduled-card__priority {
  color: #62e6b5;
  font-family: monospace;
  font-size: 12px;
  letter-spacing: 0.12em;
}

h3 {
  margin: 22px 0 8px;
  font-size: 24px;
}

p {
  margin: 0;
  color: #9aa7c0;
}

.heavy-demo-shell {
  flex: 1;
  min-height: 0;
  margin-top: 20px;
  overflow: hidden;
  border-radius: 10px;
  background: #fff;
  color: #1f2937;
}

.heavy-demo-shell :deep(.container) {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.heavy-demo-shell :deep(.list-wrapper) {
  flex: 1;
  height: auto;
  min-height: 0;
}
</style>
