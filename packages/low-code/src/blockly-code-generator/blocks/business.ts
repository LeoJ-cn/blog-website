import * as Blockly from 'blockly'

import { JavaScript } from '../blockly-javascript'

let registered = false

function value(block: Blockly.Block, name: string, fallback = ''): string {
  return JavaScript.valueToCode(block, name, JavaScript.ORDER_NONE) || fallback
}

/** 注册当前逻辑编辑器直接产出的路由、提示与多语言块。 */
export function registerBusinessBlocklyBlocks(): void {
  if (registered) return

  Blockly.Blocks.show_message = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('info'), 'type')
      this.appendValueInput('content').setCheck(null)
      this.appendValueInput('message_duration').setCheck(null)
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.show_message = (block: Blockly.Block) => {
    const type = block.getFieldValue('type') || 'info'
    const content = value(block, 'content', "''")
    const duration = value(block, 'message_duration')
    return `this.$Message.${type}(${content}${duration ? `, ${duration}` : ''});\n`
  }

  Blockly.Blocks.show_notice = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('info'), 'type')
      this.appendValueInput('title').setCheck(null)
      this.appendValueInput('notice_content').setCheck(null)
      this.appendValueInput('notice_duration').setCheck(null)
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.show_notice = (block: Blockly.Block) => {
    const type = block.getFieldValue('type') || 'info'
    const title = value(block, 'title', "''")
    const content = value(block, 'notice_content')
    const duration = value(block, 'notice_duration')
    return `this.$Notice.${type}({ title: ${title}${content ? `, desc: ${content}` : ''}${duration ? `, duration: ${duration}` : ''} });\n`
  }

  Blockly.Blocks.route = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('path'), 'routecontent')
      this.setOutput(true, null)
    },
  }
  JavaScript.route = (block: Blockly.Block) => [`this.$route.${block.getFieldValue('routecontent') || 'path'}`, JavaScript.ORDER_MEMBER]

  Blockly.Blocks.router_link_dynamic = {
    init(this: Blockly.Block) {
      this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(''), 'route')
        .appendField(new Blockly.FieldTextInput('path'), 'textType')
      this.appendValueInput('param').setCheck(null)
      this.appendValueInput('query').setCheck(null)
      this.appendValueInput('page').setCheck(null)
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.router_link_dynamic = (block: Blockly.Block) => {
    const route = JSON.stringify(block.getFieldValue('route') || '')
    const textType = block.getFieldValue('textType') || 'path'
    const params = value(block, 'param')
    const query = value(block, 'query')
    const page = value(block, 'page')
    return `this.$idg.routerPush({ ${textType}: ${route}${params ? `, params: ${params}` : ''}${query ? `, query: ${query}` : ''}${page ? `, page: ${page}` : ''} });\n`
  }

  Blockly.Blocks.block_multilingual_choose = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput(''), 'pageLocaleValue')
      this.setOutput(true, null)
    },
  }
  JavaScript.block_multilingual_choose = (block: Blockly.Block) => [
    `this.$l(\`\${PAGE_UUID}.${block.getFieldValue('pageLocaleValue') || ''}\`)`,
    JavaScript.ORDER_FUNCTION_CALL,
  ]

  Blockly.Blocks.block_multi_lang_get = {
    init(this: Blockly.Block) { this.setOutput(true, null) },
  }
  JavaScript.block_multi_lang_get = () => ['this.$i18n.locale', JavaScript.ORDER_MEMBER]

  Blockly.Blocks.block_multi_lang_set = {
    init(this: Blockly.Block) {
      this.appendDummyInput().appendField(new Blockly.FieldTextInput('en'), 'lang')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
    },
  }
  JavaScript.block_multi_lang_set = (block: Blockly.Block) => `this.$i18n.locale = ${JSON.stringify(block.getFieldValue('lang') || 'en')};\n`

  registered = true
}
