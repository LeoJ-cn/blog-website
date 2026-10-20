import type { StorybookConfig } from '@storybook/vue3-vite'
import vue from '@vitejs/plugin-vue'

const config: StorybookConfig = {
  framework: '@storybook/vue3-vite',
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  // 静态站点位于 /storybook/；相对资源路径也兼容 GitHub Pages 仓库子路径。
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    base: './',
    // UI Workspace 包以 Vue SFC 源码暴露入口，预览构建也必须编译包外的 .vue 文件。
    plugins: [...(viteConfig.plugins || []), vue()],
  }),
}

export default config
