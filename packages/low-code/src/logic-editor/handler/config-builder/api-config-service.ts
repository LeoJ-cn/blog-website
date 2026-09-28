import _ from 'lodash';
import { INodeConfig, IPositon } from '../../interface';
import { INodeConfigService } from './interface';

export class ApiConfigService implements INodeConfigService {
  getConfig(position: IPositon, cfg?: INodeConfig) {
    const _nodeId = `${+new Date() + (Math.random() * 10000).toFixed(0)}`;
    _.forEach(cfg.data.anchors, (anchor) => (anchor.nodeId = _nodeId));
    return {
      ...cfg,
      x: position.x,
      y: position.y,
      id: _nodeId, // > 需要实时更新id,不然在舞台上可能会出现相同的id的Node块，导致渲染不出来
    } as INodeConfig;
  }
}

