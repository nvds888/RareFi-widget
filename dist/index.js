import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import algosdk from 'algosdk';

function formatTokenAmount(rawAmount, decimals = 6) {
  if (rawAmount === undefined || rawAmount === null || rawAmount === 0) return '0';
  const value = rawAmount / Math.pow(10, decimals);
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
  if (value >= 1) return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  // 2 significant figures for small values: 0.001234 → "0.0012"
  const sigDecimals = Math.max(2, Math.ceil(-Math.log10(value)) + 1);
  return value.toFixed(Math.min(sigDecimals, 8)).replace(/0+$/, '').replace(/\.$/, '');
}
function parseTokenAmount(value, decimals = 6) {
  if (!value) return 0;
  const str = String(value).trim();
  if (str.startsWith('-') || /[eE]/.test(str)) return 0;
  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0 || parsed > 1e15) return 0;
  return Math.floor(parsed * Math.pow(10, decimals));
}
function formatMaxAmount(balanceInBaseUnits, decimals = 6) {
  return (Math.floor(balanceInBaseUnits / Math.pow(10, decimals - 2)) / 100).toFixed(2);
}

function createCommonjsModule(fn) {
  var module = { exports: {} };
	return fn(module, module.exports), module.exports;
}

var byteLength_1 = byteLength;
var toByteArray_1 = toByteArray;
var fromByteArray_1 = fromByteArray;

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;

function getLens (b64) {
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=');
  if (validLen === -1) validLen = len;

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4);

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp;
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

  var curByte = 0;

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen;

  var i;
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)];
    arr[curByte++] = (tmp >> 16) & 0xFF;
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[curByte++] = (tmp >> 8) & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    );
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    );
  }

  return parts.join('')
}

var base64Js = {
	byteLength: byteLength_1,
	toByteArray: toByteArray_1,
	fromByteArray: fromByteArray_1
};

/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
var read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
};

var write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = (nBytes * 8) - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
};

var ieee754 = {
	read: read,
	write: write
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

var buffer = createCommonjsModule(function (module, exports) {



const customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    : null;

exports.Buffer = Buffer;
exports.SlowBuffer = SlowBuffer;
exports.INSPECT_MAX_BYTES = 50;

const K_MAX_LENGTH = 0x7fffffff;
exports.kMaxLength = K_MAX_LENGTH;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  );
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    const arr = new Uint8Array(1);
    const proto = { foo: function () { return 42 } };
    Object.setPrototypeOf(proto, Uint8Array.prototype);
    Object.setPrototypeOf(arr, proto);
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
});

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
});

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  const buf = new Uint8Array(length);
  Object.setPrototypeOf(buf, Buffer.prototype);
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192; // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  const valueOf = value.valueOf && value.valueOf();
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  const b = fromObject(value);
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
};

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
Object.setPrototypeOf(Buffer, Uint8Array);

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpreted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
};

function allocUnsafe (size) {
  assertSize(size);
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
};

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  const length = byteLength(string, encoding) | 0;
  let buf = createBuffer(length);

  const actual = buf.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual);
  }

  return buf
}

function fromArrayLike (array) {
  const length = array.length < 0 ? 0 : checked(array.length) | 0;
  const buf = createBuffer(length);
  for (let i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255;
  }
  return buf
}

function fromArrayView (arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    const copy = new Uint8Array(arrayView);
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
  }
  return fromArrayLike(arrayView)
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  let buf;
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array);
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset);
  } else {
    buf = new Uint8Array(array, byteOffset, length);
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype);

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    const len = checked(obj.length) | 0;
    const buf = createBuffer(len);

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len);
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0;
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
};

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  let x = a.length;
  let y = b.length;

  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  let i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  const buffer = Buffer.allocUnsafe(length);
  let pos = 0;
  for (i = 0; i < list.length; ++i) {
    let buf = list[i];
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
        buf.copy(buffer, pos);
      } else {
        Uint8Array.prototype.set.call(
          buffer,
          buf,
          pos
        );
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    } else {
      buf.copy(buffer, pos);
    }
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  const len = string.length;
  const mustMatch = (arguments.length > 2 && arguments[2] === true);
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  let loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  let loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true;

function swap (b, n, m) {
  const i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  const len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (let i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  const len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (let i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  const len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (let i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  const length = this.length;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.toLocaleString = Buffer.prototype.toString;

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  let str = '';
  const max = exports.INSPECT_MAX_BYTES;
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
  if (this.length > max) str += ' ... ';
  return '<Buffer ' + str + '>'
};
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength);
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  let x = thisEnd - thisStart;
  let y = end - start;
  const len = Math.min(x, y);

  const thisCopy = this.slice(thisStart, thisEnd);
  const targetCopy = target.slice(start, end);

  for (let i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset; // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  let indexSize = 1;
  let arrLength = arr.length;
  let valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  let i;
  if (dir) {
    let foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      let found = true;
      for (let j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  const remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  const strLen = string.length;

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  let i;
  for (i = 0; i < length; ++i) {
    const parsed = parseInt(string.substr(i * 2, 2), 16);
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0;
    if (isFinite(length)) {
      length = length >>> 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  const remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  let loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
      case 'latin1':
      case 'binary':
        return asciiWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64Js.fromByteArray(buf)
  } else {
    return base64Js.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  const res = [];

  let i = start;
  while (i < end) {
    const firstByte = buf[i];
    let codePoint = null;
    let bytesPerSequence = (firstByte > 0xEF)
      ? 4
      : (firstByte > 0xDF)
          ? 3
          : (firstByte > 0xBF)
              ? 2
              : 1;

    if (i + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  const len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  let res = '';
  let i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  let ret = '';
  end = Math.min(buf.length, end);

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  let ret = '';
  end = Math.min(buf.length, end);

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  const len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  let out = '';
  for (let i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]];
  }
  return out
}

function utf16leSlice (buf, start, end) {
  const bytes = buf.slice(start, end);
  let res = '';
  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
  for (let i = 0; i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  const len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  const newBuf = this.subarray(start, end);
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype);

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUintLE =
Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  let val = this[offset];
  let mul = 1;
  let i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUintBE =
Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  let val = this[offset + --byteLength];
  let mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUint8 =
Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUint16LE =
Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUint16BE =
Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUint32LE =
Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUint32BE =
Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
  offset = offset >>> 0;
  validateNumber(offset, 'offset');
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }

  const lo = first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24;

  const hi = this[++offset] +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    last * 2 ** 24;

  return BigInt(lo) + (BigInt(hi) << BigInt(32))
});

Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
  offset = offset >>> 0;
  validateNumber(offset, 'offset');
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }

  const hi = first * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset];

  const lo = this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last;

  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
});

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  let val = this[offset];
  let mul = 1;
  let i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  let i = byteLength;
  let mul = 1;
  let val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  const val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  const val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
  offset = offset >>> 0;
  validateNumber(offset, 'offset');
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }

  const val = this[offset + 4] +
    this[offset + 5] * 2 ** 8 +
    this[offset + 6] * 2 ** 16 +
    (last << 24); // Overflow

  return (BigInt(val) << BigInt(32)) +
    BigInt(first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24)
});

Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
  offset = offset >>> 0;
  validateNumber(offset, 'offset');
  const first = this[offset];
  const last = this[offset + 7];
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8);
  }

  const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset];

  return (BigInt(val) << BigInt(32)) +
    BigInt(this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last)
});

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUintLE =
Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  let mul = 1;
  let i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUintBE =
Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  let i = byteLength - 1;
  let mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUint8 =
Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeUint16LE =
Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  this[offset] = (value & 0xff);
  this[offset + 1] = (value >>> 8);
  return offset + 2
};

