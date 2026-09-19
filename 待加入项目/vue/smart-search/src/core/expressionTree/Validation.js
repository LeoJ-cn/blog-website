/**
 * 错误类型列举
 * 10001    字段名错误(未包含在搜索字段与分析字段中)
 * 10002    字段嵌套(父表达式为字段表达式，子表达式中包含字段表达式)
 * 20001    逻辑词开头
 * 20002    逻辑词连接
 * 20003    逻辑词结尾
 * 30001    值为空
 * 30002    缺少 ）
 * 30003    多余 ）
 * 30004    缺少 ]
 * 30005    多余 ]
 * 30006    缺少 "
 * 30007    缺少 '
 * 40001    占位符格式错误
 * 50001    []格式不正确
 * 50002    []时间格式错误
 * 50003    []时间大小错误， 开始值应小于结束值
 * 50004    []数字范围格式错误
 * 50005    []数字大小错误，开始值应小于结束值
 * 60001    字段表达式格式错误
 */
import {
  last,
  forEach,
  includes,
  concat,
  get,
  startsWith,
  endsWith,
  find,
  toNumber
} from 'lodash';
import {
  isDateValue,
  isIntegerValue,
  isCorrectRange
} from '../utils/validationUtils.js';
import {
  FIELDS_LIST,
  DATE_TYPE_FIELDS,
  RANGE_TYPE_FIELDS
} from '../config/index';
import {
  TOKEN_TYPE_OPERATOR,
  TOKEN_TYPE_PLACESYMBOL,
  TOKEN_TYPE_SPACE,
  TOKEN_TYPE_USER,
  EXPRESSION_TYPE_FIELD,
  EXPRESSION_TYPE_OPERATOR,
  EXPRESSION_TYPE_RANGE,
  EXPRESSION_TYPE_TOKEN,
  TOKEN_TYPE_FIELD
} from '../../constants';

