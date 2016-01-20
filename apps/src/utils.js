/* global $, define */

var xml = require('./xml');
var sanitizeHtml = require('sanitize-html');
var savedAmd;

// Do some hackery to make it so that lodash doesn't think it's being loaded
// via require js
if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
  savedAmd = define.amd;
  define.amd = false;
}

// get lodash
var _ = require('./lodash');
var Hammer = require('./hammer');

// undo hackery
if (typeof define == 'function' && savedAmd) {
  define.amd = savedAmd;
  savedAmd = null;
}

exports.getLodash = function () {
  return _;
};

exports.getHammer = function () {
  return Hammer;
};

exports.shallowCopy = function(source) {
  var result = {};
  for (var prop in source) {
    result[prop] = source[prop];
  }

  return result;
};

/**
 * Returns a clone of the object, stripping any functions on it.
 */
exports.cloneWithoutFunctions = function(object) {
  return JSON.parse(JSON.stringify(object));
};

/**
 * Returns a new object with the properties from defaults overridden by any
 * properties in options. Leaves defaults and options unchanged.
 * NOTE: For new code, use $.extend({}, defaults, options) instead
 */
exports.extend = function(defaults, options) {
  var finalOptions = exports.shallowCopy(defaults);
  for (var prop in options) {
    finalOptions[prop] = options[prop];
  }

  return finalOptions;
};

exports.escapeHtml = function(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * Return any html which is present in 'before' and absent in 'after'.
 * @param {string} before
 * @param {string} after
 */
function removedHtml(before, after) {
  var beforeLines = before.replace(/</gi, '\n<').split('\n');
  var afterLines = after.replace(/</gi, '\n<').split('\n');

  var afterLinesMap = {};
  for (var i = 0; i < afterLines.length; i++) {
    afterLinesMap[afterLines[i]] = true;
  }

  var removedLines = beforeLines.filter(function(line) {
    return !afterLinesMap[line];
  });

  return removedLines.join('\n');
}

/**
 * Warn if any non-cosmetic changes were made to the html.
 * @param  {function(removed, unsafe, safe)} warn Function to call if
 *     any unsafe html was removed from the output.
 * @param {string} unsafe
 * @param {string} safe
 */
function warnAboutUnsafeHtml(warn, unsafe, safe) {
  // Sanitizing the html can cause some cosmetic changes, such as converting
  // <img src=''> or <img src> to <img src/>. Process the unsafe html
  // making as few changes as possible, to remove any cosmetic differences
  // from our comparison.
  //
  // HACK: there is no option to accept all url schemes via
  // `allowedSchemes` as there is with other options. Instead,
  // provide an Array which claims to contain any element. See
  // https://github.com/punkave/sanitize-html/blob/master/index.js
  // for why this works. This hack is necessary in order to warn when
  // attributes containing disallowed URL schemes are removed.
  var allSchemes = [];
  allSchemes.indexOf = function() {
    return 0;
  };

  var processed = sanitizeHtml(unsafe, {
    allowedTags: false,
    allowedAttributes: false,
    allowedSchemes: allSchemes
  });
  if (processed != safe) {
    warn(removedHtml(processed, safe), unsafe, safe);
  }
}

// Sanitize html using a whitelist of tags and attributes.
// see default options at https://www.npmjs.com/package/sanitize-html
/**
 *
 * @param {string} unsafe Unsafe html to sanitize.
 * @param {function(removed, unsafe, safe)} warn Optional function to call if
 *     any unsafe html was removed from the output.
 */
exports.sanitizeHtml = function(unsafe, warn) {
  var safe = sanitizeHtml(unsafe, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'button', 'canvas', 'img', 'input', 'option', 'label', 'select']),
    allowedAttributes: $.extend({}, sanitizeHtml.defaults.allowedAttributes, {
      button: ['id', 'class', 'style'],
      canvas: ['id', 'class', 'style', 'width', 'height'],
      div: ['id', 'class', 'style', 'contenteditable', 'tabindex'],
      img: ['id', 'class', 'data-canonical-image-url', 'src', 'style'],
      input: ['id', 'checked', 'class', 'style', 'type', 'value'],
      label: ['id', 'class', 'style'],
      select: ['id', 'class', 'style']
    }),
    allowedSchemes: sanitizeHtml.defaults.allowedSchemes.concat(['data'])
  });

  if (typeof warn === 'function' && safe != unsafe) {
    warnAboutUnsafeHtml(warn, unsafe, safe);
  }

  return safe;
};

