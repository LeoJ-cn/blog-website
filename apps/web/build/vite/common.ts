import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import type { UserConfig } from 'vite'

export const createViteCommonConfig = (): UserConfig => ({
    // 项目根、环境变量目录、缓存目录和 SPA 类型。
    root: process.cwd(),
    envDir: process.cwd(),
    envPrefix: ['VITE_'],
    cacheDir: 'node_modules/.vite',
    appType: 'spa',
    // 通用插件；环境专属插件在 development/production 中追加。
    plugins: [vue(), vueJsx()],
    // public 目录会原样复制到构建产物。
    publicDir: 'public',
    // 构建时常量注入，不是运行时环境变量。
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
      __BUILD_TOOL__: JSON.stringify('vite'),
    },
    // 模块解析、workspace 依赖去重、扩展名和 package exports 条件。
    resolve: {
      alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
      dedupe: ['vue', 'vue-router', 'pinia'],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
      conditions: ['module', 'import', 'browser', 'default'],
      preserveSymlinks: false,
    },
    // 开发服务器启动前的依赖预构建设置。
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'element-plus'],
      exclude: [],
      esbuildOptions: { target: 'es2020' },
    },
    // CSS Modules、预处理器和 PostCSS 的统一配置。
    css: {
      devSourcemap: true,
      modules: { scopeBehaviour: 'local', localsConvention: 'camelCaseOnly', generateScopedName: '[name]_[local]__[hash:base64:5]' },
      preprocessorOptions: { scss: { additionalData: '' }, less: {}, styl: {} },
      postcss: {},
    },
    // 不经过 JS 转换、按静态资源处理的文件类型。
    assetsInclude: ['**/*.wasm', '**/*.woff2', '**/*.woff', '**/*.ttf'],
    // JSON 导入行为。
    json: { namedExports: true, stringify: false },
    // Worker 输出格式和插件扩展点。
    worker: { format: 'es', plugins: () => [] },
    // 通用构建输出、压缩前处理、CommonJS 和 Rollup 配置。
    build: {
      outDir: '../../dist-vite', emptyOutDir: true, cssCodeSplit: true, manifest: true,
      // Legacy 插件会根据 targets 生成兼容产物，现代产物保持 Vite 默认的 esnext。
      target: 'esnext',
      write: true,
      copyPublicDir: true,
      cssTarget: 'es2020',
      commonjsOptions: { include: [/node_modules/], extensions: ['.js', '.cjs'] },
      watch: null,
      modulePreload: { polyfill: true },
      chunkSizeWarningLimit: 500,
      reportCompressedSize: true,
      assetsInlineLimit: 4096,
      rollupOptions: {
        external: [],
        treeshake: true,
        onwarn(warning, warn) { if (warning.code !== 'CIRCULAR_DEPENDENCY') warn(warning) },
        output: { preserveModules: false, generatedCode: 'es2015', chunkFileNames: 'assets/chunk-[hash].js', entryFileNames: 'assets/entry-[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]', manualChunks: { framework: ['vue', 'vue-router', 'pinia'] } },
      },
    },
    // 开发服务器：HMR、代理、CORS、文件监听和文件系统访问边界。
    server: { host: '127.0.0.1', port: 4173, strictPort: true, open: true, cors: true, headers: {}, proxy: {}, hmr: true, watch: { ignored: ['**/dist-*', '**/node_modules/**'] }, fs: { strict: true } },
    // 生产产物预览服务器，与 dev server 分离。
    preview: { host: '127.0.0.1', port: 4173, strictPort: true, open: false, cors: true, headers: {}, proxy: {} },
})
