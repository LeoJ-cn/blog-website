import schedulerUaSource from '../components/test-ua/test-ua.js?raw'
import advancedImageComponentSource from '../components/advanced-image-loader/nail-box_zm.vue?raw'
import advancedImageMockSource from '../components/advanced-image-loader/mock.js?raw'
import advancedImageLoaderSource from '../components/advanced-image-loader/stream-loader_norxjs.ts?raw'
import schedulerDemoSource from '../components/task-scheduler/Demo.vue?raw'
import renderSchedulerSource from '../components/task-scheduler/task-scheduler.js?raw'
import schedulerComposableSource from '../components/task-scheduler/useDeferRegister.js?raw'
import textLabelingStyleSource from '../components/text-labeling/TextLabeling.css?raw'
import textLabelingSource from '../components/text-labeling/TextLabeling.ts?raw'
import textLabelingArticleSource from '../components/text-labeling/text.txt?raw'
import xpathSelectionSource from '../components/text-labeling/xpath-selection.ts?raw'
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
    slug: 'low-code',
    title: '低代码逻辑编辑器',
    summary: '图形化逻辑编排与流程数据生成',
    description: '通过完整节点、连线与配置交互，生成兼容旧协议的 SimpleProcessData[] 和 blockData。',
    category: 'browser',
    status: 'active',
    tags: ['Vue 3', 'G6', 'Low Code'],
    featured: true,
    updatedAt: '2026-09-28',
    sources: [],
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
    slug: 'render-scheduler',
    title: '协作式任务编排器',
    summary: '优先级队列与 Vue 组件延迟渲染实验',
    description:
      '通过优先级队列依次释放 Vue 组件的渲染时机，观察不同业务模块按计划进入页面的过程。',
    category: 'browser',
    status: 'active',
    tags: ['Vue 3', 'Priority Queue', 'Deferred Rendering'],
    featured: true,
    updatedAt: '2026-09-26',
    sources: [
      {
        label: 'Demo.vue',
        path: 'apps/web/src/components/task-scheduler/Demo.vue',
        language: 'markup',
        content: schedulerDemoSource,
      },
      {
        label: 'task-scheduler.js',
        path: 'apps/web/src/components/task-scheduler/task-scheduler.js',
        language: 'javascript',
        content: renderSchedulerSource,
      },
      {
        label: 'useDeferRegister.js',
        path: 'apps/web/src/components/task-scheduler/useDeferRegister.js',
        language: 'javascript',
        content: schedulerComposableSource,
      },
    ],
  },
  {
    slug: 'text-labeling',
    title: '文本标引',
    summary: '基于 Range 与全局 offset 的可持久化文本标注',
    description:
      '选中文本后通过右键菜单创建标注，使用全局字符 offset 记录位置，并在页面刷新后恢复高亮。',
    category: 'browser',
    status: 'active',
    tags: ['Selection API', 'Range', 'LocalStorage'],
    featured: false,
    updatedAt: '2026-09-27',
    sources: [
      {
        label: 'TextLabeling.ts',
        path: 'apps/web/src/components/text-labeling/TextLabeling.ts',
        language: 'typescript',
        content: textLabelingSource,
      },
      {
        label: 'TextLabeling.css',
        path: 'apps/web/src/components/text-labeling/TextLabeling.css',
        language: 'css',
        content: textLabelingStyleSource,
      },
      {
        label: 'xpath-selection.ts',
        path: 'apps/web/src/components/text-labeling/xpath-selection.ts',
        language: 'typescript',
        content: xpathSelectionSource,
      },
      {
        label: 'text.txt',
        path: 'apps/web/src/components/text-labeling/text.txt',
        language: 'markup',
        content: textLabelingArticleSource,
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
        path: 'apps/web/src/components/test-ua/test-ua.js',
        language: 'javascript',
        content: schedulerUaSource,
      },
    ],
  },
]

export function getProjectsByCategory(category: ProjectCategory) {
  return projects.filter((project) => project.category === category)
}
