import * as Blockly from 'blockly'

import { DataCategory } from '../../types/data'
import { JavaScript } from '../blockly-javascript'
import type { CodeGenerationWorkspace } from '../context/workspace'

type VariableBlock = Blockly.Block & {
  dataId?: string
  itemName?: string
  valueList?: string[]
}

let registered = false

function readList(element: Element, attribute: string): string[] {
  const raw = element.getAttribute(attribute) || '[]'
  return JSON.parse(raw.replace(/'/g, '"')) as string[]
}

function pathToCode(path: string[]): string {
  const [root = '', ...segments] = path
  return root + segments.map((segment) => `[${JSON.stringify(segment)}]`).join('')
}

function memberPathToCode(root: string, segments: string[]): string {
  return root + segments.map((segment) => `[${JSON.stringify(segment)}]`).join('')
}

function registerLocalVariable(): void {
  Blockly.Blocks.item_get_cascader = {
    init(this: VariableBlock) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('item'), 'itemName')
      this.setOutput(true, null)
    },
    mutationToDom(this: VariableBlock) {
      const mutation = Blockly.utils.xml.createElement('mutation')
      mutation.setAttribute('itemName', this.itemName || '')
      mutation.setAttribute('valueList', JSON.stringify(this.valueList || []))
      return mutation
    },
    domToMutation(this: VariableBlock, element: Element) {
      this.itemName = element.getAttribute('itemName') || ''
      this.valueList = readList(element, 'valueList')
    },
  }
  JavaScript.item_get_cascader = (block: VariableBlock) => [
    pathToCode(block.valueList?.length ? block.valueList : [block.getFieldValue('itemName')]),
    JavaScript.ORDER_MEMBER,
  ]
}

function registerPageVariable(): void {
  Blockly.Blocks.data_schema_get_cascader = {
    init(this: VariableBlock) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('data'), 'data')
      this.setOutput(true, null)
    },
    mutationToDom(this: VariableBlock) {
      const mutation = Blockly.utils.xml.createElement('mutation')
      mutation.setAttribute('dataId', this.dataId || '')
      mutation.setAttribute('valueList', JSON.stringify(this.valueList || []))
      return mutation
    },
    domToMutation(this: VariableBlock, element: Element) {
      this.dataId = element.getAttribute('dataId') || ''
      this.valueList = readList(element, 'valueList')
    },
  }
  JavaScript.data_schema_get_cascader = (block: VariableBlock) => {
    const path = block.valueList?.length ? [...block.valueList] : [block.dataId || block.getFieldValue('data')]
    const registry = (block.workspace as CodeGenerationWorkspace).dataRegistry
    const data = registry?.get(path[0])
    if (!data) return [pathToCode(path), JavaScript.ORDER_MEMBER]

    const segments = path.slice(1)
    if (data.category === DataCategory.Temp) {
      return [memberPathToCode(data.name, segments), JavaScript.ORDER_MEMBER]
    }
    if (data.category === DataCategory.Global) {
      // Web 端全局变量由宿主存储提供；await 会让外层方法自动生成为 async。
      const storageCode = `(await this.$idg.storage.getItem(${JSON.stringify(data.name)}))`
      return [memberPathToCode(storageCode, segments), JavaScript.ORDER_MEMBER]
    }

    // 页面、路由、组件、接口和 Prop 数据都挂载在当前页面实例上。
    return [memberPathToCode('this', [data.name, ...segments]), JavaScript.ORDER_MEMBER]
  }
}

function registerObjectMember(): void {
  Blockly.Blocks.block_get_objectvalue = {
    init(this: Blockly.Block) {
      this.appendValueInput('object').setCheck(null)
      this.appendValueInput('attribute').setCheck(null)
      this.setOutput(true, null)
    },
  }
  JavaScript.block_get_objectvalue = (block: Blockly.Block) => {
    const object = JavaScript.valueToCode(block, 'object', JavaScript.ORDER_MEMBER) || 'undefined'
    const attribute = JavaScript.valueToCode(block, 'attribute', JavaScript.ORDER_NONE) || "''"
    return [`${object}[${attribute}]`, JavaScript.ORDER_MEMBER]
  }
}

/** 注册局部变量、页面变量和对象路径读取块。 */
export function registerVariableBlocklyBlocks(): void {
  if (registered) return
  registerLocalVariable()
  registerPageVariable()
  registerObjectMember()
  registered = true
}
