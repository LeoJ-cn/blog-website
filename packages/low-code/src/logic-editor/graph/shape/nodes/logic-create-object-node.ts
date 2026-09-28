import { resolveLogicEditorAsset } from '../../icon-map';
import { DataType } from '../../../../types/schema';
import { IGroup, ShapeOptions } from '@antv/g6';
import _ from 'lodash';
import {
  AnchorBaseConfigWithPosition,
  IG6,
  IIGroup,
  IModelConfig,
  INodeConfig,
  IShapeOptions,
} from '../../../interface';
import { AnchorBaseConfig_DTS, AnchorTag_DTS, BlockNames_DTS } from '../../../service/interface';
import { getImgByType, getNodeTextSize } from '../../util';

export default (G6: IG6) => {
  const itemType = BlockNames_DTS.LOGIC_CREATE_OBJECT_NODE;
  const nodeDefinition: IShapeOptions = {
    itemType: itemType,
    calcNodeHeight(cfg?: INodeConfig) {
      cfg.nodeWidth = 210;
      cfg.nodeHeight = 105;
      const all = this.getAnchorPoints(cfg);
      const len = all.length;
      if (len > 1) {
        cfg.nodeHeight = 44 + len * 30;
      } else {
        cfg.nodeHeight = 105;
      }
    },

    drawShape(cfg?: IModelConfig, group?: IIGroup) {
      this.calcNodeHeight(cfg);
      const attrs = this.getShapeStyle(cfg, group);
      const keyShape = group.addShape('rect', {
        className: `${this.shapeType}-shape`,
        name: `${this.shapeType}-shape`,
        xShapeNode: true, // 自定义节点标识
        draggable: true,
        attrs,
      });

      this.assembleShape(cfg, group);

      group.$getItem = (className) => {
        return group.get('children').find((item) => item.get('className') === className);
      };

      this.initAnchor(cfg, group);
      return keyShape;
    },

    assembleShape(cfg?: INodeConfig, group?: IGroup) {
      const offsetX = -cfg.nodeWidth / 2;
      const offsetY = -cfg.nodeHeight / 2;
      group.addShape('rect', {
        attrs: {
          x: offsetX + 1,
          y: offsetY + 1,
          width: cfg.nodeWidth - 2,
          height: 44,
          fill: '#F2F8FF',
          cursor: 'move',
          radius: [12, 12, 0, 0],
        },
        draggable: true,
      });

      group.addShape('image', {
        attrs: {
          x: offsetX + 17,
          y: offsetY + 13,
          width: 20,
          height: 20,
          img: resolveLogicEditorAsset('../../img/params_object.svg'),
          cursor: 'pointer',
        },
      });

      group.addShape('text', {
        attrs: {
          x: offsetX + 48,
          y: offsetY + 22,
          fontSize: 14,
          lineHeight: 20,
          text: '构建对象',
          fill: 'rgba(0,0,0,.85)',
          fontWeight: 'bolder',
          textBaseline: 'middle',
          textAlign: 'start',
          cursor: 'move',
        },
        draggable: true,
        name: 'title',
      });

      const allAnchors = this.getAnchorPoints(cfg) as AnchorBaseConfigWithPosition[];
      const inputAnchorNodeConfig = allAnchors[0][2];

      const inputAnchorNodeConfigs = allAnchors
        .filter((anchor) => anchor[2].tag === AnchorTag_DTS.VAR_INPUT)
        .map((anchor) => anchor[2]);
      //  * 右侧属性
      group.addShape('image', {
        attrs: {
          x: offsetX + 180,
          y: offsetY + 74 - 8,
          width: 14,
          height: 14,
          img: resolveLogicEditorAsset('../../img/return_object_inactive.svg'),
          cursor: 'pointer',
          anchor_index: 0,
        },
      });

      const text = '返回对象';

      group.addShape('text', {
        attrs: {
          x: offsetX + 175,
          y: offsetY + 74,
          text,
          fill: 'black',
          fontSize: 12,
          lineHeight: 20,
          opacity: 0.85,
          textBaseline: 'middle',
          textAlign: 'end',
          cursor: 'pointer',
          anchor_index: 0,
        },
      });

      // * 左值
      inputAnchorNodeConfigs.forEach((config: AnchorBaseConfig_DTS) => {
        const { data, index } = config;
        const { value, label, name, _route_path, schema } = data;
        group.addShape('image', {
          attrs: {
            x: offsetX + 20,
            y: offsetY + 44 + 30 * config.index - 8,
            width: 14,
            height: 14,
            img: getImgByType(schema.type, 'in'),
            cursor: 'pointer',
            anchor_index: index,
            _object_config: {
              label,
              name,
              value,
              type: schema && schema.type,
              _route_path,
              schema,
            },
          },
          name: 'param',
        });

        group.addShape('text', {
          attrs: {
            x: offsetX + 40,
            y: offsetY + 44 + 30 * config.index,
            text: label,
            fill: 'black',
            fontSize: 12,
            lineHeight: 20,
            opacity: 0.85,
            textBaseline: 'middle',
            textAlign: 'start',
            cursor: 'pointer',
            anchor_index: index,
            _object_config: {
              label,
              name,
              value,
              type: schema && schema.type,
              _route_path,
              schema,
            },
          },
          name: 'param',
        });
      });

      group.sort();
    },

    getAnchorPoints(cfg: INodeConfig): AnchorBaseConfigWithPosition[] {
      const nodeConfigData = cfg.data;
      const anchors = nodeConfigData.anchors;
      return _.map<AnchorBaseConfig_DTS, AnchorBaseConfigWithPosition>(anchors, (anchor: AnchorBaseConfig_DTS) => {
        if (anchor.tag === AnchorTag_DTS.VAR_INPUT) {
          return [0, (44 + 30 * anchor.index) / cfg.nodeHeight, anchor];
        }

        if (anchor.tag === AnchorTag_DTS.VAR_OUTPUT) {
          return [1, 74 / cfg.nodeHeight, anchor];
        }
      });
    },
  };
  G6.registerNode(itemType, nodeDefinition as ShapeOptions, BlockNames_DTS.LOGIC_BASE_NODE);
};
