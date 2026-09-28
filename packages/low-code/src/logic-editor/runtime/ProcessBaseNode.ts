import { v4 as uuidv4 } from 'uuid';
import { SimpleProcessData } from '../../types/process';
import _ from 'lodash';
import { ComponentTree } from '../../types/component';
import { Data } from '../../types/data';
import { Schema } from '../../types/schema';
import { OperationComponentTree } from '../../types/edit-page';
import { PageCenter } from '../compat/legacy-host';

interface ProcessBaseNodeOptions<T> {
  attrs?: T;
  dataList?: Data[];
  renderTree?: ComponentTree;
  component?: ComponentTree;
}

export abstract class ProcessBaseNode<T extends Object> {
  public attrs: T;
  public dataList: Data[] = [];
  public renderTree: ComponentTree;
  public component: ComponentTree;

  public constructor(options: ProcessBaseNodeOptions<T>) {
    this.attrs = options.attrs || (options.component && (options.component.data as any));
    this.dataList = options.dataList || [];
    this.renderTree = options.renderTree;
    this.component = options.component;
  }

  /**
   * 翻译节点
   */
  public abstract generate(): SimpleProcessData[];

  /**
   * 修改节点文案
   */
  public abstract modifyText(): void;

  /**
   * 生成变量的 schema
   */
  public abstract dataSchema(): Schema | undefined;

  /**
   * 操作树渲染前
   * @param key
   * @param currentOperation
   */
  public abstract beforeOperationRender(key: keyof T, currentOperation: OperationComponentTree): void;

  /**
   * 监听属性改变
   * @param key
   * @param value
   * @param currentOperation
   */
  public abstract attrsChange(
    key: keyof T,
    value: T[keyof T],
    currentOperation: OperationComponentTree,
  ): void | Promise<void>;

  /**
   * 生成 id
   */
  public generateId() {
    return uuidv4().replace(/-/g, '');
  }

  /**
   * 生成 SimpleProcessData， 帮创建 id
   * @param node
   */
  protected generateSimpleProcessData(node: Omit<SimpleProcessData, 'id'> & { id?: string }): SimpleProcessData {
    return {
      id: this.generateId(),
      ...node,
    };
  }

