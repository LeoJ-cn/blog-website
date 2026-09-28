import { OperationComponentTree } from '../../../../types/edit-page';
import { DetailNodeBaseConfig } from '../../../graph/util';
import { INodeConfig, IPositon } from '../../../interface/index';
import { BlockNames_DTS } from '../../../service/interface';

export interface INodeConfigService<T = {}> {
  getConfig?: (position: IPositon, cfg?: INodeConfig) => INodeConfig<T>;
  getConfigAsync?: (position: IPositon, cfg: INodeConfig, nodeType?: BlockNames_DTS) => Promise<INodeConfig<T>>;
  getVarDetialConfig?: (data: DetailNodeBaseConfig) => INodeConfig<T>;
  operationTree?: OperationComponentTree;
  intro?: { zh_cn: string; en_us: string };
}
