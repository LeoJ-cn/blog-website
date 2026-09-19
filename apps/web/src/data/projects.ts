import schedulerDemoSource from '../components/scheduler/demo.vue?raw'
import schedulerUaSource from '../components/scheduler/test-ua.js?raw'
import type { ProjectCategory, ProjectDefinition } from '../types/project'

export const categoryMetadata: Record<
  ProjectCategory,
  { title: string; hint: string; description: string }
> = {
  performance: {
    title: 'Performance',
    hint: '运行时与加载',
    description: '记录页面加载、运行时性能和资源表现。',
  },
  engineering: {
    title: 'Engineering',
    hint: '构建与质量',
    description: '展示工程化工具链、构建流程和质量保障。',
  },
  architecture: {
    title: 'Architecture',
    hint: '边界与组织',
    description: '探索模块边界、状态组织和可扩展架构。',
  },
  network: {
    title: 'Network',
    hint: '请求与连接',
    description: '展示 HTTP、WebSocket 和网络请求行为。',
  },
  browser: {
    title: 'Browser',
    hint: '平台与渲染',
    description: '记录浏览器 API、渲染机制和运行时能力。',
  },
}

export const projects: ProjectDefinition[] = [
  {
    slug: 'scheduler',
    title: 'Scheduler',
    summary: '分片任务与优先级调度实验',
    description: '观察 MessageChannel、任务切片和主线程响应之间的关系。',
    category: 'performance',
    status: 'active',
    difficulty: 'advanced',
    tags: ['Vue 3', 'MessageChannel', 'Performance API'],
    featured: true,
    updatedAt: '2026-09-19',
    sources: [
      {
        label: 'demo.vue',
        path: 'apps/web/src/components/scheduler/demo.vue',
        language: 'markup',
        content: schedulerDemoSource,
      },
      {
        label: 'test-ua.js',
        path: 'apps/web/src/components/scheduler/test-ua.js',
        language: 'javascript',
        content: schedulerUaSource,
      },
    ],
  },
  {
    slug: 'build-benchmark',
    title: 'Build Benchmark',
    summary: '双构建产物和耗时对比',
    description: '对比 Vite 与 Webpack 的构建过程和产物表现。',
    category: 'engineering',
    status: 'planned',
    difficulty: 'intermediate',
    tags: ['Vite', 'Webpack 5', 'Bundle'],
    featured: true,
    updatedAt: '2026-09-19',
    sources: [],
  },
  {
    slug: 'module-boundaries',
    title: 'Module Boundaries',
    summary: '模块边界与依赖方向',
    description: '探索 Monorepo 中应用和共享包之间的边界。',
    category: 'architecture',
    status: 'planned',
    difficulty: 'intermediate',
    tags: ['Monorepo', 'TypeScript'],
    updatedAt: '2026-09-19',
    sources: [],
  },
  {
    slug: 'http-client',
    title: 'HTTP Client',
    summary: '请求生命周期与错误模型',
    description: '展示请求生命周期、错误模型与拦截器设计。',
    category: 'network',
    status: 'planned',
    difficulty: 'intermediate',
    tags: ['HTTP', 'Interceptor'],
    featured: true,
    updatedAt: '2026-09-19',
    sources: [],
  },
  {
    slug: 'advanced-image-loader',
    title: 'Advanced Image Loader',
    summary: '渐进加载和资源调度',
    description: '探索渐进加载、并发控制和资源调度。',
    category: 'browser',
    status: 'planned',
    difficulty: 'advanced',
    tags: ['Image', 'Browser', 'Performance'],
    featured: true,
    updatedAt: '2026-09-19',
    sources: [],
  },
]

export function getProjectsByCategory(category: ProjectCategory) {
  return projects.filter((project) => project.category === category)
}
