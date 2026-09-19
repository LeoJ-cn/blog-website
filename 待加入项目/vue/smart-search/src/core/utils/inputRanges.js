const getInputRange = (input) => {
  let docObj = input.ownerDocument;
  let result = {
    start: 0,
    end: 0
  };

  if (navigator.appVersion.indexOf('MSIE') !== -1) {
    if (input.tagName === 'TEXTAREA') {
      if (input.value.charCodeAt(input.value.length - 1) < 14) {
        input.value = input.value.replace(/34/g, '') + String.fromCharCode(28);
      }
      let range = docObj.selection.createRange();
      let rangeCopy = range.duplicate();

      rangeCopy.moveToElementText(input);
      rangeCopy.setEndPoint('StartToEnd', range);
      result.end = input.value.length - rangeCopy.text.length;

      rangeCopy.setEndPoint('StartToStart', range);
      result.start = input.value.length - rangeCopy.text.length;

      if (input.value.substr(input.value.length - 1) === String.fromCharCode(28)) {
        input.value = input.value.substr(0, input.value.length - 1);
      }
    } else {
      let range = docObj.selection.createRange();
      let rangeCopy = range.duplicate();

      result.start = 0 - rangeCopy.moveStart('character', -100000);
      result.end = result.start + range.text.length;
    }
  } else {
    var isNumber = input.type === 'number';
    if (isNumber) input.type = 'text';
    result.start = input.selectionStart;
    result.end = input.selectionEnd;
    if (isNumber) input.type = 'number';
  }
  if (result.start < 0) {
    result = {
      start: 0,
      end: 0
    };
  }
  return result;
};

const setInputRange = function(input, pos) {
  let { start, end } = pos;
  if (end === undefined) {
    end = start;
  }

  var isNumber = input.type === 'number';

  if (isNumber) input.type = 'text';
  if (input.setSelectionRange) {
    input.setSelectionRange(start, end);
  } else {
    var range = input.createTextRange();
    range.collapse(true);
    range.moveEnd('character', start);
    range.moveStart('character', end);
    range.select();
  }
  input.blur();
  input.focus();
  if (isNumber) input.type = 'number';
};

export {
  getInputRange,
  setInputRange
};
