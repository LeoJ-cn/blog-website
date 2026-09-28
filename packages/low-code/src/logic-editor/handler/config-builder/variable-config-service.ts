import { Locales } from '../../compat/locales';
import { Data, DataCategory, DataType } from '../../../types/data';
import dataMixin from '../../compat/data';
import { getDefaultValueByType } from '../../graph/util';
import { INodeConfig, IPositon } from '../../interface';
import { AnchorTag_DTS, BlockNames_DTS } from '../../service/interface';
import { LogicEditorService } from '../../service/logic-service';
import { INodeConfigService } from './interface';

const { getParamAnchorConfig, getFlowAnchorConfig } = LogicEditorService;

export class VariableConfigService implements INodeConfigService {
  get isEn() {
    return Locales.getLanguage() === 'en-US';
  }

  async getConfigAsync(position: IPositon, cfg: INodeConfig, nodeType?: BlockNames_DTS) {
    const nodeId = `${+new Date() + (Math.random() * 10000).toFixed(0)}`;
    if (!cfg) {
      // >  新创建变量块
      let varType = nodeType.split('-')[1] as DataType;
      let value = getDefaultValueByType(varType);
      // > 调用方法在变量区，创建一个新的变量
      const { createdVariableId, createdData } = await this.createNewData(varType, value);

      return {
        type: nodeType,
        id: nodeId,
        x: position.x,
        y: position.y,
        data: {
          varId: createdVariableId,
          varLabel: createdData.label,
          varName: createdData.name,
          anchors: [
            getParamAnchorConfig(nodeType, {
              nodeId,
              tag: AnchorTag_DTS.VAR_OUTPUT,
              index: 0,
              data: {
                label: createdData.label,
                name: createdData.name,
                type: createdData.type,
                value: JSON.stringify(createdData.value),
                _route_path: createdVariableId,
                schema: createdData.schema,
              },
            }),
          ],
        },
      };
    }

    return {
      ...cfg,
      x: position.x,
      y: position.y,
      id: nodeId,
    };
  }

  private async createNewData(varType: DataType, value: any) {
    const newData: Data = {
      access_modifier: {
        accessible: true,
        editable: true,
      },
      type: varType,
      name: 'dummyAutoVariable',
      label: this.isEn ? 'default variable' : '默认创建变量',
      value,
      schema: {
        type: varType,
      },
      category: DataCategory.Page,
      comment: '',
    };
    const createdVariableId = await dataMixin.addDataAsync(newData, 'data_manage'); // 变量的id
    const createdData = dataMixin.getDataById(createdVariableId);
    return { createdVariableId, createdData };
  }
}
