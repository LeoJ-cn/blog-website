import { VARIABLE_TYPES } from '../../const';
import { IG6 } from '../../interface';

import LOGIC_ARRAY_FOREACH_NODE from './nodes/logic-array-foreach-node';
import LOGIC_ASSIGN_NODE from './nodes/logic-assign-node';
import LOGIC_BASE_NODE from './nodes/logic-base-node';
import LOGIC_CALC_NODE from './nodes/logic-calc-node';
import LOGIC_END_NODE from './nodes/logic-end-node';
import LOGIC_FUNC_NODE from './nodes/logic-func-node';
import LOGIC_IFELSE_NODE from './nodes/logic-ifelse-node';
import LOGIC_MESSAGE_NODE from './nodes/logic-message-node';
import LOGIC_NET_NODE from './nodes/logic-net-node';
import LOGIC_ROUTER_NODE from './nodes/logic-router-node';
import LOGIC_START_NODE from './nodes/logic-start-node';
import LOGIC_TRY_CATCH_NODE from './nodes/logic-try-catch-node';
import LOGIC_VARIABLE_DETAIL_NODE from './nodes/logic-variable-detail-node';
import LOGIC_VARIABLE_NODE from './nodes/logic-variable-node';
import LOGIC_EQUAL_NODE from './nodes/logic-equal-node';
import LOGIC_NOT_EQUAL_NODE from './nodes/logic-not-equal-node';
import LOGIC_LESS_NODE from './nodes/logic-less-node';
import LOGIC_GREATER_NODE from './nodes/logic-greater-node';
import LOGIC_LESS_EQUAL_NODE from './nodes/logic-less-equal-node';
import LOGIC_GREATER_EQUAL_NODE from './nodes/logic-greater-equal-node';

import LOGIC_NEGATION_NODE from './nodes/logic-negation-node';
import LOGIC_AND_NODE from './nodes/logic-and-node';
import LOGIC_OR_NODE from './nodes/logic-or-node';

import LOGIC_ADDITION_NODE from './nodes/logic-addition-node';
import LOGIC_SUBTRACTION_NODE from './nodes/logic-substraction-node';
import LOGIC_MULTIPLICATION_NODE from './nodes/logic-multiplication-node';
import LOGIC_DIVISION_NODE from './nodes/logic-division-node';
import LOGIC_REMAINDER_NODE from './nodes/logic-remainder-node';
import LOGIC_SIDE_MESSAGE_NODE from './nodes/logic-side-message-node';
import LOGIC_PAGE_PASS_VALUE_NODE from './nodes/logic-page-pass-value-node';
import LOGIC_GET_LOCALE_NODE from './nodes/logic-get-locale-node';
import LOGIC_SET_LOCALE_NODE from './nodes/logic-set-locale-node';
import LOGIC_METHOD_REF_NODE from './nodes/logic-method-ref-node';
import LOGIC_NEXT_TICK_NODE from './nodes/logic-next-tick-node';
import LOGIC_CREATE_OBJECT_NODE from './nodes/logic-create-object-node';
import LOGIC_API_NODE from './nodes/logic-api-node';
import LOGIC_SET_ARRAY_ITEM_NODE from './nodes/logic-set-array-item-node';

const registerNode: (G6: IG6) => void = (G6) => {
  // 注册方法节点
  LOGIC_BASE_NODE(G6);
  LOGIC_START_NODE(G6);
  LOGIC_END_NODE(G6);
  LOGIC_NET_NODE(G6);
  LOGIC_FUNC_NODE(G6);
  LOGIC_API_NODE(G6);
  LOGIC_VARIABLE_DETAIL_NODE(G6);
  LOGIC_CREATE_OBJECT_NODE(G6);
  LOGIC_ASSIGN_NODE(G6);
  LOGIC_ARRAY_FOREACH_NODE(G6);
  LOGIC_SET_ARRAY_ITEM_NODE(G6);
  LOGIC_TRY_CATCH_NODE(G6);
  LOGIC_IFELSE_NODE(G6);
  LOGIC_MESSAGE_NODE(G6);
  LOGIC_ROUTER_NODE(G6);
  LOGIC_CALC_NODE(G6);

  LOGIC_EQUAL_NODE(G6);
  LOGIC_NOT_EQUAL_NODE(G6);
  LOGIC_LESS_NODE(G6);
  LOGIC_GREATER_NODE(G6);
  LOGIC_LESS_EQUAL_NODE(G6);
  LOGIC_GREATER_EQUAL_NODE(G6);

  LOGIC_NEGATION_NODE(G6);
  LOGIC_AND_NODE(G6);
  LOGIC_OR_NODE(G6);

  LOGIC_ADDITION_NODE(G6);
  LOGIC_SUBTRACTION_NODE(G6);
  LOGIC_MULTIPLICATION_NODE(G6);
  LOGIC_DIVISION_NODE(G6);
  LOGIC_REMAINDER_NODE(G6);

  LOGIC_SIDE_MESSAGE_NODE(G6);
  LOGIC_PAGE_PASS_VALUE_NODE(G6);
  LOGIC_GET_LOCALE_NODE(G6);
  LOGIC_SET_LOCALE_NODE(G6);
  LOGIC_METHOD_REF_NODE(G6);
  LOGIC_NEXT_TICK_NODE(G6);

  // 注册变量节点
  VARIABLE_TYPES.forEach((type: string) => LOGIC_VARIABLE_NODE(G6, type));
};

export default registerNode;
