import { DataType, Schema } from '../../types/schema';
import { ProcessBaseNode } from './ProcessBaseNode';
import { OperationComponentTree } from '../../types/edit-page';
import { SimpleProcessData } from '../../types/process';
import * as processMixin from '../compat/process';
import _ from 'lodash';

interface FuncCallAttrs {
  funcname?: string;
  parameters?: Array<{ label?: string; name: string; type: string }>;
  params?: Array<{ param?: string; paramType?: string; type?: string; value?: string | number; variable?: string[] }>;
  leftVar?: string[];
  funcReturn?: { state: boolean; type?: DataType | '' };
  funcLabel?: string;
  paramsNum?: 'all' | 'none';
}

const TempVarName = 'funccall_temp_var';

export class FuncCallNode extends ProcessBaseNode<FuncCallAttrs> {
  public attrsChange(
    key: keyof FuncCallAttrs,
    value: FuncCallAttrs[keyof FuncCallAttrs],
    currentOperation: OperationComponentTree,
  ): void | Promise<void> {
    this.attrs = this.component.data as any;
    const { attrs, component } = this;
    switch (key) {
      case 'funcname': {
        const func = processMixin.getMethodList().find((i) => _.toString(i.id) === value);
        if (!func) {
          break;
        }
        attrs.funcLabel = func.funcLabel;
        attrs.funcReturn = func.funcReturn;
        attrs.parameters = func.parameters || [];
        attrs.leftVar = undefined;
        if (attrs.paramsNum === 'none') {
          attrs.params = [];
        } else {
          attrs.params = (func.parameters || []).map((i) => ({
            param: i.label,
            paramType: i.type,
            type: 'variable',
          }));
        }
        break;
      }
      case 'params':
        (attrs.params || []).forEach((param) => {
          const prop = attrs.parameters.find((i) => i.label === param.param);
          if (prop) {
            param.paramType = prop.type;
          }
        });
        break;
      case 'paramsNum': {
        if (value === 'none') {
          attrs.params = [];
        } else {
          attrs.params = attrs.parameters.map((i) => ({
            param: i.label,
            paramType: i.type,
            type: 'variable',
          }));
        }
        break;
      }
      default:
        break;
    }
    this.modifyText();
    this.assignNodeData();
    _.set(component.data, '$processDefaultBindVariable.schema', this.dataSchema());
  }

  public beforeOperationRender(key: keyof FuncCallAttrs, currentOperation: OperationComponentTree): void {
    const { attrs } = this;
    switch (key) {
      case 'funcname': {
        const list = processMixin
          .getMethodList()
          .map((i) => ({ label: i.label || i.funcLabel, value: _.toString(i.id) }));
        _.set(currentOperation.data, 'singleAttr.enumList', list);
        break;
      }
      case 'params': {
        const list = attrs.parameters.map((i) => ({ label: i.label, value: i.label }));
        _.set(currentOperation.data, 'nodeConfigs[0].enumList', list);
        break;
      }
      default:
        break;
    }
  }

  public dataSchema(): Schema | undefined {
    const { attrs } = this;
    if (attrs.funcReturn && attrs.funcReturn.state && attrs.funcReturn.type) {
      return { type: attrs.funcReturn.type };
    }
    return undefined;
  }

  public generate(): SimpleProcessData[] {
    const { attrs } = this;
    const nodes: SimpleProcessData[] = [];

    if (attrs.funcname) {
      const callNode = this.generateSimpleProcessData({
        type: 'funccall',
        value: {
          funcname: attrs.funcname,
        },
      });
      (attrs.params || []).forEach((param) => {
        if (!param.param || !param.type) {
          return;
        }
        if (param.type === 'variable') {
          callNode.value[param.param] = this.createSimpleProcessData('variable', param.variable);
        } else {
          callNode.value[param.param] = this.createSimpleProcessData(param.type, param.value);
        }
      });
      if (attrs.funcReturn && attrs.funcReturn.state) {
        nodes.push(
          this.createSimpleProcessData('set_tempvar', {
            name: TempVarName,
            value: callNode,
            schema: { type: attrs.funcReturn.type },
          }),
        );
      } else {
        nodes.push(callNode);
      }
    }

    if (attrs.funcReturn && attrs.funcReturn.state && Array.isArray(attrs.leftVar) && attrs.leftVar.length) {
      const assignNode = this.createSimpleProcessData('assign', {
        leftVar: this.createSimpleProcessData('variable', attrs.leftVar),
        rightVar: this.createSimpleProcessData('variable', [TempVarName]),
      });
      nodes.push(assignNode);
    }

    return nodes;
  }

  public modifyText(): void {
    const { component } = this;
    if (component.data.funcLabel) {
      this.modifyNodeTextByInsId(`调用方法 ${component.data.funcLabel}`, component);
      this.modifyNodeEnTextByInsId(`call function ${component.data.funcLabel}`, component);
    }
  }
}
