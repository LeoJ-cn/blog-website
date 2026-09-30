import * as Blockly from 'blockly'

import { JavaScript } from '../blockly-javascript'
import type { CodeGenerationWorkspace } from '../context/workspace'

const OUTPUT_TYPE = 'funccall_output'
const STATEMENT_TYPE = 'funccall_statement'

function directChildNames(element: Element, tagName: 'field' | 'value'): string[] {
  return Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === tagName)
    .map((child) => child.getAttribute('name') || '')
    .filter(Boolean)
}

function registerFunctionShape(type: string, parameterNames: string[], output: boolean): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput(''), 'funcname')
      parameterNames.forEach((name) => this.appendValueInput(name).setCheck(null))
      if (output) this.setOutput(true, null)
      else {
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
      }
    },
  }

  JavaScript[type] = (block: Blockly.Block) => {
    const methodId = block.getFieldValue('funcname')
    const method = (block.workspace as CodeGenerationWorkspace).methodRegistry?.get(methodId)
    const methodName = method?.funcName || methodId || 'missingMethod'
    const args = parameterNames.map((name) => JavaScript.valueToCode(block, name, JavaScript.ORDER_NONE) || 'undefined')
    const awaitPrefix = method?.sync ? 'await ' : ''
    const code = `${awaitPrefix}this.${methodName}(${args.join(', ')})`
    return output ? [code, JavaScript.ORDER_FUNCTION_CALL] : `${code};\n`
  }
}

/**
 * 方法调用块的连接形态取决于是否被 value 包裹。旧实现依赖编辑器上下文动态切换，
 * 无界面生成阶段改写为两个内部块类型，避免同一全局块定义同时声明 output 和 statement。
 */
export function prepareFunctionBlocklyBlocks(xml: Element): void {
  const parameters = new Map<string, Set<string>>([
    [OUTPUT_TYPE, new Set()],
    [STATEMENT_TYPE, new Set()],
  ])

  Array.from(xml.getElementsByTagName('block')).forEach((blockElement) => {
    if (blockElement.getAttribute('type') !== 'funccall') return
    const output = blockElement.parentElement?.tagName.toLowerCase() === 'value'
    const type = output ? OUTPUT_TYPE : STATEMENT_TYPE
    blockElement.setAttribute('type', type)
    directChildNames(blockElement, 'value').forEach((name) => parameters.get(type)?.add(name))
  })

  registerFunctionShape(OUTPUT_TYPE, [...(parameters.get(OUTPUT_TYPE) || [])], true)
  registerFunctionShape(STATEMENT_TYPE, [...(parameters.get(STATEMENT_TYPE) || [])], false)

  Blockly.Blocks.block_method_ref = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput(''), 'method')
      this.setOutput(true, null)
    },
  }
  JavaScript.block_method_ref = (block: Blockly.Block) => {
    const methodId = block.getFieldValue('method')
    const method = (block.workspace as CodeGenerationWorkspace).methodRegistry?.get(methodId)
    return [`this.${method?.funcName || methodId || 'missingMethod'}`, JavaScript.ORDER_MEMBER]
  }
}
