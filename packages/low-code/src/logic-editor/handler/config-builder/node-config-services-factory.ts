import { BlockNames_DTS } from '../../service/interface';

import { INodeConfigService } from './interface';
import { MethodConfigService } from './method-config-service';
import { VariableConfigService } from './variable-config-service';
import { VariableDetialConfigService } from './variable-detial-config-service';

import { OperationComponentTree } from '../../../types/edit-page';

// import { CreateObjectConfigService } from './create-object-service';
import { ApiConfigService } from './api-config-service';
import { LogicBlockBaseTplMap } from '../../service/const';
import { TemplateConfigService } from './template-config-service';
import { LifecycleConfigService } from './lifecycle-config-service';
import type { LowCodeLogicNodeRecord } from '../../../compatibility/types';
import type { INodeConfig, IPositon } from '../../interface';
import { LogicEditorService } from '../../service/logic-service';

export class NodeConfigServicesFactory {
  private static map = new Map<BlockNames_DTS | string, INodeConfigService>([
    [BlockNames_DTS.LOGIC_FUNC_NODE, new MethodConfigService()],
    [BlockNames_DTS.LOGIC_LIFECYCLE_NODE, new LifecycleConfigService()],
    // 变量
    [BlockNames_DTS.LOGIC_STRING_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_BOOLEAN_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_NUMBER_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_ARRAY_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_OBJECT_NODE, new VariableConfigService()],
    // 变量详情
    [BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE, new VariableDetialConfigService()],
    // 开始
    [
      BlockNames_DTS.LOGIC_START_NODE,
      {
        intro: {
          zh_cn: '开始节点标记方法的开始，同时也可以输出此方法的形参',
          en_us:
            'The start node marks the beginning of the method and can also output the formal parameters of the method',
        },
      },
    ],
    // 结束
    [
      BlockNames_DTS.LOGIC_END_NODE,
      {
        intro: {
          zh_cn: '结束节点标记方法的结束，它的输入就是这个方法的返回值',
          en_us: 'The end node marks the end of the method, and its input is the return value of the method',
        },
      },
    ],
    // 调用API
    [BlockNames_DTS.LOGIC_API_NODE, new ApiConfigService()],
  ]);

  public static getNodeConfig() {
    return this.map;
  }

  public static getINodeConfigService(nodeType: BlockNames_DTS): INodeConfigService {
    const service = this.map.get(nodeType);
    if (!service) {
      throw new Error(`找不到节点${nodeType}的生成方法，请检查！`);
    }
    return service;
  }

  public static getOperationTree(nodeType: BlockNames_DTS): OperationComponentTree | OperationComponentTree[] | undefined {
    const service = this.map.get(nodeType);
    if (service) {
      console.log('%c [ node-config-services-factory.ts ---> getOperationTree ]: ', 'color: orange;', service);
      return service.operationTree;
    }
  }

  public static getIntro(nodeType: BlockNames_DTS): { zh_cn: string; en_us: string } | undefined {
    const service = this.map.get(nodeType);
    if (service) {
      return service.intro;
    }
  }

  public static injectINodeConfigService(nodeType: BlockNames_DTS, config: INodeConfigService) {
    this.map.set(nodeType, config);
  }

  /** 将宿主的旧节点记录解码并注入工厂，空数组时继续使用本地模板。 */
  public static injectLogicNodeRecords(records: LowCodeLogicNodeRecord[]) {
    records.forEach((record) => {
      try {
        const rawConfig = (typeof record.node_config === 'string'
          ? JSON.parse(record.node_config)
          : (record.node_config || {})) as Record<string, any>
        const decoded: INodeConfigService = {}
        const getFlowAnchorConfig = LogicEditorService.getFlowAnchorConfig
        const getParamAnchorConfig = LogicEditorService.getParamAnchorConfig
        const rawGetConfig = rawConfig.getConfig as any

        if (rawGetConfig && typeof rawGetConfig === 'object') {
          decoded.getConfig = (position: IPositon): INodeConfig => {
            const nodeId = `${Date.now()}${Math.floor(Math.random() * 10000)}`
            const data = { ...rawGetConfig } as Record<string, any>
            delete data.$anchors
            delete data.$anchorsLength
            if (Array.isArray(rawGetConfig.$anchors) && !data.anchors) {
              data.anchors = rawGetConfig.$anchors.map((anchor: any) => (
                anchor.configType === 'paramAnchor'
                  ? getParamAnchorConfig(anchor.type, { nodeId, ...anchor.config })
                  : getFlowAnchorConfig(anchor.type, anchor.index, { nodeId, ...anchor.config })
              ))
            }
            if (rawGetConfig.$anchorsLength && !data.anchors) {
              data.anchors = Array.from({ length: Number(rawGetConfig.$anchorsLength) }, (_, index) => (
                getFlowAnchorConfig(record.name, index, { nodeId })
              ))
            }
            if (!Array.isArray(data.anchors)) throw new Error(`节点 ${record.name} 缺少 anchors 配置`)
            return { id: nodeId, type: record.name, x: position.x, y: position.y, data: data as INodeConfig['data'] }
          }
        } else if (typeof rawGetConfig === 'string') {
          eval(`decoded.getConfig = ${rawGetConfig}`)
        }
        if (typeof rawConfig.getConfigAsync === 'string') eval(`decoded.getConfigAsync = ${rawConfig.getConfigAsync}`)
        if (typeof rawConfig.getVarDetialConfig === 'string') eval(`decoded.getVarDetialConfig = ${rawConfig.getVarDetialConfig}`)
        if (record.operation_tree) {
          decoded.operationTree = (typeof record.operation_tree === 'string'
            ? JSON.parse(record.operation_tree)
            : record.operation_tree) as OperationComponentTree | OperationComponentTree[]
        }
        if (record.intro) {
          decoded.intro = typeof record.intro === 'string' ? JSON.parse(record.intro) : record.intro
        }
        if (!decoded.getConfig && !decoded.getConfigAsync && !decoded.operationTree && !decoded.intro) {
          throw new Error('记录未包含可用配置')
        }
        this.injectINodeConfigService(record.name as BlockNames_DTS, decoded)
      } catch (error) {
        console.warn(`[logic-editor] 节点 ${record.name} 配置注入失败`, error)
      }
    })
  }

  /**
   * 原宿主会在接口返回后动态覆盖这些服务；本地默认注册只补齐当前没有生成器的节点。
   */
  public static registerTemplateConfigServices() {
    Object.keys(LogicBlockBaseTplMap).forEach((nodeType) => {
      const type = nodeType as BlockNames_DTS;
      const current = this.map.get(type);
      if (!current?.getConfig) {
        const fallback = new TemplateConfigService(type);
        fallback.intro = current?.intro;
        fallback.operationTree = current?.operationTree;
        this.map.set(type, fallback);
      }
    });
  }
}

NodeConfigServicesFactory.registerTemplateConfigServices();
