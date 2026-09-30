import _ from 'lodash';
import methodMixin from '../../compat/method';
import { DataType } from '../../../types/data';
import { Method, MethodType } from '../../../types/method';
import { method2NodeConfig } from '../../graph/util';
import { assertNodeConfig, INodeConfig, IPositon } from '../../interface';
import { INodeConfigService } from './interface';

export class MethodConfigService implements INodeConfigService {
  getConfig(position: IPositon, cfg?: INodeConfig): INodeConfig {
    if (!cfg) { // 创建新的方法
      const newMethod: Method = {
        funcName: 'defalut_method_name',
        funcLabel: '默认方法',
        explanatory: '',
        parameters: [],
        blockData: '',
        methodType: MethodType.pageMethod,
        funcReturn: {
          state: true,
          type: DataType.String,
          schema: { type: DataType.String },
        },
        graphData: '', // 新创建的方法这个字段是空
        temp_data: [],
        access_modifier: {
          accessible: true,
          editable: true,
        },

      };
      const createdMethod = methodMixin.addMethod(newMethod) as Method;
      return method2NodeConfig(createdMethod, position);
    }
    // > 不创建新的方法，只是在舞台上新增已经存在方法的node块

    assertNodeConfig(cfg, '复制方法节点')
    const _nodeId = `${+new Date() + (Math.random() * 10000).toFixed(0)}`;
    _.forEach(cfg.data.anchors, (anchor) => anchor.nodeId = _nodeId);
    return {
      ...cfg,
      x: position.x,
      y: position.y,
      id: _nodeId, // > 需要实时更新id,不然在舞台上可能会出现相同的id的Node块，导致渲染不出来
    };
  }
}
