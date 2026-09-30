import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const leftBarPath = new URL('../src/logic-editor/LogicEditorLeftBar.tsx', import.meta.url)

test('方法视图的基础节点库不应过滤生命周期节点', async () => {
  const source = await readFile(leftBarPath, 'utf8')

  assert.doesNotMatch(
    source,
    /baseCategory\.children\?\.filter\([\s\S]*?logic-lifecycle-node/,
    'LogicEditorLeftBar 不应从 baseCategory 中移除生命周期节点',
  )
  assert.match(
    source,
    /const builtIn\s*=\s*\[baseCategory\s*,/,
    '方法视图应直接使用包含生命周期节点的 baseCategory',
  )
})
