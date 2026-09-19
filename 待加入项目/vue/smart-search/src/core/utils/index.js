import map from 'lodash/map';
import find from 'lodash/find';
import filter from 'lodash/filter';
import startsWith from 'lodash/startsWith';
import includes from 'lodash/includes';

import { SEARCH_FIELDS, LOGIC_FIELDS, DEFAULT_FIELDS } from '../config';
import { SECTION_TYPE_FIELD, SECTION_TYPE_LOGIC } from '../../constants';

export const getDefaultSuggestions = () => {
  const suggestion = map(DEFAULT_FIELDS.other, fieldName => {
    const obj = find(SEARCH_FIELDS, ({ name }) => {
      return name === fieldName;
    });
    return obj || {};
  });
  return {
    // FIXME: 提高给 SuggestionBoard，用于判断是否为默认模式. 这种实现方式不理想
    isDefault: true,
    content: suggestion,
    section: SECTION_TYPE_FIELD
  };
};

export const findFieldSuggestionsByStem = (stem/* uppercase  required */) => {
  let content = [];
  if (stem) {
    let stemReg = _escape(stem);
    stemReg = new RegExp(`\\b${stemReg}`, 'i');
    content = filter(SEARCH_FIELDS, ({
      name, desc
    }) => startsWith(name, stem) || stemReg.test(desc.en));
  } else {
    content = filter(SEARCH_FIELDS, ({ name }) => includes(DEFAULT_FIELDS.default, name));
  }
  if (content.length === 0) return;
  if (content.length > 5) {
    content = content.slice(0, 5);
  }
  return {
    section: SECTION_TYPE_FIELD,
    content
  };
};

export const getLogicSuggestions = () => {
  return {
    section: SECTION_TYPE_LOGIC,
    content: LOGIC_FIELDS
  };
};

function _escape(str) {
  return str.replace(/[()/.*+?^$|\\[\]]/g, '\\$&');
}
