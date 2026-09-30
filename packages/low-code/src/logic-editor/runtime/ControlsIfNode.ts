import { ProcessBaseNode } from './ProcessBaseNode';
import { OperationComponentTree } from '../../types/edit-page';
import { Schema } from '../../types/schema';
import { SimpleProcessData } from '../../types/process';
import componentMixin from '../compat/component';
import { AtomCenter } from '../compat/legacy-host';

interface ControlsIfAttrs {
  branches?: Array<Array<Array<{ a?: string[]; op?: string; bType?: string; b?: number | string | Array<string>; }>>>;
}

const defaultTree = {
  ins_id: 'b36eb21b19d348d4bb966af50eda1007',
  tag: 'ProcessBranchItem',
  data: {
    $style: {
      padding: '0 20px 0 20px',
    },
    $op: {
      select: 0,
    },
    title: '如果 执行',
    content: '暂无数据',
    $locales: {
      'en-US': {
        title: 'IF',
        content: 'No data',
      },
    },
    color: '#7E57C2',
    avatar: 'https://s2-cdn.oneitfarm.com/FoGpda6lhKQmO8uPLimswUe3pmwq',
  },
  children: [],
};

const opList = [
  {
    label: '等于',
    enLabel: '=',
    value: 'EQUAL',
  },
  {
    label: '不等于',
    enLabel: '!=',
    value: 'NOT_EQUAL',
  },
  {
    label: '大于',
    enLabel: '>',
    value: 'MORE',
  },
  {
    label: '大于等于',
    enLabel: '>=',
    value: 'MOREOREQUAL',
  },
  {
    label: '小于',
    enLabel: '<',
    value: 'LESS',
  },
  {
    label: '小于等于',
    enLabel: '<=',
    value: 'LESSOREQUAL',
  },
  {
    label: '为空',
    enLabel: 'is null',
    value: 'isNull',
  },
  {
    label: '不为空',
    enLabel: 'not null',
    value: 'notNull',
  },
];

export class ControlsIfNode extends ProcessBaseNode<ControlsIfAttrs> {
  public attrsChange(
    key: keyof ControlsIfAttrs,
    value: ControlsIfAttrs[keyof ControlsIfAttrs],
    currentOperation: OperationComponentTree,
  ): void | Promise<void> {
    this.attrs = this.component.data as any;
    const { component, attrs } = this;
    const isBranchChange = component.children.length - 1 !== (attrs.branches?.length ?? 0);
    this.modifyText();
    this.assignNodeData();
    if (isBranchChange) {
      componentMixin.setComponents(componentMixin.getComponents(), 'add');
      // 刷新 baseId
      const maxId = this.getRenderTreeMaxId(component);
      if (maxId > AtomCenter.baseId) {
        AtomCenter.setBaseId(maxId);
      }
    }
  }

  public beforeOperationRender(key: keyof ControlsIfAttrs, currentOperation: OperationComponentTree): void {
  }

  public dataSchema(): Schema | undefined {
    return undefined;
  }

  public generate(): SimpleProcessData[] {
    const { attrs } = this;
    if (!attrs.branches) {
      return [];
    }

    const node = this.generateSimpleProcessData({
      type: 'controls_if',
      value: {},
      mutation: {
        else: '1',
        elseif: attrs.branches.length - 1 + '',
      },
    });
    const nodeValue = node.value;
    if (!nodeValue) throw new Error('条件节点缺少 value 容器');

    attrs.branches.forEach((branch, index) => {
      const conditions: SimpleProcessData[] = [];
      branch.forEach((condition) => {
        const subConditions: SimpleProcessData[] = [];
        condition.forEach((subCondition) => {
          if (!subCondition.a || !subCondition.op) {
            return;
          }
          // 为空
          if (subCondition.op === 'isNull') {
            subConditions.push(this.generateSimpleProcessData({
              type: 'block_not',
              value: {
                value: this.createSimpleProcessData('variable', subCondition.a),
              },
            }));
            return;
          }
          // 不为空
          if (subCondition.op === 'notNull') {
            subConditions.push(this.generateSimpleProcessData({
              type: 'block_not',
              value: {
                value: this.generateSimpleProcessData({
                  type: 'block_not',
                  value: {
                    value: this.createSimpleProcessData('variable', subCondition.a),
                  },
                }),
              },
            }));
            return;
          }

          // 判断为空数组特殊处理
          if (subCondition.bType === 'array') {
            subConditions.push(this.generateSimpleProcessData({
              type: 'math_compare',
              value: {
                A: this.generateSimpleProcessData({
                  type: 'block_array_length',
                  value: {
                    array: this.createSimpleProcessData('variable', subCondition.a),
                  }
                }),
                B: this.createSimpleProcessData('number', 0),
                OP: subCondition.op,
              },
            }));
            return;
          }

          if (!subCondition.bType) return;
          const b = this.createSimpleProcessData(subCondition.bType, subCondition.b);
          subConditions.push(this.generateSimpleProcessData({
            type: 'math_compare',
            value: {
              A: this.createSimpleProcessData('variable', subCondition.a),
              B: b,
              OP: subCondition.op,
            },
          }));
        });

        const joinedCondition = this.joinLogicCompare(subConditions, 'ANDAND');
        if (joinedCondition) conditions.push(joinedCondition);
      });

      nodeValue['IF' + index] = this.joinLogicCompare(conditions, 'OROR');
    });

    return [node];
  }

