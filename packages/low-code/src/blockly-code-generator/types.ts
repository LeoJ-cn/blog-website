import type { ComponentTree } from '../types/component'
import type { Data } from '../types/data'
import type { LogicEditorLifecycleBinding } from '../types/logic-editor'
import type { Method } from '../types/method'

/** 代码生成失败阶段，用于区分 XML、块覆盖、Workspace、JavaScript 生成和页面组装错误。 */
export type CodeGenerationStage = 'parse' | 'coverage' | 'workspace' | 'generate' | 'assemble'

export interface CodeGenerationDiagnostic {
  stage: CodeGenerationStage
  message: string
}

export interface GenerateBlocklyCodeInput {
  /** Logic Editor 保存得到的 Blockly XML，不接受 GraphData。 */
  blockData: string
  /** 页面变量索引用于把旧 XML 中的稳定 ID 还原成变量名。 */
  data?: Data[]
  /** 方法索引用于把调用块和方法引用中的稳定 ID 还原成函数名。 */
  methods?: Method[]
}

export interface GenerateMethodCodeInput extends GenerateBlocklyCodeInput {
  method: Method
  methods?: Method[]
  components?: ComponentTree[]
}

export interface GeneratePageCodeInput {
  /** 页面变量会生成到 Options API 的 `data()` 中。 */
  data: Data[]
  /** 每个方法使用各自已提交的 `blockData` 生成，不能使用编辑器当前画布代替。 */
  methods: Method[]
  /** 生命周期中的方法 ID 按数组顺序依次执行。 */
  lifecycleBindings?: LogicEditorLifecycleBinding[]
}

export interface CodeGenerationResult {
  code: string
  diagnostics: CodeGenerationDiagnostic[]
}
