import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin, type Rollup } from 'vite'
import { posix } from 'node:path'

// 源码入口共用组件实现；仅浏览器入口自动关联 CSS，SSR 依赖图保持无 CSS 导入。
const browserStyles = (): Plugin => ({
  name: 'white55-browser-styles',
  generateBundle(_options, bundle) {
    const collect = (chunk: Rollup.OutputChunk, seen = new Set<string>()): Set<string> => {
      if (seen.has(chunk.fileName)) return new Set()
      seen.add(chunk.fileName)
      const metadata = chunk as Rollup.OutputChunk & { viteMetadata?: { importedCss: Set<string> } }
      const styles = new Set(metadata.viteMetadata?.importedCss ?? [])
      for (const dependency of chunk.imports) {
        const child = bundle[dependency]
        if (child?.type === 'chunk') {
          for (const style of collect(child, seen)) styles.add(style)
        }
      }
      return styles
    }
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk' || !chunk.isEntry || chunk.fileName.startsWith('ssr/')) continue
      const imports = [...collect(chunk)].map((style) => {
        const relative = posix.relative(posix.dirname(chunk.fileName), style)
        return `import ${JSON.stringify(`./${relative}`)};`
      })
      chunk.code = `${imports.join('\n')}\n${chunk.code}`
    }
  },
})

export default defineConfig({
  plugins: [vue(), browserStyles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: {
        catalog: fileURLToPath(new URL('./src/catalog.ts', import.meta.url)),
        index: fileURLToPath(new URL('./src/browser/index.ts', import.meta.url)),
        'ssr/index': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        avatar: fileURLToPath(new URL('./src/browser/avatar.ts', import.meta.url)),
        'ssr/avatar': fileURLToPath(new URL('./src/entries/avatar.ts', import.meta.url)),
        breadcrumb: fileURLToPath(new URL('./src/browser/breadcrumb.ts', import.meta.url)),
        'ssr/breadcrumb': fileURLToPath(new URL('./src/entries/breadcrumb.ts', import.meta.url)),
        button: fileURLToPath(new URL('./src/browser/button.ts', import.meta.url)),
        'ssr/button': fileURLToPath(new URL('./src/entries/button.ts', import.meta.url)),
        card: fileURLToPath(new URL('./src/browser/card.ts', import.meta.url)),
        'ssr/card': fileURLToPath(new URL('./src/entries/card.ts', import.meta.url)),
        checkbox: fileURLToPath(new URL('./src/browser/checkbox.ts', import.meta.url)),
        'ssr/checkbox': fileURLToPath(new URL('./src/entries/checkbox.ts', import.meta.url)),
        dialog: fileURLToPath(new URL('./src/browser/dialog.ts', import.meta.url)),
        'ssr/dialog': fileURLToPath(new URL('./src/entries/dialog.ts', import.meta.url)),
        dropdown: fileURLToPath(new URL('./src/browser/dropdown.ts', import.meta.url)),
        'ssr/dropdown': fileURLToPath(new URL('./src/entries/dropdown.ts', import.meta.url)),
        'empty-state': fileURLToPath(new URL('./src/browser/empty-state.ts', import.meta.url)),
        'ssr/empty-state': fileURLToPath(new URL('./src/entries/empty-state.ts', import.meta.url)),
        form: fileURLToPath(new URL('./src/browser/form.ts', import.meta.url)),
        'ssr/form': fileURLToPath(new URL('./src/entries/form.ts', import.meta.url)),
        icon: fileURLToPath(new URL('./src/browser/icon.ts', import.meta.url)),
        'ssr/icon': fileURLToPath(new URL('./src/entries/icon.ts', import.meta.url)),
        icons: fileURLToPath(new URL('./src/browser/icons.ts', import.meta.url)),
        'ssr/icons': fileURLToPath(new URL('./src/entries/icons.ts', import.meta.url)),
        input: fileURLToPath(new URL('./src/browser/input.ts', import.meta.url)),
        'ssr/input': fileURLToPath(new URL('./src/entries/input.ts', import.meta.url)),
        list: fileURLToPath(new URL('./src/browser/list.ts', import.meta.url)),
        'ssr/list': fileURLToPath(new URL('./src/entries/list.ts', import.meta.url)),
        loading: fileURLToPath(new URL('./src/browser/loading.ts', import.meta.url)),
        'ssr/loading': fileURLToPath(new URL('./src/entries/loading.ts', import.meta.url)),
        menu: fileURLToPath(new URL('./src/browser/menu.ts', import.meta.url)),
        'ssr/menu': fileURLToPath(new URL('./src/entries/menu.ts', import.meta.url)),
        progress: fileURLToPath(new URL('./src/browser/progress.ts', import.meta.url)),
        'ssr/progress': fileURLToPath(new URL('./src/entries/progress.ts', import.meta.url)),
        rate: fileURLToPath(new URL('./src/browser/rate.ts', import.meta.url)),
        'ssr/rate': fileURLToPath(new URL('./src/entries/rate.ts', import.meta.url)),
        select: fileURLToPath(new URL('./src/browser/select.ts', import.meta.url)),
        'ssr/select': fileURLToPath(new URL('./src/entries/select.ts', import.meta.url)),
        statistic: fileURLToPath(new URL('./src/browser/statistic.ts', import.meta.url)),
        'ssr/statistic': fileURLToPath(new URL('./src/entries/statistic.ts', import.meta.url)),
        'sub-menu': fileURLToPath(new URL('./src/browser/sub-menu.ts', import.meta.url)),
        'ssr/sub-menu': fileURLToPath(new URL('./src/entries/sub-menu.ts', import.meta.url)),
        table: fileURLToPath(new URL('./src/browser/table.ts', import.meta.url)),
        'ssr/table': fileURLToPath(new URL('./src/entries/table.ts', import.meta.url)),
        tabs: fileURLToPath(new URL('./src/browser/tabs.ts', import.meta.url)),
        'ssr/tabs': fileURLToPath(new URL('./src/entries/tabs.ts', import.meta.url)),
        tooltip: fileURLToPath(new URL('./src/browser/tooltip.ts', import.meta.url)),
        'ssr/tooltip': fileURLToPath(new URL('./src/entries/tooltip.ts', import.meta.url)),
        trend: fileURLToPath(new URL('./src/browser/trend.ts', import.meta.url)),
        'ssr/trend': fileURLToPath(new URL('./src/entries/trend.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      // Vue 由宿主提供；内部运行时依赖通过 dependencies 安装，避免重复打包。
      external: (id) =>
        id === 'vue' || id.startsWith('element-plus') || id.startsWith('@element-plus/icons-vue'),
    },
  },
})
