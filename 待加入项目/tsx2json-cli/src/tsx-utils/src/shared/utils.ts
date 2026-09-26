import uniqueId from 'lodash/uniqueId'
import { Cli_ComponentJsonschema_Interface } from './gui-cli'
import {
  Utils_ExportProp_Interface,
  Utils_ExportList_Type,
  Utils_ExportEvent_Interface,
} from './gui-utils'

export const getUuid = (module: string): string => {
  return uniqueId(`${module}_ins_id__${+new Date()}_`)
}

// $exports[]:  attrKey, eventKey
export const getExportsList = function (
  JsonData: Cli_ComponentJsonschema_Interface,
): Utils_ExportList_Type {
  const exportsList: Utils_ExportList_Type = []

  const { props = {}, events = {} } = JsonData

  Object.keys(props).forEach((key) => {
    exportsList.push({
      attrKey: key,
      alias: '',
      sortIdx: -1,
    } as Utils_ExportProp_Interface)
  })

  Object.keys(events).forEach((key) => {
    const { label = '' } = events[key]
    exportsList.push({
      eventKey: key,
      alias: '',
      sortIdx: -1,
      task: {
        label: label || `事件注释${key}`, // TODO:zm
        process: {
          type: 'bind_method',
          defaultMethods: [],
          custom_access: true,
        },
      },
    } as Utils_ExportEvent_Interface)
  })

  return exportsList
}