Buffer.prototype.writeUint16BE =
Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  this[offset] = (value >>> 8);
  this[offset + 1] = (value & 0xff);
  return offset + 2
};

Buffer.prototype.writeUint32LE =
Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  this[offset + 3] = (value >>> 24);
  this[offset + 2] = (value >>> 16);
  this[offset + 1] = (value >>> 8);
  this[offset] = (value & 0xff);
  return offset + 4
};

Buffer.prototype.writeUint32BE =
Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  this[offset] = (value >>> 24);
  this[offset + 1] = (value >>> 16);
  this[offset + 2] = (value >>> 8);
  this[offset + 3] = (value & 0xff);
  return offset + 4
};

function wrtBigUInt64LE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7);

  let lo = Number(value & BigInt(0xffffffff));
  buf[offset++] = lo;
  lo = lo >> 8;
  buf[offset++] = lo;
  lo = lo >> 8;
  buf[offset++] = lo;
  lo = lo >> 8;
  buf[offset++] = lo;
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
  buf[offset++] = hi;
  hi = hi >> 8;
  buf[offset++] = hi;
  hi = hi >> 8;
  buf[offset++] = hi;
  hi = hi >> 8;
  buf[offset++] = hi;
  return offset
}

function wrtBigUInt64BE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7);

  let lo = Number(value & BigInt(0xffffffff));
  buf[offset + 7] = lo;
  lo = lo >> 8;
  buf[offset + 6] = lo;
  lo = lo >> 8;
  buf[offset + 5] = lo;
  lo = lo >> 8;
  buf[offset + 4] = lo;
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
  buf[offset + 3] = hi;
  hi = hi >> 8;
  buf[offset + 2] = hi;
  hi = hi >> 8;
  buf[offset + 1] = hi;
  hi = hi >> 8;
  buf[offset] = hi;
  return offset + 8
}

Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
});

Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
});

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  let i = 0;
  let mul = 1;
  let sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  let i = byteLength - 1;
  let mul = 1;
  let sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  this[offset] = (value & 0xff);
  this[offset + 1] = (value >>> 8);
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  this[offset] = (value >>> 8);
  this[offset + 1] = (value & 0xff);
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  this[offset] = (value & 0xff);
  this[offset + 1] = (value >>> 8);
  this[offset + 2] = (value >>> 16);
  this[offset + 3] = (value >>> 24);
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  this[offset] = (value >>> 24);
  this[offset + 1] = (value >>> 16);
  this[offset + 2] = (value >>> 8);
  this[offset + 3] = (value & 0xff);
  return offset + 4
};

Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
});

Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
});

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4);
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8);
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  const len = end - start;

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end);
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      const code = val.charCodeAt(0);
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code;
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  } else if (typeof val === 'boolean') {
    val = Number(val);
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  let i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    const bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding);
    const len = bytes.length;
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// CUSTOM ERRORS
// =============

// Simplified versions from Node, changed for Buffer-only usage
const errors = {};
function E (sym, getMessage, Base) {
  errors[sym] = class NodeError extends Base {
    constructor () {
      super();

      Object.defineProperty(this, 'message', {
        value: getMessage.apply(this, arguments),
        writable: true,
        configurable: true
      });

      // Add the error code to the name to include it in the stack trace.
      this.name = `${this.name} [${sym}]`;
      // Reset the name to the actual name.
      delete this.name;
    }

    get code () {
      return sym
    }

    set code (value) {
      Object.defineProperty(this, 'code', {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      });
    }

    toString () {
      return `${this.name} [${sym}]: ${this.message}`
    }
  };
}

E('ERR_BUFFER_OUT_OF_BOUNDS',
  function (name) {
    if (name) {
      return `${name} is outside of buffer bounds`
    }

    return 'Attempt to access memory outside buffer bounds'
  }, RangeError);
E('ERR_INVALID_ARG_TYPE',
  function (name, actual) {
    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
  }, TypeError);
E('ERR_OUT_OF_RANGE',
  function (str, range, input) {
    let msg = `The value of "${str}" is out of range.`;
    let received = input;
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === 'bigint') {
      received = String(input);
      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
        received = addNumericalSeparator(received);
      }
      received += 'n';
    }
    msg += ` It must be ${range}. Received ${received}`;
    return msg
  }, RangeError);

