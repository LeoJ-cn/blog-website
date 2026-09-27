import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/*.soak.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: [
        'src/performance/frame-monitor.ts',
        'src/performance/frame-statistics.ts',
      ],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 100,
        lines: 95,
      },
    },
  },
})
