<script setup lang="ts">
import { buildInfo } from '@blog/config'
</script>

<template>
  <section class="hero-section">
    <p class="eyebrow">FRONTEND ENGINEERING LAB</p>
    <h1>把工程能力<br /><span>变成可运行的展示。</span></h1>
    <p class="hero-copy">
      一个持续演进的前端工程实验场，用真实代码、可交互 Demo 和性能数据记录技术实践。
    </p>
    <RouterLink class="primary-action" to="/playground">进入技术 Playground <span>→</span></RouterLink>
    <p class="build-info" aria-label="构建信息">
      {{ buildInfo.mode }} · {{ buildInfo.buildTool }} · v{{ buildInfo.version }} · {{ buildInfo.commit }}
    </p>
  </section>

  <section class="principles-section" aria-labelledby="principles-title">
    <div>
      <p class="eyebrow">FOUNDATION</p>
      <h2 id="principles-title">先把基础设施搭好。</h2>
    </div>
    <p>每个技术主题都会逐步补充原理、代码、交互结果和性能指标。</p>
  </section>
</template>
