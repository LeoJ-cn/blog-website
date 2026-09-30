import * as Blockly from 'blockly'

import { JavaScript } from '../blockly-javascript'

let registered = false

/** 注册 try/catch、数组遍历、nextTick 等固定结构控制流块。 */
export function registerControlBlocklyBlocks(): void {
  if (registered) return

  Blockly.Blocks.try_catch = {
    init(this: Blockly.Block) {
      this.appendStatementInput('try_statement').setCheck(null)
      this.appendStatementInput('catch_statement').setCheck(null)
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.try_catch = (block: Blockly.Block) => {
    const tryCode = JavaScript.statementToCode(block, 'try_statement')
    const catchCode = JavaScript.statementToCode(block, 'catch_statement')
    return `try {\n${tryCode}} catch (error) {\n${catchCode}}\n`
  }

  Blockly.Blocks.block_foreach = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('item'), 'item')
      this.appendValueInput('array').setCheck(null)
      this.appendStatementInput('statement').setCheck(null)
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.block_foreach = (block: Blockly.Block) => {
    const item = block.getFieldValue('item') || 'item'
    const array = JavaScript.valueToCode(block, 'array', JavaScript.ORDER_NONE) || '[]'
    const statements = JavaScript.statementToCode(block, 'statement')
    return `${array}.forEach((${item}, ${item}count) => {\n${statements}});\n`
  }

  Blockly.Blocks.block_nexttick = {
    init(this: Blockly.Block) {
      this.appendStatementInput('statement').setCheck(null)
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.block_nexttick = (block: Blockly.Block) => {
    const statements = JavaScript.statementToCode(block, 'statement')
    return `await this.$nextTick(async () => {\n${statements}});\n`
  }

  registered = true
}
