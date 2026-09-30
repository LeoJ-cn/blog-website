<script setup lang="ts">
import { computed, ref } from 'vue'
import { ReactVueMigrationDemo } from '@blog/react-vue-migration-demo'
import CodeBlock from '../components/CodeBlock.vue'
import { projects } from '../data/projects'

const tabs = [
  { id: 'demo', label: '演示' },
  { id: 'principle', label: '实现原理' },
  { id: 'source', label: '源码' },
  { id: 'compatibility', label: '兼容性' },
] as const

const migrationStages = [
  {
    index: '01',
    title: '保留 React Shell',
    description: '先保持原应用持续发布，通过 Feature Flag 选择 React 旧版或 Vue 迁移版。',
  },
  {
    index: '02',
    title: '建立临时 Bridge',
    description: 'ReactLoadVueOrder 将 React 生命周期映射为 mount、update、unmount。',
  },
  {
    index: '03',
    title: '逐个迁移业务模块',
    description: '业务组件改为 Vue，API、Utils、Domain 与 mitt EventBus 等框架无关代码保持原样。',
  },
  {
    index: '04',
    title: '最后迁移 Shell',
    description: '业务稳定后再替换 Shell，并删除 Bridge、bootstrap 与 React Platform 等临时代码。',
  },
] as const

const communicationRules = [
  { source: '$route.params.orderId', target: 'Props', reason: '明确的业务输入' },
  { source: 'Vue $emit', target: 'Events Contract', reason: '组件向父级发送事件' },
  { source: 'Vue $router', target: 'Migration Platform', reason: '依赖 React Shell 的导航能力' },
  { source: 'API / Utils / EventBus', target: '保持原样', reason: '能够脱离框架独立运行' },
] as const

const project = projects.find((item) => item.slug === 'react-vue-migration')!
const activeTab = ref<(typeof tabs)[number]['id']>('demo')
const activeSourceIndex = ref(0)
const activeSource = computed(() => project.sources[activeSourceIndex.value])
</script>

<template>
  <article class="playground-content" data-page="react-vue-migration">
    <p class="eyebrow">工程 / 框架迁移</p>
    <h2>{{ project.title }}</h2>
    <p class="playground-description">{{ project.description }}</p>
    <div class="project-meta">
      <span v-for="tag in project.tags" :key="tag">{{ tag }}</span>
      <span>更新于 {{ project.updatedAt }}</span>
    </div>

    <div class="demo-stage react-vue-migration-stage">
      <div class="demo-stage__header">
        <div>
          <span class="status-dot" aria-hidden="true"></span>
          <span>实时迁移演示</span>
        </div>
        <span>Vue 宿主 → React Shell → Vue 模块</span>
      </div>
      <div class="react-vue-migration-stage__body">
        <ReactVueMigrationDemo />
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

    <section v-if="activeTab === 'source'" class="tab-panel tab-panel--source" role="tabpanel">
      <div class="source-viewer">
        <nav class="source-files" aria-label="源码文件">
          <button
            v-for="(source, index) in project.sources"
            :key="source.path"
            type="button"
            :class="{ 'is-active': activeSourceIndex === index }"
            @click="activeSourceIndex = index"
          >
            <span>{{ source.label }}</span>
            <small>{{ source.path }}</small>
          </button>
        </nav>
        <CodeBlock
          :code="activeSource.content"
          :language="activeSource.language"
          :filename="activeSource.label"
        />
      </div>
    </section>

    <section
      v-else-if="activeTab === 'principle'"
      class="tab-panel migration-principle"
      role="tabpanel"
    >
      <header class="migration-principle__intro">
        <p class="eyebrow">实现原理</p>
        <h3>先识别框架边界，再用最小兼容层维持新旧模块共存。</h3>
        <p>
          能原样运行的代码不改；父子通信优先使用 Props 与 Events；只有确实依赖 React Shell
          的宿主能力才进入 Migration Platform。内容依据
          <code>packages/react-vue-migration-demo/react2vue.txt</code>
          整理。
        </p>
      </header>

      <div class="migration-principle__flow" aria-label="渐进迁移阶段">
        <article v-for="stage in migrationStages" :key="stage.index">
          <span>{{ stage.index }}</span>
          <h4>{{ stage.title }}</h4>
          <p>{{ stage.description }}</p>
        </article>
      </div>

      <div class="migration-principle__architecture">
        <div>
          <p class="migration-principle__label">单模块生命周期</p>
          <p class="migration-principle__path">
            React 父组件 → Props → ReactLoadVueOrder → mount / update / unmount → bootstrap →
            VueOrder
          </p>
          <p>
            Props 变化只调用 update，不重新创建 Vue App，因此 Vue 内部状态得以保留；切换回 React
            或离开页面时再调用 unmount，统一释放 App 与事件监听器。
          </p>
        </div>
        <div>
          <p class="migration-principle__label">依赖判断顺序</p>
          <ol>
            <li>能否脱离原框架直接运行？可以则保持原样。</li>
            <li>是否属于父组件 ↔ 业务组件通信？是则使用 Props 或 Events。</li>
            <li>Vue 模块内部能否独立解决？可以则使用 Vue 原生能力。</li>
            <li>只有必须依赖 React Shell 时，才进入 Migration Platform。</li>
          </ol>
        </div>
      </div>

      <div class="migration-principle__mapping" aria-label="迁移通信映射">
        <div v-for="rule in communicationRules" :key="rule.source">
          <code>{{ rule.source }}</code>
          <span aria-hidden="true">→</span>
          <strong>{{ rule.target }}</strong>
          <small>{{ rule.reason }}</small>
        </div>
      </div>

      <p class="migration-principle__conclusion">
        最终目标不是长期维护双框架，而是在 Vue 业务模块稳定后迁移 Shell，并删除
        ReactLoadVueOrder、bootstrap、React Platform、React Router 与旧 React 组件；Vue
        业务组件、Props Contract 和框架无关代码继续保留。
      </p>
    </section>

    <section v-else-if="activeTab === 'compatibility'" class="tab-panel" role="tabpanel">
      <p class="eyebrow">兼容性</p>
      <h3>运行时隔离，构建时共享宿主能力。</h3>
      <p>
        该演示为纯客户端方案，不依赖 SSR 或 Hydration。React Router 使用 MemoryRouter，不会改写宿主
        History；Vue 由宿主去重并保持单一 Runtime。代码使用 AbortController、queueMicrotask
        等现代浏览器能力，若需要支持更旧环境，应随宿主兼容目标补充验证与 Polyfill。
      </p>
    </section>

    <section v-else class="tab-panel tab-panel--demo" role="tabpanel">
      <p class="eyebrow">演示说明</p>
      <h3>验证迁移组件与旧 React 实现可以并存和回滚。</h3>
      <p>
        切换“实现版本”对比 React 旧版与 Vue 迁移版；切换订单观察 Props update 是否保留 Vue
        内部计数；再通过组件事件、双向 EventBus 和路由按钮检查跨框架通信。右侧日志会记录
        mount、update、unmount 与事件转发链路。
      </p>
    </section>
  </article>