function addNumericalSeparator (val) {
  let res = '';
  let i = val.length;
  const start = val[0] === '-' ? 1 : 0;
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`;
  }
  return `${val.slice(0, i)}${res}`
}

// CHECK FUNCTIONS
// ===============

function checkBounds (buf, offset, byteLength) {
  validateNumber(offset, 'offset');
  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
    boundsError(offset, buf.length - (byteLength + 1));
  }
}

function checkIntBI (value, min, max, buf, offset, byteLength) {
  if (value > max || value < min) {
    const n = typeof min === 'bigint' ? 'n' : '';
    let range;
    if (byteLength > 3) {
      if (min === 0 || min === BigInt(0)) {
        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
      } else {
        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
                `${(byteLength + 1) * 8 - 1}${n}`;
      }
    } else {
      range = `>= ${min}${n} and <= ${max}${n}`;
    }
    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
  }
  checkBounds(buf, offset, byteLength);
}

function validateNumber (value, name) {
  if (typeof value !== 'number') {
    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
  }
}

function boundsError (value, length, type) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type);
    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
  }

  if (length < 0) {
    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
  }

  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
                                    `>= ${type ? 1 : 0} and <= ${length}`,
                                    value)
}

// HELPER FUNCTIONS
// ================

const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0];
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  let codePoint;
  const length = string.length;
  let leadSurrogate = null;
  const bytes = [];

  for (let i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  const byteArray = [];
  for (let i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  let c, hi, lo;
  const byteArray = [];
  for (let i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64Js.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  let i;
  for (i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
const hexSliceLookupTable = (function () {
  const alphabet = '0123456789abcdef';
  const table = new Array(256);
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16;
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j];
    }
  }
  return table
})();

// Return not function with Error if BigInt not supported
function defineBigIntMethod (fn) {
  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
}

function BufferBigIntNotDefined () {
  throw new Error('BigInt not supported')
}
});

/**
 * Decode base64-encoded unsigned transactions from the RareFi backend,
 * sign them using the provided signer, and submit them.
 *
 * @param {string[]} b64Txns - Array of base64-encoded unsigned transactions
 * @param {Function} signTransactions - Signer from host wallet (e.g. useWallet().signTransactions)
 * @param {string} apiUrl - RareFi backend base URL
 * @returns {Promise<string>} transaction ID
 */
async function decodeSignAndSubmit(b64Txns, signTransactions, apiUrl) {
  const txnGroup = b64Txns.map(b64 => algosdk.decodeUnsignedTransaction(buffer.Buffer.from(b64, 'base64')));
  const signedTxns = await signTransactions(txnGroup);
  const signedTxnsBase64 = signedTxns.map(t => buffer.Buffer.from(t).toString('base64'));
  const response = await axios.post(`${apiUrl}/pools/submit`, {
    signedTxns: signedTxnsBase64
  });
  return response.data.txId;
}

const EXPLORER_URL = 'https://explorer.perawallet.app';
const INDEXER_URL = 'https://mainnet-idx.algonode.cloud';

// ── Asset avatar ──────────────────────────────────────────────────────────────
function AssetAvatar({
  name,
  imageUrl,
  size = 28
}) {
  const [err, setErr] = useState(false);
  if (imageUrl && !err) {
    return /*#__PURE__*/React.createElement("img", {
      src: imageUrl,
      alt: name,
      onError: () => setErr(true),
      style: {
        width: size,
        height: size,
        borderRadius: 6,
        objectFit: 'cover',
        flexShrink: 0
      }
    });
  }
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: 6,
      background: '#e5e7eb',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.4,
      fontWeight: 700,
      color: '#6b7280',
      flexShrink: 0
    }
  }, (name || '?')[0].toUpperCase());
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({
  size = 20
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      border: '2px solid #e5e7eb',
      borderTopColor: '#111',
      borderRadius: '50%',
      animation: 'rfw-spin 0.7s linear infinite'
    }
  });
}

// ── Tx status ─────────────────────────────────────────────────────────────────
function TxStatus({
  step,
  txId,
  label,
  onDone
}) {
  if (step === 'signing' || step === 'submitting') {
    return /*#__PURE__*/React.createElement("div", {
      className: "rfw-txstatus"
    }, /*#__PURE__*/React.createElement(Spinner, {
      size: 36
    }), /*#__PURE__*/React.createElement("p", {
      className: "rfw-txstatus-title"
    }, step === 'signing' ? 'Waiting for signature' : 'Broadcasting…'), /*#__PURE__*/React.createElement("p", {
      className: "rfw-txstatus-sub"
    }, step === 'signing' ? 'Confirm in your wallet' : 'Submitting to Algorand'));
  }
  if (step === 'success') {
    return /*#__PURE__*/React.createElement("div", {
      className: "rfw-txstatus"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-txstatus-check"
    }, "\u2713"), /*#__PURE__*/React.createElement("p", {
      className: "rfw-txstatus-title"
    }, label), txId && /*#__PURE__*/React.createElement("a", {
      href: `${EXPLORER_URL}/tx/${txId}`,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "rfw-explorer-link",
      style: {
        marginBottom: 4
      }
    }, "View on Explorer \u2197"), /*#__PURE__*/React.createElement("button", {
      className: "rfw-btn rfw-btn-primary",
      style: {
        marginTop: 8
      },
      onClick: onDone
    }, "Done"));
  }
  return null;
}

// ── Fetch wallet balance from Algorand indexer ────────────────────────────────
function useWalletBalance(userAddress, assetId) {
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    if (!userAddress || !assetId) return;
    fetch(`${INDEXER_URL}/v2/accounts/${userAddress}`).then(r => r.json()).then(data => {
      var _data$account, _found$amount;
      const assets = ((_data$account = data.account) == null ? void 0 : _data$account.assets) || [];
      const found = assets.find(a => a['asset-id'] === assetId);
      setBalance((_found$amount = found == null ? void 0 : found.amount) != null ? _found$amount : 0);
    }).catch(() => setBalance(null));
  }, [userAddress, assetId]);
  return balance;
}

// ── Deposit panel ─────────────────────────────────────────────────────────────
function DepositPanel({
  pools,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  const [selectedPool, setSelectedPool] = useState(pools[0] || null);
  const [amount, setAmount] = useState('');
  const [isOptedIn, setIsOptedIn] = useState(null);
  const [step, setStep] = useState('input');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const walletBalance = useWalletBalance(userAddress, selectedPool == null ? void 0 : selectedPool.depositAssetId);
  useEffect(() => {
    if (!selectedPool || !userAddress) {
      setIsOptedIn(false);
      return;
    }
    setIsOptedIn(null);
    axios.get(`${apiUrl}/pools/${selectedPool.id}/position/${userAddress}`).then(r => {
      var _r$data$position;
      return setIsOptedIn(((_r$data$position = r.data.position) == null ? void 0 : _r$data$position.isOptedIn) || false);
    }).catch(() => setIsOptedIn(false));
  }, [selectedPool == null ? void 0 : selectedPool.id, userAddress, apiUrl]);
  const handleOptIn = async () => {
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/opt-in`, {
        userAddress
      });
      await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setIsOptedIn(true);
      setStep('input');
    } catch (err) {
      var _err$response;
      setError(((_err$response = err.response) == null || (_err$response = _err$response.data) == null ? void 0 : _err$response.error) || err.message || 'Opt-in failed');
      setStep('input');
    }
  };
  const handleDeposit = async e => {
    e.preventDefault();
    const units = parseTokenAmount(amount);
    if (units <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (units < 1000000) {
      setError('Minimum deposit is 1 ' + assetName);
      return;
    }
    if (walletBalance !== null && units > walletBalance) {
      setError('Insufficient balance');
      return;
    }
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/deposit`, {
        userAddress,
        amount: units
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response2;
      setError(((_err$response2 = err.response) == null || (_err$response2 = _err$response2.data) == null ? void 0 : _err$response2.error) || err.message || 'Deposit failed');
      setStep('input');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Deposit successful",
    onDone: onSuccess
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Deposit ", assetName), /*#__PURE__*/React.createElement("label", {
    className: "rfw-label"
  }, "Receive yield in"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, pools.map(p => {
    const isCompound = p.poolType === 'compound';
    const yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, yieldAsset), isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-sub"
    }, "auto"));
  })), isOptedIn === null && /*#__PURE__*/React.createElement("p", {
    className: "rfw-muted"
  }, "Checking vault\u2026"), isOptedIn === false && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "rfw-info-box"
  }, "Opt into this vault first to start depositing."), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-primary rfw-btn-full",
    onClick: handleOptIn
  }, "Opt In to Vault")), isOptedIn === true && /*#__PURE__*/React.createElement("form", {
    onSubmit: handleDeposit
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-top"
  }, /*#__PURE__*/React.createElement("label", {
    className: "rfw-label",
    style: {
      margin: 0
    }
  }, "Amount"), walletBalance !== null && /*#__PURE__*/React.createElement("span", {
    className: "rfw-balance-hint"
  }, "Balance: ", /*#__PURE__*/React.createElement("strong", null, formatTokenAmount(walletBalance), " ", assetName))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-input-row"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rfw-input",
    type: "number",
    placeholder: "0.00",
    value: amount,
    onChange: e => setAmount(e.target.value),
    step: "0.01",
    min: "0"
  }), walletBalance !== null && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: () => setAmount(formatMaxAmount(walletBalance))
  }, "MAX"))), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "rfw-btn rfw-btn-primary rfw-btn-full",
    disabled: !amount || parseFloat(amount) <= 0
  }, "Deposit ", assetName)));
}

// ── Withdraw panel ────────────────────────────────────────────────────────────
function WithdrawPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  var _positions$selectedPo, _positions$selectedPo2;
  const poolsWithDeposits = pools.filter(p => {
    var _positions$p$id;
    return (((_positions$p$id = positions[p.id]) == null ? void 0 : _positions$p$id.depositedAmount) || 0) > 0;
  });
  const [selectedPool, setSelectedPool] = useState(poolsWithDeposits[0] || null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('input');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const deposited = selectedPool ? ((_positions$selectedPo = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo.depositedAmount) || 0 : 0;
  const pendingYield = selectedPool ? ((_positions$selectedPo2 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo2.pendingYield) || 0 : 0;
  const handleWithdraw = async e => {
    e.preventDefault();
    const units = parseTokenAmount(amount);
    if (units <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (units > deposited) {
      setError('Exceeds deposited balance');
      return;
    }
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/withdraw`, {
        userAddress,
        amount: units
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response3;
      setError(((_err$response3 = err.response) == null || (_err$response3 = _err$response3.data) == null ? void 0 : _err$response3.error) || err.message || 'Withdraw failed');
      setStep('input');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Withdrawal successful",
    onDone: onSuccess
  });
  if (poolsWithDeposits.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No deposits to withdraw."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Withdraw ", assetName), poolsWithDeposits.length > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "rfw-label"
  }, "From vault"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, poolsWithDeposits.map(p => {
    var _positions$p$id2;
    const isCompound = p.poolType === 'compound';
    const yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setAmount('');
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, yieldAsset), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-amount"
    }, formatTokenAmount((_positions$p$id2 = positions[p.id]) == null ? void 0 : _positions$p$id2.depositedAmount)));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-top"
  }, /*#__PURE__*/React.createElement("label", {
    className: "rfw-label",
    style: {
      margin: 0
    }
  }, "Amount"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-balance-hint"
  }, "Deposited: ", /*#__PURE__*/React.createElement("strong", null, formatTokenAmount(deposited), " ", assetName))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-input-row"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rfw-input",
    type: "number",
    placeholder: "0.00",
    value: amount,
    onChange: e => setAmount(e.target.value),
    step: "0.01",
    min: "0"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: () => setAmount(formatMaxAmount(deposited))
  }, "MAX"))), pendingYield > 0 && (selectedPool == null ? void 0 : selectedPool.poolType) !== 'compound' && /*#__PURE__*/React.createElement("div", {
    className: "rfw-info-box"
  }, "You have ", formatTokenAmount(pendingYield), " ", selectedPool == null ? void 0 : selectedPool.swapAssetName, " pending \u2014 still claimable after withdrawal."), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-secondary rfw-btn-full",
    disabled: !amount || parseFloat(amount) <= 0,
    onClick: handleWithdraw
  }, "Withdraw"));
}

