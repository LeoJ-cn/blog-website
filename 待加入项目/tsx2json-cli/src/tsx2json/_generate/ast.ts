import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as _ from 'lodash'
import { cusLog } from '../utils'


const { readFileSync } = require('fs')

let rootComments: {
  props: LooseObject;
  events: LooseObject;
  slots: LooseObject[];
} = {
  props: {},
  events: {},
  slots: []
}

export const getComments = (filePath: string) => {

  rootComments = {
    props: {},
    events: {},
    slots: []
  }

  const code = readFileSync(filePath, 'utf-8').toString()

  let ast;
  try {
    ast = parse(code,
      {
        sourceType: 'module',
        plugins: [
          "jsx",
          "typescript",
          "decorators-legacy"
        ]
      }
    )
  } catch (e) {
    console.log(new Error('[Error]babel ast异常: 文件不支持分析，更新 plugins'))
  }

  traverse(ast, {
    Identifier(path: LooseObject) {
      /**
       * 分析 vue 插槽配置
       * PS: slots不支持分析变量，直接写字符串
       * 只允许使用 $slot.name 或者 $slots['name-string']
       * 不允许使用变量
       */
      if (path.node.name === '$slots') {
        const SlotName = _.get(path, 'parentPath.parent.property.name', '') || _.get(path, 'parentPath.parent.property.value', '')
        const isIn = _.find(rootComments.slots, { name: SlotName });
        if (SlotName && !isIn) {
          rootComments.slots.push({
            name: SlotName
          })
        }
      }
    },
    ClassProperty(path: LooseObject) {
      ClassProperty_Visitor(path)
    },
    ClassMethod(path: LooseObject) {
      ClassMethod_Visitor(path)
    }
  })
  cusLog('Vue-插槽列表', JSON.stringify(rootComments.slots, null, 4))
  return rootComments
}


interface LooseObject {
  [key: string]: any
}

/**
 * 注释信息
 * @Prop 和 @Emit 分类存储
 */
enum CommentType {
  events = 'events',
  props = 'props'
}
interface Comments_Interface {
  [PropOrEventName: string]: {
    __comment__: string; // 注释信息
    [key: string]: any; // 其他附加信息
  }
}
interface CommentsPaylod_Interface {
  commentsText: string;
  rootCommentType: CommentType;
  propEventKey: string;
}

/**
 * 
 * ‘@’开头表示 键值对
 * 不是‘@’开头，就是普通注释文本
 */
function parseComments({
  commentsText,
  rootCommentType,
  propEventKey
}: CommentsPaylod_Interface) {

  const comments: Comments_Interface = {
    [propEventKey]: {
      // 注释信息
      __comment__: '',
      // 键值对附加信息
      additionalProperties: {},
    }
  }

  /**
   * 此处comment 指 babel的ast 结构
   * 1. 去除前后 /
   * 2. 去除起始行* 需要每一行处理 *
   * 3. 将结尾替换为,使用replace 或 split 一样，但不确定尾函数
   */
  const infoList = commentsText
    .slice(1, -1)
    .replace(/^[\s\*]*/mg, '')
    .split('\n')
  infoList.forEach(iCom => {
    const commentsVal = iCom.trim()
    if (!commentsVal) return;
    if (commentsVal.indexOf('@') === -1) {
      // 注释
      if (!comments[propEventKey].__comment__) {
        comments[propEventKey].__comment__ = commentsVal
      }
    } else {
      /**
       * 这里要废弃
       * 合法键值对的形式  @xxx.ss.xx value
       * PS：临时添加条件 @additionalProperties, 所有的附加数据必须放在 additionalProperties下
       */
      // if (
      //   /^@[_0-9a-zA-Z]/img.test(commentsVal) &&
      //   commentsVal.indexOf('@additionalProperties') !== -1
      // ) {
      //   const splitSymbol = ' __--__ '
      //   const [
      //     pathKey = '',
      //     value = ''
      //   ] = commentsVal.replace(/^@([_0-9a-zA-Z\.]*?)\s+(.+)/img, `$1${splitSymbol}$2`).split(splitSymbol)
      //   try {
      //     const parsedVal = evil(value)

      //     /**
      //      * !!!不能使用lodash.set赋值，需要 `obj[key1][key2]=value` 安全赋值，防止lodash破坏对象的结构
      //      * eg: obj[click.${事件修饰符}]
      //      * 安全赋值: obj["a"]["b"]["c"] = val
      //      */

      //     let fnStr = ''
      //     const safeUpdate = (functionBody: string) => {
      //       const generateFn = new Function(
      //         'comments',
      //         functionBody
      //       )
      //       generateFn(comments)
      //     }

      //     const keyArr = pathKey.split('.')
      //     keyArr.reduce(
      //       function (pre, cur, index, arr) {
      //         const keyPath = pre ? `${pre}["${cur}"]` : `["${cur}"]`
      //         if (index === (arr.length - 1)) {
      //           fnStr += `\n comments${keyPath}  = ${JSON.stringify(parsedVal)}`
      //           // safeUpdate(keyPath, JSON.stringify(parsedVal))
      //           safeUpdate(fnStr)
      //         } else {
      //           fnStr += `\n 
      //           if(!comments${keyPath}) {
      //             comments${keyPath}  = {}
      //           }`
      //         }
      //         return keyPath
      //       },
      //       `["${propEventKey}"]`
      //     )

      //   } catch (e) {
      //     // new Error错误信息过长
      //     console.log(`[Warning] invalid [key:value] from [PropOrEventName: ${propEventKey} ]: \n  [${commentsVal}] \n`)
      //   }
      // }
    }
  })

  rootComments[rootCommentType][propEventKey] = comments[propEventKey]
}

// @Prop
function ClassProperty_Visitor(path: LooseObject) {

  let isProp = false;
  let propName = ''

  _.forEach(
    _.get(path, 'node.decorators', []),
    (decorator: LooseObject) => {
      const deName = _.get(decorator, 'expression.callee.name', '')
      if (deName === 'Prop') {
        isProp = true
      }
    }
  )

  if (!isProp) return
  propName = _.get(path, 'node.key.name', '')

  const coLength = _.get(path, 'node.leadingComments.length', -1)
  const commentsText: string =
    _.get(path, `node.leadingComments[${coLength - 1}].value`, '') + ''

  parseComments({
    commentsText,
    rootCommentType: CommentType.props,
    propEventKey: propName
  })
}

// @Emit
function ClassMethod_Visitor(path: LooseObject) {
  let isEmit = false
  let emitEventName = ''

  _.forEach(
    _.get(path, 'node.decorators', []),
    (decorator: LooseObject) => {
      const deName = _.get(decorator, 'expression.callee.name', '')
      const eventName = _.get(decorator, 'expression.arguments[0].value', '').trim()
      if (deName === 'Emit') {
        isEmit = true
      }
      if (eventName) {
        emitEventName = eventName
      }
    }
  )

  if (!isEmit) return

  if (!emitEventName) {
    emitEventName = _.get(path, 'node.key.name', '')
  }

  const coLength = _.get(path, 'node.leadingComments.length', -1)
  const commentsText: string =
    _.get(path, `node.leadingComments[${coLength - 1}].value`, '') + ''

  parseComments({
    commentsText,
    rootCommentType: CommentType.events,
    propEventKey: emitEventName
  })
}

