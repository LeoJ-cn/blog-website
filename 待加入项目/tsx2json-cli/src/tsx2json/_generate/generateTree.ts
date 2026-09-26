import { CompilerApi, SourceFile } from '../compiler'
import OPTION_CONFIG from '../Option.config'
import { getChildrenFunction } from '../compiler'
import { getSyntaxKindName } from '../utils'
import { geAttrs } from './generateComponentAttrs'
import { getRootApi, getRootSourceFile, getRootBindingTools } from '../store'

interface LooseObject {
  [key: string]: any
}

let rootSourceFile: SourceFile
let rootApi: CompilerApi
function getTargetDataTree(api: any, tsNode: any, getChildren: any) {
  const children = getChildren(tsNode)
  const kindName = getSyntaxKindName(api, tsNode.kind)

  // TODO:zm 换掉‘魔字符串’的逻辑
  if (kindName === 'ClassDeclaration') {
    // ast 渲染可视化的树
    const treeResult: LooseObject = {}
    transformData(treeResult, api, tsNode, getChildren)
    const cc = treeResult.children
    for (let i = 0; i < cc.length; i++) {
      const iNode = cc[i]
      geAttrs(iNode, getRootBindingTools(), treeResult.tsDescMap)
    }
    return treeResult
  }

  if (children.length === 0) {
    // 叶子结点
    return null
  } else {
    let iResult: any
    for (let i = 0; i < children.length - 1; i++) {
      const iNode = children[i]
      iResult = getTargetDataTree(api, iNode, getChildren)
      if (iResult) {
        break
      }
    }
    return iResult
  }
}

function transformData(currentObj: any, api: any, tsNode: any, getChildren: any) {
  const children = getChildren(tsNode)
  const kindName = getSyntaxKindName(api, tsNode.kind)

  const fileText: string = rootSourceFile.text.substring(
    tsNode.getStart(rootSourceFile),
    tsNode.getEnd(),
  )

  // ***定义解析数据结构***
  const tsDescMap = {
    kindName,
    // fullText: tsNode.getFullText(rootSourceFile),
    singleText: fileText.replace(/[\t\r\n]/g, ''),
    schema: {
      tag: '', // 组件tag
      props: {}, // prop
      events: {}, // @Emit事件
    },
    __SchemaWordbook: {} as LooseObject, // 所有的数据类型(生成模拟文件，分析数据类型)
    PropList: [],
    MethodList: [],
  }

  let tChildren = []
  if (children.length === 0) {
    // 叶子结点
    return {
      children: [],
      kindName,
      tsNode,
      tsDescMap,
    }
  } else {
    for (let i = 0; i < children.length; i++) {
      const childObject = {}
      const iNode = children[i]
      // TODO:zm 这里是否有必要深度遍历，class下面一层即可
      tChildren.push(transformData(childObject, api, iNode, getChildren))
    }
  }
  currentObj.children = tChildren
  currentObj.kindName = kindName
  currentObj.tsNode = tsNode
  currentObj.tsDescMap = tsDescMap
  return currentObj
}

export function geTarget() {
  rootSourceFile = getRootSourceFile()
  rootApi = getRootApi()
  const treeData = getTargetDataTree(
    rootApi,
    rootSourceFile,
    getChildrenFunction(OPTION_CONFIG.treeMode, rootSourceFile),
  )
  if (!treeData) {
    throw new Error('请检查组件：「tsx文件」没有匹配到 「@component」')
  }
  return treeData
}
