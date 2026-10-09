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
          path: 'solutions',
          redirect: '/playground/solutions/openlayers-gis',
        },
        {
          path: 'solutions/openlayers-gis',
          name: 'playground-openlayers-gis',
          component: () => import('../../pages/PlaygroundGisPage.vue'),
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
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../../pages/NotFoundPage.vue'),
    },
  ],
})

export default router
