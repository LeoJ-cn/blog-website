import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../../pages/HomePage.vue'),
    },
    {
      path: '/playground',
      name: 'playground',
      component: () => import('../../pages/PlaygroundPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../../pages/NotFoundPage.vue'),
    },
  ],
})

export default router
