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
      redirect: '/playground/performance',
      children: [
        {
          path: 'performance',
          name: 'playground-performance',
          component: () => import('../../pages/PlaygroundPerformancePage.vue'),
        },
        {
          path: 'browser',
          redirect: '/playground/browser/advanced-image-loader',
        },
        {
          path: 'browser/advanced-image-loader',
          name: 'playground-advanced-image',
          component: () => import('../../pages/PlaygroundAdvancedImagePage.vue'),
        },
        {
          path: 'browser/render-scheduler',
          name: 'playground-render-scheduler',
          component: () => import('../../pages/PlaygroundRenderSchedulerPage.vue'),
        },
        {
          path: 'browser/device-performance-probe',
          name: 'playground-device-performance-probe',
          component: () => import('../../pages/PlaygroundDevicePerformanceProbePage.vue'),
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
