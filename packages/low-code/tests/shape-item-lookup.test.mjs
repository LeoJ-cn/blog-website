import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

test('节点图形查询允许临时图形尚未创建', async (context) => {
  const requireFromWeb = createRequire(new URL('../../../apps/web/package.json', import.meta.url))
  const requireFromVite = createRequire(requireFromWeb.resolve('vite/package.json'))
  const { build } = requireFromVite('esbuild')
  const outputDirectory = await mkdtemp(new URL('../.shape-test-', import.meta.url))
  const outputPath = join(outputDirectory, 'logic-base-node.cjs')
  context.after(() => rm(outputDirectory, { recursive: true, force: true }))

  await build({
    entryPoints: [new URL('../src/logic-editor/graph/shape/nodes/logic-base-node.ts', import.meta.url).pathname],
    outfile: outputPath,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    packages: 'external',
    loader: { '.svg': 'text' },
    logLevel: 'silent',
    plugins: [{
      name: 'g6-test-stub',
      setup(esbuild) {
        esbuild.onResolve({ filter: /^@antv\/g6$/ }, () => ({
          path: 'g6-test-stub',
          namespace: 'test',
        }))
        esbuild.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
          contents: 'export default {}',
          loader: 'js',
        }))
      },
    }],
  })
  globalThis.window = globalThis
  const { default: registerBaseNode } = createRequire(outputPath)(outputPath)
  let nodeDefinition
  registerBaseNode({
    registerNode(_type, definition) {
      nodeDefinition = definition
    },
  })

  const children = []
  const group = {
    anchorShapes: [],
    addShape(_type, options) {
      const shape = {
        get(key) {
          return options[key]
        },
      }
      children.push(shape)
      return shape
    },
    get(key) {
      if (key === 'children') return children
      if (key === 'destroyed') return false
      return undefined
    },
  }
  nodeDefinition.drawShape({ id: 'logic-start-node' }, group)

  assert.doesNotThrow(() => {
    assert.equal(group.$getItem('dashed-line'), undefined)
  })
})
