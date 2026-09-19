# 一、使用说明
1. 安装 @idg/gui-cli
```
yarn add @idg/gui-cli  --registry=https://npm.oneitfarm.com
```

2. 查看安装
```
gui -h

out log:
Usage: gui [options] [command]

Options:
  --version, -V       当前gui-cli的版本
  -h, --help          display help for command

Commands:
  tsx2json [options]  tsx 转换成 schema
  help [command]      display help for command
```

3. 准备工作：查看需要分析的组件
```
注意： 目标组件所在的仓库，需已经完成“yarn install”的安装，分析过程存在获取三方依赖
```

4. 执行分析
```
gui tsx2json -c ${file_absolute_path}

out files(4): 输出的文件在分析目录下
1.<组件的JsonSchema> ${Component_Class_Name}.schema.json
2.<最小方法>          ${Component_Class_Name}.jsonSchemaToMethod.schema.json
3.<原子组件-占位渲染>   ${Component_Class_Name}.jsonSchemaToAtomComponent.schema.json
4.<原子组件-交互树>      ${Component_Class_Name}.jsonSchemaToOperationTree.schema.json
```




# 二、其他说明
## Analyze the schema of the vue.tsx component
## The current version only analyzes @Prop and @Emit
## Cli

```
Usage: ztsx tsx2json [options]

tsx 转换成 schema

Options:
  -c --conversion <fileFath>          *.tsx => *.schema.json 转译单个文件
  -ca --conversion-all  <folderFath>  *.tsx => *.schema.json 转译目录下所有tsx文件
  -h, --help                          display help for command
```

## JavaScript API

```
 const { tsx2json } = require("@white55/tsx");
 tsx2json( ${file_absolute_path} )
```


# 字段说明
```
  /**
   * 字段说明：
   * REMOTE_PATH: '//pkg.oneitfarm.com'
   * APP_ID: '/packages/config.json -> appid' [COMPONENT_PATH]
   * NPM_NAME: '/package.json -> name'
   * VERSION: '/package.json -> version'
   * PACKAGE_NAME: '${components_path}+index.ts -> pkg.name'
   * COMPONENT_NAME: '${components_ClassName}'
   *
   *
   * 路径逻辑
   * COMPONENT_FILE_PATH： 组件路径（packages/largegraph/components/*）
   * COMPONENTS_PATH: 组件所在目录 .../components
   * ROTE_PATH: path.resolve(COMPONENTS_PATH, '../../../')
   * APP_ID: path.resolve(ROTE_PATH, 'packages', 'config.json') -> .appid
   * NPM_NAME: path.resolve(ROTE_PATH, 'package.json') -> .name
   * VERSION: path.resolve(ROTE_PATH, 'package.json') -> .version
   * PACKAGE_NAME: path.resolve(COMPONENTS_PATH, 'index.ts') -> .name
   * COMPONENT_NAME: path.resolve(COMPONENT_FILE_PATH) -> .ClassName
   *
   */
```
## 最小方法-远端配置
```
  {
    "path": {
      "type": "remote",
      "appid": "${APP_ID}",
      "remoteEntry": "${REMOTE_PATH}/${NPM_NAME}/${VERSION}/remoteEntry.js",
      "path": "${APP_ID}.${PACKAGE_NAME}.${COMPONENT_NAME}"
    },
    "category": "editor_render"
  }
```

## 最小方法-依赖配置
```
[
  {
		"type": "async-service",
		"value": {
			"source": "${NPM_NAME}",
			"channelAlias": "default",
      "appid": "${APP_ID}",
      "version": "${VERSION}"
		}
  },
  {
		"type": "depend",
    "value": "component.${APP_ID}.${PACKAGE_NAME}.${COMPONENT_NAME}"
	}
]
```

## 组件Demo Url
```
http://${remote}/${package-name}/0.0.1/

```



# 三 .tsx 组件注意事项
1. prop属性使用 @Prop ， emit事件使用 @Emit 
2. Ts Type定义相关: 所有字段添加“块注释”， 第一行注释会被指定成 description
```
File: some-type.ts

export interface DateRange {
  /**
  * 日期（这里一个注释）
  */
  date: string; // '2022-09-27'
  /**
  * 范围
  */
  ranges: Range[];
}
```

2. 外部引入的ts定义文件，只能 import from .ts 文件， 不允许 import from .tsx文件

3. 设置prop的交互树（通过ts注释「@additionalProperties.gui_render_comp "some-comp"」来指定）
```
Demo：
export interface DateRange {
  /**
  * 日期
  * @additionalProperties.gui_render_comp  "GoTextInput"
  */
  date: string;
}



默认指定的类型
{
  boolean: 'GoChecker',
  number: 'GoNumberInput',
  string: 'GoTextInput',
  enum: "GoItemSelect" // 枚举类型：强制使用下拉框（尽可能在符合场景使用起来，有助于交互操作）
}


交互组件列表：
[
  'GoTextInput',
  'GoItemSelect',
  'GoSpecialPicker',
  'GoChecker',
  'GoNumberInput',
  'GoColor',
  'GoFont',
  'GoIconSelect',
  'GoImageSelect',
  'GoAudioSelect',
  'GoVideoSelect',
  'GoSvgSelect',
  'GoDateEditor',
  'GoDirectionSelect',
  'GoRouteSelect',
  'GoAdvanceSetting',
  'GoRadioSelect',
  'GoTimestampSelect',
  'GoDateDashSelect',
  'GoHourMinuteSelect',
  'GoNumWithUnit',
  'GoCheckGroup',
  'GoComponentSelect',
  'GoCascaderSelect',
  'GoAutoTextarea',
  'ApiSelect',
  'ProcessVariableSelect',
  'AttrSelect',
  'AdvanceVariableSelect',
  'GoRatio',
  'GoNone'
];


解决问题：
1. 如果渲染出现问题无法解决，就指定交互渲染组件是
```
