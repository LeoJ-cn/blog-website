import type { Data } from '../../types/data'
import { DataType, type Schema } from '../../types/schema'

let dataProvider: (id: string) => Data | undefined = () => undefined
let dataCreator: (data: Data, category: string) => Promise<string> = async () => ''

export function setDataProvider(provider: (id: string) => Data | undefined): void {
  dataProvider = provider
}

export function setDataCreator(creator: (data: Data, category: string) => Promise<string>): void {
  dataCreator = creator
}

function getDefaultValueJSONFromSchema(schema?: Schema): string | undefined {
  if (!schema) return undefined
  let result = schema.key ? `"${schema.key}":` : ''
  switch (schema.type) {
    case DataType.Boolean: return result + 'false'
    case DataType.Number: return result + '0'
    case DataType.String: return result + '""'
    case DataType.Object:
      result += `{${(schema.properties || []).map(getDefaultValueJSONFromSchema).join(',')}}`
      return result
    case DataType.Array:
      return result + `[${schema.items ? getDefaultValueJSONFromSchema(schema.items) : ''}]`
    default: return result
  }
}

export default {
  getDataById: (id: string) => dataProvider(id),
  addDataAsync: (data: Data, category: string) => dataCreator(data, category),
  getDefaultValueJSONFromSchema,
}
