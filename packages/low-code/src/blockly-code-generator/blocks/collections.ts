import * as Blockly from 'blockly'

import { JavaScript } from '../blockly-javascript'

type ItemMutationBlock = Blockly.Block & { itemCount_?: number }

let registered = false

function registerDynamicValueList(type: string, prefix: string, output: string | null = null): void {
  Blockly.Blocks[type] = {
    init(this: ItemMutationBlock) {
      this.itemCount_ = 0
      this.setOutput(true, output)
    },
    mutationToDom(this: ItemMutationBlock) {
      const mutation = Blockly.utils.xml.createElement('mutation')
      mutation.setAttribute('items', String(this.itemCount_ || 0))
      return mutation
    },
    domToMutation(this: ItemMutationBlock, element: Element) {
      this.itemCount_ = Number(element.getAttribute('items') || 0)
      for (let index = 0; index < this.itemCount_; index += 1) {
        if (!this.getInput(`${prefix}${index}`)) this.appendValueInput(`${prefix}${index}`).setCheck(null)
      }
    },
  }
}

function input(block: Blockly.Block, name: string, fallback = 'undefined'): string {
  return JavaScript.valueToCode(block, name, JavaScript.ORDER_NONE) || fallback
}

function registerArrayAndObjectCreation(): void {
  registerDynamicValueList('create_array', 'ADD', 'Array')
  JavaScript.create_array = (block: ItemMutationBlock) => {
    const values = Array.from({ length: block.itemCount_ || 0 }, (_, index) => input(block, `ADD${index}`))
    return [`[${values.join(', ')}]`, JavaScript.ORDER_ATOMIC]
  }

  registerDynamicValueList('object_create_with', 'ADD', 'Object')
  JavaScript.object_create_with = (block: ItemMutationBlock) => {
    const values = Array.from({ length: block.itemCount_ || 0 }, (_, index) => input(block, `ADD${index}`))
    return [`{ ${values.join(', ')} }`, JavaScript.ORDER_ATOMIC]
  }

  Blockly.Blocks.kv = {
    init(this: Blockly.Block) {
      this.appendValueInput('key').setCheck(null)
      this.appendValueInput('value').setCheck(null)
      this.setOutput(true, null)
    },
  }
  JavaScript.kv = (block: Blockly.Block) => [
    `[${input(block, 'key', "''")}]: ${input(block, 'value')}`,
    JavaScript.ORDER_NONE,
  ]
}

function registerArrayOperations(): void {
  Blockly.defineBlocksWithJsonArray([
    { type: 'getvalfromarr', message0: '%1 [ %2 ]', args0: [{ type: 'input_value', name: 'arr' }, { type: 'input_value', name: 'index' }], output: null },
    { type: 'block_array_length', message0: '%1 length', args0: [{ type: 'input_value', name: 'array' }], output: 'Number' },
    { type: 'block_concat', message0: '%1 concat %2', args0: [{ type: 'input_value', name: 'mainItem' }, { type: 'input_value', name: 'subItem' }], output: 'Array' },
    { type: 'block_array_splice', message0: '%1 splice %2', args0: [{ type: 'input_value', name: 'array' }, { type: 'input_value', name: 'index' }], previousStatement: null, nextStatement: null },
    { type: 'change_item_splice', message0: '%1 splice %2 %3 %4', args0: [{ type: 'input_value', name: 'ARRAY' }, { type: 'input_value', name: 'AT' }, { type: 'input_value', name: 'LENGTH' }, { type: 'input_value', name: 'TO' }], previousStatement: null, nextStatement: null },
  ])

  JavaScript.getvalfromarr = (block: Blockly.Block) => [`${input(block, 'arr', '[]')}[${input(block, 'index', '0')}]`, JavaScript.ORDER_MEMBER]
  JavaScript.block_array_length = (block: Blockly.Block) => [`${input(block, 'array', '[]')}.length`, JavaScript.ORDER_MEMBER]
  JavaScript.block_concat = (block: Blockly.Block) => [`${input(block, 'mainItem', '[]')}.concat(${input(block, 'subItem', '[]')})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_array_splice = (block: Blockly.Block) => `${input(block, 'array', '[]')}.splice(${input(block, 'index', '0')}, 1);\n`
  JavaScript.change_item_splice = (block: Blockly.Block) => {
    const array = input(block, 'ARRAY', '[]')
    const at = input(block, 'AT', '0')
    const length = input(block, 'LENGTH', '0')
    const replacement = JavaScript.valueToCode(block, 'TO', JavaScript.ORDER_NONE)
    return `${array}.splice(${at}, ${length}${replacement ? `, ${replacement}` : ''});\n`
  }
}

function registerTextAndNumberOperations(): void {
  Blockly.defineBlocksWithJsonArray([
    { type: 'block_to_string', message0: 'String %1', args0: [{ type: 'input_value', name: 'val' }], output: 'String' },
    { type: 'block_parse_int', message0: 'Number %1', args0: [{ type: 'input_value', name: 'val' }], output: 'Number' },
    { type: 'block_math_ceil', message0: 'ceil %1', args0: [{ type: 'input_value', name: 'val' }], output: 'Number' },
    { type: 'block_math_floor', message0: 'floor %1', args0: [{ type: 'input_value', name: 'val' }], output: 'Number' },
    { type: 'block_tofixed', message0: '%1 fixed %2', args0: [{ type: 'input_value', name: 'number' }, { type: 'input_value', name: 'fix' }], output: 'String' },
    { type: 'block_split', message0: '%1 split %2', args0: [{ type: 'input_value', name: 'str' }, { type: 'input_value', name: 'splitStr' }], output: 'Array' },
    { type: 'block_substring', message0: '%1 substring %2 %3', args0: [{ type: 'input_value', name: 'str' }, { type: 'input_value', name: 'start' }, { type: 'input_value', name: 'end' }], output: 'String' },
    { type: 'block_includes', message0: '%1 includes %2', args0: [{ type: 'input_value', name: 'fatherStr' }, { type: 'input_value', name: 'childStr' }], output: 'Boolean' },
  ])

  JavaScript.block_to_string = (block: Blockly.Block) => [`String(${input(block, 'val')})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_parse_int = (block: Blockly.Block) => [`Number(${input(block, 'val')})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_math_ceil = (block: Blockly.Block) => [`Math.ceil(${input(block, 'val', '0')})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_math_floor = (block: Blockly.Block) => [`Math.floor(${input(block, 'val', '0')})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_tofixed = (block: Blockly.Block) => [`${input(block, 'number', '0')}.toFixed(${input(block, 'fix', '0')})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_split = (block: Blockly.Block) => [`${input(block, 'str', "''")}.split(${input(block, 'splitStr', "''")})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_substring = (block: Blockly.Block) => [`${input(block, 'str', "''")}.substring(${input(block, 'start', '0')}, ${input(block, 'end', '0')})`, JavaScript.ORDER_FUNCTION_CALL]
  JavaScript.block_includes = (block: Blockly.Block) => [`${input(block, 'fatherStr', "''")}.includes(${input(block, 'childStr', "''")})`, JavaScript.ORDER_FUNCTION_CALL]
}

/** 注册当前节点翻译器会产生的集合、对象、文本和数字运算块。 */
export function registerCollectionBlocklyBlocks(): void {
  if (registered) return
  registerArrayAndObjectCreation()
  registerArrayOperations()
  registerTextAndNumberOperations()
  registered = true
}
