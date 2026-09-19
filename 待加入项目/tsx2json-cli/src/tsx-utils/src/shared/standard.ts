export interface EnumList_Interface {
  label: string;
  value: string;
}

export type LooseObject = {
  [key: string]: any
}

export interface Schema_Interface {
  type?: any; // 基本类型
  key?: string;
  enumList?: EnumList_Interface[] | [];
  items?: Schema_Interface; // type = 数组的时候
  properties?: {
    [pro: string]: Schema_Interface
  };
  label?: string; // schema的key的中文

  description?: string, //原子数据类型注释
  additionalProperties?: { // 注释中添加的附加属性
    gui_render_comp: any; // 指定gui渲染组件
    [OtherParams: string]: any;
  },
  // 其他未分析的定义（比如anyof等）
  [other: string]: any
}