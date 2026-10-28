import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const entry = (name: string) => fileURLToPath(new URL(`./src/entries/${name}.ts`, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        catalog: fileURLToPath(new URL('./src/catalog.ts', import.meta.url)),
        button: entry('button'),
        input: entry('input'),
        select: entry('select'),
        dialog: entry('dialog'),
        loading: entry('loading'),
        'empty-state': entry('empty-state'),
        form: entry('form'),
        table: entry('table'),
        checkbox: entry('checkbox'),
        rate: entry('rate'),
        icon: entry('icon'),
        icons: entry('icons'),
        card: entry('card'),
        avatar: entry('avatar'),
        menu: entry('menu'),
        'sub-menu': entry('sub-menu'),
        breadcrumb: entry('breadcrumb'),
        tabs: entry('tabs'),
        dropdown: entry('dropdown'),
        statistic: entry('statistic'),
        trend: entry('trend'),
        progress: entry('progress'),
        list: entry('list'),
        tooltip: entry('tooltip'),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      // Vue 与 Element Plus 由宿主提供，避免组件库重复打包运行时。
      external: (id) =>
        id === 'vue' || id.startsWith('element-plus') || id.startsWith('@element-plus/icons-vue'),
    },
  },
})
