import { BlockNames_DTS } from '../../service/interface';

import { INodeConfigService } from './interface';
import { MethodConfigService } from './method-config-service';
import { VariableConfigService } from './variable-config-service';
import { VariableDetialConfigService } from './variable-detial-config-service';

import { OperationComponentTree } from '../../../types/edit-page';

import { LifecycleConfigService } from './lifecycle-config-service';
// import { CreateObjectConfigService } from './create-object-service';
import { ApiConfigService } from './api-config-service';
import { LogicBlockBaseTplMap } from '../../service/const';
import { TemplateConfigService } from './template-config-service';

export class NodeConfigServicesFactory {
  private static map = new Map<BlockNames_DTS | string, INodeConfigService>([
    [BlockNames_DTS.LOGIC_FUNC_NODE, new MethodConfigService()],
    // 变量
    [BlockNames_DTS.LOGIC_STRING_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_BOOLEAN_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_NUMBER_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_ARRAY_NODE, new VariableConfigService()],
    [BlockNames_DTS.LOGIC_OBJECT_NODE, new VariableConfigService()],
    // 变量详情
    [BlockNames_DTS.LOGIC_VARIABLE_DETIAL_NODE, new VariableDetialConfigService()],
    // 生命周期
    [BlockNames_DTS.LOGIC_LIFECYCLE_NODE, new LifecycleConfigService()],
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

  public static getOperationTree(nodeType: BlockNames_DTS): OperationComponentTree | undefined {
    const service = this.map.get(nodeType);
    if (service) {
      console.log('%c [ node-config-services-factory.ts ---> getOperationTree ]: ', 'color: orange;', service);
      return service.operationTree;
    }
  }

  public static getIntro(nodeType: BlockNames_DTS): { zh_cn: string; en_us: string } {
    const service = this.map.get(nodeType);
    if (service) {
      return service.intro;
    }
  }

  public static injectINodeConfigService(nodeType: BlockNames_DTS, config: INodeConfigService) {
    this.map.set(nodeType, config);
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
