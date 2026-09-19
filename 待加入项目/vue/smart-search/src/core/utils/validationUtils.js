import {
  isNaN,
  isInteger
} from 'lodash';
/**
 * 判断值是否为时间类型
 * @param {*} str
 */
function isDateValue(str) {
  return (
    /^[1-2]\d{3}(0[1-9]|1[0-2])(0[1-9]|[1-2][0-9]|3[0-1])$/.test(str) ||
        /^[1-2]\d{3}$/.test(str) ||
        /^[1-2]\d{3}(0[1-9]|1[0-2])$/.test(str)
  );
}
/**
 * 判断值是否为数值类型
 * @param {*} str
 */
function isIntegerValue(str) {
  var strNum = Number(str);
  return !isNaN(strNum) && isInteger(strNum);
}

/**
 * 比较时间类型范围值是否前面小于等于后面的值
 * @param {*} rangeStart 开始值
 * @param {*} rangeEnd 结束值
 */
function isCorrectRange(rangeStart, rangeEnd) {
  let isCorrect = false;
  if (_formateDate(rangeStart) <= _formateDate(rangeEnd)) {
    isCorrect = true;
  }
  return isCorrect;
}
/**
 * 将时间格式统一格式为8位时间格式
 * @param {*} time
 */
function _formateDate(time) {
  switch (time.length) {
    case 4:
      time = parseInt(time + '0101', 10);
      break;
    case 6:
      time = parseInt(time + '01', 10);
      break;
    default:
      time = parseInt(time, 10);
      break;
  }
  return time;
}

export {
  isDateValue,
  isIntegerValue,
  isCorrectRange
}
;
