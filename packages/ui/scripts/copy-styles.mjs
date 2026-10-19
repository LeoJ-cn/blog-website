import { cp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../src/styles/', import.meta.url))
const target = fileURLToPath(new URL('../dist/styles/', import.meta.url))

// Vite library build 只追踪 JS 入口；CSS 子路径需原样进入独立产物。
await mkdir(target, { recursive: true })
await cp(source, target, { recursive: true })
