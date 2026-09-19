export const EDITOR_TYPE_DIV_INPUT = 'divinput'
export const EDITOR_TYPE_DIV_TEXTAREA = 'divtextarea'
export const EDITOR_TYPE_INPUT = 'input'
export const EDITOR_TYPE_TEXTAREA = 'textarea'

export const EVENT_UPDATE_EDITOR_STATUS = 'update-editor-status'
export const EVENT_UPDATE_SUGGESTION_DATA = 'update-suggestion-data'
export const EVENT_UPDATE_QUERY = 'update-query'

export const DOM_EVENT_KEYDOWN = 'keydown'
export const DOM_EVENT_UP = 'keyup'
export const DOM_EVENT_FOCUS = 'focus'
export const DOM_EVENT_BLUR = 'blur'
export const DOM_EVENT_COMPOSITION_START = 'compositionstart'
export const DOM_EVENT_COMPOSITION_END = 'compositionend'
export const DOM_EVENT_INPUT = 'input'
export const DOM_EVENT_MOUSE_ENTER = 'mouseenter'
export const DOM_EVENT_MOUSE_LEAVE = 'mouseleave'
export const DOM_EVENT_MOUSE_MOVE = 'mousemove'
export const DOM_EVENT_CLICK = 'click'

export const DOM_VK_TAB = 9
export const DOM_VK_RETURN = 13
export const DOM_VK_LEFT = 37
export const DOM_VK_UP = 38
export const DOM_VK_RIGHT = 39
export const DOM_VK_DOWN = 40

export const DELAY_UPDATE_EDITOR_STATUS = 50

export const TYPE_SELECT_OPTION_RIGHT = 'right'

export const CLASS_NAME_FIELD_TO_BE_FIXED = 'field-fixing'
export const CLASS_NAME_EDITOR_CONTAINER = 'editor-container'
export const SELECTOR_FIELD_TO_BE_FIXED = `.${CLASS_NAME_FIELD_TO_BE_FIXED}`
export const SELECTOR_EDITOR_CONTAINER = `.${CLASS_NAME_EDITOR_CONTAINER}`

export const LOGIC_OPERATOR_AND = 'AND'
export const LOGIC_OPERATOR_OR = 'OR'
export const LOGIC_OPERATOR_NOT = 'NOT'

export const SELECT_OPTIONS_PRE_SELECTED = 'pre-selected'
export const SELECT_OPTIONS_SELECTED = 'selected'

export const DEFAULT_KEYWORD_FIELDS = ['TA', 'TAC', 'TTL', 'ABST']
export const DEFAULT_ASSIGNEE_FIELDS = ['ALL_AN', 'ANCS', 'ANC', 'ANS']
export const DEFAULT_CLASSIFICATION_NUMBER_FIELDS = ['IPC', 'CPC', 'LOC', 'UPC']
export const DEFAULT_OTHER_FIELDS = ['IN', 'PBD', 'APD', 'PN']

export const REQUEST_TYPE_ASSIGNEE = 'ANCS'
export const REQUEST_TYPE_GNAME = 'GNAME'
export const REQUEST_TYPE_AUTOCOMPLETE = 'AUTOCOMPLETE'
export const REQUEST_TYPE_FIELD_LIST = 'FIELD'
export const REQUEST_TYPE_HISTORY = 'HISTORY'
export const REQUEST_TYPE_KEYWORDS = 'KEYWORDS'
export const REQUEST_TYPE_LOGIC = 'LOGIC'
export const REQUEST_TYPE_RANGE = 'RANGE'
export const REQUEST_TYPE_RANGE_SHORT = 'RANGESHORT'
export const REQUEST_TYPE_DATE = 'DATE'

export const TOKEN_TYPE_FIELD = 'field'
export const TOKEN_TYPE_LOGIC = 'logic'
export const TOKEN_TYPE_OPERATOR = 'operator'
export const TOKEN_TYPE_PLACESYMBOL = 'placeSymbol'
export const TOKEN_TYPE_SPACE = 'space'
export const TOKEN_TYPE_USER = 'user'

export const EXPRESSION_TYPE_FIELD = 'fieldExp'
export const EXPRESSION_TYPE_OPERATOR = 'operatorExp'
export const EXPRESSION_TYPE_RANGE = 'rangeExp'
export const EXPRESSION_TYPE_ROOT = 'rootExp'
export const EXPRESSION_TYPE_TOKEN = 'token'

export const SECTION_TYPE_ANCS = 'ANCS'
export const SECTION_TYPE_AUTOCOMPLETE = 'AUTOCOMPLETE'
export const SECTION_TYPE_FIELD = 'FIELD'
export const SECTION_TYPE_HISTORY = 'HISTORY'
export const SECTION_TYPE_KEYWORDS = 'KEYWORDS'
export const SECTION_TYPE_LOGIC = 'LOGIC'
export const SECTION_TYPE_SAMPLE = 'SAMPLE'

export const OPERATORS = ['(', ')', '[', ']', ':']
export const OPERATOR_RANGE_LEFT = '['
/**
 * 自动补齐，关键词推荐，历史记录， [标]当前申请(专利权)人，字段
 */
export const DEFAULT_SORT = [
  SECTION_TYPE_AUTOCOMPLETE,
  SECTION_TYPE_KEYWORDS,
  SECTION_TYPE_HISTORY,
  SECTION_TYPE_ANCS,
  SECTION_TYPE_FIELD,
]

export const SUPPORT_ANCS_FIELDS = [SECTION_TYPE_ANCS]