// ── Claim panel ───────────────────────────────────────────────────────────────
function ClaimPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  onBack,
  onSuccess
}) {
  var _positions$selectedPo3;
  const poolsWithYield = pools.filter(p => {
    var _positions$p$id3;
    return (((_positions$p$id3 = positions[p.id]) == null ? void 0 : _positions$p$id3.pendingYield) || 0) > 0;
  });
  const [selectedPool, setSelectedPool] = useState(poolsWithYield[0] || null);
  const [step, setStep] = useState('confirm');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const pending = selectedPool ? ((_positions$selectedPo3 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo3.pendingYield) || 0 : 0;
  const yieldAsset = (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA';
  const handleClaim = async () => {
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/claim`, {
        userAddress
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response4;
      setError(((_err$response4 = err.response) == null || (_err$response4 = _err$response4.data) == null ? void 0 : _err$response4.error) || err.message || 'Claim failed');
      setStep('confirm');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Yield claimed",
    onDone: onSuccess
  });
  if (poolsWithYield.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No pending yield to claim."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Claim Yield"), poolsWithYield.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid",
    style: {
      marginBottom: 16
    }
  }, poolsWithYield.map(p => {
    var _positions$p$id4;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setError('');
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, p.swapAssetName || 'ASA'), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-amount"
    }, formatTokenAmount((_positions$p$id4 = positions[p.id]) == null ? void 0 : _positions$p$id4.pendingYield)));
  })), /*#__PURE__*/React.createElement("div", {
    className: "rfw-claim-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-claim-card-label"
  }, "Claimable now"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-claim-card-amount"
  }, formatTokenAmount(pending), " ", /*#__PURE__*/React.createElement("span", null, yieldAsset))), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-success rfw-btn-full",
    onClick: handleClaim,
    disabled: pending <= 0
  }, "Claim ", formatTokenAmount(pending), " ", yieldAsset));
}

// ── Switch vault panel ────────────────────────────────────────────────────────
function SwitchPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  var _positions$fromPool$i;
  const poolsWithDeposits = pools.filter(p => {
    var _positions$p$id5;
    return (((_positions$p$id5 = positions[p.id]) == null ? void 0 : _positions$p$id5.depositedAmount) || 0) > 0;
  });
  const [fromPool, setFromPool] = useState(poolsWithDeposits[0] || null);
  const [toPool, setToPool] = useState(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('select');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const availableTargets = pools.filter(p => p.id !== (fromPool == null ? void 0 : fromPool.id));
  const deposited = fromPool ? ((_positions$fromPool$i = positions[fromPool.id]) == null ? void 0 : _positions$fromPool$i.depositedAmount) || 0 : 0;
  const handleSwitch = async () => {
    if (!fromPool || !toPool) {
      setError('Select source and target vault');
      return;
    }
    const units = parseTokenAmount(amount);
    if (units <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (units > deposited) {
      setError('Exceeds deposited balance');
      return;
    }
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/switch-pool`, {
        userAddress,
        fromPoolId: fromPool.id,
        toPoolId: toPool.id,
        amount: units
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response5;
      setError(((_err$response5 = err.response) == null || (_err$response5 = _err$response5.data) == null ? void 0 : _err$response5.error) || err.message || 'Switch failed');
      setStep('select');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Vault switched",
    onDone: onSuccess
  });
  if (poolsWithDeposits.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No deposits to switch."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Switch Vault"), /*#__PURE__*/React.createElement("label", {
    className: "rfw-label"
  }, "From"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, poolsWithDeposits.map(p => {
    var _positions$p$id6;
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(fromPool == null ? void 0 : fromPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setFromPool(p);
        setToPool(null);
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, label), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-amount"
    }, formatTokenAmount((_positions$p$id6 = positions[p.id]) == null ? void 0 : _positions$p$id6.depositedAmount)));
  })), /*#__PURE__*/React.createElement("label", {
    className: "rfw-label",
    style: {
      marginTop: 8
    }
  }, "To"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, availableTargets.map(p => {
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(toPool == null ? void 0 : toPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setToPool(p);
        setError('');
      }
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-badge"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, label));
  })), /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-amount-top"
  }, /*#__PURE__*/React.createElement("label", {
    className: "rfw-label",
    style: {
      margin: 0
    }
  }, "Amount to switch"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-balance-hint"
  }, "Deposited: ", /*#__PURE__*/React.createElement("strong", null, formatTokenAmount(deposited), " ", assetName))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-input-row"
  }, /*#__PURE__*/React.createElement("input", {
    className: "rfw-input",
    type: "number",
    placeholder: "0.00",
    value: amount,
    onChange: e => setAmount(e.target.value),
    step: "0.01",
    min: "0"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: () => setAmount(formatMaxAmount(deposited))
  }, "MAX"))), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-primary rfw-btn-full",
    onClick: handleSwitch,
    disabled: !fromPool || !toPool || !amount || parseFloat(amount) <= 0,
    style: {
      marginTop: 8
    }
  }, "Switch Vault"));
}

