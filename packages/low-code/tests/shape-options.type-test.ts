import type { IIGroup, INodeConfig, IShapeOptions } from '../src/logic-editor/interface'

const requiredCallbacks: IShapeOptions = {
  calcNodeHeight(cfg: INodeConfig) {
    void cfg
  },
  assembleShape(cfg: INodeConfig, group: IIGroup) {
    void cfg
    void group
  },
}

void requiredCallbacks