export default {
  errorData: {},
  currentExp: {},
  parentExp: {},
  ExpressionList: [],
  getExpressionError(currentExp, ExpressionList) {
    this.errorData = {};
    this.currentExp = currentExp;
    if (ExpressionList && ExpressionList.length > 0) {
      this.ExpressionList = ExpressionList;
      this.parentExp = last(ExpressionList);
    }
    this.validateToken();
    this.validateExpression();
    this.validateLogic();
    this.currentExp.errorData = this.errorData;
    return this.currentExp;
  },
  /**
   * 验证表达式错误
   */
  validateExpression() {
    let children = this.currentExp.children;
    let errorData = {
      id: this.currentExp.id
    };
    let expressionError = [];
    let patnetFieldTokenType = get(this.parentExp, 'children[0].data.type', '');
    let patentField = patnetFieldTokenType === TOKEN_TYPE_FIELD ? get(this.parentExp, 'children[0].data.value', '').toLocaleUpperCase() : '';
    if (this.currentExp.expressionType === EXPRESSION_TYPE_OPERATOR) {
      if (last(children).expressionType !== EXPRESSION_TYPE_TOKEN || last(children).data.value !== ')') {
        //  缺少小括号和中括号作为token 错误
        // errorData.errorCode = '30002';
      } else if (children.length === 2 || (children.length === 3 && get(children[1], 'data.type') === TOKEN_TYPE_SPACE)) {
        errorData.errorCode = '30001';
      }
    } else if (this.currentExp.expressionType === EXPRESSION_TYPE_RANGE) {
      if (last(children).expressionType !== EXPRESSION_TYPE_TOKEN || last(children).data.value !== ']') {
        //  缺少小括号和中括号作为token 错误
        // errorData.errorCode = '30004';
      } else if (children.length === 2 || (children.length === 3 && get(children[1], 'data.type') === TOKEN_TYPE_SPACE)) {
        errorData.errorCode = '30001';
      } else {
        let rangeTokenList = this.getRangeTokenList(children);
        if (includes(DATE_TYPE_FIELDS, patentField) || includes(RANGE_TYPE_FIELDS, patentField)) {
          if (rangeTokenList.length !== 3 || get(rangeTokenList, '[1].data.value').toLocaleUpperCase() !== 'TO') {
            errorData.errorCode = '50001';
          } else {
            this.validateRangeToken(rangeTokenList, patentField);
          }
        }
      }
    } else if (this.currentExp.expressionType === EXPRESSION_TYPE_FIELD) {
      let field = get(children[0], 'data.value', '').toLocaleUpperCase();
      if (includes(DATE_TYPE_FIELDS, field) || includes(RANGE_TYPE_FIELDS, field)) {
        if (last(children).expressionType !== EXPRESSION_TYPE_RANGE) {
          errorData.errorCode = '60001';
        }
      }
    }
    if (errorData.errorCode) {
      expressionError.push(errorData);
    }
    if (expressionError.length > 0) {
      this.errorData.expressionError = expressionError;
    }
  },
  /**
   * 验证token错误
   */
  validateToken() {
    let tokenError = [];
    let isFieldNest = this.getIsFieldNest();
    forEach(this.currentExp.children, (item, index)=>{
      if (item.expressionType === EXPRESSION_TYPE_TOKEN) {
        let errData = {
          id: item.data.id
        };
        if (item.data.type === 'field') {
          if (!includes(FIELDS_LIST, item.data.value.toLocaleUpperCase())) {
            errData.errorCode = '10001';
            tokenError.push(errData);
          } else if (isFieldNest) {
            errData.errorCode = '10002';
            tokenError.push(errData);
          }
        } else if (item.data.type === TOKEN_TYPE_PLACESYMBOL && !/^\$(W(\d+|S)$)|(PRE\d+$)/.test(item.data.value.toLocaleUpperCase())) {
          errData.errorCode = '40001';
          tokenError.push(errData);
        } else if (item.data.value === '(' && get(last(this.currentExp.children), 'data.value') !== ')') {
          errData.errorCode = '30002';
          tokenError.push(errData);
        } else if (item.data.value === ')' && (index !== this.currentExp.children.length - 1 || get(this.currentExp, 'children[0].data.value') !== '(')) {
          errData.errorCode = '30003';
          tokenError.push(errData);
        } else if (item.data.value === '[' && (get(last(this.currentExp.children), 'data.value') !== ']')) {
          errData.errorCode = '30004';
          tokenError.push(errData);
        } else if (item.data.value === ']' && (index !== this.currentExp.children.length - 1 || get(this.currentExp, 'children[0].data.value') !== '[')) {
          errData.errorCode = '30005';
          tokenError.push(errData);
        } else if (item.data.type === TOKEN_TYPE_USER) {
          if (/^"\s*"$|^'\s*'$/.test(item.data.value)) {
            errData.errorCode = '30001';
            tokenError.push(errData);
          } else if (startsWith(item.data.value, '"') && !endsWith(item.data.value, '"') || item.data.value === '"') {
            errData.errorCode = '30006';
            tokenError.push(errData);
          } else if (startsWith(item.data.value, "'") && !endsWith(item.data.value, "'") || item.data.value === "'") {
            errData.errorCode = '30007';
            tokenError.push(errData);
          }
        }
      }
    });
    if (tokenError.length > 0) {
      this.errorData.tokenError = concat(this.errorData.tokenError || [], tokenError);
    }
  },
  /**
   * 验证逻辑词错误
   */
  validateLogic() {
    let chainStr = '';
    let startLogicReg = /^_*l/; // 逻辑词开头
    let continuousLogicReg = /l_l/; // 逻辑词结尾
    let endLogicReg = /l_*$/; // 逻辑词连接
    let logicError = [];
    forEach(this.currentExp.children, item=>{
      let chianItem;
      if (item.expressionType === EXPRESSION_TYPE_TOKEN) {
        chianItem = item.data.type;
        if (item.data.type === 'logic') {
          chianItem = 'l';
        } else if (item.data.type === TOKEN_TYPE_SPACE || item.data.type === TOKEN_TYPE_OPERATOR) {
          chianItem = '_';
        } else {
          chianItem = 'o';
        }
      } else {
        chianItem = 'o';
      }
      chainStr += chianItem;
    });
    if (startLogicReg.test(chainStr)) {
      let index = chainStr.indexOf('l');
      let errData = {
        id: this.currentExp.children[index].data.id,
        errorCode: '20001'
      };
      logicError.push(errData);
    }
    if (endLogicReg.test(chainStr)) {
      let conLogicArr = chainStr.split('l');
      let index = chainStr.length - last(conLogicArr).length - 1;
      let errData = {
        id: this.currentExp.children[index].data.id,
        errorCode: '20003'
      };
      logicError.push(errData);
    }
    if (continuousLogicReg.test(chainStr)) {
      let conLogicArr = chainStr.split('l_l');
      let start = 0;
      forEach(conLogicArr, item=>{
        start += item.length;
        if (start >= this.currentExp.children.length) return;
        forEach([start, start + 2], subItem =>{
          let errData = {
            id: this.currentExp.children[subItem].data.id,
            errorCode: '20002'
          };
          logicError.push(errData);
        });
        start += 3;
      });
    }
    if (logicError.length > 0) {
      this.errorData.tokenError = concat(this.errorData.tokenError || [], logicError);
    }
  },
  /**
    * 验证rangeExp token错误
    * @param {*} rangeTokenList 过滤后的tokenList
    * @param {*} patentField   父表达式字段名
    */
  validateRangeToken(rangeTokenList, patentField) {
    const rangeStart = rangeTokenList[0].data.value;
    const rangeEnd = rangeTokenList[2].data.value;
    let tokenError = [];
    if (includes(DATE_TYPE_FIELDS, patentField)) {
      // 时间类型
      if (!(rangeStart === '*' || isDateValue(rangeStart))) {
        let errData = {};
        errData.id = rangeTokenList[0].data.id;
        errData.errorCode = '50002';
        tokenError.push(errData);
      }
      if (!(rangeEnd === '*' || isDateValue(rangeEnd))) {
        let errData = {};
        errData.id = rangeTokenList[2].data.id;
        errData.errorCode = '50002';
        tokenError.push(errData);
      }
      if (isDateValue(rangeStart) && isDateValue(rangeEnd) && !isCorrectRange(rangeStart, rangeEnd)) {
        let errData = {};
        errData.id = rangeTokenList[0].data.id;
        errData.errorCode = '50003';
        tokenError.push(errData);
      }

    } else if (includes(RANGE_TYPE_FIELDS, patentField)) {
      // 数值类型
      if (!(rangeStart === '*' || (isIntegerValue(rangeStart) && toNumber(rangeStart) >= 0))) {
        let errData = {};
        errData.id = rangeTokenList[0].data.id;
        errData.errorCode = '50004';
        tokenError.push(errData);
      }
      if (!(rangeEnd === '*' || (isIntegerValue(rangeEnd) && toNumber(rangeEnd) >= 0))) {
        let errData = {};
        errData.id = rangeTokenList[2].data.id;
        errData.errorCode = '50004';
        tokenError.push(errData);
      }
      if (isIntegerValue(rangeStart) && isIntegerValue(rangeEnd) && toNumber(rangeStart) >= toNumber(rangeEnd)) {
        let errData = {};
        errData.id = rangeTokenList[0].data.id;
        errData.errorCode = '50005';
        tokenError.push(errData);
      }
    }
    if (tokenError.length > 0) {
      this.errorData.tokenError = concat(this.errorData.tokenError || [], tokenError);
    }
  },
  getRangeTokenList(children) {
    let _tokenList = [];
    forEach(children, (item)=>{
      let _type = get(item, 'data.type');
      if (_type !== TOKEN_TYPE_SPACE && _type !== TOKEN_TYPE_OPERATOR) {
        _tokenList.push(item);
      }
    });
    return _tokenList;
  },
  getIsFieldNest() {
    let isFieldNest = !!find(this.ExpressionList, {
      expressionType: EXPRESSION_TYPE_FIELD
    });
    return isFieldNest;
  }
};

