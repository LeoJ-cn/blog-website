import { BlocklyCodeGenerator } from './BlocklyCodeGenerator'
import { MethodCodeGenerator } from './MethodCodeGenerator'
import { PageCodeGenerator } from './PageCodeGenerator'
import type {
  CodeGenerationResult,
  GenerateBlocklyCodeInput,
  GenerateMethodCodeInput,
  GeneratePageCodeInput,
} from './types'

export function generateBlocklyCode(input: GenerateBlocklyCodeInput): CodeGenerationResult {
  return new BlocklyCodeGenerator().generate(input)
}

export function generateMethodCode(input: GenerateMethodCodeInput): CodeGenerationResult {
  return new MethodCodeGenerator().generate(input)
}

export function generatePageCode(input: GeneratePageCodeInput): CodeGenerationResult {
  return new PageCodeGenerator().generate(input)
}

export { BlocklyCodeGenerator, MethodCodeGenerator, PageCodeGenerator }
export type {
  CodeGenerationDiagnostic,
  CodeGenerationResult,
  CodeGenerationStage,
  GenerateBlocklyCodeInput,
  GenerateMethodCodeInput,
  GeneratePageCodeInput,
} from './types'