// ── Exit panel ────────────────────────────────────────────────────────────────
function ExitPanel({
  pools,
  positions,
  userAddress,
  signTransactions,
  apiUrl,
  assetName,
  onBack,
  onSuccess
}) {
  const poolsWithPosition = pools.filter(p => {
    const pos = positions[p.id];
    return ((pos == null ? void 0 : pos.depositedAmount) || 0) > 0 || ((pos == null ? void 0 : pos.pendingYield) || 0) > 0;
  });
  const [selectedPool, setSelectedPool] = useState(poolsWithPosition[0] || null);
  const [step, setStep] = useState('confirm');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState('');
  const pos = selectedPool ? positions[selectedPool.id] : null;
  const handleExit = async () => {
    setStep('signing');
    setError('');
    try {
      const res = await axios.post(`${apiUrl}/pools/${selectedPool.id}/close-out`, {
        userAddress
      });
      const id = await decodeSignAndSubmit(res.data.transactions, signTransactions, apiUrl);
      setTxId(id);
      setStep('success');
    } catch (err) {
      var _err$response6;
      setError(((_err$response6 = err.response) == null || (_err$response6 = _err$response6.data) == null ? void 0 : _err$response6.error) || err.message || 'Exit failed');
      setStep('confirm');
    }
  };
  if (step === 'signing' || step === 'submitting') return /*#__PURE__*/React.createElement(TxStatus, {
    step: step
  });
  if (step === 'success') return /*#__PURE__*/React.createElement(TxStatus, {
    step: "success",
    txId: txId,
    label: "Exited vault",
    onDone: onSuccess
  });
  if (poolsWithPosition.length === 0) return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No active position to exit."));
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Exit Vault"), poolsWithPosition.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-vault-grid"
  }, poolsWithPosition.map(p => {
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: `rfw-vault-btn ${(selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''}`,
      onClick: () => {
        setSelectedPool(p);
        setError('');
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-vault-btn-label"
    }, label));
  })), /*#__PURE__*/React.createElement("div", {
    className: "rfw-exit-summary"
  }, (pos == null ? void 0 : pos.depositedAmount) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-exit-row"
  }, /*#__PURE__*/React.createElement("span", null, "Deposit returned"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-exit-row-value"
  }, formatTokenAmount(pos.depositedAmount), " ", assetName)), (pos == null ? void 0 : pos.pendingYield) > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-exit-row"
  }, /*#__PURE__*/React.createElement("span", null, "Yield claimed"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-exit-row-value rfw-positive"
  }, formatTokenAmount(pos.pendingYield), " ", (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA'))), /*#__PURE__*/React.createElement("p", {
    className: "rfw-warning"
  }, "Closes your position and opts you out of the vault."), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-danger rfw-btn-full",
    onClick: handleExit
  }, "Exit & Withdraw All"));
}

// ── Activity panel (transaction history) ─────────────────────────────────────
const TX_CONFIG = {
  deposit: {
    label: 'Deposit',
    color: '#2563eb',
    bg: '#eff6ff'
  },
  withdraw: {
    label: 'Withdraw',
    color: '#6b7280',
    bg: '#f9fafb'
  },
  claim: {
    label: 'Claimed Yield',
    color: '#16a34a',
    bg: '#f0fdf4'
  },
  claimYield: {
    label: 'Claimed Yield',
    color: '#16a34a',
    bg: '#f0fdf4'
  },
  optIn: {
    label: 'Opt In',
    color: '#9ca3af',
    bg: '#f9fafb'
  },
  closeOut: {
    label: 'Exit',
    color: '#dc2626',
    bg: '#fef2f2'
  },
  compoundYield: {
    label: 'Compounded',
    color: '#7c3aed',
    bg: '#f5f3ff'
  },
  swapYield: {
    label: 'Swap Yield',
    color: '#7c3aed',
    bg: '#f5f3ff'
  }
};
function ActivityPanel({
  transactions,
  assetName,
  onBack
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Activity"), transactions.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No transactions yet.") : /*#__PURE__*/React.createElement("div", {
    className: "rfw-activity-list"
  }, transactions.map(tx => {
    var _tx$pool, _tx$pool2;
    const cfg = TX_CONFIG[tx.type] || {
      label: 'Transaction',
      color: '#6b7280',
      bg: '#f9fafb'
    };
    const poolLabel = ((_tx$pool = tx.pool) == null ? void 0 : _tx$pool.poolType) === 'compound' ? assetName + ' Vault (auto)' : `${((_tx$pool2 = tx.pool) == null ? void 0 : _tx$pool2.swapAssetName) || 'ASA'} Vault`;
    return /*#__PURE__*/React.createElement("div", {
      key: tx.id,
      className: "rfw-activity-item"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-badge",
      style: {
        background: cfg.bg,
        color: cfg.color
      }
    }, cfg.label), /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-main"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-activity-pool"
    }, poolLabel), tx.amount > 0 && /*#__PURE__*/React.createElement("span", {
      className: "rfw-activity-amount",
      style: {
        color: cfg.color
      }
    }, ['deposit', 'withdraw', 'closeOut'].includes(tx.type) ? '' : '+', formatTokenAmount(tx.amount))), /*#__PURE__*/React.createElement("div", {
      className: "rfw-activity-meta"
    }, tx.timestamp && /*#__PURE__*/React.createElement("span", null, new Date(tx.timestamp * 1000).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })), /*#__PURE__*/React.createElement("a", {
      href: `${EXPLORER_URL}/tx/${tx.id}`,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "rfw-explorer-link"
    }, "\u2197"))));
  })));
}

