import * as Blockly from 'blockly'

import { JavaScript } from '../blockly-javascript'

type SchemaTemporaryBlock = Blockly.Block & { variableName?: string }

let registered = false

function value(block: Blockly.Block, name: string, fallback = ''): string {
  return JavaScript.valueToCode(block, name, JavaScript.ORDER_NONE) || fallback
}

/** 注册无需旧宿主远程元数据即可确定语义的集成块。 */
export function registerIntegrationBlocklyBlocks(): void {
  if (registered) return

  Blockly.Blocks.block_schema_set_temp = {
    init(this: SchemaTemporaryBlock) {
      this.appendValueInput('value').setCheck(null).appendField(new Blockly.FieldTextInput('temp'), 'temp')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
    mutationToDom(this: SchemaTemporaryBlock) {
      const mutation = Blockly.utils.xml.createElement('mutation')
      mutation.setAttribute('varName', this.variableName || this.getFieldValue('temp') || 'temp')
      return mutation
    },
    domToMutation(this: SchemaTemporaryBlock, element: Element) {
      this.variableName = element.getAttribute('varName') || element.getAttribute('variableName') || 'temp'
      this.setFieldValue(this.variableName, 'temp')
    },
  }
  JavaScript.block_schema_set_temp = (block: Blockly.Block) => {
    const name = block.getFieldValue('temp') || 'temp'
    return `var ${name} = ${value(block, 'value', 'null')};\n`
  }

  Blockly.Blocks.network_callapi_request = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput('idg'), 'requestStart')
        .appendField(new Blockly.FieldTextInput('get'), 'method')
      this.appendValueInput('url').setCheck(null)
      this.appendValueInput('params').setCheck(null)
      this.appendValueInput('request_header').setCheck(null)
      this.appendValueInput('request_stack').setCheck(null)
      this.setOutput(true, null)
    },
  }
  JavaScript.network_callapi_request = (block: Blockly.Block) => {
    const method = block.getFieldValue('method') || 'get'
    const url = value(block, 'url', "''")
    const params = value(block, 'params')
    const headers = value(block, 'request_header')
    const requestStack = value(block, 'request_stack')
    const payloadKey = method.toLowerCase() === 'get' ? 'params' : 'data'
    const code = `await this.$idg.callService({ url: ${url}, method: ${JSON.stringify(method)}${params ? `, ${payloadKey}: ${params}` : ''}${headers ? `, headers: ${headers}` : ''}${requestStack ? `, requestStack: ${requestStack}` : ''} })`
    return [code, JavaScript.ORDER_FUNCTION_CALL]
  }

  registered = true
}

function childNames(element: Element, tagName: 'field' | 'value'): string[] {
  return Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === tagName)
    .map((child) => child.getAttribute('name') || '')
    .filter(Boolean)
}

function registerHostDependentShape(type: string, fields: string[], inputs: string[], output: boolean): void {
  Blockly.Blocks[type] = {
    init(this: Blockly.Block) {
      const dummy = this.appendDummyInput()
      fields.forEach((field) => dummy.appendField(new Blockly.FieldTextInput(''), field))
      inputs.forEach((inputName) => this.appendValueInput(inputName).setCheck(null))
      if (output) this.setOutput(true, null)
      else {
        this.setPreviousStatement(true, null)
        this.setNextStatement(true, null)
      }
    },
  }
  JavaScript[type] = () => {
    throw new Error(`块 ${type} 依赖旧 AssetCenter 元数据，当前代码生成上下文尚未提供对应解析器`)
  }
}

/**
 * 旧 API 与 mini-method 块的形态来自远程元数据。这里先保证 XML 可恢复，
 * 缺少元数据时在 generate 阶段给出准确诊断，而不是误报为未知 Blockly 块。
 */
export function prepareHostDependentBlocklyBlocks(xml: Element): void {
  const sourceTypes = ['call_api', 'block_method_minimethod']
  sourceTypes.forEach((sourceType) => {
    const blocks = Array.from(xml.getElementsByTagName('block'))
      .filter((block) => block.getAttribute('type') === sourceType)

    blocks.forEach((block, index) => {
      const output = block.parentElement?.tagName.toLowerCase() === 'value'
      const internalType = `${sourceType}_${output ? 'output' : 'statement'}_${index}`
      block.setAttribute('type', internalType)
      registerHostDependentShape(
        internalType,
        childNames(block, 'field'),
        childNames(block, 'value'),
        output,
      )
    })
  })
}
