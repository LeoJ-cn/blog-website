import { CallApiProcessNodeFrontAttrApi } from '../../types/api';
import { ProcessBaseNode } from './ProcessBaseNode';
import { OperationComponentTree } from '../../types/edit-page';
import { Schema } from '../../types/schema';
import { SimpleProcessData } from '../../types/process';
import _ from 'lodash';
import * as processMixin from '../compat/process';

interface CallApiAttrs {
  api?: CallApiProcessNodeFrontAttrApi & any;
  leftVar?: string[];
  params?: Array<{ id?: number; param?: string; paramType?: string; type?: string; value?: string[] | string | number; }>;
  return?: string[];
  returnFail?: 'show_message' | 'funccall' | 'api_return' | 'throw' | 'none';
  returnType?: string;
  break?: boolean;
  failText?: string;
  function?: string;
  paramsNum?: 'all' | 'none';
}

type CallApiParam = NonNullable<CallApiAttrs['params']>[number]
interface ApiPropConfig {
  key: string
  label?: string
  value?: unknown
  schema?: { type?: string }
}

const TempVarName = 'call_api_temp_var';

export class CallApiNode extends ProcessBaseNode<CallApiAttrs> {
  public attrsChange(
    key: keyof CallApiAttrs,
    value: CallApiAttrs[keyof CallApiAttrs],
    currentOperation: OperationComponentTree,
  ): void | Promise<void> {
    const oldApi = this.attrs.api;
    this.attrs = this.component.data as any;
    const { attrs, component } = this;
    if (!attrs.api) return;
    switch (key) {
      case 'api': {
        if (!oldApi || oldApi.name !== attrs.api.name) {
          if (attrs.paramsNum === 'none') {
            attrs.params = [];
          } else {
            const propsList = (JSON.parse(attrs.api.props) || []) as ApiPropConfig[];
            const params: CallApiParam[] = [];
            propsList.forEach((prop, index) => {
              if (index === propsList.length - 1) {
                return;
              }
              params.push({
                id: index,
                param: prop.key,
                paramType: _.get(prop, 'schema.type'),
                type: 'variable',
              });
            });
            attrs.params = params;
          }
          attrs.return = ['res'];
        } else {
          const propsList = (JSON.parse(attrs.api.props) || []) as ApiPropConfig[];
          const keys = propsList.map((i) => i.key);
          attrs.params = (attrs.params ?? []).filter((i) => i.param !== undefined && keys.includes(i.param));
        }
        break;
      }
      case 'params': {
        const propsList = (JSON.parse(attrs.api.props) || []) as ApiPropConfig[];
        (attrs.params ?? []).forEach((param) => {
          if (param.type !== 'variable' && Array.isArray(param.value)) {
            param.value = '';
          }
          if (param.type === 'variable' && !Array.isArray(param.value)) {
            param.value = undefined;
          }
          const prop = propsList.find((i) => i.key === param.param);
          if (prop) {
            param.paramType = _.get(prop, 'schema.type');
          }
        });
        break;
      }
      case 'returnType': {
        attrs.return = ['res'];
        break;
      }
      case 'paramsNum': {
        const propsList = (JSON.parse(attrs.api.props) || []) as ApiPropConfig[];
        if (value === 'none') {
          attrs.params = [];
        } else {
          const params: CallApiParam[] = [];
          propsList.forEach((prop, index) => {
            if (index === propsList.length - 1) {
              return;
            }
            params.push({
              id: index,
              param: prop.key,
              paramType: _.get(prop, 'schema.type'),
              type: 'variable',
            });
          });
          attrs.params = params;
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

  public beforeOperationRender(key: keyof CallApiAttrs, currentOperation: OperationComponentTree): void {
    const { attrs } = this;
    if (!attrs.api || !currentOperation.data) return;
    switch (key) {
      case 'params': {
        const propsList = (JSON.parse(attrs.api.props) || []) as ApiPropConfig[];
        const params: Array<{ label: string; value: string; type?: string }> = [];
        propsList.forEach((prop, index) => {
          if (index === propsList.length - 1) {
            return;
          }
          params.push({
            label: prop.label || prop.key,
            value: prop.key,
            type: _.get(prop, 'schema.type'),
          });
        });
        _.set(currentOperation.data, 'nodeConfigs[0].enumList', params);
        break;
      }
      case 'function': {
        const list = processMixin.getMethodList().map((i) => ({ label: i.funcLabel, value: i.id }));
        _.set(currentOperation.data, 'singleAttr.enumList', list);
        break;
      }
      case 'return': {
        _.set(
          currentOperation.data,
          'singleAttr.schema',
          _.get(JSON.parse(attrs.api.realization), 'returnSchema'),
        );
        break;
      }
      default:
        break;
    }
  }

  public dataSchema(): Schema | undefined {
    const { attrs } = this;
    if (!attrs.api) {
      return ;
    }
    const schema = _.get(JSON.parse(attrs.api.realization), 'returnSchema');
    if (schema && attrs.returnType === 'sub' && Array.isArray(attrs.return)) {
      return this.getSchemaByPath(schema, attrs.return.slice(1));
    }
    return schema;
  }

  public generate(): SimpleProcessData[] {
    const { attrs } = this;
    const nodes: SimpleProcessData[] = [];
    if (!attrs.api) {
      return [];
    }
    const { appid, label, doc_version, name, props } = attrs.api;
    const minimethod_uuid = `${appid}_${label}_${doc_version}`;
    const propsList = JSON.parse(props) as ApiPropConfig[];
    const requestStackValue = propsList[propsList.length - 1];
    if (!requestStackValue) throw new Error(`API ${name} 缺少请求栈配置`);
    // api 的请求栈
    const requestStack = this.value2SimpleProcessData(requestStackValue.value);
    // 生成调用 api 主体
    const callApiNode = this.generateSimpleProcessData({
      type: 'call_api',
      value: {
        [name]: label,
        ['arg' + (propsList.length - 1)]: requestStack,
      },
      mutation: {
        minimethod_uuid,
        appid: 'null',
        task_label: 'null',
        version: 'null',
        arguments: '',
      },
    })
    const callApiValue = callApiNode.value;
    if (!callApiValue) throw new Error(`API ${name} 调用节点缺少 value 容器`);
    const tempDataNode = this.createSimpleProcessData('set_tempvar', {
      name: TempVarName,
      value: callApiNode,
    });

    // 拼接 api 参数
    if (Array.isArray(propsList) && Array.isArray(attrs.params)) {
      const configuredParams = attrs.params;
      propsList.forEach((prop, index) => {
        const param = configuredParams.find((i) => i.param === prop.key);
        if (!param || !param.type) {
          return;
        }
        if (param.type === 'variable') {
          callApiValue['arg' + index] = this.createSimpleProcessData('variable', param.value);
        } else {
          callApiValue['arg' + index] = this.createSimpleProcessData(prop.schema?.type ?? 'null', param.value);
        }
      });
    }

    nodes.push(tempDataNode);

    // 返回失败的错误处理
    const failNode: SimpleProcessData & { value: { IF0: SimpleProcessData; DO0: SimpleProcessData[] } } = {
      id: this.generateId(),
      type: 'controls_if',
      value: {
        IF0: {
          id: this.generateId(),
          type: 'math_compare',
          value: {
            A: this.createSimpleProcessData('variable', [TempVarName, 'state']),
            B: this.createSimpleProcessData('number', 1),
            OP: 'NOT_EQUAL',
          },
        },
        DO0: [],
      },
    };
    if (attrs.returnFail) {
      if (attrs.returnFail === 'show_message' && attrs.failText) {
        failNode.value.DO0.push(this.generateSimpleProcessData({
          type: 'show_message',
          value: {
            type: 'error',
            content: this.createSimpleProcessData('string', attrs.failText || ''),
          },
        }));
      }
      if (attrs.returnFail === 'funccall' && attrs.function) {
        const method = processMixin.getMethodList().find((i) => i.id === attrs.function);
        if (method && method.funcReturn && method.funcReturn.state) {
          failNode.value.DO0.push(this.createSimpleProcessData('set_tempvar', {
            name: 'api_func_call_temp_var',
            value: this.generateSimpleProcessData({
              type: 'funccall',
              value: {
                funcname: attrs.function,
              },
            }),
          }));
        } else if (method) {
          failNode.value.DO0.push(this.generateSimpleProcessData({
            type: 'funccall',
            value: {
              funcname: attrs.function,
            },
          }));
        }
      }
      if (attrs.returnFail === 'api_return') {
        failNode.value.DO0.push(this.generateSimpleProcessData({
          type: 'show_message',
          value: {
            type: 'error',
            content: this.createSimpleProcessData('variable', [TempVarName, 'msg']),
          },
        }));
      }
      if (attrs.returnFail === 'throw') {
        failNode.value.DO0.push(this.generateSimpleProcessData({
          type: 'block_method_minimethod',
          mutation: {
            minimethod_uuid: 'sal20000_org_key22082327jg9l342i'
          },
          value: {
            throwError: '抛出异常throw',
            arg0: this.createSimpleProcessData('variable', [TempVarName, 'msg']),
          },
        }));
      }

      if (attrs.break) {
        failNode.value.DO0.push(this.generateSimpleProcessData({
          type: 'funcreturn',
        }));
      }

      nodes.push(failNode);
    }

    // 赋值到接收变量
    if (attrs.leftVar) {
      let rightVar;
      if (attrs.returnType === 'sub' && Array.isArray(attrs.return) && attrs.return.length > 1) {
        rightVar = this.createSimpleProcessData('variable', [TempVarName, ...attrs.return.slice(1)]);
      } else {
        rightVar = this.createSimpleProcessData('variable', TempVarName);
      }
      nodes.push(this.createSimpleProcessData('assign', {
        leftVar: this.createSimpleProcessData('variable', attrs.leftVar),
        rightVar,
      }));
    }

    return nodes;
  }

  public modifyText(): void {
    const { component } = this;
    const attrs = component.data as CallApiAttrs;
    let text = `暂无数据`;
    let enText = `No data`;
    if (attrs.api) {
      const { library_label, library_name, category_label, category_name, label, name } = attrs.api;
      text = `调用 API ${library_label}库-${category_label}类-${label}`;
      enText = `call API ${library_name} library - ${category_name} category - ${name}`;

      if (attrs.leftVar) {
        text += ` 把结果赋值到 "${this.getLabelByVariable(attrs.leftVar)}"`;
        enText += `assign the result to "${this.getLabelByVariable(attrs.leftVar)}"`;
      }
    }

    this.modifyNodeTextByInsId(text, component);
    this.modifyNodeEnTextByInsId(enText, component);
  }

}
