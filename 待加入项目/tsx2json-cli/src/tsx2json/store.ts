import {
  CompilerApi,
  PublicApiInfo,
  SourceFile,
} from "./compiler";

type LooseObject = {
  [key: string]: any
}
interface StoreData {
  isInited?: boolean,
  rootSourceFile?: SourceFile,
  rootApi?: CompilerApi,
  rootPublicApiInfo?: PublicApiInfo,
  rootBindingTools?: LooseObject
}

const storeData: StoreData = { isInited: false }

export const isInited = () => {
  return storeData.isInited
}

export const setInited = () => {
  storeData.isInited = true
}

export const getRootApi = () => {
  return storeData.rootApi as CompilerApi
}

export const setRootApi = (api: CompilerApi) => {
  storeData.rootApi = api
}

export const getRootSourceFile = () => {
  return storeData.rootSourceFile as SourceFile
}
export const setRootSourceFile = (rootSourceFile: SourceFile) => {
  storeData.rootSourceFile = rootSourceFile
}
export const getRootPublicApiInfo = (): PublicApiInfo => {
  return storeData.rootPublicApiInfo as PublicApiInfo
}

export const setRootPublicApiInfo = (rootPublicApiInfo: PublicApiInfo) => {
  storeData.rootPublicApiInfo = rootPublicApiInfo
}

export const getRootBindingTools = () => {
  return storeData?.rootBindingTools
}
export const setRootBindingTools = (rootBindingTools: object) => {
  storeData.rootBindingTools = rootBindingTools
}
