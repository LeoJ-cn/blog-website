import type { Method } from '../../types/method'

let methodCreator: (method: Method) => Method = (method) => method

export function setMethodCreator(creator: (method: Method) => Method): void {
  methodCreator = creator
}

export default { addMethod: (method: Method) => methodCreator(method) }
