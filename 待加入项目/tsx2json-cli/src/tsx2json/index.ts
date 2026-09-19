import OPTION_CONFIG from './Option.config'
import { CompilerPackageNames } from "./shared";
import { getCompilerApi, createSourceFile, getPublicApiInfo } from "./compiler";
import { isInited, setInited, getRootApi, setRootApi, setRootSourceFile, setRootBindingTools, setRootPublicApiInfo } from './store'
import { geTarget } from './_generate/generateTree'



export async function initTs2Json() {
  if (isInited()) return
  await initCompilerApi();
  await initPublicApi();
  setInited();
}

export function getFileDefinition(code: string) {
  return generateFileDefinition(OPTION_CONFIG.compilerPackageName, code, OPTION_CONFIG);
}

function initCompilerApi() {
  return getCompilerApi(OPTION_CONFIG.compilerPackageName).then(cacheApi => {
    setRootApi(cacheApi)
  }).catch(err => {
    throw new Error('[tsxjson]: 解析接口 getCompilerApi 初始化失败!')
  });
}

function initPublicApi() {
  return getPublicApiInfo(OPTION_CONFIG.compilerPackageName).then(publicApiInfo => {
    setRootPublicApiInfo(publicApiInfo)
  }).catch(err => {
    throw new Error('[tsxjson]: 依赖接口 getPublicApiInfo 初始化失败!')
  });
}

function generateFileDefinition(compilerPackageName: CompilerPackageNames, code: string, options: any) {
  const cacheApi: any = getRootApi()
  const { sourceFile, bindingTools } = createSourceFile(cacheApi, code, options.scriptTarget, options.scriptKind);
  setRootSourceFile(sourceFile)
  setRootBindingTools(bindingTools)

  let schema;
  let TsResult;
  if (code) {
    TsResult = geTarget()
    try {
      schema = TsResult.tsDescMap.schema
    } catch {
      throw new Error('[tsxjson]: 分析异常，请检查解析逻辑！')
    }
  }



  return {
    __SchemaWordbook: TsResult?.tsDescMap?.__SchemaWordbook || {},
    schema,
    TsResult,

    packageName: compilerPackageName,
    api: cacheApi,
    sourceFile,
    bindingTools,
    selectedNode: sourceFile,
  }
}


