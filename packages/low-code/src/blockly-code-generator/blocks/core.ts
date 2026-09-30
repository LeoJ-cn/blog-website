import * as Blockly from 'blockly'

import { JavaScript } from '../blockly-javascript'
import { registerBusinessBlocklyBlocks } from './business'
import { registerCollectionBlocklyBlocks } from './collections'
import { registerControlBlocklyBlocks } from './control'
import { registerIntegrationBlocklyBlocks } from './integration'
import { registerMathBlocklyBlocks } from './math'
import { registerVariableBlocklyBlocks } from './variables'

type LegacyBlock = Blockly.Block & {
  funcId?: string
  varName?: string
}

let registered = false

function registerStatementWrapper(): void {
  Blockly.Blocks.show_function = {
    init(this: LegacyBlock) {
      this.appendStatementInput('showFunc').setCheck(null)
      this.setDeletable(false)
    },
    mutationToDom(this: LegacyBlock) {
      const mutation = Blockly.utils.xml.createElement('mutation')
      mutation.setAttribute('funcId', this.funcId || '')
      return mutation
    },
    domToMutation(this: LegacyBlock, element: Element) {
      this.funcId = element.getAttribute('funcId') || ''
    },
  }

  JavaScript.show_function = (block: Blockly.Block) => (
    JavaScript.statementToCode(block, 'showFunc')
  )
}

function registerTemporaryVariables(): void {
  Blockly.Blocks.block_set_tempvar = {
    init(this: LegacyBlock) {
      this.appendValueInput('tempVarValue')
        .setCheck(null)
        .appendField('var')
        .appendField(new Blockly.FieldTextInput('tempVar'), 'tempVarName')
        .appendField('=')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
    mutationToDom(this: LegacyBlock) {
      const mutation = Blockly.utils.xml.createElement('mutation')
      mutation.setAttribute('varName', this.varName || '')
      return mutation
    },
    domToMutation(this: LegacyBlock, element: Element) {
      this.varName = element.getAttribute('varName') || ''
    },
  }
  JavaScript.block_set_tempvar = (block: Blockly.Block) => {
    const name = block.getFieldValue('tempVarName')
    const value = JavaScript.valueToCode(block, 'tempVarValue', JavaScript.ORDER_ATOMIC) || 'null'
    return `var ${name} = ${value};\n`
  }

  Blockly.Blocks.funcgettempvar = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('tempVar'), 'tempVar')
      this.setOutput(true, null)
    },
  }
  JavaScript.funcgettempvar = (block: Blockly.Block) => [
    block.getFieldValue('tempVar'),
    JavaScript.ORDER_ATOMIC,
  ]
}

function registerBasicStatements(): void {
  Blockly.Blocks.assignblock = {
    init(this: Blockly.Block) {
      this.appendValueInput('leftVar').setCheck(null)
      this.appendValueInput('rightVar').setCheck(null).appendField('=')
      this.setInputsInline(true)
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.assignblock = (block: Blockly.Block) => {
    const left = JavaScript.valueToCode(block, 'leftVar', JavaScript.ORDER_ATOMIC)
    const right = JavaScript.valueToCode(block, 'rightVar', JavaScript.ORDER_ATOMIC)
    return `${left} = ${right};\n`
  }

  Blockly.Blocks.funcreturn = {
    init(this: Blockly.Block) {
      this.appendValueInput('returnVal').setCheck(null).appendField('return')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.funcreturn = (block: Blockly.Block) => {
    const value = JavaScript.valueToCode(block, 'returnVal', JavaScript.ORDER_ATOMIC)
    return `return ${value};\n`
  }

  Blockly.Blocks.block_null = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField('null')
      this.setOutput(true, null)
    },
  }
  JavaScript.block_null = () => ['null', JavaScript.ORDER_ATOMIC]
}

/**
 * 注册第一批与 Logic Editor 基础过程数据对应的无界面块。
 * 注册保持幂等，避免 Vite 热更新或多个生成器实例重复覆盖全局定义。
 */
export function registerCoreBlocklyBlocks(): void {
  if (registered) return
  registerStatementWrapper()
  registerTemporaryVariables()
  registerBasicStatements()
  registerMathBlocklyBlocks()
  registerVariableBlocklyBlocks()
  registerControlBlocklyBlocks()
  registerCollectionBlocklyBlocks()
  registerBusinessBlocklyBlocks()
  registerIntegrationBlocklyBlocks()
  registered = true
}
