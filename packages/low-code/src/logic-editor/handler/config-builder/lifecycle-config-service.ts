import { Global, PageCenter, PlatformLifeCycle } from '../../compat/lifecycle';
import { EditPageMold } from '../../../types/edit-page';
import { INodeConfig, IPositon } from '../../interface';
import { BlockNames_DTS } from '../../service/interface';
import { LogicEditorService } from '../../service/logic-service';
import { INodeConfigService } from './interface';

const { getFlowAnchorConfig } = LogicEditorService;

export class LifecycleConfigService implements INodeConfigService {
  intro = {
    zh_cn: '将方法的上游节点设置为生命周期的某个输出分支，即可在页面的相应时间点自动调用该方法',
    en_us:
      'Set the upstream node of the method to one of the output branches of the life cycle to automatically call the method at the corresponding point in time on the page',
  };

  getConfig(position: IPositon, cfg?: INodeConfig) {
    // const nodeId = `${+new Date() + (Math.random() * 10000).toFixed(0)}`;
    const nodeId = BlockNames_DTS.LOGIC_LIFECYCLE_NODE; // 全局唯一
    const anchors = (PlatformLifeCycle[Global.cur_terminal_uuid] || [])
      .filter((t: { mold: EditPageMold }) =>
        Object.prototype.hasOwnProperty.call(t, 'mold') ? PageCenter.cur_page.mold === t.mold : true,
      )
      .map((t, i) =>
        getFlowAnchorConfig(BlockNames_DTS.LOGIC_LIFECYCLE_NODE, i, {
          nodeId,
          data: {
            label: t.label,
            value: t.value,
          },
        }),
      );

    const nodeConfig = {
      id: nodeId,
      type: BlockNames_DTS.LOGIC_LIFECYCLE_NODE,
      x: position.x,
      y: position.y,
      data: {
        anchors,
      },
    };

    return nodeConfig;
  }
}
