import './blockly-locale'

import * as Blockly from 'blockly'

import { JavaScript } from './blockly-javascript'
import { registerCoreBlocklyBlocks } from './blocks/core'
import { prepareFunctionBlocklyBlocks } from './blocks/functions'
import { prepareHostDependentBlocklyBlocks } from './blocks/integration'
import { DataRegistry } from './context/DataRegistry'
import { MethodRegistry } from './context/MethodRegistry'
import type { CodeGenerationWorkspace } from './context/workspace'
import type { CodeGenerationDiagnostic, CodeGenerationResult, GenerateBlocklyCodeInput } from './types'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 将 Blockly XML 翻译成 JavaScript；实例不持有 Logic Editor 或页面状态。 */
export class BlocklyCodeGenerator {
  public generate(input: GenerateBlocklyCodeInput): CodeGenerationResult {
    const diagnostics: CodeGenerationDiagnostic[] = []
    registerCoreBlocklyBlocks()

    let xml: Element
    try {
      xml = Blockly.Xml.textToDom(input.blockData)
      prepareFunctionBlocklyBlocks(xml)
      prepareHostDependentBlocklyBlocks(xml)
    } catch (error) {
      diagnostics.push({ stage: 'parse', message: getErrorMessage(error) })
      return { code: '', diagnostics }
    }

    const workspace = new Blockly.Workspace() as CodeGenerationWorkspace
    workspace.dataRegistry = new DataRegistry(input.data)
    workspace.methodRegistry = new MethodRegistry(input.methods)
    try {
      Blockly.Xml.domToWorkspace(xml, workspace)
    } catch (error) {
      diagnostics.push({ stage: 'workspace', message: getErrorMessage(error) })
      workspace.dispose()
      return { code: '', diagnostics }
    }

    try {
      return {
        code: JavaScript.workspaceToCode(workspace),
        diagnostics,
      }
    } catch (error) {
      diagnostics.push({ stage: 'generate', message: getErrorMessage(error) })
      return { code: '', diagnostics }
    } finally {
      workspace.dispose()
    }
  }
}
