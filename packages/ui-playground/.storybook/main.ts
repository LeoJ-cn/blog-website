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
    build: {
      ...viteConfig.build,
      rollupOptions: {
        ...viteConfig.build?.rollupOptions,
        // Storybook 的第三方 chunk 名可能以 _ 开头；统一加前缀，避免被 Pages 的 Jekyll 过滤。
        output: {
          chunkFileNames: 'assets/chunk-[name]-[hash].js',
          entryFileNames: 'assets/entry-[name]-[hash].js',
          assetFileNames: 'assets/asset-[name]-[hash][extname]',
        },
      },
    },
    // UI Workspace 包以 Vue SFC 源码暴露入口，预览构建也必须编译包外的 .vue 文件。
    plugins: [...(viteConfig.plugins || []), vue()],
  }),
}

export default config
