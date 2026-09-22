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
          name: 'playground-advanced-image',
          component: () => import('../../pages/PlaygroundAdvancedImagePage.vue'),
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
