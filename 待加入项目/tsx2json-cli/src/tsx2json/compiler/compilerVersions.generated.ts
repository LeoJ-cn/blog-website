// dprint-ignore-file
/* Automatically maintained from package.json. Do not edit! */

import * as TsSource from 'typescript'
import * as TsLibs from '../resources/libFiles/typescript/index'
import * as TsPub from '../resources/publicApiInfo/typescript'

import { CompilerPackageNames } from '../shared'
import { assertNever } from '../utils'

export async function importCompilerApi(packageName: CompilerPackageNames) {
  switch (packageName) {
    case 'typescript':
      return TsSource
    default:
      return assertNever(packageName, `Not implemented version: ${packageName}`)
  }
}

export async function importLibFiles(packageName: CompilerPackageNames) {
  switch (packageName) {
    case 'typescript':
      return TsLibs
    default:
      return assertNever(packageName, `Not implemented version: ${packageName}`)
  }
}
export interface PublicApiInfo {
  nodePropertiesBySyntaxKind: Map<string, Set<string>>
  symbolProperties: Set<string>
  typeProperties: Set<string>
  signatureProperties: Set<string>
}

export async function getPublicApiInfo(packageName: CompilerPackageNames): Promise<PublicApiInfo> {
  switch (packageName) {
    case 'typescript':
      return TsPub
    default:
      return assertNever(packageName, `Not implemented version: ${packageName}`)
  }
}
