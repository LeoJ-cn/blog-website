import { parse } from "@babel/parser"
import traverse from "@babel/traverse"
import generator from "@babel/generator"
import { cusLog } from '../utils'

const _ = require('lodash')
const fs = require("fs");
const path = require("path");

// 类型声明
type DepRelation = { filePath: string; deps: string[]; code: string }

interface PathCWD_Interface {
  importFilePath: string;
  folderPath: string
}


export class CombineMultiFiles {
  /**
   * 忽略的npm包
   */
  readonly ignoreNpmList = [
    'vue-property-decorator'
  ]

  // 符合解析规则的文件
  readonly validSuffix = ['.ts', '.tsx']

  /**
   * 分析依赖后的代码
   */
  mergedCode = '';

  /**
   * 初始化一个空的 depRelation，用于收集依赖
   */
  depRelation: DepRelation[] = []

  /**
   * 分析文件目录
   */
  rootFolderPath = ''

  constructor(filePath: string) {

    // 入口文件分析
    const ff_path = path.resolve(filePath)

    this.rootFolderPath = path.dirname(ff_path)


    // this.collectCodeAndDeps(ff_path) // 手动收集依赖
    
    this.autoCollectCodeAndDeps(ff_path)


    // // 测试代码
    // console.log('depRelation', JSON.stringify(this.depRelation, null, 4), '\n')
    // console.log('mergedCode-remove-import:\n', this.mergedCode, '\n-------\n\n')
    // fs.writeFileSync(
    //   path.resolve(path.dirname(filePath), 'merge-code.tsx'),
    //   'var _depRelation = ' + JSON.stringify(this.depRelation, null, 4) + '\n' + this.mergedCode
    // );
  }

  /**
   * 路径解析，目前支持os系统，其他系统待兼容
   */
  getRequirePathsList(folderPath: string) {
    const nodeModulesResolvePathList: string[] = []
    const pathSplitList = folderPath.split(path.sep);

    pathSplitList.reduce(
      (preResult: string, curItem: string) => {
        const newPath = path.join(preResult || path.sep, curItem)
        nodeModulesResolvePathList.push(newPath)
        return newPath
      },
      ''
    )

    // node_modules 由近及远查找
    return nodeModulesResolvePathList.reverse()
  }

  /**
   * 获取·import·的文件路径
   * PS：只分析ts, tsx, js依赖
   */
  getAbsolutePath({ importFilePath, folderPath }: PathCWD_Interface): string {
    /**
     * 非npm包名： 转换成绝对路径
     */
    let validPath = ''
    if (path.isAbsolute(importFilePath)) {
      validPath = path.resolve(importFilePath);
    } else if (importFilePath.charAt(0) === '.') {
      validPath = path.resolve(folderPath, importFilePath);
    }

    // npm包名
    if (!validPath) {
      try {
        const maybeList = this.getRequirePathsList(folderPath)
        // hack: require打包后不可使用
        const _require = eval("require")
        validPath = _require.resolve(importFilePath, {
          paths: maybeList,
        })
        if (this.validSuffix.indexOf(path.extname(validPath)) === -1) {
          validPath = ''
        }
      } catch (e) {
        validPath = ''
      }
      return validPath
    }

    /**
     * 判断文件夹还是文件: 如果是文件夹，后缀自动加上路径“/index”
     */
    try {
      const stat = fs.statSync(validPath);
      if (stat.isDirectory()) {
        validPath = path.resolve(validPath, 'index')
      }
    } catch (e) {
      // ignore
    }

    // 路径已完全的直接返回
    if (
      this.validSuffix.indexOf(path.extname(validPath)) !== -1 &&
      fs.existsSync(validPath)
    ) {
      return validPath
    }

    for (let i = 0; i < this.validSuffix.length; i++) {
      const completedPath = `${validPath}${this.validSuffix[i]}`
      if (fs.existsSync(completedPath)) {
        return completedPath
      }
    }

    // 非ts文件,  不支持引入
    return ''
  }

  /**
   * 收集文件依赖以及代码合并
   * TODO: tree-shaking
   */
  collectCodeAndDeps(fatherAbsoulteDepPath: string) {
    const classThis = this
    const currentFileFolderPath = path.dirname(fatherAbsoulteDepPath)
    if (!fatherAbsoulteDepPath) return;
    cusLog("依赖加载", '加载资源: ' + fatherAbsoulteDepPath)
    const code = fs.readFileSync(fatherAbsoulteDepPath, 'utf8').toString()
    let curDep = _.find(this.depRelation, { filePath: fatherAbsoulteDepPath }) as any
    if (!curDep) {
      curDep = {
        filePath: fatherAbsoulteDepPath,
        deps: [],
        // code: code
      }
      this.depRelation.push(curDep)

      // 将代码转为 AST
      const ast = parse(
        code,
        {
          sourceType: 'module',
          plugins: [
            "jsx",
            "typescript",
            // "exportDefaultFrom",
            // ["decorators", { decoratorsBeforeExport: true }]
            "decorators-legacy"
          ]
        }
      )

      // 分析文件依赖，将内容放至 depRelation
      traverse(ast, {
        // ExportDefaultDeclaration(path){
        //   //移除非目标tsx文件的 @Component 代码块
        // },

        ImportDeclaration(path) {
          const childDepAbsolutePath = classThis.getAbsolutePath({
            importFilePath: path.node.source.value,
            folderPath: currentFileFolderPath
          })

          path.remove(); // 移除所有import语句
          if (!childDepAbsolutePath) return
          curDep.deps.push(childDepAbsolutePath)
          classThis.collectCodeAndDeps(childDepAbsolutePath)
        }
      })

      const {
        code: geCode = ''
      } = generator(ast, {
        concise: false,
        decoratorsBeforeExport: true,
        retainLines: true,
        compact: false, // 避免格式化空格导致输出ts文件出现问题
      }, code)

      const fileComment = `// file: ${fatherAbsoulteDepPath}`
      this.mergedCode += `\n\n${fileComment}\n${geCode}`

    }
  }

  /**
   * 只替换分析文件，不替换后续依赖
   */
  autoCollectCodeAndDeps(fatherAbsoulteDepPath: string) {
    const classThis = this
    cusLog("依赖加载", '加载资源: ' + fatherAbsoulteDepPath)
    const code = fs.readFileSync(fatherAbsoulteDepPath, 'utf8').toString()
    let curDep = _.find(this.depRelation, { filePath: fatherAbsoulteDepPath }) as any
    if (!curDep) {
      curDep = {
        filePath: fatherAbsoulteDepPath,
        deps: [],
        // code: code
      }
      this.depRelation.push(curDep)

      // 将代码转为 AST
      const ast = parse(
        code,
        {
          sourceType: 'module',
          plugins: [
            "jsx",
            "typescript",
            // "exportDefaultFrom",
            // ["decorators", { decoratorsBeforeExport: true }]
            "decorators-legacy"
          ]
        }
      )

      // 分析文件依赖，将内容放至 depRelation
      traverse(ast, {
        ImportDeclaration(path) {
          if(classThis.ignoreNpmList.indexOf(path.node.source.value) !== -1){
            path.remove(); // 移除忽略import语句
          }
        }
      })
      const {
        code: geCode = ''
      } = generator(ast, {
        concise: false,
        decoratorsBeforeExport: true,
        retainLines: true,
        compact: false, // 避免格式化空格导致输出ts文件出现问题
      }, code)
      const fileComment = `// file: ${fatherAbsoulteDepPath}`
      this.mergedCode += `\n\n${fileComment}\n${geCode}`
    }
  }
}