  /**
   * 创建 SimpleProcessData 数据
   * @param type
   * @param value
   */
  public createSimpleProcessData(type: string, value?: any, options: any = {}): SimpleProcessData | undefined {
    let node: any = {
      id: this.generateId(),
      value: {},
    };
    switch (type) {
      case 'null':
        node.type = 'block_null';
        break;
      case 'number':
        node.type = 'math_number';
        node.value.NUM = _.toString(value) || '0';
        break;
      case 'string':
        node.type = 'text';
        node.value.TEXT = _.toString(value);
        break;
      case 'boolean':
        node.type = 'logic_boolean';
        node.value.BOOL = value || 'FALSE';
        break;
      case 'object':
        node.type = 'object_create_with';
        if (!Array.isArray(value) || !value.length) {
          node.mutation = { items: '0' };
          break;
        }
        const factValue = value.filter((v) => v && v.key);
        node.mutation = { items: factValue.length + '' };
        factValue.forEach((item, index) => {
          node.value['ADD' + index] = this.generateSimpleProcessData({
            type: 'kv',
            value: {
              key: typeof item.key === 'string' ? this.createSimpleProcessData('string', item.key) : item.key,
              value: item.value,
            },
          });
        });
        break;
      case 'array':
        node.type = 'create_array';
        if (!Array.isArray(value) || !value.length) {
          node.mutation = { items: '0' };
          break;
        }
        node.mutation = { items: value.length + '' };
        value.forEach((item, index) => {
          node.value['ADD' + index] = item;
        });
        break;
      case 'variable':
        if (!Array.isArray(value)) {
          value = [value];
        }
        const variableId = value[0];
        if (!variableId) {
          return undefined;
        }
        const variable = variableId.length === 32;
        if (variable && !options.schema) {
          node.type = 'data_schema_get_cascader';
          node.mutation = {
            valueList: JSON.stringify(value.slice(0, 1)),
            dataId: variableId,
          };
          node.value.data = variableId;
          value.slice(1).forEach((item: string, index: number) => {
            node = {
              id: this.generateId(),
              type: 'block_get_objectvalue',
              value: {
                object: node,
                attribute: this.createSimpleProcessData('string', item),
              },
            };
          });
        } else {
          let variableNode = node;
          node.type = 'item_get_cascader';
          const realSchema = { type: 'any' } as any;
          let cs = realSchema;
          node.value.itemName = variableId;
          value.slice(1).forEach((item: string, index: number) => {
            node = {
              id: this.generateId(),
              type: 'block_get_objectvalue',
              value: {
                object: node,
                attribute: this.createSimpleProcessData('string', item),
              },
            };
            cs.type = 'object';
            if (!cs.properties) {
              cs.properties = [];
            }
            cs.properties.push({
              key: item,
              type: 'any',
            });
            cs = cs.properties[0];
          });
          variableNode.mutation = {
            itemName: variableId,
            realSchema: JSON.stringify(options.schema || realSchema).replace(/"/g, "'"),
            valueList: JSON.stringify(value.slice(0, 1)),
          };
        }
        break;
      case 'math_arithmetic':
        node.type = 'math_arithmetic_basic';
        if (!value) {
          break;
        }
        node.value.A = value.A;
        node.value.B = value.B;
        node.value.OP = value.OP;
        break;
      case 'assign':
        node.type = 'assignblock';
        node.value.leftVar = value.leftVar;
        node.value.rightVar = value.rightVar;
        break;
      case 'set_tempvar':
        if (value.schema) {
          node.type = 'block_schema_set_temp';
          node.value.temp = value.name;
          node.value.value = value.value;
          node.mutation = {
            varName: value.name,
            schema: JSON.stringify(value.schema).replace(/"/g, "'"),
          };
        } else {
          node.type = 'block_set_tempvar';
          node.value.tempVarName = value.name;
          node.value.tempVarValue = value.value;
          node.mutation = {
            varName: value.name,
          };
        }
        break;
      case 'locale':
        node.type = 'block_multilingual_choose';
        node.value.pageLocaleValue = value;
        break;
      case 'is':
        node.type = 'block_not';
        node.value.value = this.createSimpleProcessData('not', value);
        break;
      case 'not':
        node.type = 'block_not';
        node.value.value = value;
        break;
      default:
        return;
    }
    return node;
  }

  protected value2SimpleProcessData(value: any) {
    if (Array.isArray(value)) {
      return this.createSimpleProcessData(
        'array',
        value.map((i) => this.value2SimpleProcessData(i)),
      );
    }
    switch (typeof value) {
      case 'undefined':
        return undefined;
      case 'object':
        if (!value) {
          return this.createSimpleProcessData('null');
        }
        return this.createSimpleProcessData(
          'object',
          Object.keys(value).map((key) => ({ key, value: this.value2SimpleProcessData(value[key]) })),
        );
      case 'boolean':
        return this.createSimpleProcessData('boolean', value ? 'TRUE' : 'FALSE');
      case 'number':
      case 'bigint':
        return this.createSimpleProcessData('number', value);
      case 'string':
        return this.createSimpleProcessData('string', value);
      case 'function':
        break;
      case 'symbol':
        break;
      default:
        break;
    }
    return undefined;
  }

  public assignNodeData() {
    const { component } = this;
    const originData = component.data.$data || [];

    const collectIds = (result: Record<string, Array<string>>, item: SimpleProcessData) => {
      if (!result[item.type]) {
        result[item.type] = [];
      }
      result[item.type].splice(0, 0, item.id);

      if (item.value) {
        Object.keys(item.value).forEach((key) => {
          const value = item.value[key];
          if (!value || typeof value !== 'object') {
            return;
          }
          if (Array.isArray(value)) {
            value.reduce(collectIds, result);
          } else {
            collectIds(result, value);
          }
        });
      }

      return result;
    };
    const oldIdMap = originData.reduce(collectIds, {});

    const newData = this.generate();

    const assignIds = (item: SimpleProcessData) => {
      if (!item.type) {
        return;
      }
      const id = oldIdMap[item.type] && oldIdMap[item.type].pop();
      if (!id) {
        return;
      }
      item.id = id;
      if (!item.value) {
        return;
      }
      Object.keys(item.value).forEach((key) => {
        const value = item.value[key];
        if (!value || typeof value !== 'object') {
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(assignIds);
        } else {
          assignIds(value);
        }
      });
    };

    if (newData) {
      newData.forEach(assignIds);
    }
    component.data.$data = newData;
  }

  /**
   * 合并逻辑对比块
   * @param conditions
   * @param op
   */
  protected joinLogicCompare(conditions: SimpleProcessData[], op: 'ANDAND' | 'OROR') {
    if (conditions.length < 2) {
      return conditions[0];
    }

    let curCompare = this.generateSimpleProcessData({
      type: 'logic_compare',
      value: {
        A: conditions[0],
        B: conditions[1],
        OP: op,
      },
    });

    conditions.slice(2).forEach((condition) => {
      curCompare = this.generateSimpleProcessData({
        type: 'logic_compare',
        value: {
          A: curCompare,
          B: condition,
          OP: op,
        },
      });
    });

    return curCompare;
  }

  public getRenderTreeMaxId(renderTree: ComponentTree): number {
    let maxId = renderTree.id;

    renderTree.children.forEach((child) => {
      const id = this.getRenderTreeMaxId(child);
      if (id > maxId) {
        maxId = id;
      }
    });

    return maxId;
  }

  protected refreshTreeId(tree: ComponentTree, startId: number): number {
    tree.id = ++startId;

    tree.children.forEach((child) => {
      child.parentId = tree.id;
      startId = this.refreshTreeId(child, startId);
    });

    return startId;
  }

  /**
   * 在指定位置插入 ComponentTree
   * @param tree
   * @param parentTree
   * @param pos
   */
  protected addTreeByPosition(tree: ComponentTree, parentTree: ComponentTree, pos: number) {
    tree = _.cloneDeep(tree);
    const maxId = this.getRenderTreeMaxId(this.renderTree);
    this.refreshTreeId(tree, maxId);
    tree.parentId = parentTree.id;

    parentTree.children.splice(pos, 0, tree);
  }

  /**
   * 根据 insId 寻找节点
   * @param node
   * @param insId
   */
  protected findNodeByInsId(node: ComponentTree | undefined, insId: string): ComponentTree | undefined {
    if (!node) {
      return undefined;
    }
    if (node.ins_id === insId) {
      return node;
    }
    if (!node.children) {
      return undefined;
    }
    for (const n of node.children) {
      const findNode = this.findNodeByInsId(n, insId);
      if (findNode) {
        return findNode;
      }
    }
    return undefined;
  }

  /**
   * 修改指定节点的文案
   * @param text
   * @param node
   */
  protected modifyNodeText(text: string, node: ComponentTree = this.component) {
    node.data.content = text;
  }

  /**
   * 修改指定节点的英文文案
   * @param text
   * @param node
   */
  protected modifyNodeEnText(text: string, node: ComponentTree = this.component) {
    _.set(node.data, `$locales['en-US'].content`, text);
  }

  /**
   * 根据 insId 修改指定节点的文案
   * @param text
   * @param node
   * @param insId
   */
  protected modifyNodeTextByInsId(
    text: string,
    node: ComponentTree = this.component,
    insId = 'bf6eba50b76d4f0d9f6c29d0ab94a18b',
  ) {
    if (!node.children.length) {
      node.data.content = text;
      return;
    }
    const findNode = this.findNodeByInsId(node, insId);
    if (findNode) {
      findNode.data.$text = text;
    }
  }

  /**
   * 根据 insId 修改指定节点的英文文案
   * @param text
   * @param node
   * @param insId
   */
  protected modifyNodeEnTextByInsId(
    text: string,
    node: ComponentTree = this.component,
    insId = 'bf6eba50b76d4f0d9f6c29d0ab94a18b',
  ) {
    if (!node.children.length) {
      _.set(node.data, `$locales['en-US'].content`, text);
      return;
    }
    const findNode = this.findNodeByInsId(node, insId);
    if (findNode) {
      _.set(findNode.data, `$locales['en-US'].$text`, text);
    }
  }

  /**
   * 获取变量的 label
   * @param variable
   */
  protected getLabelByVariable(variable: string[]) {
    const label = this.dataList.find((i) => (i.id || i.name) === variable[0]);
    if (label) {
      return [label.label, ...variable.slice(1)].join('.');
    }
    return variable.join('.');
  }

  /**
   * 根据 Schema 路径获取 Schema
   * @param schema
   * @param path
   */
  protected getSchemaByPath(schema: Schema, path: string[]): Schema | undefined {
    if (path.length === 0) {
      return schema;
    }
    if (!schema || schema.type !== 'object' || !Array.isArray(schema.properties)) {
      return undefined;
    }
    const curPath = path.shift();
    const property = _.cloneDeep(schema.properties.find((i) => i.key === curPath));

    if (!property) {
      return undefined;
    }
    if (path.length > 0) {
      return this.getSchemaByPath(property, path);
    }
    delete property.key;
    return property;
  }

  protected getSchemaByVariable(variable: string[]): Schema | undefined {
    if (!variable[0]) {
      return undefined;
    }
    const data = this.dataList.find((i) => i.id === variable[0]);
    if (!data) {
      return undefined;
    }
    return this.getSchemaByPath(data.schema, variable.slice(1));
  }

  /**
   * 获取多语言列表
   */
  public getLocaleList() {
    const extra1 = PageCenter.cur_page && PageCenter.cur_page.extra1;
    const pageUuid = JSON.parse(extra1).page_uuid;
    return PageCenter.localeManager.getPageLocaleArray(pageUuid);
  }

  /**
   * 根据 value 获取多语言的 label
   * @param value
   */
  public getLocaleLabelByValue(value: string) {
    const list = this.getLocaleList();
    const item = list.find((i) => i.value === value);
    if (item) {
      return item.label;
    }
  }
}
