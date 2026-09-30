import { BlocklyCodeGenerator } from './BlocklyCodeGenerator'
import type { CodeGenerationResult, GenerateMethodCodeInput } from './types'

/**
 * 为单个方法生成函数源码。当前只封装参数和方法体；数据、组件及调试上下文将在对应块迁移时接入。
 */
export class MethodCodeGenerator {
  private readonly blocklyGenerator = new BlocklyCodeGenerator()

  public generate(input: GenerateMethodCodeInput): CodeGenerationResult {
    const bodyResult = this.blocklyGenerator.generate({
      blockData: input.blockData,
      data: input.data,
      methods: input.methods,
    })
    if (bodyResult.diagnostics.length) return bodyResult

    const parameters = input.method.parameters.map((parameter) => parameter.name).join(', ')
    const asyncPrefix = /\bawait\b/.test(bodyResult.code) ? 'async ' : ''
    const indentedBody = bodyResult.code
      .split('\n')
      .filter((line, index, lines) => line || index < lines.length - 1)
      .map((line) => `  ${line}`)
      .join('\n')

    return {
      code: `${asyncPrefix}(${parameters}) => {\n${indentedBody}\n}`,
      diagnostics: [],
    }
  }
}
