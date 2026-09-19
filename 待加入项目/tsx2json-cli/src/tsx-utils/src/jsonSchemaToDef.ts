import { jsonSchemaToMethod } from './jsonSchemaToMethod'
import { jsonSchemaToAtomComponent } from './jsonSchemaToAtomComponent'
import { jsonSchemaToOperationTree } from './jsonSchemaToOperationTree'
import {
  Cli_ComponentJsonschema_Interface,
  Utils_JsonSchemaToDefReturn_Type
} from './shared/index'


export const jsonSchemaToDef = function (JsonData: Cli_ComponentJsonschema_Interface): Utils_JsonSchemaToDefReturn_Type {
  return {
    jsonSchemaToMethod: jsonSchemaToMethod(JsonData),
    jsonSchemaToAtomComponent: jsonSchemaToAtomComponent(JsonData),
    jsonSchemaToOperationTree: jsonSchemaToOperationTree(JsonData)
  }
}
