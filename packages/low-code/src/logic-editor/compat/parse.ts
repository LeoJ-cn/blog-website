import { Log } from './locales';
import _ from 'lodash';
import { Data, DataType, Schema } from '../../types/data';
const TAG = 'gui/index';

// 根据xml生成schema
export function getSchemaByXml(dom: Element) {
  let schema: any;
  try {
    switch (dom.getAttribute('type')) {
      case 'text':
        schema = {
          type: DataType.String,
        };
        break;
      case 'math_number':
        schema = {
          type: DataType.Number,
        };
        break;
      case 'create_empty_object':
      case 'object_create_with':
        schema = {
          type: DataType.Object,
          properties: [],
        };
        // 对象---找到所有blockly的key-val节点
        const keyValDom = [...dom.children].filter((ele) => ele.tagName === 'value');
        keyValDom.forEach((item) => {
          const kvBlock = item.children[0];
          let keyField = kvBlock.children[0].getElementsByTagName('field')[0];
          let valBlock = kvBlock.children[1].children[0];
          let key = keyField.innerHTML;
          if (key === '') {
            throw new Error('Key is empty!');
          }
          schema.properties.push({ ...getSchemaByXml(valBlock), key });
        });
        break;
      case 'create_empty_array':
      case 'create_array':
        schema = {
          type: DataType.Array,
          items: {},
        };
        // 数组的schema从第一项进行推测
        const itemDom = [...dom.children].find((ele) => ele.tagName === 'value');
        if (itemDom) {
          schema.items = getSchemaByXml(itemDom.children[0]);
        }
        break;
      case 'logic_boolean':
        schema = {
          type: DataType.Boolean,
        };
        break;
      case 'block_method_ref':
      case 'block_schema_function':
        schema = {
          type: DataType.Function,
        };
        break;
      default:
        break;
    }
    return schema;
  } catch (error) {
    console.log('getSchema', error);
    return undefined;
  }
}

// 变量结构解析
export function Parse(target: any) {
  Log.debug(TAG, '变量结构解析', '目标值', target);
  let result: any;
  try {
    if (_.isFunction(target)) {
      result = {
        type: DataType.Function,
      };
    }
    if (isObject(target)) {
      result = {
        type: DataType.Object,
        properties: [],
      };
      for (let key in target) {
        if (!key) {
          throw new Error('Key is empty!');
        }
      }
      _.forOwn(target, (value, key) => {
        result.properties.push(handleProperties(value, key));
      });
    }
    if (isArray(target)) {
      result = {
        type: DataType.Array,
        items: {},
      };
      result.items = handleProperties(target).items;
    }
    if (_.isString(target)) {
      result = {
        type: DataType.String,
      };
    }
    if (_.isNumber(target)) {
      result = {
        type: DataType.Number,
      };
    }
    if (_.isBoolean(target)) {
      result = {
        type: DataType.Boolean,
      };
    }

    return result;
  } catch (error) {
    console.log('Parse', error);
    return undefined;
  }
}

// 处理对象属性
export function handleProperties(propValue: any, key?: string) {
  if (key === '') {
    throw new Error('Key is empty!');
  }
  if (_.isFunction(propValue)) {
    return {
      type: DataType.Function,
      key,
    };
  }
  if (_.isNumber(propValue)) {
    return {
      type: DataType.Number,
      key,
    };
  }
  if (_.isBoolean(propValue)) {
    return {
      type: DataType.Boolean,
      key,
    };
  }
  if (_.isString(propValue)) {
    return {
      type: DataType.String,
      key,
    };
  }
  if (isObject(propValue)) {
    const buffer_obj: any = {
      type: DataType.Object,
      key,
      properties: [],
    };
    _.forOwn(propValue, (value, k) => {
      buffer_obj.properties.push(handleProperties(value, k));
    });
    return buffer_obj;
  }
  if (isArray(propValue)) {
    const buffer_arr = {
      type: DataType.Array,
      key,
      items: {},
    };
    // 数组为空
    if (propValue.length === 0) {
      return buffer_arr;
    }
    // 将每一项的数据结构与第一项进行对比
    _.map(propValue, (value) => {
      if (!checkItemFormat(propValue[0], value)) {
        throw new Error('数组元素数据存在错误！');
      }
    });
    if (isArray(propValue[0])) {
      const buffer: any = {
        type: DataType.Array,
        items: {},
      };
      buffer.items = handleProperties(propValue[0]).items;
      buffer_arr.items = buffer;
    } else if (isObject(propValue[0])) {
      const buffer: any = {
        type: DataType.Object,
        properties: [],
      };
      _.forOwn(propValue[0], (value, k) => {
        buffer.properties.push(handleProperties(value, k));
      });
      buffer_arr.items = buffer;
    } else {
      buffer_arr.items = handleProperties(propValue[0]);
    }
    return buffer_arr;
  }
}

// 遍历value若schema对应的值是function则返回function
function traverseValueBySchema(prefix: string = '', schema: Schema | undefined, value: any): any {
  try {
    if (!schema) {
      return value; // 若schema不存在则不遍历value
    }
    if (_.isString(value)) {
      if (getDataTypeByPath(prefix, schema) === DataType.Function) {
        eval(`value = ${value}`);
        return value;
      }
    }
    if (_.isArray(value)) {
      return value.map((valueItem) => {
        return traverseValueBySchema(prefix, schema.items, valueItem);
      });
    }
    if (isObject(value)) {
      for (let key in value) {
        const curSchema = _.find(schema.properties ?? [], (propItem) => {
          return propItem.key === key;
        });
        const prefixArray = prefix.split('.').filter((v) => v);
        prefixArray.push(key);
        value[key] = traverseValueBySchema(prefixArray.join('.'), curSchema, value[key]);
      }
      return value;
    }
    return value;
  } catch (error) {
    Log.debug(TAG, 'traverseValueBySchema', error);
  }
}

export function parseData(datas: string) {
  let parsedDatas = JSON.parse(datas);
  // function的变量需特殊处理
  for (let i = 0; i < parsedDatas.length; i++) {
    const dataItem: Data = parsedDatas[i];
    parsedDatas[i].value = traverseValueBySchema('', dataItem.schema, dataItem.value);
  }
  return parsedDatas;
}

// path的例子 a.b.c
export function getDataTypeByPath(path: string, schema: Schema) {
  if (!path || (schema.type !== DataType.Object && schema.type !== DataType.Array)) {
    return schema.type;
  }
  const pathArray = path.split('.');
  let curSchema = schema;
  let curProps: Schema | undefined = schema.type === DataType.Array ? schema.items : schema;
  while (pathArray.length > 0) {
    if (!curProps) break;
    const findProp = _.find(curProps.properties ?? [], (prop) => {
      return prop.key === pathArray[0];
    });
    if (!findProp) {
      break;
    } else if (findProp.type === DataType.Array) {
      curProps = findProp.items;
      curSchema = findProp;
    } else {
      curSchema = findProp;
      curProps = findProp;
    }
    pathArray.shift();
  }
  return curSchema.type;
}

// 检查数组元素格式
export function checkItemFormat(firstItem: any, item: any): boolean {
  return Object.prototype.toString.call(firstItem) === Object.prototype.toString.call(item);
  // if (isArray(item)) {
  //   _.map(item, value => {
  //     if (!checkItemFormat(item[0], value)) {
  //       throw new Error("数组元素数据存在错误！");
  //     }
  //   })
  // }
}

// 检测是否是数组
export function isArray(arr: any[]) {
  return Object.prototype.toString.call(arr) === '[object Array]';
}

// 检测是否为对象
export function isObject(obj: any) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

window.Parse = Parse;
