<script setup lang="ts">
import Test from '@/components/Test.vue'
import { ref } from 'vue'

const tabs = [
  { id: 'demo', label: 'Demo' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'metrics', label: '性能指标' },
  { id: 'compatibility', label: '兼容性' },
] as const

const activeTab = ref<(typeof tabs)[number]['id']>('demo')
</script>

<template>
  <article class="playground-content">
    <p class="eyebrow">PERFORMANCE</p>
    <h2>Performance</h2>
    <p class="playground-description">记录页面加载、运行时性能和资源表现。</p>

    <div class="demo-stage">
      <div class="demo-stage__header">
        <div>
          <span class="status-dot" aria-hidden="true"></span>
          <span>INTERACTIVE DEMO</span>
        </div>
        <span>待接入</span>
      </div>
      <div class="demo-workbench">
        <aside class="demo-workbench__controls">
          <h3>交互配置</h3>
          <p>左侧交互区域待配置。</p>
        </aside>
        <div class="demo-workbench__result">
          <div>
            <h3>展示结果</h3>
            <p>右侧结果区域待配置。</p>
          </div>
        </div>
      </div>
    </div>

    <nav class="content-tabs" aria-label="技术内容" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ 'is-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        role="tab"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'source'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">SOURCE CODE</p>
      <h3>源码待配置</h3>
      <p>这里将展示对应技术方案的源码。</p>
    </section>

    <section v-else-if="activeTab === 'metrics'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">PERFORMANCE METRICS</p>
      <h3>性能指标待配置</h3>
      <p>这里将展示运行结果和性能指标。</p>
    </section>

    <section v-else-if="activeTab === 'principle'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">实现原理</p>
      <h3>实现原理待配置</h3>
      <p>这里将说明技术方案的实现过程和核心原理。</p>
    </section>

    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">兼容性</p>
      <h3>兼容性信息待配置</h3>
      <p>这里将说明运行环境、浏览器支持范围和降级方案。</p>
    </section>

    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">DEMO OVERVIEW</p>
      <h3>Demo 说明待配置</h3>
      <p>这里将说明交互参数、观察方式和实验结论。</p>
    </section>
  </article>
  <Test />
</template>
