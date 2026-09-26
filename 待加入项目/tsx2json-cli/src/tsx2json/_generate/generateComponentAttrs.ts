import { getRootSourceFile, getRootApi, getRootPublicApiInfo } from '../store'
import {
  CompilerApi,
  Node,
  PublicApiInfo,
  SourceFile,
  Symbol,
  Type,
  TypeChecker,
} from '../compiler'
import OPTION_CONFIG from '../Option.config'
import { getEmitSchema, getPropSchema } from './tsType2JsonSchema'
import * as _ from 'lodash'

interface Context {
  api: CompilerApi
  publicApiInfo: PublicApiInfo | undefined | false
  showInternals: boolean
  sourceFile: SourceFile
}

interface LooseObject {
  [key: string]: any
}
interface GeClassNameParams {
  rootTsNodeInfo: LooseObject
  typeRootLabel: string
}

interface GeCommonParams {
  rootTsNodeInfo: LooseObject
  tsSource: any
  typeRootLabel: string
  typeChecker: TypeChecker
}

export function geAttrs(tsSource: any, bindingTools: any, rootTsNodeInfo: LooseObject) {
  const context: Context = {
    api: getRootApi(),
    publicApiInfo: getRootPublicApiInfo(),
    showInternals: OPTION_CONFIG.showInternals,
    sourceFile: getRootSourceFile(),
  }

  const typeChecker = bindingTools().typeChecker
  const typeRootLabel = getForType(context, tsSource.tsNode, typeChecker)

  // PS 这里只对 ClassDeclaration【@component】的子节点做分析
  switch (tsSource.tsDescMap.kindName) {
    case 'Identifier':
      geClassName({
        rootTsNodeInfo,
        typeRootLabel,
      })
      break
    case 'PropertyDeclaration':
      gePropList({
        rootTsNodeInfo,
        tsSource,
        typeRootLabel,
        typeChecker,
      })
      break
    case 'MethodDeclaration':
      GeMethodDeclaration({
        rootTsNodeInfo,
        tsSource,
        typeRootLabel,
        typeChecker,
      })
      break
    case 'Decorator':
    case 'ExportKeyword':
    case 'DefaultKeyword':
    case 'HeritageClause':
    default:
      break
  }
}

// @装饰器正则校验
function isDecoratorExist(keyword: string, textLabel: string) {
  return new RegExp(`^@\s*${keyword}\s*\\(`, 'm').test(textLabel)
}

// 生成 类名
function geClassName(params: GeClassNameParams) {
  const { rootTsNodeInfo, typeRootLabel } = params
  rootTsNodeInfo.ClassName = typeRootLabel
  rootTsNodeInfo.schema.tag = typeRootLabel
}

// 生成 Prop
function gePropList(params: GeCommonParams) {
  const {
    rootTsNodeInfo,
    tsSource: {
      tsDescMap: { singleText = '' },
      tsNode,
    },
    typeRootLabel,
    typeChecker,
  } = params
  // prop 或者 其他变量
  if (isDecoratorExist('Prop', singleText)) {
    const defaultValue = singleText.replace(/\s/g, '').replace(/@Prop\((.*)\).+/g, '$1')
    const propName = getForSymbol(tsNode, typeChecker)
    const propSchema = getPropSchema(
      typeRootLabel,
      defaultValue,
      propName,
      rootTsNodeInfo.__SchemaWordbook,
    )

    rootTsNodeInfo.schema.props = {
      ...rootTsNodeInfo.schema.props,
      ...propSchema,
    }
    rootTsNodeInfo.PropList.push({
      propType: typeRootLabel,
      propName,
      schema: propSchema,
    })
  }
}

// 生成 emit
function GeMethodDeclaration(params: GeCommonParams) {
  const {
    rootTsNodeInfo,
    tsSource: {
      children = [],
      tsDescMap: { singleText = '' },
      tsNode,
    },
    typeRootLabel,
    typeChecker,
  } = params

  // 基本方法，@Emit、@Watch等
  // 目前只处理 @Emit
  if (isDecoratorExist('Emit', singleText)) {
    const emitHandlerMatch: any = singleText.replace(/\s/g, '').match(/@Emit\(['"](.*?)['"]\).+/m)
    const methodName =
      (emitHandlerMatch && emitHandlerMatch[1]) || getForSymbol(tsNode, typeChecker)

    const Parameter_TsNode = _.filter(children, { kindName: 'Parameter' }) || []
    const payloadParams = _.map(Parameter_TsNode, (item) => item.tsDescMap.singleText)
    const returnTsType = typeRootLabel.replace(/\s/g, '').replace(/.*=>(.*)/g, '$1')
    const emitSchema = getEmitSchema(
      returnTsType,
      methodName,
      payloadParams,
      rootTsNodeInfo.__SchemaWordbook,
    )

    rootTsNodeInfo.schema.events = {
      ...rootTsNodeInfo.schema.events,
      ...emitSchema,
    }
    rootTsNodeInfo.MethodList.push({
      schema: emitSchema,
      methodReturn: typeRootLabel,
      methodName,
    })
  }
}

function getForType(context: Context, tsNode: Node, typeChecker: TypeChecker) {
  function getTypeToString() {
    try {
      return typeChecker.typeToString(type as Type, tsNode)
    } catch (err) {
      return `[Problem getting type text: ${err}]`
    }
  }

  if (tsNode.kind === context.api.SyntaxKind.SourceFile) {
    return ''
  }
  const type = getOrReturnError(() => typeChecker.getTypeAtLocation(tsNode))
  if (type == null) {
    return '[None]'
  }
  if (typeof type === 'string') {
    return '[Error]'
  }

  const typeRootLabel = getTypeToString() || 'Type'
  return typeRootLabel
}

function getOrReturnError<T>(getFunc: () => T): T | string {
  try {
    return getFunc()
  } catch (err) {
    return JSON.stringify(err)
  }
}

function getForSymbol(tsNode: Node, typeChecker: TypeChecker) {
  function getSymbolName() {
    try {
      return (symbol as Symbol).getName()
    } catch (err) {
      return `[Problem getting symbol name: ${err}]`
    }
  }

  const symbol = getOrReturnError(
    () => ((tsNode as any).symbol as Symbol | undefined) || typeChecker.getSymbolAtLocation(tsNode),
  )
  if (symbol == null) {
    return ''
  }
  if (typeof symbol === 'string') {
    return ''
  }

  return getSymbolName() || 'Symbol'
}