// ── Yield history panel ───────────────────────────────────────────────────────
function YieldHistoryPanel({
  userAddress,
  apiUrl,
  assetName,
  onBack
}) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!userAddress) return;
    setLoading(true);
    axios.get(`${apiUrl}/pools/yield-history/${userAddress}`).then(r => {
      const filtered = (r.data.yieldHistory || []).filter(item => item.poolType === 'compound' || item.yieldAsset);
      setHistory(filtered);
    }).catch(() => setError('Failed to load yield history')).finally(() => setLoading(false));
  }, [userAddress, apiUrl]);
  const totalByToken = {};
  history.forEach(item => {
    const token = item.poolType === 'compound' ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
    totalByToken[token] = (totalByToken[token] || 0) + (item.yieldAmount || 0);
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-panel"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-back",
    onClick: onBack
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "rfw-panel-title"
  }, "Yield History"), loading && /*#__PURE__*/React.createElement("div", {
    className: "rfw-loading",
    style: {
      padding: '24px 0'
    }
  }, /*#__PURE__*/React.createElement(Spinner, null)), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), !loading && !error && history.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-empty-state"
  }, "No yield history yet.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11
    }
  }, "Deposit to start earning.")), !loading && !error && history.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, Object.keys(totalByToken).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-totals"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-totals-label"
  }, "Total earned"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-totals-amounts"
  }, Object.entries(totalByToken).map(([token, amt]) => /*#__PURE__*/React.createElement("div", {
    key: token,
    className: "rfw-yield-total-row"
  }, /*#__PURE__*/React.createElement("span", null, token), /*#__PURE__*/React.createElement("span", {
    className: "rfw-positive"
  }, "+", formatTokenAmount(amt)))))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-list"
  }, history.map((item, i) => {
    var _item$swapDays;
    const isCompound = item.poolType === 'compound';
    const yieldToken = isCompound ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
    const vaultLabel = isCompound ? assetName + ' Vault (auto-compound)' : yieldToken + ' Vault';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "rfw-yield-item"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-item-header"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-item-vault"
    }, isCompound && /*#__PURE__*/React.createElement("span", {
      className: "rfw-compound-dot"
    }, "\u21BB"), /*#__PURE__*/React.createElement("span", null, vaultLabel))), /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-item-rows"
    }, /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-stat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-yield-stat-label"
    }, isCompound ? 'Compounded' : 'Claimed'), /*#__PURE__*/React.createElement("span", {
      className: "rfw-positive"
    }, "+", formatTokenAmount(item.yieldAmount), " ", yieldToken)), item.pendingYield > 0 && /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-stat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-yield-stat-label"
    }, "Pending"), /*#__PURE__*/React.createElement("span", {
      className: "rfw-pending"
    }, "+", formatTokenAmount(item.pendingYield), " ", yieldToken)), ((_item$swapDays = item.swapDays) == null ? void 0 : _item$swapDays.length) > 0 && /*#__PURE__*/React.createElement("div", {
      className: "rfw-yield-stat"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rfw-yield-stat-label"
    }, "Distributions"), /*#__PURE__*/React.createElement("span", null, item.swapDays.length, "\xD7"))));
  }))));
}

// ── Home view ─────────────────────────────────────────────────────────────────
function HomeView({
  pools,
  positions,
  positionsLoading,
  assetName,
  assetImageUrl,
  onAction
}) {
  const totalDeposit = Object.values(positions).reduce((s, p) => s + (p.depositedAmount || 0), 0);
  const hasDeposit = totalDeposit > 0;
  const pendingByToken = {};
  pools.forEach(pool => {
    const pos = positions[pool.id];
    if ((pos == null ? void 0 : pos.pendingYield) > 0) {
      const token = pool.swapAssetName || 'ASA';
      pendingByToken[token] = (pendingByToken[token] || 0) + pos.pendingYield;
    }
  });
  const hasPendingYield = Object.keys(pendingByToken).length > 0;
  const activeVaults = pools.filter(p => {
    var _positions$p$id7;
    return (((_positions$p$id7 = positions[p.id]) == null ? void 0 : _positions$p$id7.depositedAmount) || 0) > 0;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-home"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-card"
  }, positionsLoading ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Spinner, {
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: '#9ca3af'
    }
  }, "Loading\u2026")) : hasDeposit || hasPendingYield ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-label"
  }, "Your Deposit"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-value"
  }, formatTokenAmount(totalDeposit), " ", /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-asset"
  }, assetName))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-divider"
  }), /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-label"
  }, "Pending Yield"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-pos-value rfw-positive"
  }, hasPendingYield ? Object.entries(pendingByToken).map(([t, a]) => `+${formatTokenAmount(a)} ${t}`).join(' · ') : '—')), activeVaults.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-vaults"
  }, activeVaults.map(p => {
    const isCompound = p.poolType === 'compound';
    const label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA') + ' Vault';
    return /*#__PURE__*/React.createElement("span", {
      key: p.id,
      className: "rfw-vault-tag"
    }, label);
  }))) : /*#__PURE__*/React.createElement("div", {
    className: "rfw-no-position"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-no-position-icon"
  }, "\u2B21"), /*#__PURE__*/React.createElement("p", null, "No active position"), /*#__PURE__*/React.createElement("span", null, "Deposit to start earning yield"))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-actions-primary"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-primary",
    onClick: () => onAction('deposit')
  }, "Deposit"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-secondary",
    onClick: () => onAction('withdraw'),
    disabled: !hasDeposit
  }, "Withdraw"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-success",
    onClick: () => onAction('claim'),
    disabled: !hasPendingYield
  }, "Claim Yield")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-actions-secondary"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-outline",
    onClick: () => onAction('switch'),
    disabled: !hasDeposit || pools.length <= 1
  }, "Switch Vault"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-danger-outline",
    onClick: () => onAction('exit'),
    disabled: !hasDeposit && !hasPendingYield
  }, "Exit")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-history-links"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-history-link",
    onClick: () => onAction('activity')
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB"), " Activity"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-history-divider"
  }), /*#__PURE__*/React.createElement("button", {
    className: "rfw-history-link",
    onClick: () => onAction('yieldHistory')
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC8"), " Yield History")));
}

// ── Main modal ────────────────────────────────────────────────────────────────
function WidgetModal({
  open,
  onClose,
  pools,
  positions,
  transactions,
  loading,
  positionsLoading,
  onRefresh,
  userAddress,
  signTransactions,
  apiUrl,
  asset,
  assetImageUrl
}) {
  const [view, setView] = useState('home');
  if (!open) return null;
  const goHome = () => {
    setView('home');
    onRefresh();
  };
  const common = {
    pools,
    positions,
    userAddress,
    signTransactions,
    apiUrl,
    assetName: asset,
    onBack: () => setView('home'),
    onSuccess: goHome
  };
  const renderView = () => {
    switch (view) {
      case 'deposit':
        return /*#__PURE__*/React.createElement(DepositPanel, common);
      case 'withdraw':
        return /*#__PURE__*/React.createElement(WithdrawPanel, common);
      case 'claim':
        return /*#__PURE__*/React.createElement(ClaimPanel, common);
      case 'switch':
        return /*#__PURE__*/React.createElement(SwitchPanel, common);
      case 'exit':
        return /*#__PURE__*/React.createElement(ExitPanel, common);
      case 'activity':
        return /*#__PURE__*/React.createElement(ActivityPanel, {
          transactions: transactions,
          assetName: asset,
          onBack: () => setView('home')
        });
      case 'yieldHistory':
        return /*#__PURE__*/React.createElement(YieldHistoryPanel, {
          userAddress: userAddress,
          apiUrl: apiUrl,
          assetName: asset,
          onBack: () => setView('home')
        });
      default:
        return /*#__PURE__*/React.createElement(HomeView, {
          pools: pools,
          positions: positions,
          positionsLoading: positionsLoading,
          assetName: asset,
          assetImageUrl: assetImageUrl,
          onAction: setView
        });
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "rfw-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-title"
  }, /*#__PURE__*/React.createElement(AssetAvatar, {
    name: asset,
    imageUrl: assetImageUrl,
    size: 28
  }), /*#__PURE__*/React.createElement("span", null, asset, " Vaults")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-header-right"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://rarefi.app",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "rfw-powered"
  }, "Powered by RareFi \u2197"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-close",
    onClick: onClose
  }, "\xD7"))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-modal-body"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "rfw-loading"
  }, /*#__PURE__*/React.createElement(Spinner, null), /*#__PURE__*/React.createElement("span", null, "Loading vaults\u2026")) : renderView())));
}

