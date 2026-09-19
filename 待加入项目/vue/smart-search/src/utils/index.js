import { LOGIC_OPERATOR_AND, LOGIC_OPERATOR_OR, LOGIC_OPERATOR_NOT, SECTION_TYPE_FIELD } from '../constants';

const RE_ENDS_WITH_LOGIC = new RegExp(`(${LOGIC_OPERATOR_AND}|${LOGIC_OPERATOR_OR}|${LOGIC_OPERATOR_NOT})$`);

export const formatKeyWord = (str, type) => {
  let htmlStr = str;
  if (type === SECTION_TYPE_FIELD) {
    let keyArr = str.split(':');
    if (keyArr.length === 2) {
      htmlStr = `<span class="field-name">${keyArr[0]}</span>:${keyArr[1]}`;
    }
  }
  return htmlStr;
};

export const isPatentNumber = () => {
  return true;
};

export const endsWithLogic = (value) => {
  return RE_ENDS_WITH_LOGIC.test(value.toUpperCase());
};
