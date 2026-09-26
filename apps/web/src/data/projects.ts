import schedulerDemoSource from '../components/scheduler/demo.vue?raw'
import schedulerUaSource from '../components/scheduler/test-ua.js?raw'
import advancedImageComponentSource from '../components/advanced-image-loader/nail-box_zm.vue?raw'
import advancedImageMockSource from '../components/advanced-image-loader/mock.js?raw'
import advancedImageLoaderSource from '../components/advanced-image-loader/stream-loader_norxjs.ts?raw'
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
    ],
  },
  {
    slug: 'advanced-image-loader',
    title: 'Advanced Image Loader',
    summary: '并发加载、Canvas 裁剪与失败降级',
    description: '观察缩略图、原图、Canvas 裁剪、并发队列和失败回退组成的高性能图片方案。',
    category: 'browser',
    status: 'active',
    tags: ['Canvas', 'Scheduler', 'ImageBitmap'],
    featured: true,
    updatedAt: '2026-09-22',
    sources: [
      {
        label: 'nail-box_zm.vue',
        path: 'apps/web/src/components/advanced-image-loader/nail-box_zm.vue',
        language: 'markup',
        content: advancedImageComponentSource,
      },
      {
        label: 'stream-loader_norxjs.ts',
        path: 'apps/web/src/components/advanced-image-loader/stream-loader_norxjs.ts',
        language: 'typescript',
        content: advancedImageLoaderSource,
      },
      {
        label: 'mock.js',
        path: 'apps/web/src/components/advanced-image-loader/mock.js',
        language: 'javascript',
        content: advancedImageMockSource,
      },
    ],
  },
  {
    slug: 'device-performance-probe',
    title: '设备性能探针',
    summary: '设备能力采集、动态基准测试与性能分级',
    description:
      '结合浏览器设备信息、静态硬件指标和带熔断的动态基准测试，生成当前设备的性能等级与渲染建议。',
    category: 'browser',
    status: 'active',
    tags: ['User Agent', 'Performance API', 'Circuit Breaker'],
    featured: false,
    updatedAt: '2026-09-26',
    sources: [
      {
        label: 'test-ua.js',
        path: 'apps/web/src/components/scheduler/test-ua.js',
        language: 'javascript',
        content: schedulerUaSource,
      },
    ],
  },
]

export function getProjectsByCategory(category: ProjectCategory) {
  return projects.filter((project) => project.category === category)
}
