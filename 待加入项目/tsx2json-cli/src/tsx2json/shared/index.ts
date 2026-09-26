export type LooseObject = {
  [key: string]: any
}

// TODO:zm schema类型定义
export interface SchemaJson {
  // type: DataType; // 基本类型
  // key?: string;
  // enumList?: EnumList[] | [];
  // items?: Schema; // type = 数组的时候
  // properties?: Schema[]; // 注意要对key去重  type = object
  // label?: string; // schema的key的中文

  // // 注释附加信息
  // additionalProperties?: {
  //   gui_render_comp: string; 枚举  交互树：使用哪一种组件渲染
  //   [key: string]: any;
  // };

  [key: string]: any
}

export * from './compilerVersions.generated'
// export * as constants from "./constants";
export * from './types'
