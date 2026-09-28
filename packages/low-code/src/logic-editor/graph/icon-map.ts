import add from './img/add.svg'
import api from './img/api.svg'
import calc from './img/calc.svg'
import circleSm from './img/circle-sm.svg'
import codeArray from './img/code-array.svg'
import detail from './img/detail.svg'
import end from './img/end.svg'
import func from './img/func.svg'
import help from './img/help.svg'
import ifElse from './img/if-else.svg'
import judgeCondition from './img/judge-condition.svg'
import lan from './img/lan.svg'
import loop from './img/loop.svg'
import message from './img/message.svg'
import methodRef from './img/method-ref.svg'
import net from './img/net.svg'
import nextTick from './img/next-tick.svg'
import notice from './img/notice.svg'
import pageValue from './img/page-value.svg'
import paramsArray from './img/params_array.svg'
import paramsArrayInactive from './img/params_array_inactive.svg'
import paramsBlue from './img/params_blue.svg'
import paramsBlueInactive from './img/params_blue_inactive.svg'
import paramsBoolean from './img/params_boolean.svg'
import paramsBooleanInactive from './img/params_boolean_inactive.svg'
import paramsNumber from './img/params_number.svg'
import paramsNumberInactive from './img/params_number_inactive.svg'
import paramsObject from './img/params_object.svg'
import paramsObjectInactive from './img/params_object_inactive.svg'
import paramsString from './img/params_string.svg'
import paramsStringInactive from './img/params_string_inactive.svg'
import paramsUndefined from './img/params_undefined.svg'
import paramsUndefinedInactive from './img/params_undefined_inactive.svg'
import returnArray from './img/return_array.svg'
import returnArrayInactive from './img/return_array_inactive.svg'
import returnBoolean from './img/return_boolean.svg'
import returnBooleanInactive from './img/return_boolean_inactive.svg'
import returnNumber from './img/return_number.svg'
import returnNumberInactive from './img/return_number_inactive.svg'
import returnObject from './img/return_object.svg'
import returnObjectInactive from './img/return_object_inactive.svg'
import returnString from './img/return_string.svg'
import returnStringInactive from './img/return_string_inactive.svg'
import returnUndefined from './img/return_undefined.svg'
import returnUndefinedInactive from './img/return_undefined_inactive.svg'
import rightarrow from './img/rightarrow.svg'
import rightarrow2 from './img/rightarrow2.svg'
import router from './img/router.svg'
import start from './img/start.svg'
import statementAnchor from './img/statement_anchor.svg'
import statementAnchorLight from './img/statement_anchor_light.svg'
import variable from './img/variable.svg'
import vector from './img/vector.svg'
import vectorInactive from './img/vector_inactive.svg'
import warning from './img/warning.svg'

const iconMap: Record<string, string> = {
  'add.svg': add,
  'api.svg': api,
  'calc.svg': calc,
  'circle-sm.svg': circleSm,
  'code-array.svg': codeArray,
  'detail.svg': detail,
  'end.svg': end,
  'func.svg': func,
  'help.svg': help,
  'if-else.svg': ifElse,
  'judge-condition.svg': judgeCondition,
  'lan.svg': lan,
  'loop.svg': loop,
  'message.svg': message,
  'method-ref.svg': methodRef,
  'net.svg': net,
  'next-tick.svg': nextTick,
  'notice.svg': notice,
  'page-value.svg': pageValue,
  'params_array.svg': paramsArray,
  'params_array_inactive.svg': paramsArrayInactive,
  'params_blue.svg': paramsBlue,
  'params_blue_inactive.svg': paramsBlueInactive,
  'params_boolean.svg': paramsBoolean,
  'params_boolean_inactive.svg': paramsBooleanInactive,
  'params_number.svg': paramsNumber,
  'params_number_inactive.svg': paramsNumberInactive,
  'params_object.svg': paramsObject,
  'params_object_inactive.svg': paramsObjectInactive,
  'params_string.svg': paramsString,
  'params_string_inactive.svg': paramsStringInactive,
  'params_undefined.svg': paramsUndefined,
  'params_undefined_inactive.svg': paramsUndefinedInactive,
  'return_array.svg': returnArray,
  'return_array_inactive.svg': returnArrayInactive,
  'return_boolean.svg': returnBoolean,
  'return_boolean_inactive.svg': returnBooleanInactive,
  'return_number.svg': returnNumber,
  'return_number_inactive.svg': returnNumberInactive,
  'return_object.svg': returnObject,
  'return_object_inactive.svg': returnObjectInactive,
  'return_string.svg': returnString,
  'return_string_inactive.svg': returnStringInactive,
  'return_undefined.svg': returnUndefined,
  'return_undefined_inactive.svg': returnUndefinedInactive,
  'rightarrow.svg': rightarrow,
  'rightarrow2.svg': rightarrow2,
  'router.svg': router,
  'start.svg': start,
  'statement_anchor.svg': statementAnchor,
  'statement_anchor_light.svg': statementAnchorLight,
  'variable.svg': variable,
  'vector.svg': vector,
  'vector_inactive.svg': vectorInactive,
  'warning.svg': warning,
}

/** 将旧版相对/动态 require 路径映射为构建器可处理的静态资源 URL。 */
export function resolveLogicEditorAsset(path: string): string {
  const fileName = path.split('/').pop() || ''
  const asset = iconMap[fileName]
  if (!asset) {
    throw new Error(`未注册逻辑编辑器资源: ${path}`)
  }
  return asset
}