  public modifyText(): void {
    const { component } = this;
    const attrs = component.data as ControlsIfAttrs;
    if (!attrs.branches) {
      return;
    }

    // 实际节点比交互多
    if (component.children.length - 1 > attrs.branches.length) {
      component.children = [
        ...component.children.slice(0, attrs.branches.length),
        component.children[component.children.length - 1],
      ];
    }

    // 实际节点比交互少
    if (component.children.length - 1 < attrs.branches.length) {
      Array.from({ length: attrs.branches.length - component.children.length + 1 }).forEach(() => {
        this.addTreeByPosition(defaultTree as any, component, component.children.length - 1);
      });
    }

    // 赋值子节点的 name
    component.children.forEach((child, index) => {
      if (index === component.children.length - 1) {
        child.data.$dataPath = '[0].value.ELSE';
      } else {
        child.data.$dataPath = '[0].value.DO' + index;
      }
    })

    // 修改节点文案
    attrs.branches.forEach((branch, index) => {
      let text = '暂无数据';
      let enText = 'No data';
      const conditions: string[] = [];
      const enConditions: string[] = [];

      branch.forEach((condition) => {
        const subConditions: string[] = [];
        const enSubConditions: string[] = [];
        condition.forEach((subCondition) => {
          if (!subCondition.a || !subCondition.op) {
            return;
          }
          let t = '"' + this.getLabelByVariable(subCondition.a) + '" ';
          let et = t;

          const operator = opList.find((i) => i.value === subCondition.op);
          if (!operator) return;
          t += operator.label;
          et += operator.enLabel;

          if (subCondition.op !== 'isNull' && subCondition.op !== 'notNull') {
            t += ' ';
            et += ' ';
            switch (subCondition.bType) {
              case 'number':
                t += (subCondition.b || '0');
                et += (subCondition.b || '0');
                break;
              case 'string':
                t += (subCondition.b || '');
                et += (subCondition.b || '');
                break;
              case 'variable':
                if (!subCondition.b) {
                  return;
                }
                t += `"${this.getLabelByVariable(subCondition.b as string[])}"`;
                et += `"${this.getLabelByVariable(subCondition.b as string[])}"`;
                break;
              case 'boolean':
                t += subCondition.b === 'TRUE' ? '真' : '假';
                et += subCondition.b === 'TRUE' ? 'true' : 'false';
                break;
              case 'array':
                t += '空数组';
                et += 'empty array';
                break;
              case 'null':
                t += '空';
                et += 'null';
                break;
              default:
                return;
            }
          }

          subConditions.push(t);
          enSubConditions.push(et);
        });

        if (subConditions.length) {
          conditions.push(subConditions.join(' 且 '));
          enConditions.push(enSubConditions.join(' and '));
        }
      });

      if (conditions.length) {
        text = `如果满足下列条件\n${conditions.join('\n或 ')}\n执行下面流程`;
        enText = `If the following conditions are met\n${enConditions.join('\nor ')}\nExecute the following process`;
      }

      const branchComponent = component.children[index];
      if (!branchComponent) return;
      const layout = branchComponent.children.find((i) => i.tag === 'GuiLayout');
      if (layout) {
        this.modifyNodeTextByInsId(text, layout);
        this.modifyNodeEnTextByInsId(enText, layout);
      } else {
        this.modifyNodeText(text, branchComponent);
        this.modifyNodeEnText(enText, branchComponent);
      }
    });
  }

}