/**
 * Version of modulo which, unlike javascript's `%` operator,
 * will always return a positive remainder.
 * @param number
 * @param mod
 */
exports.mod = function(number, mod) {
  return ((number % mod) + mod) % mod;
};

/**
 * Generates an array of integers from start to end inclusive
 */
exports.range = function(start, end) {
  var ints = [];
  for (var i = start; i <= end; i++) {
    ints.push(i);
  }
  return ints;
};

/**
 * Given two functions, generates a function that returns the result of the
 * second function if and only if the first function returns true
 */
exports.executeIfConditional = function (conditional, fn) {
  return function () {
    if (conditional()) {
      return fn.apply(this, arguments);
    }
  };
};

/**
 * Removes all single and double quotes from a string
 * @param inputString
 * @returns {string} string without quotes
 */
exports.stripQuotes = function(inputString) {
  return inputString.replace(/["']/g, "");
};

/**
 * Defines an inheritance relationship between parent class and this class.
 */
Function.prototype.inherits = function (parent) {
  this.prototype = Object.create(parent.prototype);
  this.prototype.constructor = this;
  this.superPrototype = parent.prototype;
};

/**
 * Wrap a couple of our Blockly number validators to allow for ???.  This is
 * done so that level builders can specify required blocks with wildcard fields.
 */
exports.wrapNumberValidatorsForLevelBuilder = function () {
  var nonNeg = Blockly.FieldTextInput.nonnegativeIntegerValidator;
  var numVal = Blockly.FieldTextInput.numberValidator;

  Blockly.FieldTextInput.nonnegativeIntegerValidator = function (text) {
    if (text === '???') {
      return text;
    }
    return nonNeg(text);
  };

  Blockly.FieldTextInput.numberValidator = function (text) {
    if (text === '???') {
      return text;
    }
    return numVal(text);
  };
};

/**
 * Return a random key name from an object.
 *
 * Slightly modified from: http://stackoverflow.com/a/15106541
 */

exports.randomKey = function (obj) {
  var keys = Object.keys(obj);
  return keys[keys.length * Math.random() << 0];
};

/**
 * Generate a random identifier in a format matching the RFC-4122 specification.
 *
 * Taken from
 * {@link http://byronsalau.com/blog/how-to-create-a-guid-uuid-in-javascript/}
 *
 * @see RFC-4122 standard {@link http://www.ietf.org/rfc/rfc4122.txt}
 *
 * @returns {string} RFC4122-compliant UUID
 */
exports.createUuid = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

exports.fireResizeEvent = function () {
  var ev = document.createEvent('Event');
  ev.initEvent('resize', true, true);
  window.dispatchEvent(ev);
};

// ECMAScript 6 polyfill for String.prototype.repeat
// Polyfill adapted from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference
//        /Global_Objects/String/repeat
if (!String.prototype.repeat) {
  /**
   * The repeat() method constructs and returns a new string which contains
   * the specified number of copies of the string on which it was called,
   * concatenated together?
   * @param {number} count
   * @returns {string}
   */
  String.prototype.repeat = function(count) {
    'use strict';
    if (this === null) {
      throw new TypeError('can\'t convert ' + this + ' to object');
    }
    var str = '' + this;
    count = +count;
    if (count != count) {
      count = 0;
    }
    if (count < 0) {
      throw new RangeError('repeat count must be non-negative');
    }
    if (count == Infinity) {
      throw new RangeError('repeat count must be less than infinity');
    }
    count = Math.floor(count);
    if (str.length === 0 || count === 0) {
      return '';
    }
    // Ensuring count is a 31-bit integer allows us to heavily optimize the
    // main part. But anyway, most current (august 2014) browsers can't handle
    // strings 1 << 28 chars or longer, so:
    if (str.length * count >= 1 << 28) {
      throw new RangeError('repeat count must not overflow maximum string size');
    }
    var rpt = '';
    for (;;) {
      if ((count & 1) === 1) {
        rpt += str;
      }
      count >>>= 1;
      if (count === 0) {
        break;
      }
      str += str;
    }
    return rpt;
  };
}

/**
 * Similar to val || defaultVal, except it's gated on whether or not val is
 * undefined instead of whether val is falsey.
 * @returns {*} val if not undefined, otherwise defaultVal
 */
exports.valueOr = function (val, defaultVal) {
  return val === undefined ? defaultVal : val;
};


/**
 * Attempts to analyze whether or not err represents infinite recursion having
 * occurred. This error differs per browser, and it's possible that we don't
 * properly discover all cases.
 * Note: Other languages probably have localized messages, meaning we won't
 * catch them.
 */
exports.isInfiniteRecursionError = function (err) {
  // Chrome/Safari: message ends in a period in Safari, not in Chrome
  if (err instanceof RangeError &&
    /^Maximum call stack size exceeded/.test(err.message)) {
    return true;
  }

  // Firefox
  /* jshint ignore:start */
  // Linter doesn't like our use of InternalError, even though we gate on its
  // existence.
  if (typeof(InternalError) !== 'undefined' && err instanceof InternalError &&
      err.message === 'too much recursion') {
    return true;
  }
  /* jshint ignore:end */

  // IE
  if (err instanceof Error &&
      err.message === 'Out of stack space') {
    return true;
  }

  return false;
};

// TODO(dave): move this logic to dashboard.
exports.getPegasusHost = function() {
  switch (window.location.hostname) {
    case 'studio.code.org':
    case 'learn.code.org':
      return 'code.org';
    default:
      var name = window.location.hostname.split('.')[0];
      switch(name) {
        case 'localhost':
          return 'localhost.code.org:3000';
        case 'development':
        case 'staging':
        case 'test':
        case 'levelbuilder':
          return name + '.code.org';
        case 'staging-studio':
          return 'staging.code.org';
        case 'test-studio':
          return 'test.code.org';
        case 'levelbuilder-studio':
          return 'levelbuilder.code.org';
        default:
          return null;
      }
  }
};

/**
 * IE9 throws an exception when trying to access the media field of a stylesheet
 */
exports.browserSupportsCssMedia = function () {
  var styleSheets = document.styleSheets;
  for (var i = 0; i < styleSheets.length; i++) {
    var rules = styleSheets[i].cssRules || styleSheets[i].rules;
    try {
      if (rules.length > 0) {
        // see if we can access media
        var media = rules[0].media;
      }
    } catch (e) {
      return false;
    }
  }
  return true;
};

/**
 * Remove escaped characters and HTML to convert some rendered text to what should appear in user-edited controls
 * @param text
 * @returns String that has no more escape characters and multiple divs converted to newlines
 */
exports.unescapeText = function(text) {
  var cleanedText = text;
  cleanedText = cleanedText.replace(/<div>/gi, '\n'); // Divs generate newlines
  cleanedText = cleanedText.replace(/<[^>]+>/gi, ''); // Strip all other tags

  // This next step requires some explanation
  // In multiline text it's possible for the first line to render wrapped or unwrapped.
  //     Line 1
  //     Line 2
  //   Can render as either of:
  //     Line 1<div>Line 2</div>
  //     <div>Line 1</div><div>Line 2</div>
  //
  // But leading blank lines will always render wrapped and should be preserved
  //
  //     Line 2
  //     Line 3
  //   Renders as
  //    <div><br></div><div>Line 2</div><div>Line 3</div>
  //
  // To handle this behavior we strip leading newlines UNLESS they are followed
  // by another newline, using a negative lookahead (?!)
  cleanedText = cleanedText.replace(/^\n(?!\n)/, ''); // Strip leading nondoubled newline

  cleanedText = cleanedText.replace(/&nbsp;/gi, ' '); // Unescape nonbreaking spaces
  cleanedText = cleanedText.replace(/&gt;/gi, '>');   // Unescape >
  cleanedText = cleanedText.replace(/&lt;/gi, '<');   // Unescape <
  cleanedText = cleanedText.replace(/&amp;/gi, '&');  // Unescape & (must happen last!)
  return cleanedText;
};

/**
 * Escape special characters in a piece of text, and convert newlines to seperate divs
 * @param text
 * @returns String with special characters escaped and newlines converted divs
 */
exports.escapeText = function (text) {
  var escapedText = text.toString();
  escapedText = escapedText.replace(/&/g, '&amp;');   // Escape & (must happen first!)
  escapedText = escapedText.replace(/</g, '&lt;');    // Escape <
  escapedText = escapedText.replace(/>/g, '&gt;');    // Escape >
  escapedText = escapedText.replace(/  /g,' &nbsp;'); // Escape doubled spaces

  // Now wrap each line except the first line in a <div>,
  // replacing blank lines with <div><br><div>
  var lines = escapedText.split('\n');
  var returnValue = lines[0] + lines.slice(1).map(function (line) {
      return '<div>' + (line.length ? line : '<br>') + '</div>';
    }).join('');

  return returnValue;
};