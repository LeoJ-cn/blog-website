import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function collectFiles(directory) {
  if (!statSync(directory, { throwIfNoEntry: false })) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'webpack-report.html' || entry.name === 'vite-report.html' || entry.name.endsWith('.map')) return []
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(file) : [file]
  })
}

function runBuild(name, outputDirectory, args) {
  const startedAt = performance.now()
  execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' })
  const durationMs = Math.round(performance.now() - startedAt)
  const files = collectFiles(path.join(root, outputDirectory))
  const bytes = files.reduce((total, file) => total + statSync(file).size, 0)
  return { name, durationMs, files: files.length, bytes }
}

const results = [
  runBuild('vite', 'dist-vite', ['build:vite']),
  runBuild('webpack', 'dist-webpack', ['build:webpack']),
]

console.table(results.map((result) => ({ ...result, sizeKiB: Math.round(result.bytes / 1024) })))
