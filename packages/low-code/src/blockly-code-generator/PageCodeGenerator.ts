import { DataCategory } from '../types/data'
import type { Data } from '../types/data'
import type { LogicEditorLifecycleBinding } from '../types/logic-editor'
import type { Method } from '../types/method'
import { BlocklyCodeGenerator } from './BlocklyCodeGenerator'
import type { CodeGenerationDiagnostic, CodeGenerationResult, GeneratePageCodeInput } from './types'

const VUE_3_LIFECYCLE_MAP: Record<string, string> = {
  created: 'created',
  mounted: 'mounted',
  // 旧编辑器持久化的是 Vue 2 名称，生成 Vue 3 页面时必须转换。
  destroyed: 'unmounted',
}

function indent(code: string, spaces: number): string {
  const padding = ' '.repeat(spaces)
  return code
    .split('\n')
    .filter((line, index, lines) => line || index < lines.length - 1)
    .map((line) => `${padding}${line}`)
    .join('\n')
}

function serializeValue(data: Data): string {
  if (data.value === undefined) return 'undefined'
  const serialized = JSON.stringify(data.value, null, 2)
  if (serialized === undefined) return 'undefined'
  return serialized
}

function generateDataOption(data: Data[]): string {
  const pageData = data.filter((item) => !item.is_delete && (!item.category || item.category === DataCategory.Page))
  const properties = pageData.map((item) => {
    const value = serializeValue(item)
    return `${JSON.stringify(item.name)}: ${value.includes('\n') ? `\n${indent(value, 8)}` : value}`
  })
  const body = properties.length ? `${indent(properties.join(',\n'), 6)}\n    ` : ''
  return `  data() {\n    return {\n${body}}\n  }`
}

function findMethod(bindingMethodId: string, methods: Method[]): Method | undefined {
  return methods.find((method) => method.id === bindingMethodId || method.uuid === bindingMethodId)
}

function generateLifecycleOptions(
  bindings: LogicEditorLifecycleBinding[],
  methods: Method[],
  diagnostics: CodeGenerationDiagnostic[],
): string[] {
  return bindings.flatMap((binding) => {
    const lifecycle = VUE_3_LIFECYCLE_MAP[binding.lifecycle]
    if (!lifecycle) {
      diagnostics.push({ stage: 'assemble', message: `不支持的页面生命周期：${binding.lifecycle}` })
      return []
    }

    const calls = binding.methodIds.flatMap((methodId) => {
      const method = findMethod(methodId, methods)
      if (!method) {
        diagnostics.push({ stage: 'assemble', message: `生命周期 ${binding.lifecycle} 引用了不存在的方法：${methodId}` })
        return []
      }
      return [`    await this[${JSON.stringify(method.funcName)}]()`]
    })
    if (!calls.length) return []
    return [`  async ${lifecycle}() {\n${calls.join('\n')}\n  }`]
  })
}

/** 将页面变量、Blockly 方法和生命周期绑定组装成完整的 Vue 3 Options API 页面源码。 */
export class PageCodeGenerator {
  private readonly blocklyGenerator = new BlocklyCodeGenerator()

  public generate(input: GeneratePageCodeInput): CodeGenerationResult {
    const diagnostics: CodeGenerationDiagnostic[] = []
    const activeMethods = input.methods.filter((method) => !method.is_delete)
    const methodEntries = activeMethods.flatMap((method) => {
      const result = method.blockData
        ? this.blocklyGenerator.generate({ blockData: method.blockData, data: input.data, methods: activeMethods })
        : { code: '', diagnostics: [] }
      diagnostics.push(...result.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        message: `方法“${method.funcLabel || method.funcName}”：${diagnostic.message}`,
      })))
      if (result.diagnostics.length) return []

      const parameters = method.parameters.map((parameter) => parameter.name).join(', ')
      const asyncPrefix = /\bawait\b/.test(result.code) ? 'async ' : ''
      const body = result.code ? `\n${indent(result.code, 6)}\n    ` : ''
      return [`    ${asyncPrefix}${JSON.stringify(method.funcName)}(${parameters}) {${body}}`]
    })

    try {
      const options = [
        generateDataOption(input.data),
        ...generateLifecycleOptions(input.lifecycleBindings || [], activeMethods, diagnostics),
        `  methods: {\n${methodEntries.join(',\n')}\n  }`,
      ]
      if (diagnostics.length) return { code: '', diagnostics }
      return { code: `export default {\n${options.join(',\n\n')}\n}\n`, diagnostics }
    } catch (error) {
      diagnostics.push({
        stage: 'assemble',
        message: error instanceof Error ? error.message : String(error),
      })
      return { code: '', diagnostics }
    }
  }
}
