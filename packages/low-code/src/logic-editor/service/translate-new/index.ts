import { TranslateBaseService } from './BaseService';
import { InitTranslateQuery_DTS, BlockNames_DTS, TranslateError_DTS } from '../interface';

import { TranslateStartNodeService } from './TranslateStartNodeService';
import { TranslateEndNodeService } from './TranslateEndNodeService';
import { TranslateTryCatchService } from './TranslateTryCatchService';
import { TranslateFunctionNodeService } from './TranslateFunctionNodeService';
import { TranslateMessageNodeService } from './TranslateMessageNodeService';
import { TranslateArrayForeachNodeService } from './TranslateArrayForeachNodeService';
import { TranslateIfelseNodeService } from './TranslateIfelseNodeService';
import { TranslateAssignNodeService } from './TranslateAssignNodeService';
import { TranslateNegationNodeService } from './TranslateNegationNodeService';
import { TranslateAndOrNodeService } from './TranslateAndOrNodeService';
import { TranslateMathCompareNodeService } from './TranslateMathCompareNodeService';
import { TranslateNetNodeNodeService } from './TranslateNetNodeNodeService';
import { TranslateRouterLinkNodeService } from './TranslateRouterLinkNodeService';
import { TranslateMathArithmeticBasicService } from './TranslateMathArithmeticBasicService';
import { TranslateSideMessageService } from './TranslateSideMessageService';
import { TranslatePagePassValueService } from './TranslatePagePassValueService';
import { TranslateGetLocaleService } from './TranslateGetLocaleService';
import { TranslateNextTickService } from './TranslateNextTickService';
import { TranslateSetLocaleService } from './TranslateSetLocaleService';
import { TranslateMethodRefService } from './TranslateMethodRefService';
import { TranslateApiNodeService } from './TranslateApiNodeService';
import { TranslateCreateObjectNodeService } from './TranslateCreateObjectNodeService';
import { TranslateSetArrayItemNodeService } from './TranslateSetArrayItemNode';

/**
 * TODO:
 *
 *
 *


// 新增翻译块 （16 - 。。。）
文档地址：https://jfengine.feishu.cn/wiki/wikcn6uXh2eACBNMDPj2pKreSah?table=tblglDRrr6ez5xlq&view=vewLgt4u2h


api列表
删除数组项
查找指定位置数组项
查找满足条件数组项
合并数组
获取数组长度
构造临时对象

 */

/**
 * 块翻译方法
 */
const utils = {
  // 开始块
  [BlockNames_DTS.LOGIC_START_NODE]: TranslateStartNodeService,
  // 结束块
  [BlockNames_DTS.LOGIC_END_NODE]: TranslateEndNodeService,
  // 捕获异常
  [BlockNames_DTS.LOGIC_TRY_CATCH_NODE]: TranslateTryCatchService,
  // 自定义方法
  [BlockNames_DTS.LOGIC_FUNC_NODE]: TranslateFunctionNodeService,
  // 消息提醒
  [BlockNames_DTS.LOGIC_MESSAGE_NODE]: TranslateMessageNodeService,
  // 数组循环
  [BlockNames_DTS.LOGIC_ARRAY_FOREACH_NODE]: TranslateArrayForeachNodeService,
  // if-else块
  [BlockNames_DTS.LOGIC_IFELSE_NODE]: TranslateIfelseNodeService,
  // 赋值块
  [BlockNames_DTS.LOGIC_ASSIGN_NODE]: TranslateAssignNodeService,
  // 逻辑取反
  [BlockNames_DTS.LOGIC_NEGATION_NODE]: TranslateNegationNodeService,
  // 逻辑运算: 逻辑与 && 逻辑或
  [BlockNames_DTS.LOGIC_AND_NODE]: TranslateAndOrNodeService,
  [BlockNames_DTS.LOGIC_OR_NODE]: TranslateAndOrNodeService,
  // 逻辑判断（等于，不等于，大于，小于，大于等于，小于等于）
  [BlockNames_DTS.LOGIC_EQUAL_NODE]: TranslateMathCompareNodeService,
  [BlockNames_DTS.LOGIC_NOT_EQUAL_NODE]: TranslateMathCompareNodeService,
  [BlockNames_DTS.LOGIC_GREATER_NODE]: TranslateMathCompareNodeService,
  [BlockNames_DTS.LOGIC_GREATER_EQUAL_NODE]: TranslateMathCompareNodeService,
  [BlockNames_DTS.LOGIC_LESS_NODE]: TranslateMathCompareNodeService,
  [BlockNames_DTS.LOGIC_LESS_EQUAL_NODE]: TranslateMathCompareNodeService,
  // 网络请求
  [BlockNames_DTS.LOGIC_NET_NODE]: TranslateNetNodeNodeService,
  // 路由跳转（页面跳转）
  [BlockNames_DTS.LOGIC_ROUTER_NODE]: TranslateRouterLinkNodeService,
  // 加法 & 减法 & 乘法 & 除法 & 取余
  [BlockNames_DTS.LOGIC_ADDITION_NODE]: TranslateMathArithmeticBasicService,
  [BlockNames_DTS.LOGIC_SUBTRACTION_NODE]: TranslateMathArithmeticBasicService,
  [BlockNames_DTS.LOGIC_MULTIPLICATION_NODE]: TranslateMathArithmeticBasicService,
  [BlockNames_DTS.LOGIC_DIVISION_NODE]: TranslateMathArithmeticBasicService,
  [BlockNames_DTS.LOGIC_REMAINDER_NODE]: TranslateMathArithmeticBasicService,
  // 侧边提醒
  [BlockNames_DTS.LOGIC_SIDE_MESSAGE_NODE]: TranslateSideMessageService,
  // 页面传值
  [BlockNames_DTS.LOGIC_PAGE_PASS_VALUE_NODE]: TranslatePagePassValueService,
  // 获取多语言
  [BlockNames_DTS.LOGIC_GET_LOCALE_NODE]: TranslateGetLocaleService,
  // $nexttick
  [BlockNames_DTS.LOGIC_NEXT_TICK_NODE]: TranslateNextTickService,
  // 设置多语言
  [BlockNames_DTS.LOGIC_SET_LOCALE_NODE]: TranslateSetLocaleService,
  // 获取方法引用
  [BlockNames_DTS.LOGIC_METHOD_REF_NODE]: TranslateMethodRefService,
  // api列表
  [BlockNames_DTS.LOGIC_API_NODE]: TranslateApiNodeService,
  // 构造临时对象
  [BlockNames_DTS.LOGIC_CREATE_OBJECT_NODE]: TranslateCreateObjectNodeService,
  // 设置数组项
  [BlockNames_DTS.LOGIC_SET_ARRAY_ITEM_NODE]: TranslateSetArrayItemNodeService,
};

export class TranslateService extends TranslateBaseService {
  blockly = '';
  translateErrorList: TranslateError_DTS[] = [];
  constructor(initTranslateQuery: InitTranslateQuery_DTS) {
    super();
    this.init(utils, initTranslateQuery.cache);
    this.blockly = this.translate(initTranslateQuery);
    this.translateErrorList = TranslateBaseService.translateErrorList;
  }
  public destroy() {
    this.blockly = '';
    this.processData = [];
    this.translateErrorList = [];
    this.init();
  }
}
