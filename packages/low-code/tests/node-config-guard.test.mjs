import assert from 'node:assert/strict'
import test from 'node:test'

import { assertNodeConfig, isNodeConfig } from '../src/logic-editor/interface/node-config-guard.ts'

const validNode = {
  id: 'node-1',
  type: 'logic-start-node',
  data: { anchors: [] },
}

test('isNodeConfig 接受包含完整核心字段的节点', () => {
  assert.equal(isNodeConfig(validNode), true)
})

test('isNodeConfig 拒绝缺失核心字段的节点', () => {
  const invalidNodes = [
    null,
    {},
    { ...validNode, id: '' },
    { ...validNode, type: '' },
    { ...validNode, data: null },
    { ...validNode, data: {} },
    { ...validNode, data: { anchors: null } },
  ]

  invalidNodes.forEach((node) => assert.equal(isNodeConfig(node), false))
})

test('assertNodeConfig 的错误包含调用上下文', () => {
  assert.throws(
    () => assertNodeConfig({ ...validNode, data: {} }, '持久化方法图 nodes[2]'),
    /持久化方法图 nodes\[2\]/,
  )
})

