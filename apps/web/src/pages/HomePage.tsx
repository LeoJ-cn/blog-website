import { defineComponent } from 'vue'
import { RouterLink } from 'vue-router'
import { buildInfo } from '@blog/config'

const featuredProjects = [
  {
    eyebrow: 'PERFORMANCE',
    title: 'Scheduler',
    description: '观察任务切片、优先级调度与主线程响应之间的关系。',
    to: '/playground/performance',
    featured: true,
  },
  {
    eyebrow: 'BROWSER',
    title: 'Advanced Image Loader',
    description: '探索渐进加载、并发控制和资源调度。',
    to: '/playground/browser',
  },
  {
    eyebrow: 'NETWORK',
    title: 'HTTP Client',
    description: '展示请求生命周期、错误模型与拦截器设计。',
    to: '/playground/network',
  },
  {
    eyebrow: 'ENGINEERING',
    title: 'Build Benchmark',
    description: '对比 Vite 与 Webpack 的构建过程和产物表现。',
    to: '/playground/engineering',
  },
]

export default defineComponent({
  name: 'HomePage',
  setup() {
    return () => (
      <>
        <section class="hero-section">
          <p class="eyebrow">FRONTEND ENGINEERING LAB</p>
          <h1>
            把工程能力
            <br />
            <span>变成可运行的展示。</span>
          </h1>
          <p class="hero-copy">
            一个持续演进的前端工程实验场，用真实代码、可交互 Demo 和性能数据记录技术实践。
          </p>
          <RouterLink class="primary-action" to="/playground">
            进入技术 Playground <span>→</span>
          </RouterLink>
          <p class="build-info" aria-label="构建信息">
            {buildInfo.mode} · {buildInfo.buildTool} · v{buildInfo.version} · {buildInfo.commit}
          </p>
        </section>

        <section class="featured-section" aria-labelledby="featured-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">FEATURED EXPERIMENTS</p>
              <h2 id="featured-title">从可运行的项目开始探索。</h2>
            </div>
            <p>每个技术主题都会逐步补充原理、代码、交互结果和性能指标。</p>
          </div>

          <div class="project-grid">
            {featuredProjects.map((project) => (
              <RouterLink
                class={['project-card', project.featured && 'project-card--featured']}
                to={project.to}
              >
                <p class="project-card__eyebrow">{project.eyebrow}</p>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <span class="project-card__link">查看项目 →</span>
              </RouterLink>
            ))}
          </div>
        </section>
      </>
    )
  },
})
