import { IGroup, ShapeOptions } from '@antv/g6';
import {
  AnchorBaseConfigWithPosition,
  AnchorTag,
  IG6,
  IIGroup,
  IModelConfig,
  INodeConfig,
  IShapeOptions,
  IVarNodeConfig,
} from '../../../interface';
import { BlockNames_DTS } from '../../../service/interface';
import { getImgByType, getNodeTextSize } from '../../util';
import { DataType } from '../../../../types/data';
import _ from 'lodash';
import dataMixin from '../../../compat/data';

export default (G6: IG6, type: string) => {
  const itemType = `logic-${type}-node`;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,
    calcNodeHeight(cfg?: INodeConfig<IVarNodeConfig>) {
      cfg.nodeHeight = 40;
      // 计算宽度
      const data = dataMixin.getDataById(cfg.data.varId);
      if (data) {
        const varLength = getNodeTextSize(data.label);
        cfg.nodeWidth = varLength < 7 ? 150 : 150 + (varLength - 6) * 16;
      }
    },
    drawShape(cfg?: INodeConfig<IVarNodeConfig>, group?: IIGroup) {
      this.calcNodeHeight(cfg);

      const attrs = this.getShapeStyle(cfg, group);
      const keyShape = group.addShape('rect', {
        className: `${this.shapeType}-shape`,
        name: `${this.shapeType}-shape`,
        xShapeNode: true,
        draggable: true,
        attrs,
      });

      const offsetX = -cfg.nodeWidth / 2;
      const offsetY = -cfg.nodeHeight / 2;
      const data = dataMixin.getDataById(cfg.data.varId);
      let textOffset = 0;
      if (data) {
        const varLength = getNodeTextSize(data.label);
        textOffset = varLength < 7 ? 0 : (varLength - 6) * 16;
      }

      const allAnchors = this.getAnchorPoints(cfg) as AnchorBaseConfigWithPosition[];
      const config = allAnchors[0][2];
      const {
        nodeId,
        connected,
        data: { type, label, name, value, _route_path, schema },
      } = config;
      let _value = value;
      try {
        _value = JSON.parse(value);
      } catch (e) {}
      const _object_config = {
        label,
        name,
        value: _value,
        type: schema && schema.type,
        _route_path,
        schema,
      };

      group.addShape('text', {
        attrs: {
          x: offsetX + 20,
          y: offsetY + 20,
          text: label,
          fill: 'black',
          fontSize: 14,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'start',
          cursor: 'pointer',
          anchor_index: 0,
          _object_config,
        },
        draggable: true,
        meta: config, // 挂载当前锚点的数据
      });
      group.addShape('image', {
        attrs: {
          x: offsetX + 120 + textOffset,
          y: offsetY + 12,
          width: 16,
          height: 16,
          img: getImgByType(type, 'out', !!connected),
          cursor: 'pointer',
          anchor_index: 0,
          _object_config,
        },
        anchorTag: AnchorTag.VAR_OUTPUT,
        anchorIndex: 0,
        draggable: true,
        meta: config, // meta 挂载 变量详情的 NodeConfig
      });

      group.sort();
      group.$getItem = (className) => {
        return group.get('children').find((item) => item.get('className') === className);
      };

      this.initAnchor(cfg, group);
      return keyShape;
    },

    assembleShape(cfg?: INodeConfig, group?: IGroup) {},

    getAnchorPoints(cfg: INodeConfig<IVarNodeConfig>): AnchorBaseConfigWithPosition[] {
      const nodeConfigData = cfg.data;
      const anchor = nodeConfigData.anchors[0];
      return [[1, 0.5, anchor]];
    },
  };
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
