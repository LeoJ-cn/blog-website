import type { GraphData } from '@antv/g6'
import type { DefineComponent } from 'vue'
import type { LowCodeCompatibilityContext } from './compatibility/types'
import type { SimpleProcessData } from './types/process'

export const LogicEditor: DefineComponent<{
  modelValue: GraphData
  context: LowCodeCompatibilityContext
}>

export class LogicEditorService {
  constructor(graphData: GraphData, rootMethodId: string)
  blockly: string
  processData: SimpleProcessData[]
  translateErrorList: unknown[]
}

export function createLowCodeContext(options: LowCodeCompatibilityContext): LowCodeCompatibilityContext

export type {
  LowCodeCompatibilityContext,
  LowCodeControllerAdapter,
  LowCodeDispatcherAdapter,
  LowCodeFeedbackAdapter,
  LowCodeLogicNodeRecord,
  LowCodeStoreAdapter,
} from './compatibility/types'
export type { Data } from './types/data'
export { DataCategory, DataType } from './types/data'
export type { Method } from './types/method'
export { MethodType, MethodWatchType } from './types/method'
export type {
  LogicEditorGraphSnapshot,
  LogicEditorLifecycleBinding,
  LogicEditorSavePayload,
} from './types/logic-editor'
export type { SimpleProcessData } from './types/process'
export {
  BlocklyCodeGenerator,
  MethodCodeGenerator,
  PageCodeGenerator,
  generateBlocklyCode,
  generateMethodCode,
  generatePageCode,
} from './blockly-code-generator'
export type {
  CodeGenerationDiagnostic,
  CodeGenerationResult,
  CodeGenerationStage,
  GenerateBlocklyCodeInput,
  GenerateMethodCodeInput,
  GeneratePageCodeInput,
} from './blockly-code-generator'
export type { Schema } from './types/schema'
export type { GraphData } from '@antv/g6'
