const path = require("path");
const fs = require("fs")
interface GuiConfigParams_Interface {
  APP_ID: string;
  NPM_NAME: string;
  VERSION: string;
  PACKAGE_NAME: string;
  COMPONENT_NAME: string;
  REMOTE_PATH: string;
}

interface RemoteConfig_Interface {
  path: {
    type: string;
    appid: string;
    remoteEntry: string;
    path: string;
  };
  category: string;
}

interface DependConfigItem_Interface {
  type: string;
  value: {
    source: string;
    channelAlias: string;
    appid: string;
    version: string;
  }
}
interface DependConfigItem2_Interface {
  type: string;
  value: string;
}
type DependConfig_Type = Array<DependConfigItem_Interface | DependConfigItem2_Interface>


export function getRemoteConfig(guiconfig: GuiConfigParams_Interface): RemoteConfig_Interface {
  const {
    APP_ID,
    NPM_NAME,
    VERSION,
    PACKAGE_NAME,
    COMPONENT_NAME,
    REMOTE_PATH
  } = guiconfig;
  return {
    "path": {
      "type": "remote",
      "appid": `${APP_ID}`,
      "remoteEntry": `${REMOTE_PATH}/${NPM_NAME}/${VERSION}/remoteEntry.js`,
      "path": `${APP_ID}.${PACKAGE_NAME}.${COMPONENT_NAME}`
    },
    "category": "editor_render"
  }
}

export function getDependConfig(guiconfig: GuiConfigParams_Interface): DependConfig_Type {
  const {
    APP_ID,
    VERSION,
    NPM_NAME,
    PACKAGE_NAME,
    COMPONENT_NAME
  } = guiconfig;
  return [
    {
      "type": "async-service",
      "value": {
        "source": `${NPM_NAME}`,
        "channelAlias": "default",
        "appid": `${APP_ID}`,
        "version": `${VERSION}`
      }
    },
    {
      "type": "depend",
      "value": `component.${APP_ID}.${PACKAGE_NAME}.${COMPONENT_NAME}`
    }
  ]
}

export function generateGuiRemoteConfig(filePath: string, componentName: string = '') {
  const ALL_CONFIG = {
    COMPONENT_PATH: filePath, // 分析的组件
    COMPONENTS_PATH: "", // 组件所在的components
    COMPONENTS_INDEX_TS_PATH: "", // 项目内的package [PACKAGE_NAME]
    ROTE_PATH: "", // 组件所在项目
    CONFIG_JSON_PATH: "", // 项目文件（/packages/config.json） [APP_ID]
    PACKAGE_JSON_PATH: "", // 项目package.json文件 [NPM_NAME/VERSION]

    APP_ID: "",
    NPM_NAME: "",
    VERSION: "",
    PACKAGE_NAME: "",
    COMPONENT_NAME: componentName,
    REMOTE_PATH: "//pkg.oneitfarm.com",
  };

  // 查找components目录
  let walk_path = "";
  for (let i = 0; i < 50; i++) {
    walk_path = path.resolve(filePath, "..");
    const isInPackages = path.basename(
      path.resolve(walk_path, "..", "..")
    ) === 'packages';
    const curFolerName = path.basename(walk_path);

    // 组件所在目录，然后根据固定目录结构，推测
    if (curFolerName === "components" && isInPackages) {
      ALL_CONFIG.COMPONENTS_PATH = walk_path;
      break;
    }
  }
  if (!ALL_CONFIG.COMPONENTS_PATH) {
    throw new Error("【失败：生成远端配置】没有匹配packages的包，请检查组件是否存放在 /packages/{packageName}/components/* 下");
  }

  // 查找components所在的package目录
  let COMPONENTS_INDEX_TS_PATH = path.resolve(
    ALL_CONFIG.COMPONENTS_PATH,
    "..",
    "index.ts"
  );
  if (!fs.existsSync(COMPONENTS_INDEX_TS_PATH)) {
    COMPONENTS_INDEX_TS_PATH = path.resolve(
      ALL_CONFIG.COMPONENTS_PATH,
      "..",
      "index.js"
    );
    if (!fs.existsSync(COMPONENTS_INDEX_TS_PATH)) {
      throw new Error("【失败：生成远端配置】没有匹配到 ${package}/index.[js|ts] 文件");
    }
  }
  ALL_CONFIG.COMPONENTS_INDEX_TS_PATH = COMPONENTS_INDEX_TS_PATH;

  // 项目根目录
  ALL_CONFIG.ROTE_PATH = path.resolve(
    ALL_CONFIG.COMPONENTS_PATH,
    "..",
    "..",
    ".."
  );

  // config.json（获取appid）
  ALL_CONFIG.CONFIG_JSON_PATH = path.resolve(
    ALL_CONFIG.ROTE_PATH,
    "packages",
    "config.json"
  );

  // package.json (获取name以及version)
  ALL_CONFIG.PACKAGE_JSON_PATH = path.resolve(
    ALL_CONFIG.ROTE_PATH,
    "package.json"
  );


  const {
    PACKAGE_JSON_PATH,
    CONFIG_JSON_PATH
  } = ALL_CONFIG

  const {
    name,
    version
  } = require(PACKAGE_JSON_PATH);
  ALL_CONFIG.NPM_NAME = name;
  ALL_CONFIG.VERSION = version;

  if (!name || !version) {
    throw new Error(
      `【失败：生成远端配置】package.json缺少name或version：${PACKAGE_JSON_PATH};`
    )
  }

  const {
    appid,
  } = require(CONFIG_JSON_PATH)
  ALL_CONFIG.APP_ID = appid;

  if (!appid) {
    throw new Error(
      `【失败：生成远端配置】config.json缺少appid：${CONFIG_JSON_PATH};`
    )
  }

  // TODO: 这里通过正则获取 package.name 有风险
  let packageName = ''
  const str = fs.readFileSync(COMPONENTS_INDEX_TS_PATH, 'utf8')
  String(str).replace(/name\s*:\s*['"](.+)['"]/img, (match, $1) => {
    packageName = $1
    return match
  })

  if (!packageName) {
    throw new Error(
      `【失败：生成远端配置】请检查package的name定义：${COMPONENTS_INDEX_TS_PATH};\n
       建议直接定义package.name, 示例如下：
       // ...
       const pkg: Package = {
        name: 'package_name',
        // ...
      };
      // ...
      `
    )
  }

  ALL_CONFIG.PACKAGE_NAME = packageName

  return {
    remote_config: getRemoteConfig(ALL_CONFIG),
    depend_config: getDependConfig(ALL_CONFIG)
  }
}