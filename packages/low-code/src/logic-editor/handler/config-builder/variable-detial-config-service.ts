import _ from 'lodash';
import { DataType, Schema } from '../../../types/data';
import dataMixin from '../../compat/data';
import { DetailNodeBaseConfig } from '../../graph/util';
import { AnchorTag_DTS, BlockNames_DTS } from '../../service/interface';
import { LogicEditorService } from '../../service/logic-service';
import { INodeConfigService } from './interface';

const { getParamAnchorConfig, getFlowAnchorConfig } = LogicEditorService;

export class VariableDetialConfigService implements INodeConfigService {
  getVarDetialConfig(data: DetailNodeBaseConfig) {
    const { parent_node_id, parent_node_position, parent_node_config } = data;
    const { _route_path, name, label, value, _origin_node_id, schema, _origin_anchor_index } = parent_node_config;
    const curNodeId = parent_node_id + '_' + name;
    const model = {
      type: BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE,
      id: curNodeId,
      x: parent_node_position.x + 300,
      y: parent_node_position.y,
      data: {
        anchors: [],
        _origin_node_id,
        _origin_anchor_index,
      },
    };
    // 详情块左值
    const varInputAnchor = getParamAnchorConfig(BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE, {
      nodeId: curNodeId,
      tag: AnchorTag_DTS.VAR_INPUT,
      index: 0,
      data: {
        label,
        name,
        value,
        type: schema.type,
        _route_path: _route_path, // 左值不需要加上 name
        _origin_node_id,
        _origin_anchor_index,
        schema,
      },
    });

    const varsOutputAnchors = _.map(schema.properties || [], (subSchema: Schema, index: number) => {
      const _subSchema = _.cloneDeep(subSchema);
      delete _subSchema.key;
      return getParamAnchorConfig(BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE, {
        nodeId: curNodeId,
        tag: AnchorTag_DTS.VAR_OUTPUT,
        index: index + 1,
        data: {
          label: subSchema.label,
          name: subSchema.key,
          value: dataMixin.getDefaultValueJSONFromSchema(_subSchema),
          type: subSchema.type,
          schema: subSchema,
          _route_path: _route_path + '.' + subSchema.key,
          _origin_node_id,
          _origin_anchor_index,
        },
      });
    });

    model.data.anchors = [varInputAnchor, ...varsOutputAnchors];
    return model;
  }
}