function useWidgetData({
  asset,
  userAddress,
  apiUrl
}) {
  const [pools, setPools] = useState([]);
  const [positions, setPositions] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const fetchPools = useCallback(async () => {
    try {
      const res = await axios.get(`${apiUrl}/pools`);
      const all = res.data.pools || [];
      return all.filter(p => (p.depositAssetName || 'ALPHA') === asset);
    } catch (_unused) {
      return [];
    }
  }, [asset, apiUrl]);
  const fetchPositions = useCallback(async (poolList, address) => {
    if (!address || poolList.length === 0) return {};
    const result = {};
    await Promise.all(poolList.map(async pool => {
      try {
        const res = await axios.get(`${apiUrl}/pools/${pool.id}/position/${address}`);
        if (res.data.position) result[pool.id] = res.data.position;
      } catch (_unused2) {}
    }));
    return result;
  }, [apiUrl]);
  const fetchTransactions = useCallback(async address => {
    if (!address) return [];
    try {
      const res = await axios.get(`${apiUrl}/pools/transactions/${address}`);
      return res.data.transactions || [];
    } catch (_unused3) {
      return [];
    }
  }, [apiUrl]);
  const refresh = useCallback(async () => {
    setLoading(true);
    const poolList = await fetchPools();
    setPools(poolList);
    setPositionsLoading(true);
    const [pos, txns] = await Promise.all([fetchPositions(poolList, userAddress), fetchTransactions(userAddress)]);
    setPositions(pos);
    setTransactions(txns);
    setPositionsLoading(false);
    setLoading(false);
  }, [fetchPools, fetchPositions, fetchTransactions, userAddress]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return {
    pools,
    positions,
    transactions,
    loading,
    positionsLoading,
    refresh
  };
}

const CSS = `
@keyframes rfw-spin { to { transform: rotate(360deg); } }
@keyframes rfw-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Trigger */
.rfw-trigger-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; font-family: inherit; letter-spacing: 0.01em; }
.rfw-trigger-btn:hover:not(:disabled) { opacity: 0.82; }
.rfw-trigger-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.rfw-trigger-icon { font-size: 14px; }

/* Overlay */
.rfw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }

/* Modal */
.rfw-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 380px; box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.07); animation: rfw-fadein 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }

/* Header */
.rfw-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
.rfw-modal-title { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: #111; }
.rfw-modal-header-right { display: flex; align-items: center; gap: 10px; }
.rfw-powered { font-size: 10px; color: #c4c4c4; text-decoration: none; transition: color 0.15s; letter-spacing: 0.02em; }
.rfw-powered:hover { color: #888; }
.rfw-close { background: none; border: none; font-size: 22px; line-height: 1; cursor: pointer; color: #c4c4c4; padding: 0 2px; transition: color 0.15s; }
.rfw-close:hover { color: #111; }

/* Body */
.rfw-modal-body { padding: 16px; max-height: 540px; overflow-y: auto; }
.rfw-loading { display: flex; align-items: center; gap: 10px; padding: 32px 0; color: #9ca3af; font-size: 13px; justify-content: center; }

/* Position card */
.rfw-pos-card { background: #111; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
.rfw-pos-row { display: flex; justify-content: space-between; align-items: center; }
.rfw-pos-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }
.rfw-pos-value { font-size: 15px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.rfw-pos-asset { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6); margin-left: 2px; }
.rfw-pos-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 10px 0; }
.rfw-pos-vaults { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.rfw-vault-tag { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }
.rfw-positive { color: #4ade80 !important; }
.rfw-pending { color: #fbbf24 !important; }
.rfw-no-position { text-align: center; padding: 8px 0; }
.rfw-no-position-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.3; color: #fff; }
.rfw-no-position p { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; margin: 0 0 3px; }
.rfw-no-position span { color: rgba(255,255,255,0.35); font-size: 11px; }

/* Actions */
.rfw-actions-primary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin-bottom: 7px; }
.rfw-actions-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 12px; }

/* Buttons */
.rfw-btn { border: none; border-radius: 9px; padding: 9px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: center; white-space: nowrap; letter-spacing: 0.01em; }
.rfw-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.rfw-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.rfw-btn-full { width: 100%; padding: 11px; font-size: 13px; }
.rfw-btn-primary { background: #111; color: #fff; }
.rfw-btn-secondary { background: #f0f0f0; color: #111; }
.rfw-btn-success { background: #16a34a; color: #fff; }
.rfw-btn-outline { background: transparent; color: #111; border: 1.5px solid #e0e0e0; }
.rfw-btn-danger { background: #dc2626; color: #fff; }
.rfw-btn-danger-outline { background: transparent; color: #dc2626; border: 1.5px solid #fca5a5; }

/* History links */
.rfw-history-links { display: flex; align-items: center; border: 1.5px solid #f0f0f0; border-radius: 10px; overflow: hidden; }
.rfw-history-link { flex: 1; background: none; border: none; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.15s, color 0.15s; }
.rfw-history-link:hover { background: #f9fafb; color: #111; }
.rfw-history-divider { width: 1px; height: 32px; background: #f0f0f0; }

/* Panel */
.rfw-panel { display: flex; flex-direction: column; }
.rfw-back { background: #fff; border: none; font-size: 12px; color: #9ca3af; cursor: pointer; padding: 6px 0; margin-bottom: 14px; font-family: inherit; text-align: left; transition: color 0.15s; display: inline-flex; align-items: center; gap: 3px; position: sticky; top: 0; z-index: 10; }
.rfw-back:hover { color: #111; }
.rfw-panel-title { font-size: 15px; font-weight: 700; color: #111; margin: 0 0 16px; }
.rfw-label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }

/* Vault selector grid */
.rfw-vault-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }
.rfw-vault-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 14px; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 9px; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; font-family: inherit; min-width: 64px; }
.rfw-vault-btn:hover { border-color: #9ca3af; background: #f3f4f6; }
.rfw-vault-btn--selected { border-color: #111; background: #f0f0f0; }
.rfw-vault-btn-label { font-size: 12px; font-weight: 700; color: #111; }
.rfw-vault-btn-sub { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.rfw-vault-btn-amount { font-size: 10px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.rfw-compound-badge { position: absolute; top: -5px; right: -5px; background: #6366f1; color: #fff; font-size: 9px; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1; }

/* Amount input block */
.rfw-amount-block { margin-bottom: 12px; }
.rfw-amount-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
.rfw-balance-hint { font-size: 11px; color: #9ca3af; }
.rfw-balance-hint strong { color: #374151; }
.rfw-input-row { display: flex; gap: 7px; }
.rfw-input { flex: 1; padding: 10px 13px; border: 1.5px solid #e5e7eb; border-radius: 9px; font-size: 15px; font-family: inherit; color: #111; background: #fff; transition: border-color 0.15s; outline: none; }
.rfw-input:focus { border-color: #111; }
.rfw-max-btn { padding: 0 12px; background: #f0f0f0; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; color: #111; cursor: pointer; font-family: inherit; letter-spacing: 0.03em; }
.rfw-max-btn:hover { background: #e5e7eb; }

/* Info & states */
.rfw-info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #111; border-radius: 7px; padding: 10px 12px; font-size: 12px; color: #374151; margin-bottom: 12px; line-height: 1.45; }
.rfw-helper { font-size: 11px; color: #9ca3af; margin: 0 0 12px; }
.rfw-muted { font-size: 13px; color: #9ca3af; margin: 0 0 12px; }
.rfw-error { font-size: 12px; color: #dc2626; background: #fef2f2; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }
.rfw-warning { font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }
.rfw-empty-state { text-align: center; padding: 32px 0; color: #9ca3af; font-size: 13px; line-height: 1.6; }

/* Claim card */
.rfw-claim-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 14px; text-align: center; }
.rfw-claim-card-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 6px; }
.rfw-claim-card-amount { font-size: 26px; font-weight: 800; color: #15803d; font-variant-numeric: tabular-nums; }
.rfw-claim-card-amount span { font-size: 14px; font-weight: 600; margin-left: 4px; }

/* Exit summary */
.rfw-exit-summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 13px 15px; margin-bottom: 12px; }
.rfw-exit-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #374151; padding: 4px 0; }
.rfw-exit-row-value { font-weight: 600; }

/* Activity list */
.rfw-activity-list { display: flex; flex-direction: column; gap: 8px; }
.rfw-activity-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 11px 13px; background: #fff; }
.rfw-activity-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-bottom: 6px; letter-spacing: 0.03em; }
.rfw-activity-body {}
.rfw-activity-main { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
.rfw-activity-pool { font-size: 13px; font-weight: 600; color: #111; }
.rfw-activity-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.rfw-activity-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af; }
.rfw-explorer-link { color: #c4c4c4; text-decoration: none; transition: color 0.15s; font-size: 12px; }
.rfw-explorer-link:hover { color: #111; }

/* Yield history */
.rfw-yield-totals { background: #111; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
.rfw-yield-totals-label { font-size: 10px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-bottom: 8px; }
.rfw-yield-totals-amounts {}
.rfw-yield-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #fff; padding: 2px 0; }
.rfw-yield-list { display: flex; flex-direction: column; gap: 8px; }
.rfw-yield-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px; }
.rfw-yield-item-header { margin-bottom: 10px; }
.rfw-yield-item-vault { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #111; }
.rfw-compound-dot { background: #6366f1; color: #fff; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rfw-yield-item-rows { display: flex; flex-direction: column; gap: 5px; }
.rfw-yield-stat { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #374151; }
.rfw-yield-stat-label { color: #9ca3af; }

/* Tx status */
.rfw-txstatus { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 16px; text-align: center; }
.rfw-txstatus-title { font-size: 15px; font-weight: 700; color: #111; margin: 0; }
.rfw-txstatus-sub { font-size: 12px; color: #9ca3af; margin: 0; }
.rfw-txstatus-check { width: 48px; height: 48px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }
`;
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('rarefi-widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'rarefi-widget-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * RareFiWidget
 *
 * Drop-in yield vault widget. The host app passes wallet info — no separate
 * wallet connection is needed inside the widget.
 *
 * Props:
 *   asset           {string}   Deposit asset name, e.g. 'ALPHA'
 *   userAddress     {string}   Connected wallet address from the host app
 *   signTransactions {Function} wallet.signTransactions from @txnlab/use-wallet-react
 *                               (txns: Transaction[]) => Promise<Uint8Array[]>
 *   apiUrl          {string}   RareFi backend URL (default: https://api.rarefi.app)
 *   assetImageUrl   {string?}  URL to the asset logo image (optional)
 *   theme           {'light'|'dark'} (default: 'light')
 *   renderTrigger   {Function?} Custom trigger renderer: ({ onClick }) => ReactNode
 *                               If omitted, a default button is rendered.
 */
function RareFiWidget({
  asset = 'ALPHA',
  userAddress,
  signTransactions,
  apiUrl = 'https://api.rarefi.app/api',
  assetImageUrl,
  theme = 'light',
  renderTrigger
}) {
  injectStyles();
  const [open, setOpen] = useState(false);
  const {
    pools,
    positions,
    transactions,
    loading,
    positionsLoading,
    refresh
  } = useWidgetData({
    asset,
    userAddress,
    apiUrl
  });
  const handleOpen = () => {
    if (!userAddress) {
      console.warn('[RareFiWidget] No userAddress provided — wallet not connected in host app.');
      return;
    }
    setOpen(true);
  };
  const trigger = renderTrigger ? renderTrigger({
    onClick: handleOpen
  }) : /*#__PURE__*/React.createElement("button", {
    className: "rfw-trigger-btn",
    "data-theme": theme,
    onClick: handleOpen,
    disabled: !userAddress,
    title: userAddress ? `${asset} Vaults` : 'Connect wallet to use vaults'
  }, /*#__PURE__*/React.createElement("span", {
    className: "rfw-trigger-icon"
  }, "\u2B21"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-trigger-label"
  }, asset, " Vaults"));
  return /*#__PURE__*/React.createElement(React.Fragment, null, trigger, /*#__PURE__*/React.createElement(WidgetModal, {
    open: open,
    onClose: () => setOpen(false),
    pools: pools,
    positions: positions,
    transactions: transactions,
    loading: loading,
    positionsLoading: positionsLoading,
    onRefresh: refresh,
    userAddress: userAddress,
    signTransactions: signTransactions,
    apiUrl: apiUrl,
    asset: asset,
    assetImageUrl: assetImageUrl,
    theme: theme
  }));
}

export { RareFiWidget };
//# sourceMappingURL=index.js.map
