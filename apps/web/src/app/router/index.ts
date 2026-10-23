import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../../pages/HomePage'),
    },
    {
      path: '/playground',
      name: 'playground',
      component: () => import('../../pages/PlaygroundPage.vue'),
      redirect: '/playground/solutions',
      children: [
        {
          path: 'ui',
          redirect: '/playground/ui/docs',
        },
        {
          path: 'ui/docs/:component?',
          name: 'ui-docs',
          component: () => import('../../pages/PlaygroundUiDocsPage.vue'),
        },
        {
          path: 'ui/playground/:component?',
          // 旧演示书签统一回到简介页；组件目录与示例由 Storybook 维护。
          redirect: '/playground/ui/docs',
        },
        {
          path: 'solutions',
          redirect: '/playground/solutions/openlayers-gis',
        },
        {
          path: 'solutions/openlayers-gis',
          name: 'playground-openlayers-gis',
          component: () => import('../../pages/PlaygroundGisPage.vue'),
        },
        {
          path: 'visualization',
          redirect: '/playground/visualization/echarts',
        },
        {
          path: 'visualization/echarts',
          name: 'playground-echarts-day01',
          component: () => import('../../pages/PlaygroundEChartsDay01Page.vue'),
        },
        {
          path: 'visualization/dashboard',
          name: 'playground-visualization-dashboard',
          component: () => import('../../pages/PlaygroundVisualizationDashboardPage.vue'),
        },
        {
          path: 'solutions/echarts-day01',
          redirect: '/playground/visualization/echarts',
        },
        {
          path: 'solutions/low-code',
          name: 'playground-low-code',
          component: () => import('../../pages/PlaygroundLowCodePage.vue'),
        },
        {
          path: 'performance',
          name: 'playground-performance',
          redirect: '/playground/performance/device-performance-probe',
        },
        {
          path: 'low-code',
          redirect: '/playground/solutions/low-code',
        },
        {
          path: 'browser',
          redirect: '/playground/browser/text-labeling',
        },
        {
          path: 'engineering',
          redirect: '/playground/engineering/react-vue-migration',
        },
        {
          path: 'engineering/react-vue-migration',
          name: 'playground-react-vue-migration',
          component: () => import('../../pages/PlaygroundReactVueMigrationPage.vue'),
        },
        {
          path: 'engineering/openlayers-gis',
          redirect: '/playground/solutions/openlayers-gis',
        },
        {
          path: 'browser/advanced-image-loader',
          redirect: '/playground/performance/advanced-image-loader',
        },
        {
          path: 'performance/advanced-image-loader',
          name: 'playground-advanced-image',
          component: () => import('../../pages/PlaygroundAdvancedImagePage.vue'),
        },
        {
          path: 'performance/render-scheduler',
          name: 'playground-render-scheduler',
          component: () => import('../../pages/PlaygroundRenderSchedulerPage.vue'),
        },
        {
          path: 'performance/device-performance-probe',
          name: 'playground-device-performance-probe',
          component: () => import('../../pages/PlaygroundDevicePerformanceProbePage.vue'),
        },
        {
          path: 'browser/text-labeling',
          name: 'playground-text-labeling',
          component: () => import('../../pages/PlaygroundTextLabelingPage.vue'),
        },
      ],
    },
    {
      path: '/echarts/day01',
      redirect: '/playground/visualization/echarts',
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../../pages/NotFoundPage.vue'),
    },
  ],
})

function isPlaygroundPath(path: string): boolean {
  return path === '/playground' || path.startsWith('/playground/')
}

router.beforeEach((to, from) => {
  // 全屏状态写在 URL 中；站内切换技术点时继承它，同页退出全屏和离开 Playground 不受影响。
  if (
    from.query.display === 'fullscreen' &&
    to.query.display === undefined &&
    from.path !== to.path &&
    isPlaygroundPath(from.path) &&
    isPlaygroundPath(to.path)
  ) {
    return { path: to.path, query: { ...to.query, display: 'fullscreen' }, hash: to.hash }
  }
})

export default router