</template>

<style scoped>
.react-vue-migration-stage {
  padding: 0;
}

.react-vue-migration-stage__body {
  padding: clamp(1rem, 2vw, 1.5rem);
}

.migration-principle {
  display: grid;
  gap: 1.5rem;
}

.migration-principle__intro p:last-child,
.migration-principle__architecture p,
.migration-principle p.migration-principle__conclusion {
  color: #8e9bb8;
  line-height: 1.75;
  margin: 0;
}

.migration-principle code,
.migration-principle__path {
  color: #62e6b5;
  font-family: SFMono-Regular, Consolas, monospace;
}

.migration-principle__flow {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.migration-principle__flow article {
  background: #0b1426;
  border: 1px solid #263453;
  border-radius: 8px;
  padding: 1rem;
}

.migration-principle__flow span,
.migration-principle__label {
  color: #62e6b5;
  font-family: SFMono-Regular, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.migration-principle__flow h4 {
  font-size: 1rem;
  margin: 0.65rem 0 0.5rem;
}

.migration-principle__flow p {
  color: #8e9bb8;
  font-size: 0.85rem;
  line-height: 1.65;
  margin: 0;
}

.migration-principle__architecture {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.migration-principle__architecture > div {
  border-left: 2px solid #344563;
  padding-left: 1rem;
}

.migration-principle__architecture ol {
  color: #8e9bb8;
  line-height: 1.8;
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}

.migration-principle__architecture p.migration-principle__path {
  font-size: 0.8rem;
  margin: 0.55rem 0 0.75rem;
}

.migration-principle__mapping {
  border: 1px solid #263453;
  border-radius: 8px;
  overflow: hidden;
}

.migration-principle__mapping > div {
  align-items: center;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(150px, 1fr) auto minmax(150px, 1fr) minmax(180px, 1.4fr);
  padding: 0.85rem 1rem;
}

.migration-principle__mapping > div + div {
  border-top: 1px solid #263453;
}

.migration-principle__mapping strong {
  color: #e8edf7;
}

.migration-principle__mapping small {
  color: #71809e;
}

.migration-principle__conclusion {
  border-top: 1px solid #263453;
  max-width: none;
  padding-top: 1.25rem;
}

@media (max-width: 900px) {
  .migration-principle__flow,
  .migration-principle__architecture {
    grid-template-columns: 1fr;
  }

  .migration-principle__mapping > div {
    gap: 0.4rem;
    grid-template-columns: 1fr;
  }

  .migration-principle__mapping > div > span {
    display: none;
  }
}
</style>
