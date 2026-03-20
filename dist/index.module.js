import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import algosdk from 'algosdk';

function formatTokenAmount(rawAmount, decimals) {
  if (decimals === void 0) {
    decimals = 6;
  }
  if (rawAmount === undefined || rawAmount === null || rawAmount === 0) return '0';
  var value = rawAmount / Math.pow(10, decimals);
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
  if (value >= 1) return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  // 2 significant figures for small values: 0.001234 → "0.0012"
  var sigDecimals = Math.max(2, Math.ceil(-Math.log10(value)) + 1);
  return value.toFixed(Math.min(sigDecimals, 8)).replace(/0+$/, '').replace(/\.$/, '');
}
function parseTokenAmount(value, decimals) {
  if (decimals === void 0) {
    decimals = 6;
  }
  if (!value) return 0;
  var str = String(value).trim();
  if (str.startsWith('-') || /[eE]/.test(str)) return 0;
  var parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0 || parsed > 1e15) return 0;
  return Math.floor(parsed * Math.pow(10, decimals));
}
function formatMaxAmount(balanceInBaseUnits, decimals) {
  if (decimals === void 0) {
    decimals = 6;
  }
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
 * Sign and submit transactions.
 * Passes encoded Uint8Arrays to signTransactions (compatible with all wallets including Lute).
 */
var signAndSubmit = function signAndSubmit(b64Txns, signTransactions, apiUrl) {
  try {
    // Pass encoded bytes — wallets like Lute expect Uint8Array, not Transaction objects
    var encodedTxns = b64Txns.map(function (b64) {
      return buffer.Buffer.from(b64, 'base64');
    });
    return Promise.resolve(signTransactions(encodedTxns)).then(function (signedTxns) {
      var signedTxnsBase64 = signedTxns.map(function (t) {
        return buffer.Buffer.from(t).toString('base64');
      });
      return Promise.resolve(axios.post(apiUrl + "/pools/submit", {
        signedTxns: signedTxnsBase64
      })).then(function (response) {
        return response.data.txId;
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
function decodeTxns(b64Txns) {
  return b64Txns.map(function (b64) {
    return algosdk.decodeUnsignedTransaction(buffer.Buffer.from(b64, 'base64'));
  });
}

var name$1 = "RareFiVault";
var structs$1 = {
};
var methods$1 = [
	{
		name: "createVault",
		args: [
			{
				type: "uint64",
				name: "depositAssetId"
			},
			{
				type: "uint64",
				name: "yieldAssetId"
			},
			{
				type: "uint64",
				name: "swapAssetId"
			},
			{
				type: "uint64",
				name: "creatorFeeRate"
			},
			{
				type: "uint64",
				name: "minSwapThreshold"
			},
			{
				type: "uint64",
				name: "maxSlippageBps"
			},
			{
				type: "uint64",
				name: "tinymanPoolAppId"
			},
			{
				type: "address",
				name: "tinymanPoolAddress"
			},
			{
				type: "address",
				name: "rarefiAddress"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
				"NoOp"
			],
			call: [
			]
		},
		readonly: false,
		desc: "Create and initialize the vault\r\nCalled once at deployment",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "optInAssets",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Opt the contract into all required assets\r\nMust be called by creator after deployment with:\r\n- 5.5 ALGO payment (stays in contract for MBR and operational fees)",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "optIn",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"OptIn"
			]
		},
		readonly: false,
		desc: "User opts into the contract to enable local storage",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "closeOut",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"CloseOut"
			]
		},
		readonly: false,
		desc: "User closes out - claims all pending yield and withdraws all deposits first",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "deposit",
		args: [
			{
				type: "uint64",
				name: "slippageBps",
				desc: "- Slippage tolerance for auto-swap (ignored if no swap needed)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "User deposits Alpha into the vault\r\nExpects an asset transfer in the group before this call\r\n\r\nIf USDC balance >= threshold and has existing depositors, automatically\r\nswaps yield BEFORE processing deposit. This ensures yield goes to\r\nexisting depositors, not the new one.",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "withdraw",
		args: [
			{
				type: "uint64",
				name: "amount",
				desc: "- Amount to withdraw (0 = withdraw all)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "User withdraws Alpha from the vault",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "claim",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "User claims their accumulated yield (in swap_asset)",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "claimCreator",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Creator claims their accumulated yield",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "swapYield",
		args: [
			{
				type: "uint64",
				name: "slippageBps",
				desc: "- Slippage tolerance in basis points (e.g., 50 = 0.5%, 100 = 1%)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Swaps accumulated USDC to project ASA via Tinyman V2\r\nUses ON-CHAIN price calculation - reads pool reserves and fee dynamically\r\nPermissionless - anyone can trigger, slippage capped by maxSlippageBps",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getVaultStats",
		args: [
		],
		returns: {
			type: "(uint64,uint64,uint64,uint64,uint64,uint64)"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get vault statistics",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getPendingYield",
		args: [
			{
				type: "address",
				name: "user"
			}
		],
		returns: {
			type: "uint64"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get user's pending yield (without claiming)",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getUserDeposit",
		args: [
			{
				type: "address",
				name: "user"
			}
		],
		returns: {
			type: "uint64"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get user's deposit balance",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getSwapQuote",
		args: [
		],
		returns: {
			type: "(uint64,uint64,uint64)",
			desc: "[usdcBalance, expectedOutput, minOutputAt50bps]"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Preview swap output - shows expected ASA for current USDC balance\r\nReads pool state on-chain to calculate expected output",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateMinSwapThreshold",
		args: [
			{
				type: "uint64",
				name: "newThreshold"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the minimum swap threshold",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateMaxSlippage",
		args: [
			{
				type: "uint64",
				name: "newMaxSlippageBps"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the maximum slippage tolerance for swaps\r\nOnly callable by creator",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateCreatorAddress",
		args: [
			{
				type: "address",
				name: "newCreatorAddress"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the creator address (key rotation)\r\nOnly callable by current creator",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateRarefiAddress",
		args: [
			{
				type: "address",
				name: "newRarefiAddress"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the RareFi platform address\r\nOnly callable by current RareFi address",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateCreatorFeeRate",
		args: [
			{
				type: "uint64",
				name: "newFeeRate"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the creator fee rate\r\nOnly callable by creator, constrained to 0-6% range",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "contributeFarm",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Anyone can contribute to the farm by sending swapAsset\r\nFarm bonus is distributed proportionally during yield swaps\r\nThis allows projects/sponsors to boost yield for depositors\r\n\r\nExpects an asset transfer of swapAsset before this call",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "setEmissionRatio",
		args: [
			{
				type: "uint64",
				name: "newRatio",
				desc: "- The emission ratio multiplier (e.g., 4000000 for aggressive distribution)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Set the emission ratio (multiplier for dynamic farm rate calculation)\r\nOnly callable by creator or RareFi\r\nDynamic rate = farmBalance * emissionRatio / totalDeposits",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getFarmStats",
		args: [
		],
		returns: {
			type: "(uint64,uint64,uint64)",
			desc: "[farmBalance, emissionRatio, currentDynamicRate]"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get farm statistics including dynamic emission rate",
		events: [
		],
		recommendations: {
		}
	}
];
var arcs$1 = [
	22,
	28
];
var networks$1 = {
};
var state$1 = {
	schema: {
		global: {
			ints: 14,
			bytes: 3
		},
		local: {
			ints: 3,
			bytes: 0
		}
	},
	keys: {
		global: {
			depositAsset: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "ZGVwb3NpdEFzc2V0"
			},
			yieldAsset: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "eWllbGRBc3NldA=="
			},
			swapAsset: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "c3dhcEFzc2V0"
			},
			creatorAddress: {
				keyType: "AVMString",
				valueType: "address",
				key: "Y3JlYXRvckFkZHJlc3M="
			},
			rarefiAddress: {
				keyType: "AVMString",
				valueType: "address",
				key: "cmFyZWZpQWRkcmVzcw=="
			},
			creatorFeeRate: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "Y3JlYXRvckZlZVJhdGU="
			},
			creatorUnclaimedYield: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "Y3JlYXRvclVuY2xhaW1lZFlpZWxk"
			},
			totalDeposits: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dG90YWxEZXBvc2l0cw=="
			},
			yieldPerToken: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "eWllbGRQZXJUb2tlbg=="
			},
			minSwapThreshold: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "bWluU3dhcFRocmVzaG9sZA=="
			},
			maxSlippageBps: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "bWF4U2xpcHBhZ2VCcHM="
			},
			totalYieldGenerated: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dG90YWxZaWVsZEdlbmVyYXRlZA=="
			},
			tinymanPoolAppId: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dGlueW1hblBvb2xBcHBJZA=="
			},
			tinymanPoolAddress: {
				keyType: "AVMString",
				valueType: "address",
				key: "dGlueW1hblBvb2xBZGRyZXNz"
			},
			farmBalance: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "ZmFybUJhbGFuY2U="
			},
			emissionRatio: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "ZW1pc3Npb25SYXRpbw=="
			},
			assetsOptedIn: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "YXNzZXRzT3B0ZWRJbg=="
			}
		},
		local: {
			depositedAmount: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "ZGVwb3NpdGVkQW1vdW50"
			},
			userYieldPerToken: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dXNlcllpZWxkUGVyVG9rZW4="
			},
			earnedYield: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "ZWFybmVkWWllbGQ="
			}
		},
		box: {
		}
	},
	maps: {
		global: {
		},
		local: {
		},
		box: {
		}
	}
};
var bareActions$1 = {
	create: [
	],
	call: [
		"DeleteApplication",
		"UpdateApplication"
	]
};
var sourceInfo$1 = {
	approval: {
		sourceInfo: [
			{
				pc: [
					1107,
					1911
				],
				errorMessage: "App call must follow asset transfer"
			},
			{
				pc: [
					806
				],
				errorMessage: "App call must follow payment"
			},
			{
				pc: [
					800
				],
				errorMessage: "Assets already opted in"
			},
			{
				pc: [
					1429
				],
				errorMessage: "Below minimum swap threshold"
			},
			{
				pc: [
					2236
				],
				errorMessage: "Cannot read pool asset_1_id"
			},
			{
				pc: [
					2263
				],
				errorMessage: "Cannot read pool asset_1_reserves"
			},
			{
				pc: [
					2290
				],
				errorMessage: "Cannot read pool asset_2_reserves"
			},
			{
				pc: [
					2315
				],
				errorMessage: "Cannot read pool total_fee_share"
			},
			{
				pc: [
					1825,
					1859
				],
				errorMessage: "Cannot set zero address"
			},
			{
				pc: [
					552
				],
				errorMessage: "Contract deletion disabled"
			},
			{
				pc: [
					556
				],
				errorMessage: "Contract updates disabled"
			},
			{
				pc: [
					1961
				],
				errorMessage: "Contribution must be positive"
			},
			{
				pc: [
					649
				],
				errorMessage: "Creator fee rate exceeds maximum (6%)"
			},
			{
				pc: [
					698
				],
				errorMessage: "Deposit and swap assets must be different"
			},
			{
				pc: [
					692
				],
				errorMessage: "Deposit and yield assets must be different"
			},
			{
				pc: [
					1162
				],
				errorMessage: "Deposit too small"
			},
			{
				pc: [
					2005
				],
				errorMessage: "Emission ratio must be positive"
			},
			{
				pc: [
					2387
				],
				errorMessage: "Expected output is zero"
			},
			{
				pc: [
					1893
				],
				errorMessage: "Fee rate exceeds maximum (6%)"
			},
			{
				pc: [
					831
				],
				errorMessage: "Insufficient ALGO (need 5.5 ALGO)"
			},
			{
				pc: [
					1232
				],
				errorMessage: "Insufficient balance"
			},
			{
				pc: [
					686
				],
				errorMessage: "Invalid Tinyman pool app ID"
			},
			{
				pc: [
					677
				],
				errorMessage: "Invalid deposit asset"
			},
			{
				pc: [
					683
				],
				errorMessage: "Invalid swap asset"
			},
			{
				pc: [
					680
				],
				errorMessage: "Invalid yield asset"
			},
			{
				pc: [
					674,
					1791
				],
				errorMessage: "Max slippage too high"
			},
			{
				pc: [
					668,
					1786
				],
				errorMessage: "Max slippage too low (min 5%)"
			},
			{
				pc: [
					1592,
					1696,
					2100,
					2176,
					2345,
					2362,
					2403,
					2537,
					2593,
					2633
				],
				errorMessage: "Multiplication overflow in mulDivFloor"
			},
			{
				pc: [
					1132,
					1936
				],
				errorMessage: "Must send to contract"
			},
			{
				pc: [
					1125
				],
				errorMessage: "Must transfer deposit asset"
			},
			{
				pc: [
					1929
				],
				errorMessage: "Must transfer swap asset"
			},
			{
				pc: [
					1434
				],
				errorMessage: "No depositors to distribute to"
			},
			{
				pc: [
					1305,
					1357
				],
				errorMessage: "Nothing to claim"
			},
			{
				pc: [
					1224
				],
				errorMessage: "Nothing to withdraw"
			},
			{
				pc: [
					522
				],
				errorMessage: "OnCompletion must be CloseOut && can only call when not creating"
			},
			{
				pc: [
					360
				],
				errorMessage: "OnCompletion must be NoOp"
			},
			{
				pc: [
					533
				],
				errorMessage: "OnCompletion must be OptIn && can only call when not creating"
			},
			{
				pc: [
					1854
				],
				errorMessage: "Only RareFi can update"
			},
			{
				pc: [
					1350
				],
				errorMessage: "Only creator can claim"
			},
			{
				pc: [
					793
				],
				errorMessage: "Only creator can opt-in assets"
			},
			{
				pc: [
					1820
				],
				errorMessage: "Only creator can update"
			},
			{
				pc: [
					1888
				],
				errorMessage: "Only creator can update fee rate"
			},
			{
				pc: [
					1780
				],
				errorMessage: "Only creator can update max slippage"
			},
			{
				pc: [
					2003
				],
				errorMessage: "Only creator or RareFi can set emission ratio"
			},
			{
				pc: [
					1741
				],
				errorMessage: "Only creator or RareFi can update"
			},
			{
				pc: [
					838
				],
				errorMessage: "Payment must be from caller"
			},
			{
				pc: [
					821
				],
				errorMessage: "Payment must be to app"
			},
			{
				pc: [
					1066,
					1410
				],
				errorMessage: "Slippage exceeds maximum allowed"
			},
			{
				pc: [
					2502
				],
				errorMessage: "Swap output below minimum"
			},
			{
				pc: [
					661
				],
				errorMessage: "Swap threshold too high (max 50 USDC)"
			},
			{
				pc: [
					655
				],
				errorMessage: "Swap threshold too low"
			},
			{
				pc: [
					1751
				],
				errorMessage: "Threshold too high (max 50 USDC)"
			},
			{
				pc: [
					1746
				],
				errorMessage: "Threshold too low"
			},
			{
				pc: [
					1139,
					1943
				],
				errorMessage: "Transfer must be from caller"
			},
			{
				pc: [
					704
				],
				errorMessage: "Yield and swap assets must be different"
			},
			{
				pc: [
					1081,
					1420,
					1453,
					1464,
					1641,
					2412,
					2495
				],
				errorMessage: "account opted into asset"
			},
			{
				pc: [
					1153,
					1957
				],
				errorMessage: "assetCloseTo must be zero"
			},
			{
				pc: [
					551,
					555
				],
				errorMessage: "can only call when not creating"
			},
			{
				pc: [
					791,
					798,
					857,
					878,
					899,
					982,
					999,
					1026,
					1064,
					1074,
					1086,
					1094,
					1123,
					1186,
					1250,
					1264,
					1319,
					1348,
					1355,
					1369,
					1406,
					1417,
					1425,
					1433,
					1447,
					1458,
					1468,
					1473,
					1478,
					1483,
					1558,
					1634,
					1730,
					1738,
					1778,
					1818,
					1852,
					1886,
					1927,
					1965,
					1992,
					2000,
					2017,
					2024,
					2036,
					2041,
					2068,
					2075,
					2085,
					2090,
					2142,
					2196,
					2214,
					2219,
					2320,
					2408,
					2418,
					2423,
					2444,
					2508,
					2515,
					2541,
					2553,
					2569,
					2581,
					2607,
					2619,
					2638,
					2648
				],
				errorMessage: "check GlobalState exists"
			},
			{
				pc: [
					965,
					975,
					1173,
					1217,
					1303,
					1536,
					1544,
					1571,
					1619,
					2128,
					2155,
					2183
				],
				errorMessage: "check LocalState exists"
			},
			{
				pc: [
					851
				],
				errorMessage: "closeRemainderTo must be zero"
			},
			{
				pc: [
					628,
					637,
					1525,
					1615,
					1806,
					1839
				],
				errorMessage: "invalid number of bytes for arc4.static_array<arc4.uint8, 32>"
			},
			{
				pc: [
					564,
					573,
					582,
					591,
					600,
					609,
					618,
					1051,
					1200,
					1394,
					1717,
					1765,
					1873,
					1979
				],
				errorMessage: "invalid number of bytes for arc4.uint64"
			},
			{
				pc: [
					643,
					785,
					845,
					925,
					950,
					1059,
					1146,
					1208,
					1291,
					1342,
					1401,
					1724,
					1772,
					1812,
					1845,
					1880,
					1905,
					1950,
					1986
				],
				errorMessage: "rekeyTo must be zero"
			},
			{
				pc: [
					1115,
					1919
				],
				errorMessage: "transaction type is axfer"
			},
			{
				pc: [
					814
				],
				errorMessage: "transaction type is pay"
			}
		],
		pcOffsetMethod: "none"
	},
	clear: {
		sourceInfo: [
		],
		pcOffsetMethod: "none"
	}
};
var source$1 = {
	approval: "I3ByYWdtYSB2ZXJzaW9uIDExCiNwcmFnbWEgdHlwZXRyYWNrIGZhbHNlCgovLyBAYWxnb3JhbmRmb3VuZGF0aW9uL2FsZ29yYW5kLXR5cGVzY3JpcHQvYXJjNC9pbmRleC5kLnRzOjpDb250cmFjdC5hcHByb3ZhbFByb2dyYW0oKSAtPiB1aW50NjQ6Cm1haW46CiAgICBpbnRjYmxvY2sgMCAxIDggNCAxMDAwMCAxMDAwMDAwMDAwMDAwIDIwMDAwMCA1MDAwMDAwMAogICAgYnl0ZWNibG9jayAidG90YWxEZXBvc2l0cyIgImZhcm1CYWxhbmNlIiAiY3JlYXRvckFkZHJlc3MiICJkZXBvc2l0ZWRBbW91bnQiICJ5aWVsZEFzc2V0IiAic3dhcEFzc2V0IiAieWllbGRQZXJUb2tlbiIgImVhcm5lZFlpZWxkIiAiY3JlYXRvclVuY2xhaW1lZFlpZWxkIiAiZW1pc3Npb25SYXRpbyIgImRlcG9zaXRBc3NldCIgInJhcmVmaUFkZHJlc3MiIDB4MTUxZjdjNzUgIm1pblN3YXBUaHJlc2hvbGQiICJtYXhTbGlwcGFnZUJwcyIgInRvdGFsWWllbGRHZW5lcmF0ZWQiICJ1c2VyWWllbGRQZXJUb2tlbiIgImNyZWF0b3JGZWVSYXRlIiAidGlueW1hblBvb2xBcHBJZCIgInRpbnltYW5Qb29sQWRkcmVzcyIgImFzc2V0c09wdGVkSW4iCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM2CiAgICAvLyBleHBvcnQgY2xhc3MgUmFyZUZpVmF1bHQgZXh0ZW5kcyBhcmM0LkNvbnRyYWN0IHsKICAgIHR4biBOdW1BcHBBcmdzCiAgICBieiBtYWluX2JhcmVfcm91dGluZ0AzMAogICAgcHVzaGJ5dGVzcyAweDI5MzE0ZDk1IDB4NmE2OTFmZTIgLy8gbWV0aG9kICJvcHRJbigpdm9pZCIsIG1ldGhvZCAiY2xvc2VPdXQoKXZvaWQiCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAwCiAgICBtYXRjaCBtYWluX29wdEluX3JvdXRlQDMgbWFpbl9jbG9zZU91dF9yb3V0ZUA0CgptYWluX3N3aXRjaF9jYXNlX25leHRANToKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzYKICAgIC8vIGV4cG9ydCBjbGFzcyBSYXJlRmlWYXVsdCBleHRlbmRzIGFyYzQuQ29udHJhY3QgewogICAgdHhuIE9uQ29tcGxldGlvbgogICAgIQogICAgYXNzZXJ0IC8vIE9uQ29tcGxldGlvbiBtdXN0IGJlIE5vT3AKICAgIHR4biBBcHBsaWNhdGlvbklECiAgICBieiBtYWluX2NyZWF0ZV9Ob09wQDI2CiAgICBwdXNoYnl0ZXNzIDB4NDE0ZTQxYjUgMHg2ZTJlYmM5YiAweDIxZjFkZGZmIDB4ZjE1Nzc3MjYgMHhiYzk5NDQ5ZSAweDM2ZjNiMmY0IDB4MDAzNTk3YTIgMHhiMGRmNWMwZiAweDNmYjhhOTI3IDB4ZjQxZGEzNWQgMHhhYjZlZjczYiAweGFhZTJjYWQyIDB4MWY2NWQ2NGUgMHgxNGZhOTQ3MyAweGJjNWUzOGM2IDB4YWZlYmZjYWMgMHhkMDU0YzE5ZiAweDE3MGU3MjkyIC8vIG1ldGhvZCAib3B0SW5Bc3NldHMoKXZvaWQiLCBtZXRob2QgImRlcG9zaXQodWludDY0KXZvaWQiLCBtZXRob2QgIndpdGhkcmF3KHVpbnQ2NCl2b2lkIiwgbWV0aG9kICJjbGFpbSgpdm9pZCIsIG1ldGhvZCAiY2xhaW1DcmVhdG9yKCl2b2lkIiwgbWV0aG9kICJzd2FwWWllbGQodWludDY0KXZvaWQiLCBtZXRob2QgImdldFZhdWx0U3RhdHMoKSh1aW50NjQsdWludDY0LHVpbnQ2NCx1aW50NjQsdWludDY0LHVpbnQ2NCkiLCBtZXRob2QgImdldFBlbmRpbmdZaWVsZChhZGRyZXNzKXVpbnQ2NCIsIG1ldGhvZCAiZ2V0VXNlckRlcG9zaXQoYWRkcmVzcyl1aW50NjQiLCBtZXRob2QgImdldFN3YXBRdW90ZSgpKHVpbnQ2NCx1aW50NjQsdWludDY0KSIsIG1ldGhvZCAidXBkYXRlTWluU3dhcFRocmVzaG9sZCh1aW50NjQpdm9pZCIsIG1ldGhvZCAidXBkYXRlTWF4U2xpcHBhZ2UodWludDY0KXZvaWQiLCBtZXRob2QgInVwZGF0ZUNyZWF0b3JBZGRyZXNzKGFkZHJlc3Mpdm9pZCIsIG1ldGhvZCAidXBkYXRlUmFyZWZpQWRkcmVzcyhhZGRyZXNzKXZvaWQiLCBtZXRob2QgInVwZGF0ZUNyZWF0b3JGZWVSYXRlKHVpbnQ2NCl2b2lkIiwgbWV0aG9kICJjb250cmlidXRlRmFybSgpdm9pZCIsIG1ldGhvZCAic2V0RW1pc3Npb25SYXRpbyh1aW50NjQpdm9pZCIsIG1ldGhvZCAiZ2V0RmFybVN0YXRzKCkodWludDY0LHVpbnQ2NCx1aW50NjQpIgogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMAogICAgbWF0Y2ggb3B0SW5Bc3NldHMgZGVwb3NpdCB3aXRoZHJhdyBjbGFpbSBjbGFpbUNyZWF0b3Igc3dhcFlpZWxkIGdldFZhdWx0U3RhdHMgZ2V0UGVuZGluZ1lpZWxkIGdldFVzZXJEZXBvc2l0IGdldFN3YXBRdW90ZSB1cGRhdGVNaW5Td2FwVGhyZXNob2xkIHVwZGF0ZU1heFNsaXBwYWdlIHVwZGF0ZUNyZWF0b3JBZGRyZXNzIHVwZGF0ZVJhcmVmaUFkZHJlc3MgdXBkYXRlQ3JlYXRvckZlZVJhdGUgY29udHJpYnV0ZUZhcm0gc2V0RW1pc3Npb25SYXRpbyBnZXRGYXJtU3RhdHMKICAgIGVycgoKbWFpbl9jcmVhdGVfTm9PcEAyNjoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzYKICAgIC8vIGV4cG9ydCBjbGFzcyBSYXJlRmlWYXVsdCBleHRlbmRzIGFyYzQuQ29udHJhY3QgewogICAgcHVzaGJ5dGVzIDB4ZWE3MDczMTkgLy8gbWV0aG9kICJjcmVhdGVWYXVsdCh1aW50NjQsdWludDY0LHVpbnQ2NCx1aW50NjQsdWludDY0LHVpbnQ2NCx1aW50NjQsYWRkcmVzcyxhZGRyZXNzKXZvaWQiCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAwCiAgICBtYXRjaCBjcmVhdGVWYXVsdAogICAgZXJyCgptYWluX2Nsb3NlT3V0X3JvdXRlQDQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM4OQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnQ2xvc2VPdXQnIH0pCiAgICB0eG4gT25Db21wbGV0aW9uCiAgICBwdXNoaW50IDIgLy8gQ2xvc2VPdXQKICAgID09CiAgICB0eG4gQXBwbGljYXRpb25JRAogICAgJiYKICAgIGFzc2VydCAvLyBPbkNvbXBsZXRpb24gbXVzdCBiZSBDbG9zZU91dCAmJiBjYW4gb25seSBjYWxsIHdoZW4gbm90IGNyZWF0aW5nCiAgICBiIGNsb3NlT3V0CgptYWluX29wdEluX3JvdXRlQDM6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM3NwogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnT3B0SW4nIH0pCiAgICB0eG4gT25Db21wbGV0aW9uCiAgICBpbnRjXzEgLy8gT3B0SW4KICAgID09CiAgICB0eG4gQXBwbGljYXRpb25JRAogICAgJiYKICAgIGFzc2VydCAvLyBPbkNvbXBsZXRpb24gbXVzdCBiZSBPcHRJbiAmJiBjYW4gb25seSBjYWxsIHdoZW4gbm90IGNyZWF0aW5nCiAgICBiIG9wdEluCgptYWluX2JhcmVfcm91dGluZ0AzMDoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzYKICAgIC8vIGV4cG9ydCBjbGFzcyBSYXJlRmlWYXVsdCBleHRlbmRzIGFyYzQuQ29udHJhY3QgewogICAgaW50Y18zIC8vIFVwZGF0ZUFwcGxpY2F0aW9uCiAgICBwdXNoaW50IDUgLy8gRGVsZXRlQXBwbGljYXRpb24KICAgIHR4biBPbkNvbXBsZXRpb24KICAgIG1hdGNoIG1haW5fdXBkYXRlQXBwbGljYXRpb25AMzEgbWFpbl9kZWxldGVBcHBsaWNhdGlvbkAzMgogICAgZXJyCgptYWluX2RlbGV0ZUFwcGxpY2F0aW9uQDMyOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3OTgKICAgIC8vIEBiYXJlbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnRGVsZXRlQXBwbGljYXRpb24nIH0pCiAgICB0eG4gQXBwbGljYXRpb25JRAogICAgYXNzZXJ0IC8vIGNhbiBvbmx5IGNhbGwgd2hlbiBub3QgY3JlYXRpbmcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODAwCiAgICAvLyBhc3NlcnQoZmFsc2UsICdDb250cmFjdCBkZWxldGlvbiBkaXNhYmxlZCcpOwogICAgZXJyIC8vIENvbnRyYWN0IGRlbGV0aW9uIGRpc2FibGVkCgptYWluX3VwZGF0ZUFwcGxpY2F0aW9uQDMxOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3OTMKICAgIC8vIEBiYXJlbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnVXBkYXRlQXBwbGljYXRpb24nIH0pCiAgICB0eG4gQXBwbGljYXRpb25JRAogICAgYXNzZXJ0IC8vIGNhbiBvbmx5IGNhbGwgd2hlbiBub3QgY3JlYXRpbmcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Nzk1CiAgICAvLyBhc3NlcnQoZmFsc2UsICdDb250cmFjdCB1cGRhdGVzIGRpc2FibGVkJyk7CiAgICBlcnIgLy8gQ29udHJhY3QgdXBkYXRlcyBkaXNhYmxlZAoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LmNyZWF0ZVZhdWx0W3JvdXRpbmddKCkgLT4gdm9pZDoKY3JlYXRlVmF1bHQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI1NQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgb25DcmVhdGU6ICdyZXF1aXJlJyB9KQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMgogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMwogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgNAogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgNQogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgNgogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgNwogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgOAogICAgZHVwCiAgICBsZW4KICAgIHB1c2hpbnQgMzIgLy8gMzIKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQuc3RhdGljX2FycmF5PGFyYzQudWludDgsIDMyPgogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgOQogICAgZHVwCiAgICBsZW4KICAgIHB1c2hpbnQgMzIgLy8gMzIKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQuc3RhdGljX2FycmF5PGFyYzQudWludDgsIDMyPgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyNjgKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjcxCiAgICAvLyBhc3NlcnQoY3JlYXRvckZlZVJhdGUgPD0gTUFYX0ZFRV9SQVRFLCAnQ3JlYXRvciBmZWUgcmF0ZSBleGNlZWRzIG1heGltdW0gKDYlKScpOwogICAgZGlnIDUKICAgIHB1c2hpbnQgNiAvLyA2CiAgICA8PQogICAgYXNzZXJ0IC8vIENyZWF0b3IgZmVlIHJhdGUgZXhjZWVkcyBtYXhpbXVtICg2JSkKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjcyCiAgICAvLyBhc3NlcnQobWluU3dhcFRocmVzaG9sZCA+PSBNSU5fU1dBUF9BTU9VTlQsICdTd2FwIHRocmVzaG9sZCB0b28gbG93Jyk7CiAgICBkaWcgNAogICAgaW50YyA2IC8vIDIwMDAwMAogICAgPj0KICAgIGFzc2VydCAvLyBTd2FwIHRocmVzaG9sZCB0b28gbG93CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI3MwogICAgLy8gYXNzZXJ0KG1pblN3YXBUaHJlc2hvbGQgPD0gTUFYX1NXQVBfVEhSRVNIT0xELCAnU3dhcCB0aHJlc2hvbGQgdG9vIGhpZ2ggKG1heCA1MCBVU0RDKScpOwogICAgZGlnIDQKICAgIGludGMgNyAvLyA1MDAwMDAwMAogICAgPD0KICAgIGFzc2VydCAvLyBTd2FwIHRocmVzaG9sZCB0b28gaGlnaCAobWF4IDUwIFVTREMpCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI3NAogICAgLy8gYXNzZXJ0KG1heFNsaXBwYWdlQnBzID49IE1JTl9NQVhfU0xJUFBBR0VfQlBTLCAnTWF4IHNsaXBwYWdlIHRvbyBsb3cgKG1pbiA1JSknKTsKICAgIGRpZyAzCiAgICBwdXNoaW50IDUwMCAvLyA1MDAKICAgID49CiAgICBhc3NlcnQgLy8gTWF4IHNsaXBwYWdlIHRvbyBsb3cgKG1pbiA1JSkKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjc1CiAgICAvLyBhc3NlcnQobWF4U2xpcHBhZ2VCcHMgPD0gTUFYX1NMSVBQQUdFX0JQUywgJ01heCBzbGlwcGFnZSB0b28gaGlnaCcpOwogICAgZGlnIDMKICAgIGludGMgNCAvLyAxMDAwMAogICAgPD0KICAgIGFzc2VydCAvLyBNYXggc2xpcHBhZ2UgdG9vIGhpZ2gKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjc2CiAgICAvLyBhc3NlcnQoZGVwb3NpdEFzc2V0SWQgIT09IFVpbnQ2NCgwKSwgJ0ludmFsaWQgZGVwb3NpdCBhc3NldCcpOwogICAgZGlnIDgKICAgIGFzc2VydCAvLyBJbnZhbGlkIGRlcG9zaXQgYXNzZXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjc3CiAgICAvLyBhc3NlcnQoeWllbGRBc3NldElkICE9PSBVaW50NjQoMCksICdJbnZhbGlkIHlpZWxkIGFzc2V0Jyk7CiAgICBkaWcgNwogICAgYXNzZXJ0IC8vIEludmFsaWQgeWllbGQgYXNzZXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjc4CiAgICAvLyBhc3NlcnQoc3dhcEFzc2V0SWQgIT09IFVpbnQ2NCgwKSwgJ0ludmFsaWQgc3dhcCBhc3NldCcpOwogICAgZGlnIDYKICAgIGFzc2VydCAvLyBJbnZhbGlkIHN3YXAgYXNzZXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjc5CiAgICAvLyBhc3NlcnQodGlueW1hblBvb2xBcHBJZCAhPT0gVWludDY0KDApLCAnSW52YWxpZCBUaW55bWFuIHBvb2wgYXBwIElEJyk7CiAgICBkaWcgMgogICAgYXNzZXJ0IC8vIEludmFsaWQgVGlueW1hbiBwb29sIGFwcCBJRAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyODIKICAgIC8vIGFzc2VydChkZXBvc2l0QXNzZXRJZCAhPT0geWllbGRBc3NldElkLCAnRGVwb3NpdCBhbmQgeWllbGQgYXNzZXRzIG11c3QgYmUgZGlmZmVyZW50Jyk7CiAgICBkaWcgOAogICAgZGlnIDgKICAgICE9CiAgICBhc3NlcnQgLy8gRGVwb3NpdCBhbmQgeWllbGQgYXNzZXRzIG11c3QgYmUgZGlmZmVyZW50CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI4MwogICAgLy8gYXNzZXJ0KGRlcG9zaXRBc3NldElkICE9PSBzd2FwQXNzZXRJZCwgJ0RlcG9zaXQgYW5kIHN3YXAgYXNzZXRzIG11c3QgYmUgZGlmZmVyZW50Jyk7CiAgICBkaWcgOAogICAgZGlnIDcKICAgICE9CiAgICBhc3NlcnQgLy8gRGVwb3NpdCBhbmQgc3dhcCBhc3NldHMgbXVzdCBiZSBkaWZmZXJlbnQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjg0CiAgICAvLyBhc3NlcnQoeWllbGRBc3NldElkICE9PSBzd2FwQXNzZXRJZCwgJ1lpZWxkIGFuZCBzd2FwIGFzc2V0cyBtdXN0IGJlIGRpZmZlcmVudCcpOwogICAgZGlnIDcKICAgIGRpZyA3CiAgICAhPQogICAgYXNzZXJ0IC8vIFlpZWxkIGFuZCBzd2FwIGFzc2V0cyBtdXN0IGJlIGRpZmZlcmVudAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MgogICAgLy8gZGVwb3NpdEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgIC8vIEFscGhhIEFTQSBJRCAod2hhdCB1c2VycyBkZXBvc2l0KQogICAgYnl0ZWMgMTAgLy8gImRlcG9zaXRBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjg3CiAgICAvLyB0aGlzLmRlcG9zaXRBc3NldC52YWx1ZSA9IGRlcG9zaXRBc3NldElkOwogICAgdW5jb3ZlciA5CiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MwogICAgLy8geWllbGRBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFVTREMgQVNBIElEICh3aGF0IGFpcmRyb3BzIGNvbWUgaW4gYXMpCiAgICBieXRlYyA0IC8vICJ5aWVsZEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyODgKICAgIC8vIHRoaXMueWllbGRBc3NldC52YWx1ZSA9IHlpZWxkQXNzZXRJZDsKICAgIHVuY292ZXIgOAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDQKICAgIC8vIHN3YXBBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBQcm9qZWN0J3MgQVNBIElEICh3aGF0IHlpZWxkIGlzIHN3YXBwZWQgdG8pCiAgICBieXRlYyA1IC8vICJzd2FwQXNzZXQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI4OQogICAgLy8gdGhpcy5zd2FwQXNzZXQudmFsdWUgPSBzd2FwQXNzZXRJZDsKICAgIHVuY292ZXIgNwogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDcKICAgIC8vIGNyZWF0b3JBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAvLyBWYXVsdCBjcmVhdG9yIHdobyByZWNlaXZlcyBmZWUKICAgIGJ5dGVjXzIgLy8gImNyZWF0b3JBZGRyZXNzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyOTIKICAgIC8vIHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUgPSBUeG4uc2VuZGVyOwogICAgdHhuIFNlbmRlcgogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDgKICAgIC8vIHJhcmVmaUFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgICAvLyBSYXJlRmkgcGxhdGZvcm0gYWRkcmVzcyAoY2FuIGFsc28gdHJpZ2dlciBzd2FwcykKICAgIGJ5dGVjIDExIC8vICJyYXJlZmlBZGRyZXNzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyOTMKICAgIC8vIHRoaXMucmFyZWZpQWRkcmVzcy52YWx1ZSA9IHJhcmVmaUFkZHJlc3M7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0OQogICAgLy8gY3JlYXRvckZlZVJhdGUgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgIC8vIDAtMTAwLCBwZXJjZW50YWdlIG9mIHlpZWxkIHRvIGNyZWF0b3IKICAgIGJ5dGVjIDE3IC8vICJjcmVhdG9yRmVlUmF0ZSIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjk0CiAgICAvLyB0aGlzLmNyZWF0b3JGZWVSYXRlLnZhbHVlID0gY3JlYXRvckZlZVJhdGU7CiAgICB1bmNvdmVyIDUKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUwCiAgICAvLyBjcmVhdG9yVW5jbGFpbWVkWWllbGQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7IC8vIEFjY3VtdWxhdGVkIHlpZWxkIGZvciBjcmVhdG9yIHRvIGNsYWltCiAgICBieXRlYyA4IC8vICJjcmVhdG9yVW5jbGFpbWVkWWllbGQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI5NQogICAgLy8gdGhpcy5jcmVhdG9yVW5jbGFpbWVkWWllbGQudmFsdWUgPSBVaW50NjQoMCk7CiAgICBpbnRjXzAgLy8gMAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsRGVwb3NpdHMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBUb3RhbCBBbHBoYSBkZXBvc2l0ZWQgaW4gdmF1bHQKICAgIGJ5dGVjXzAgLy8gInRvdGFsRGVwb3NpdHMiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI5OAogICAgLy8gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID0gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU0CiAgICAvLyB5aWVsZFBlclRva2VuID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgLy8gQWNjdW11bGF0b3IgZm9yIHlpZWxkIGRpc3RyaWJ1dGlvbiAoc2NhbGVkIGJ5IFNDQUxFKQogICAgYnl0ZWMgNiAvLyAieWllbGRQZXJUb2tlbiIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mjk5CiAgICAvLyB0aGlzLnlpZWxkUGVyVG9rZW4udmFsdWUgPSBVaW50NjQoMCk7CiAgICBpbnRjXzAgLy8gMAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTUKICAgIC8vIG1pblN3YXBUaHJlc2hvbGQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAvLyBNaW5pbXVtIFVTREMgYmVmb3JlIHN3YXAgYWxsb3dlZAogICAgYnl0ZWMgMTMgLy8gIm1pblN3YXBUaHJlc2hvbGQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMwMAogICAgLy8gdGhpcy5taW5Td2FwVGhyZXNob2xkLnZhbHVlID0gbWluU3dhcFRocmVzaG9sZDsKICAgIHVuY292ZXIgNAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTYKICAgIC8vIG1heFNsaXBwYWdlQnBzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAvLyBNYXhpbXVtIHNsaXBwYWdlIHRvbGVyYW5jZSBpbiBiYXNpcyBwb2ludHMKICAgIGJ5dGVjIDE0IC8vICJtYXhTbGlwcGFnZUJwcyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzAxCiAgICAvLyB0aGlzLm1heFNsaXBwYWdlQnBzLnZhbHVlID0gbWF4U2xpcHBhZ2VCcHM7CiAgICB1bmNvdmVyIDMKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU3CiAgICAvLyB0b3RhbFlpZWxkR2VuZXJhdGVkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBUb3RhbCB5aWVsZCBnZW5lcmF0ZWQgZnJvbSBzd2FwcyAoc3dhcCBvdXRwdXQgaW4gc3dhcEFzc2V0KQogICAgYnl0ZWMgMTUgLy8gInRvdGFsWWllbGRHZW5lcmF0ZWQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMwMgogICAgLy8gdGhpcy50b3RhbFlpZWxkR2VuZXJhdGVkLnZhbHVlID0gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYwCiAgICAvLyB0aW55bWFuUG9vbEFwcElkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgLy8gVGlueW1hbiBWMiBwb29sIGFwcCBJRCAoVVNEQy9zd2FwQXNzZXQpCiAgICBieXRlYyAxOCAvLyAidGlueW1hblBvb2xBcHBJZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzA1CiAgICAvLyB0aGlzLnRpbnltYW5Qb29sQXBwSWQudmFsdWUgPSB0aW55bWFuUG9vbEFwcElkOwogICAgdW5jb3ZlciAyCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MQogICAgLy8gdGlueW1hblBvb2xBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgLy8gVGlueW1hbiBwb29sIGFkZHJlc3MKICAgIGJ5dGVjIDE5IC8vICJ0aW55bWFuUG9vbEFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMwNgogICAgLy8gdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWUgPSB0aW55bWFuUG9vbEFkZHJlc3M7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgc3dhcEFzc2V0IGF2YWlsYWJsZSBmb3IgZmFybSBib251cwogICAgYnl0ZWNfMSAvLyAiZmFybUJhbGFuY2UiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMwOQogICAgLy8gdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NQogICAgLy8gZW1pc3Npb25SYXRpbyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gTXVsdGlwbGllciBmb3IgZHluYW1pYyByYXRlOiByYXRlID0gZmFybUJhbGFuY2UgKiBlbWlzc2lvblJhdGlvIC8gdG90YWxEZXBvc2l0cwogICAgYnl0ZWMgOSAvLyAiZW1pc3Npb25SYXRpbyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzEwCiAgICAvLyB0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUgPSBVaW50NjQoMCk7IC8vIERpc2FibGVkIGJ5IGRlZmF1bHQsIGNyZWF0b3Igc2V0cyB2aWEgc2V0RW1pc3Npb25SYXRpbwogICAgaW50Y18wIC8vIDAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY4CiAgICAvLyBhc3NldHNPcHRlZEluID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgIC8vIDEgaWYgYXNzZXRzIGFyZSBvcHRlZCBpbiwgMCBvdGhlcndpc2UKICAgIGJ5dGVjIDIwIC8vICJhc3NldHNPcHRlZEluIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozMTMKICAgIC8vIHRoaXMuYXNzZXRzT3B0ZWRJbi52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyNTUKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IG9uQ3JlYXRlOiAncmVxdWlyZScgfSkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjpSYXJlRmlWYXVsdC5vcHRJbkFzc2V0c1tyb3V0aW5nXSgpIC0+IHZvaWQ6Cm9wdEluQXNzZXRzOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozMjMKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzI0CiAgICAvLyBhc3NlcnQoVHhuLnNlbmRlciA9PT0gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZSwgJ09ubHkgY3JlYXRvciBjYW4gb3B0LWluIGFzc2V0cycpOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDcKICAgIC8vIGNyZWF0b3JBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAvLyBWYXVsdCBjcmVhdG9yIHdobyByZWNlaXZlcyBmZWUKICAgIGJ5dGVjXzIgLy8gImNyZWF0b3JBZGRyZXNzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozMjQKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiBvcHQtaW4gYXNzZXRzJyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIGFzc2VydCAvLyBPbmx5IGNyZWF0b3IgY2FuIG9wdC1pbiBhc3NldHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzI1CiAgICAvLyBhc3NlcnQodGhpcy5hc3NldHNPcHRlZEluLnZhbHVlID09PSBVaW50NjQoMCksICdBc3NldHMgYWxyZWFkeSBvcHRlZCBpbicpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjgKICAgIC8vIGFzc2V0c09wdGVkSW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgLy8gMSBpZiBhc3NldHMgYXJlIG9wdGVkIGluLCAwIG90aGVyd2lzZQogICAgYnl0ZWMgMjAgLy8gImFzc2V0c09wdGVkSW4iCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMyNQogICAgLy8gYXNzZXJ0KHRoaXMuYXNzZXRzT3B0ZWRJbi52YWx1ZSA9PT0gVWludDY0KDApLCAnQXNzZXRzIGFscmVhZHkgb3B0ZWQgaW4nKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAhCiAgICBhc3NlcnQgLy8gQXNzZXRzIGFscmVhZHkgb3B0ZWQgaW4KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzI3CiAgICAvLyBjb25zdCBhcHBBZGRyOiBBY2NvdW50ID0gR2xvYmFsLmN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3M7CiAgICBnbG9iYWwgQ3VycmVudEFwcGxpY2F0aW9uQWRkcmVzcwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozMzEKICAgIC8vIGNvbnN0IGN1cnJlbnRJbmRleCA9IFR4bi5ncm91cEluZGV4OwogICAgdHhuIEdyb3VwSW5kZXgKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzMyCiAgICAvLyBhc3NlcnQoY3VycmVudEluZGV4ID49IFVpbnQ2NCgxKSwgJ0FwcCBjYWxsIG11c3QgZm9sbG93IHBheW1lbnQnKTsKICAgIGR1cAogICAgYXNzZXJ0IC8vIEFwcCBjYWxsIG11c3QgZm9sbG93IHBheW1lbnQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzM0CiAgICAvLyBjb25zdCBhbGdvUGF5bWVudCA9IGd0eG4uUGF5bWVudFR4bihjdXJyZW50SW5kZXggLSBVaW50NjQoMSkpOwogICAgaW50Y18xIC8vIDEKICAgIC0KICAgIGR1cAogICAgZ3R4bnMgVHlwZUVudW0KICAgIGludGNfMSAvLyBwYXkKICAgID09CiAgICBhc3NlcnQgLy8gdHJhbnNhY3Rpb24gdHlwZSBpcyBwYXkKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzM1CiAgICAvLyBhc3NlcnQoYWxnb1BheW1lbnQucmVjZWl2ZXIgPT09IGFwcEFkZHIsICdQYXltZW50IG11c3QgYmUgdG8gYXBwJyk7CiAgICBkdXAKICAgIGd0eG5zIFJlY2VpdmVyCiAgICBkaWcgMgogICAgPT0KICAgIGFzc2VydCAvLyBQYXltZW50IG11c3QgYmUgdG8gYXBwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMzNgogICAgLy8gYXNzZXJ0KGFsZ29QYXltZW50LmFtb3VudCA+PSB0b3RhbFJlcXVpcmVkLCAnSW5zdWZmaWNpZW50IEFMR08gKG5lZWQgNS41IEFMR08pJyk7CiAgICBkdXAKICAgIGd0eG5zIEFtb3VudAogICAgcHVzaGludCA1NTAwMDAwIC8vIDU1MDAwMDAKICAgID49CiAgICBhc3NlcnQgLy8gSW5zdWZmaWNpZW50IEFMR08gKG5lZWQgNS41IEFMR08pCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMzNwogICAgLy8gYXNzZXJ0KGFsZ29QYXltZW50LnNlbmRlciA9PT0gVHhuLnNlbmRlciwgJ1BheW1lbnQgbXVzdCBiZSBmcm9tIGNhbGxlcicpOwogICAgZHVwCiAgICBndHhucyBTZW5kZXIKICAgIHR4biBTZW5kZXIKICAgID09CiAgICBhc3NlcnQgLy8gUGF5bWVudCBtdXN0IGJlIGZyb20gY2FsbGVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM0MAogICAgLy8gYXNzZXJ0KGFsZ29QYXltZW50LnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICBkdXAKICAgIGd0eG5zIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNDEKICAgIC8vIGFzc2VydChhbGdvUGF5bWVudC5jbG9zZVJlbWFpbmRlclRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdjbG9zZVJlbWFpbmRlclRvIG11c3QgYmUgemVybycpOwogICAgZ3R4bnMgQ2xvc2VSZW1haW5kZXJUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIGNsb3NlUmVtYWluZGVyVG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM0NC0zNDkKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IGFwcEFkZHIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5kZXBvc2l0QXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogVWludDY0KDApLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9iZWdpbgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNDYKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy5kZXBvc2l0QXNzZXQudmFsdWUpLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDIKICAgIC8vIGRlcG9zaXRBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAvLyBBbHBoYSBBU0EgSUQgKHdoYXQgdXNlcnMgZGVwb3NpdCkKICAgIGJ5dGVjIDEwIC8vICJkZXBvc2l0QXNzZXQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM0NgogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLmRlcG9zaXRBc3NldC52YWx1ZSksCiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNDcKICAgIC8vIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICBpbnRjXzAgLy8gMAogICAgaXR4bl9maWVsZCBBc3NldEFtb3VudAogICAgaXR4bl9maWVsZCBYZmVyQXNzZXQKICAgIGR1cAogICAgaXR4bl9maWVsZCBBc3NldFJlY2VpdmVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM0NC0zNDkKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IGFwcEFkZHIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5kZXBvc2l0QXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogVWludDY0KDApLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaW50Y18zIC8vIDQKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzQ4CiAgICAvLyBmZWU6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEZlZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNDQtMzQ5CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBhcHBBZGRyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuZGVwb3NpdEFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IFVpbnQ2NCgwKSwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fc3VibWl0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM1Mi0zNTcKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IGFwcEFkZHIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy55aWVsZEFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IFVpbnQ2NCgwKSwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fYmVnaW4KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzU0CiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMueWllbGRBc3NldC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MwogICAgLy8geWllbGRBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFVTREMgQVNBIElEICh3aGF0IGFpcmRyb3BzIGNvbWUgaW4gYXMpCiAgICBieXRlYyA0IC8vICJ5aWVsZEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNTQKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy55aWVsZEFzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM1NQogICAgLy8gYXNzZXRBbW91bnQ6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEFzc2V0QW1vdW50CiAgICBpdHhuX2ZpZWxkIFhmZXJBc3NldAogICAgZHVwCiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzUyLTM1NwogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogYXBwQWRkciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnlpZWxkQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogVWludDY0KDApLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaW50Y18zIC8vIDQKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzU2CiAgICAvLyBmZWU6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEZlZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNTItMzU3CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBhcHBBZGRyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMueWllbGRBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpdHhuX3N1Ym1pdAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNjAtMzY1CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBhcHBBZGRyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuc3dhcEFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IFVpbnQ2NCgwKSwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fYmVnaW4KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzYyCiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuc3dhcEFzc2V0LnZhbHVlKSwKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ0CiAgICAvLyBzd2FwQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gUHJvamVjdCdzIEFTQSBJRCAod2hhdCB5aWVsZCBpcyBzd2FwcGVkIHRvKQogICAgYnl0ZWMgNSAvLyAic3dhcEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNjIKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzYzCiAgICAvLyBhc3NldEFtb3VudDogVWludDY0KDApLAogICAgaW50Y18wIC8vIDAKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzYwLTM2NQogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogYXBwQWRkciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpbnRjXzMgLy8gNAogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNjQKICAgIC8vIGZlZTogVWludDY0KDApLAogICAgaW50Y18wIC8vIDAKICAgIGl0eG5fZmllbGQgRmVlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM2MC0zNjUKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IGFwcEFkZHIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogVWludDY0KDApLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9zdWJtaXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjgKICAgIC8vIGFzc2V0c09wdGVkSW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgLy8gMSBpZiBhc3NldHMgYXJlIG9wdGVkIGluLCAwIG90aGVyd2lzZQogICAgYnl0ZWMgMjAgLy8gImFzc2V0c09wdGVkSW4iCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM2NwogICAgLy8gdGhpcy5hc3NldHNPcHRlZEluLnZhbHVlID0gVWludDY0KDEpOwogICAgaW50Y18xIC8vIDEKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjMyMQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjpSYXJlRmlWYXVsdC5vcHRJbltyb3V0aW5nXSgpIC0+IHZvaWQ6Cm9wdEluOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozNzkKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzgxCiAgICAvLyB0aGlzLmRlcG9zaXRlZEFtb3VudChUeG4uc2VuZGVyKS52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIHR4biBTZW5kZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQKICAgIC8vIGRlcG9zaXRlZEFtb3VudCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAvLyBVc2VyJ3MgQWxwaGEgYmFsYW5jZSBpbiB2YXVsdAogICAgYnl0ZWNfMyAvLyAiZGVwb3NpdGVkQW1vdW50IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozODEKICAgIC8vIHRoaXMuZGVwb3NpdGVkQW1vdW50KFR4bi5zZW5kZXIpLnZhbHVlID0gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIGFwcF9sb2NhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzgyCiAgICAvLyB0aGlzLnVzZXJZaWVsZFBlclRva2VuKFR4bi5zZW5kZXIpLnZhbHVlID0gVWludDY0KDApOwogICAgdHhuIFNlbmRlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NQogICAgLy8gdXNlcllpZWxkUGVyVG9rZW4gPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgIC8vIFNuYXBzaG90IG9mIHlpZWxkUGVyVG9rZW4gYXQgbGFzdCBhY3Rpb24KICAgIGJ5dGVjIDE2IC8vICJ1c2VyWWllbGRQZXJUb2tlbiIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzgyCiAgICAvLyB0aGlzLnVzZXJZaWVsZFBlclRva2VuKFR4bi5zZW5kZXIpLnZhbHVlID0gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIGFwcF9sb2NhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzgzCiAgICAvLyB0aGlzLmVhcm5lZFlpZWxkKFR4bi5zZW5kZXIpLnZhbHVlID0gVWludDY0KDApOwogICAgdHhuIFNlbmRlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NgogICAgLy8gZWFybmVkWWllbGQgPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIEFjY3VtdWxhdGVkIHlpZWxkIG5vdCB5ZXQgY2xhaW1lZAogICAgYnl0ZWMgNyAvLyAiZWFybmVkWWllbGQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM4MwogICAgLy8gdGhpcy5lYXJuZWRZaWVsZChUeG4uc2VuZGVyKS52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfbG9jYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM3NwogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnT3B0SW4nIH0pCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQuY2xvc2VPdXRbcm91dGluZ10oKSAtPiB2b2lkOgpjbG9zZU91dDoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MzkxCiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM5MwogICAgLy8gdGhpcy51cGRhdGVFYXJuZWRZaWVsZChUeG4uc2VuZGVyKTsKICAgIHR4biBTZW5kZXIKICAgIGNhbGxzdWIgdXBkYXRlRWFybmVkWWllbGQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mzk1CiAgICAvLyBjb25zdCB1c2VyRGVwb3NpdCA9IHRoaXMuZGVwb3NpdGVkQW1vdW50KFR4bi5zZW5kZXIpLnZhbHVlOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQKICAgIC8vIGRlcG9zaXRlZEFtb3VudCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAvLyBVc2VyJ3MgQWxwaGEgYmFsYW5jZSBpbiB2YXVsdAogICAgYnl0ZWNfMyAvLyAiZGVwb3NpdGVkQW1vdW50IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czozOTUKICAgIC8vIGNvbnN0IHVzZXJEZXBvc2l0ID0gdGhpcy5kZXBvc2l0ZWRBbW91bnQoVHhuLnNlbmRlcikudmFsdWU7CiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBzd2FwCiAgICBkdXAKICAgIHVuY292ZXIgMgogICAgYXNzZXJ0IC8vIGNoZWNrIExvY2FsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM5NgogICAgLy8gY29uc3QgdXNlcllpZWxkID0gdGhpcy5lYXJuZWRZaWVsZChUeG4uc2VuZGVyKS52YWx1ZTsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc2CiAgICAvLyBlYXJuZWRZaWVsZCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gQWNjdW11bGF0ZWQgeWllbGQgbm90IHlldCBjbGFpbWVkCiAgICBieXRlYyA3IC8vICJlYXJuZWRZaWVsZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Mzk2CiAgICAvLyBjb25zdCB1c2VyWWllbGQgPSB0aGlzLmVhcm5lZFlpZWxkKFR4bi5zZW5kZXIpLnZhbHVlOwogICAgYXBwX2xvY2FsX2dldF9leAogICAgc3dhcAogICAgY292ZXIgMgogICAgYXNzZXJ0IC8vIGNoZWNrIExvY2FsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM5OQogICAgLy8gaWYgKHVzZXJEZXBvc2l0ID4gVWludDY0KDApKSB7CiAgICBieiBjbG9zZU91dF9hZnRlcl9pZl9lbHNlQDQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDAwCiAgICAvLyB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUgPSB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUgLSB1c2VyRGVwb3NpdDsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbERlcG9zaXRzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgLy8gVG90YWwgQWxwaGEgZGVwb3NpdGVkIGluIHZhdWx0CiAgICBieXRlY18wIC8vICJ0b3RhbERlcG9zaXRzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MDAKICAgIC8vIHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZSA9IHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZSAtIHVzZXJEZXBvc2l0OwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGRpZyAyCiAgICBkdXAKICAgIGNvdmVyIDIKICAgIC0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsRGVwb3NpdHMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBUb3RhbCBBbHBoYSBkZXBvc2l0ZWQgaW4gdmF1bHQKICAgIGJ5dGVjXzAgLy8gInRvdGFsRGVwb3NpdHMiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQwMAogICAgLy8gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID0gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlIC0gdXNlckRlcG9zaXQ7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MDItNDA3CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBUeG4uc2VuZGVyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuZGVwb3NpdEFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IHVzZXJEZXBvc2l0LAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9iZWdpbgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MDMKICAgIC8vIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICB0eG4gU2VuZGVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQwNAogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLmRlcG9zaXRBc3NldC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MgogICAgLy8gZGVwb3NpdEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgIC8vIEFscGhhIEFTQSBJRCAod2hhdCB1c2VycyBkZXBvc2l0KQogICAgYnl0ZWMgMTAgLy8gImRlcG9zaXRBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDA0CiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuZGVwb3NpdEFzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDAyLTQwNwogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLmRlcG9zaXRBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiB1c2VyRGVwb3NpdCwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGludGNfMyAvLyA0CiAgICBpdHhuX2ZpZWxkIFR5cGVFbnVtCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQwNgogICAgLy8gZmVlOiBVaW50NjQoMCksCiAgICBpbnRjXzAgLy8gMAogICAgaXR4bl9maWVsZCBGZWUKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDAyLTQwNwogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLmRlcG9zaXRBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiB1c2VyRGVwb3NpdCwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fc3VibWl0CgpjbG9zZU91dF9hZnRlcl9pZl9lbHNlQDQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQxMQogICAgLy8gaWYgKHVzZXJZaWVsZCA+IFVpbnQ2NCgwKSkgewogICAgZHVwCiAgICBieiBjbG9zZU91dF9hZnRlcl9pZl9lbHNlQDcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDEyLTQxNwogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiB1c2VyWWllbGQsCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpdHhuX2JlZ2luCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQxMwogICAgLy8gYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIHR4biBTZW5kZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDE0CiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuc3dhcEFzc2V0LnZhbHVlKSwKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ0CiAgICAvLyBzd2FwQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gUHJvamVjdCdzIEFTQSBJRCAod2hhdCB5aWVsZCBpcyBzd2FwcGVkIHRvKQogICAgYnl0ZWMgNSAvLyAic3dhcEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MTQKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGRpZyAyCiAgICBpdHhuX2ZpZWxkIEFzc2V0QW1vdW50CiAgICBpdHhuX2ZpZWxkIFhmZXJBc3NldAogICAgaXR4bl9maWVsZCBBc3NldFJlY2VpdmVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQxMi00MTcKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogdXNlcllpZWxkLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaW50Y18zIC8vIDQKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDE2CiAgICAvLyBmZWU6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEZlZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MTItNDE3CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBUeG4uc2VuZGVyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuc3dhcEFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IHVzZXJZaWVsZCwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fc3VibWl0CgpjbG9zZU91dF9hZnRlcl9pZl9lbHNlQDc6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjM4OQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnQ2xvc2VPdXQnIH0pCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQuZGVwb3NpdFtyb3V0aW5nXSgpIC0+IHZvaWQ6CmRlcG9zaXQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQzNQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIGR1cAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MzcKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDM4CiAgICAvLyBhc3NlcnQoc2xpcHBhZ2VCcHMgPD0gdGhpcy5tYXhTbGlwcGFnZUJwcy52YWx1ZSwgJ1NsaXBwYWdlIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NgogICAgLy8gbWF4U2xpcHBhZ2VCcHMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgIC8vIE1heGltdW0gc2xpcHBhZ2UgdG9sZXJhbmNlIGluIGJhc2lzIHBvaW50cwogICAgYnl0ZWMgMTQgLy8gIm1heFNsaXBwYWdlQnBzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MzgKICAgIC8vIGFzc2VydChzbGlwcGFnZUJwcyA8PSB0aGlzLm1heFNsaXBwYWdlQnBzLnZhbHVlLCAnU2xpcHBhZ2UgZXhjZWVkcyBtYXhpbXVtIGFsbG93ZWQnKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA8PQogICAgYXNzZXJ0IC8vIFNsaXBwYWdlIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ0MAogICAgLy8gY29uc3QgYXBwQWRkcjogQWNjb3VudCA9IEdsb2JhbC5jdXJyZW50QXBwbGljYXRpb25BZGRyZXNzOwogICAgZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKICAgIGR1cAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NDEKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy55aWVsZEFzc2V0LnZhbHVlKS5iYWxhbmNlKGFwcEFkZHIpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDMKICAgIC8vIHlpZWxkQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBVU0RDIEFTQSBJRCAod2hhdCBhaXJkcm9wcyBjb21lIGluIGFzKQogICAgYnl0ZWMgNCAvLyAieWllbGRBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDQxCiAgICAvLyBjb25zdCB1c2RjQmFsYW5jZSA9IEFzc2V0KHRoaXMueWllbGRBc3NldC52YWx1ZSkuYmFsYW5jZShhcHBBZGRyKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBhc3NldF9ob2xkaW5nX2dldCBBc3NldEJhbGFuY2UKICAgIHN3YXAKICAgIGR1cAogICAgdW5jb3ZlciAyCiAgICBhc3NlcnQgLy8gYWNjb3VudCBvcHRlZCBpbnRvIGFzc2V0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ0NQogICAgLy8gaWYgKHVzZGNCYWxhbmNlID49IHRoaXMubWluU3dhcFRocmVzaG9sZC52YWx1ZSAmJiB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUgPiBVaW50NjQoMCkpIHsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU1CiAgICAvLyBtaW5Td2FwVGhyZXNob2xkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgLy8gTWluaW11bSBVU0RDIGJlZm9yZSBzd2FwIGFsbG93ZWQKICAgIGJ5dGVjIDEzIC8vICJtaW5Td2FwVGhyZXNob2xkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NDUKICAgIC8vIGlmICh1c2RjQmFsYW5jZSA+PSB0aGlzLm1pblN3YXBUaHJlc2hvbGQudmFsdWUgJiYgdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPj0KICAgIGJ6IGRlcG9zaXRfYWZ0ZXJfaWZfZWxzZUA0CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxEZXBvc2l0cyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgIC8vIFRvdGFsIEFscGhhIGRlcG9zaXRlZCBpbiB2YXVsdAogICAgYnl0ZWNfMCAvLyAidG90YWxEZXBvc2l0cyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDQ1CiAgICAvLyBpZiAodXNkY0JhbGFuY2UgPj0gdGhpcy5taW5Td2FwVGhyZXNob2xkLnZhbHVlICYmIHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZSA+IFVpbnQ2NCgwKSkgewogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGJ6IGRlcG9zaXRfYWZ0ZXJfaWZfZWxzZUA0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ0NgogICAgLy8gdGhpcy5leGVjdXRlU3dhcEFuZERpc3RyaWJ1dGUodXNkY0JhbGFuY2UsIHNsaXBwYWdlQnBzKTsKICAgIGR1cAogICAgZGlnIDMKICAgIGNhbGxzdWIgZXhlY3V0ZVN3YXBBbmREaXN0cmlidXRlCgpkZXBvc2l0X2FmdGVyX2lmX2Vsc2VANDoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDUwCiAgICAvLyBjb25zdCBjdXJyZW50SW5kZXggPSBUeG4uZ3JvdXBJbmRleDsKICAgIHR4biBHcm91cEluZGV4CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ1MQogICAgLy8gYXNzZXJ0KGN1cnJlbnRJbmRleCA+PSBVaW50NjQoMSksICdBcHAgY2FsbCBtdXN0IGZvbGxvdyBhc3NldCB0cmFuc2ZlcicpOwogICAgZHVwCiAgICBhc3NlcnQgLy8gQXBwIGNhbGwgbXVzdCBmb2xsb3cgYXNzZXQgdHJhbnNmZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDUzCiAgICAvLyBjb25zdCBkZXBvc2l0VHJhbnNmZXIgPSBndHhuLkFzc2V0VHJhbnNmZXJUeG4oY3VycmVudEluZGV4IC0gVWludDY0KDEpKTsKICAgIGludGNfMSAvLyAxCiAgICAtCiAgICBkdXAKICAgIGd0eG5zIFR5cGVFbnVtCiAgICBpbnRjXzMgLy8gYXhmZXIKICAgID09CiAgICBhc3NlcnQgLy8gdHJhbnNhY3Rpb24gdHlwZSBpcyBheGZlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NTQKICAgIC8vIGFzc2VydChkZXBvc2l0VHJhbnNmZXIueGZlckFzc2V0ID09PSBBc3NldCh0aGlzLmRlcG9zaXRBc3NldC52YWx1ZSksICdNdXN0IHRyYW5zZmVyIGRlcG9zaXQgYXNzZXQnKTsKICAgIGR1cAogICAgZ3R4bnMgWGZlckFzc2V0CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MgogICAgLy8gZGVwb3NpdEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgIC8vIEFscGhhIEFTQSBJRCAod2hhdCB1c2VycyBkZXBvc2l0KQogICAgYnl0ZWMgMTAgLy8gImRlcG9zaXRBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDU0CiAgICAvLyBhc3NlcnQoZGVwb3NpdFRyYW5zZmVyLnhmZXJBc3NldCA9PT0gQXNzZXQodGhpcy5kZXBvc2l0QXNzZXQudmFsdWUpLCAnTXVzdCB0cmFuc2ZlciBkZXBvc2l0IGFzc2V0Jyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIGFzc2VydCAvLyBNdXN0IHRyYW5zZmVyIGRlcG9zaXQgYXNzZXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDU1CiAgICAvLyBhc3NlcnQoZGVwb3NpdFRyYW5zZmVyLmFzc2V0UmVjZWl2ZXIgPT09IGFwcEFkZHIsICdNdXN0IHNlbmQgdG8gY29udHJhY3QnKTsKICAgIGR1cAogICAgZ3R4bnMgQXNzZXRSZWNlaXZlcgogICAgZGlnIDMKICAgID09CiAgICBhc3NlcnQgLy8gTXVzdCBzZW5kIHRvIGNvbnRyYWN0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ1NgogICAgLy8gYXNzZXJ0KGRlcG9zaXRUcmFuc2Zlci5zZW5kZXIgPT09IFR4bi5zZW5kZXIsICdUcmFuc2ZlciBtdXN0IGJlIGZyb20gY2FsbGVyJyk7CiAgICBkdXAKICAgIGd0eG5zIFNlbmRlcgogICAgdHhuIFNlbmRlcgogICAgPT0KICAgIGFzc2VydCAvLyBUcmFuc2ZlciBtdXN0IGJlIGZyb20gY2FsbGVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ1OQogICAgLy8gYXNzZXJ0KGRlcG9zaXRUcmFuc2Zlci5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgZHVwCiAgICBndHhucyBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDYwCiAgICAvLyBhc3NlcnQoZGVwb3NpdFRyYW5zZmVyLmFzc2V0Q2xvc2VUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAnYXNzZXRDbG9zZVRvIG11c3QgYmUgemVybycpOwogICAgZHVwCiAgICBndHhucyBBc3NldENsb3NlVG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyBhc3NldENsb3NlVG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ2MgogICAgLy8gY29uc3QgYW1vdW50ID0gZGVwb3NpdFRyYW5zZmVyLmFzc2V0QW1vdW50OwogICAgZ3R4bnMgQXNzZXRBbW91bnQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDYzCiAgICAvLyBhc3NlcnQoYW1vdW50ID49IE1JTl9ERVBPU0lUX0FNT1VOVCwgJ0RlcG9zaXQgdG9vIHNtYWxsJyk7CiAgICBkdXAKICAgIHB1c2hpbnQgMTAwMDAwMCAvLyAxMDAwMDAwCiAgICA+PQogICAgYXNzZXJ0IC8vIERlcG9zaXQgdG9vIHNtYWxsCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ2NgogICAgLy8gdGhpcy51cGRhdGVFYXJuZWRZaWVsZChUeG4uc2VuZGVyKTsKICAgIHR4biBTZW5kZXIKICAgIGNhbGxzdWIgdXBkYXRlRWFybmVkWWllbGQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDY5CiAgICAvLyB0aGlzLmRlcG9zaXRlZEFtb3VudChUeG4uc2VuZGVyKS52YWx1ZSA9IHRoaXMuZGVwb3NpdGVkQW1vdW50KFR4bi5zZW5kZXIpLnZhbHVlICsgYW1vdW50OwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQKICAgIC8vIGRlcG9zaXRlZEFtb3VudCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAvLyBVc2VyJ3MgQWxwaGEgYmFsYW5jZSBpbiB2YXVsdAogICAgYnl0ZWNfMyAvLyAiZGVwb3NpdGVkQW1vdW50IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NjkKICAgIC8vIHRoaXMuZGVwb3NpdGVkQW1vdW50KFR4bi5zZW5kZXIpLnZhbHVlID0gdGhpcy5kZXBvc2l0ZWRBbW91bnQoVHhuLnNlbmRlcikudmFsdWUgKyBhbW91bnQ7CiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgTG9jYWxTdGF0ZSBleGlzdHMKICAgIGRpZyAxCiAgICArCiAgICB0eG4gU2VuZGVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc0CiAgICAvLyBkZXBvc2l0ZWRBbW91bnQgPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgICAgLy8gVXNlcidzIEFscGhhIGJhbGFuY2UgaW4gdmF1bHQKICAgIGJ5dGVjXzMgLy8gImRlcG9zaXRlZEFtb3VudCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDY5CiAgICAvLyB0aGlzLmRlcG9zaXRlZEFtb3VudChUeG4uc2VuZGVyKS52YWx1ZSA9IHRoaXMuZGVwb3NpdGVkQW1vdW50KFR4bi5zZW5kZXIpLnZhbHVlICsgYW1vdW50OwogICAgdW5jb3ZlciAyCiAgICBhcHBfbG9jYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ3MAogICAgLy8gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID0gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlICsgYW1vdW50OwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsRGVwb3NpdHMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBUb3RhbCBBbHBoYSBkZXBvc2l0ZWQgaW4gdmF1bHQKICAgIGJ5dGVjXzAgLy8gInRvdGFsRGVwb3NpdHMiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ3MAogICAgLy8gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID0gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlICsgYW1vdW50OwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgICsKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsRGVwb3NpdHMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBUb3RhbCBBbHBoYSBkZXBvc2l0ZWQgaW4gdmF1bHQKICAgIGJ5dGVjXzAgLy8gInRvdGFsRGVwb3NpdHMiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ3MAogICAgLy8gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID0gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlICsgYW1vdW50OwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDM1CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LndpdGhkcmF3W3JvdXRpbmddKCkgLT4gdm9pZDoKd2l0aGRyYXc6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ3NwogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIGR1cAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NzkKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDgwCiAgICAvLyBjb25zdCB1c2VyQmFsYW5jZSA9IHRoaXMuZGVwb3NpdGVkQW1vdW50KFR4bi5zZW5kZXIpLnZhbHVlOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQKICAgIC8vIGRlcG9zaXRlZEFtb3VudCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAvLyBVc2VyJ3MgQWxwaGEgYmFsYW5jZSBpbiB2YXVsdAogICAgYnl0ZWNfMyAvLyAiZGVwb3NpdGVkQW1vdW50IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0ODAKICAgIC8vIGNvbnN0IHVzZXJCYWxhbmNlID0gdGhpcy5kZXBvc2l0ZWRBbW91bnQoVHhuLnNlbmRlcikudmFsdWU7CiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBzd2FwCiAgICBjb3ZlciAyCiAgICBhc3NlcnQgLy8gY2hlY2sgTG9jYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDg0CiAgICAvLyBpZiAod2l0aGRyYXdBbW91bnQgPT09IFVpbnQ2NCgwKSkgewogICAgYnogd2l0aGRyYXdfaWZfYm9keUAyCiAgICBkaWcgMQoKd2l0aGRyYXdfYWZ0ZXJfaWZfZWxzZUAzOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0ODgKICAgIC8vIGFzc2VydCh3aXRoZHJhd0Ftb3VudCA+IFVpbnQ2NCgwKSwgJ05vdGhpbmcgdG8gd2l0aGRyYXcnKTsKICAgIGR1cAogICAgYXNzZXJ0IC8vIE5vdGhpbmcgdG8gd2l0aGRyYXcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDg5CiAgICAvLyBhc3NlcnQod2l0aGRyYXdBbW91bnQgPD0gdXNlckJhbGFuY2UsICdJbnN1ZmZpY2llbnQgYmFsYW5jZScpOwogICAgZHVwCiAgICBkaWcgMgogICAgZHVwCiAgICBjb3ZlciAyCiAgICA8PQogICAgYXNzZXJ0IC8vIEluc3VmZmljaWVudCBiYWxhbmNlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ5MgogICAgLy8gdGhpcy51cGRhdGVFYXJuZWRZaWVsZChUeG4uc2VuZGVyKTsKICAgIHR4biBTZW5kZXIKICAgIGNhbGxzdWIgdXBkYXRlRWFybmVkWWllbGQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDk1CiAgICAvLyB0aGlzLmRlcG9zaXRlZEFtb3VudChUeG4uc2VuZGVyKS52YWx1ZSA9IHVzZXJCYWxhbmNlIC0gd2l0aGRyYXdBbW91bnQ7CiAgICBkaWcgMQogICAgLQogICAgdHhuIFNlbmRlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NAogICAgLy8gZGVwb3NpdGVkQW1vdW50ID0gTG9jYWxTdGF0ZTx1aW50NjQ+KCk7ICAgIC8vIFVzZXIncyBBbHBoYSBiYWxhbmNlIGluIHZhdWx0CiAgICBieXRlY18zIC8vICJkZXBvc2l0ZWRBbW91bnQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ5NQogICAgLy8gdGhpcy5kZXBvc2l0ZWRBbW91bnQoVHhuLnNlbmRlcikudmFsdWUgPSB1c2VyQmFsYW5jZSAtIHdpdGhkcmF3QW1vdW50OwogICAgdW5jb3ZlciAyCiAgICBhcHBfbG9jYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ5NgogICAgLy8gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID0gdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlIC0gd2l0aGRyYXdBbW91bnQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxEZXBvc2l0cyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgIC8vIFRvdGFsIEFscGhhIGRlcG9zaXRlZCBpbiB2YXVsdAogICAgYnl0ZWNfMCAvLyAidG90YWxEZXBvc2l0cyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDk2CiAgICAvLyB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUgPSB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUgLSB3aXRoZHJhd0Ftb3VudDsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBkaWcgMQogICAgLQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxEZXBvc2l0cyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgIC8vIFRvdGFsIEFscGhhIGRlcG9zaXRlZCBpbiB2YXVsdAogICAgYnl0ZWNfMCAvLyAidG90YWxEZXBvc2l0cyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDk2CiAgICAvLyB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUgPSB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUgLSB3aXRoZHJhd0Ftb3VudDsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ5OS01MDQKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5kZXBvc2l0QXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogd2l0aGRyYXdBbW91bnQsCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpdHhuX2JlZ2luCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUwMAogICAgLy8gYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIHR4biBTZW5kZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTAxCiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuZGVwb3NpdEFzc2V0LnZhbHVlKSwKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQyCiAgICAvLyBkZXBvc2l0QXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgLy8gQWxwaGEgQVNBIElEICh3aGF0IHVzZXJzIGRlcG9zaXQpCiAgICBieXRlYyAxMCAvLyAiZGVwb3NpdEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MDEKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy5kZXBvc2l0QXNzZXQudmFsdWUpLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIHVuY292ZXIgMgogICAgaXR4bl9maWVsZCBBc3NldEFtb3VudAogICAgaXR4bl9maWVsZCBYZmVyQXNzZXQKICAgIGl0eG5fZmllbGQgQXNzZXRSZWNlaXZlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0OTktNTA0CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBUeG4uc2VuZGVyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuZGVwb3NpdEFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IHdpdGhkcmF3QW1vdW50LAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaW50Y18zIC8vIDQKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTAzCiAgICAvLyBmZWU6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEZlZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0OTktNTA0CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBUeG4uc2VuZGVyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuZGVwb3NpdEFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IHdpdGhkcmF3QW1vdW50LAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9zdWJtaXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDc3CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKd2l0aGRyYXdfaWZfYm9keUAyOgogICAgZHVwCiAgICBiIHdpdGhkcmF3X2FmdGVyX2lmX2Vsc2VAMwoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LmNsYWltW3JvdXRpbmddKCkgLT4gdm9pZDoKY2xhaW06CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUxNgogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MTgKICAgIC8vIHRoaXMudXBkYXRlRWFybmVkWWllbGQoVHhuLnNlbmRlcik7CiAgICB0eG4gU2VuZGVyCiAgICBjYWxsc3ViIHVwZGF0ZUVhcm5lZFlpZWxkCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUyMAogICAgLy8gY29uc3QgY2xhaW1hYmxlID0gdGhpcy5lYXJuZWRZaWVsZChUeG4uc2VuZGVyKS52YWx1ZTsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc2CiAgICAvLyBlYXJuZWRZaWVsZCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gQWNjdW11bGF0ZWQgeWllbGQgbm90IHlldCBjbGFpbWVkCiAgICBieXRlYyA3IC8vICJlYXJuZWRZaWVsZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTIwCiAgICAvLyBjb25zdCBjbGFpbWFibGUgPSB0aGlzLmVhcm5lZFlpZWxkKFR4bi5zZW5kZXIpLnZhbHVlOwogICAgYXBwX2xvY2FsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIExvY2FsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUyMQogICAgLy8gYXNzZXJ0KGNsYWltYWJsZSA+IFVpbnQ2NCgwKSwgJ05vdGhpbmcgdG8gY2xhaW0nKTsKICAgIGR1cAogICAgYXNzZXJ0IC8vIE5vdGhpbmcgdG8gY2xhaW0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTI0CiAgICAvLyB0aGlzLmVhcm5lZFlpZWxkKFR4bi5zZW5kZXIpLnZhbHVlID0gVWludDY0KDApOwogICAgdHhuIFNlbmRlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NgogICAgLy8gZWFybmVkWWllbGQgPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIEFjY3VtdWxhdGVkIHlpZWxkIG5vdCB5ZXQgY2xhaW1lZAogICAgYnl0ZWMgNyAvLyAiZWFybmVkWWllbGQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUyNAogICAgLy8gdGhpcy5lYXJuZWRZaWVsZChUeG4uc2VuZGVyKS52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfbG9jYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUyNy01MzIKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogY2xhaW1hYmxlLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9iZWdpbgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MjgKICAgIC8vIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICB0eG4gU2VuZGVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUyOQogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NAogICAgLy8gc3dhcEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFByb2plY3QncyBBU0EgSUQgKHdoYXQgeWllbGQgaXMgc3dhcHBlZCB0bykKICAgIGJ5dGVjIDUgLy8gInN3YXBBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTI5CiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuc3dhcEFzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTI3LTUzMgogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBjbGFpbWFibGUsCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpbnRjXzMgLy8gNAogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MzEKICAgIC8vIGZlZTogVWludDY0KDApLAogICAgaW50Y18wIC8vIDAKICAgIGl0eG5fZmllbGQgRmVlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUyNy01MzIKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogY2xhaW1hYmxlLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9zdWJtaXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTE0CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LmNsYWltQ3JlYXRvcltyb3V0aW5nXSgpIC0+IHZvaWQ6CmNsYWltQ3JlYXRvcjoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTQwCiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU0MQogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIGNsYWltJyk7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMiAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU0MQogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIGNsYWltJyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIGFzc2VydCAvLyBPbmx5IGNyZWF0b3IgY2FuIGNsYWltCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU0MwogICAgLy8gY29uc3QgY2xhaW1hYmxlID0gdGhpcy5jcmVhdG9yVW5jbGFpbWVkWWllbGQudmFsdWU7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZFlpZWxkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCB5aWVsZCBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZFlpZWxkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NDMKICAgIC8vIGNvbnN0IGNsYWltYWJsZSA9IHRoaXMuY3JlYXRvclVuY2xhaW1lZFlpZWxkLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTQ0CiAgICAvLyBhc3NlcnQoY2xhaW1hYmxlID4gVWludDY0KDApLCAnTm90aGluZyB0byBjbGFpbScpOwogICAgZHVwCiAgICBhc3NlcnQgLy8gTm90aGluZyB0byBjbGFpbQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZFlpZWxkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCB5aWVsZCBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZFlpZWxkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NDcKICAgIC8vIHRoaXMuY3JlYXRvclVuY2xhaW1lZFlpZWxkLnZhbHVlID0gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU1MC01NTUKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogY2xhaW1hYmxlLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9iZWdpbgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NTEKICAgIC8vIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICB0eG4gU2VuZGVyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU1MgogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NAogICAgLy8gc3dhcEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFByb2plY3QncyBBU0EgSUQgKHdoYXQgeWllbGQgaXMgc3dhcHBlZCB0bykKICAgIGJ5dGVjIDUgLy8gInN3YXBBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTUyCiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuc3dhcEFzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTUwLTU1NQogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBjbGFpbWFibGUsCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpbnRjXzMgLy8gNAogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NTQKICAgIC8vIGZlZTogVWludDY0KDApLAogICAgaW50Y18wIC8vIDAKICAgIGl0eG5fZmllbGQgRmVlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU1MC01NTUKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogY2xhaW1hYmxlLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9zdWJtaXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTM4CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LnN3YXBZaWVsZFtyb3V0aW5nXSgpIC0+IHZvaWQ6CnN3YXBZaWVsZDoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTY5CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NzEKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTcyCiAgICAvLyBhc3NlcnQoc2xpcHBhZ2VCcHMgPD0gdGhpcy5tYXhTbGlwcGFnZUJwcy52YWx1ZSwgJ1NsaXBwYWdlIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NgogICAgLy8gbWF4U2xpcHBhZ2VCcHMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgIC8vIE1heGltdW0gc2xpcHBhZ2UgdG9sZXJhbmNlIGluIGJhc2lzIHBvaW50cwogICAgYnl0ZWMgMTQgLy8gIm1heFNsaXBwYWdlQnBzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NzIKICAgIC8vIGFzc2VydChzbGlwcGFnZUJwcyA8PSB0aGlzLm1heFNsaXBwYWdlQnBzLnZhbHVlLCAnU2xpcHBhZ2UgZXhjZWVkcyBtYXhpbXVtIGFsbG93ZWQnKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBkaWcgMQogICAgPj0KICAgIGFzc2VydCAvLyBTbGlwcGFnZSBleGNlZWRzIG1heGltdW0gYWxsb3dlZAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NzQKICAgIC8vIGNvbnN0IGFwcEFkZHI6IEFjY291bnQgPSBHbG9iYWwuY3VycmVudEFwcGxpY2F0aW9uQWRkcmVzczsKICAgIGdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU3NQogICAgLy8gY29uc3QgdXNkY0JhbGFuY2UgPSBBc3NldCh0aGlzLnlpZWxkQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MwogICAgLy8geWllbGRBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFVTREMgQVNBIElEICh3aGF0IGFpcmRyb3BzIGNvbWUgaW4gYXMpCiAgICBieXRlYyA0IC8vICJ5aWVsZEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NzUKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy55aWVsZEFzc2V0LnZhbHVlKS5iYWxhbmNlKGFwcEFkZHIpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGFzc2V0X2hvbGRpbmdfZ2V0IEFzc2V0QmFsYW5jZQogICAgYXNzZXJ0IC8vIGFjY291bnQgb3B0ZWQgaW50byBhc3NldAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NzcKICAgIC8vIGFzc2VydCh1c2RjQmFsYW5jZSA+PSB0aGlzLm1pblN3YXBUaHJlc2hvbGQudmFsdWUsICdCZWxvdyBtaW5pbXVtIHN3YXAgdGhyZXNob2xkJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NQogICAgLy8gbWluU3dhcFRocmVzaG9sZCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgIC8vIE1pbmltdW0gVVNEQyBiZWZvcmUgc3dhcCBhbGxvd2VkCiAgICBieXRlYyAxMyAvLyAibWluU3dhcFRocmVzaG9sZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTc3CiAgICAvLyBhc3NlcnQodXNkY0JhbGFuY2UgPj0gdGhpcy5taW5Td2FwVGhyZXNob2xkLnZhbHVlLCAnQmVsb3cgbWluaW11bSBzd2FwIHRocmVzaG9sZCcpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGRpZyAxCiAgICA8PQogICAgYXNzZXJ0IC8vIEJlbG93IG1pbmltdW0gc3dhcCB0aHJlc2hvbGQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTc4CiAgICAvLyBhc3NlcnQodGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID4gVWludDY0KDApLCAnTm8gZGVwb3NpdG9ycyB0byBkaXN0cmlidXRlIHRvJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxEZXBvc2l0cyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgIC8vIFRvdGFsIEFscGhhIGRlcG9zaXRlZCBpbiB2YXVsdAogICAgYnl0ZWNfMCAvLyAidG90YWxEZXBvc2l0cyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTc4CiAgICAvLyBhc3NlcnQodGhpcy50b3RhbERlcG9zaXRzLnZhbHVlID4gVWludDY0KDApLCAnTm8gZGVwb3NpdG9ycyB0byBkaXN0cmlidXRlIHRvJyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYXNzZXJ0IC8vIE5vIGRlcG9zaXRvcnMgdG8gZGlzdHJpYnV0ZSB0bwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1ODAKICAgIC8vIHRoaXMuZXhlY3V0ZVN3YXBBbmREaXN0cmlidXRlKHVzZGNCYWxhbmNlLCBzbGlwcGFnZUJwcyk7CiAgICBzd2FwCiAgICBjYWxsc3ViIGV4ZWN1dGVTd2FwQW5kRGlzdHJpYnV0ZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NjkKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQuZ2V0VmF1bHRTdGF0c1tyb3V0aW5nXSgpIC0+IHZvaWQ6CmdldFZhdWx0U3RhdHM6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU5MgogICAgLy8gY29uc3QgYXBwQWRkcjogQWNjb3VudCA9IEdsb2JhbC5jdXJyZW50QXBwbGljYXRpb25BZGRyZXNzOwogICAgZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTkzCiAgICAvLyBjb25zdCB1c2RjQmFsYW5jZSA9IEFzc2V0KHRoaXMueWllbGRBc3NldC52YWx1ZSkuYmFsYW5jZShhcHBBZGRyKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQzCiAgICAvLyB5aWVsZEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gVVNEQyBBU0EgSUQgKHdoYXQgYWlyZHJvcHMgY29tZSBpbiBhcykKICAgIGJ5dGVjIDQgLy8gInlpZWxkQXNzZXQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU5MwogICAgLy8gY29uc3QgdXNkY0JhbGFuY2UgPSBBc3NldCh0aGlzLnlpZWxkQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgZGlnIDEKICAgIHN3YXAKICAgIGFzc2V0X2hvbGRpbmdfZ2V0IEFzc2V0QmFsYW5jZQogICAgYXNzZXJ0IC8vIGFjY291bnQgb3B0ZWQgaW50byBhc3NldAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1OTQKICAgIC8vIGNvbnN0IHN3YXBBc3NldEJhbGFuY2UgPSBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSkuYmFsYW5jZShhcHBBZGRyKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ0CiAgICAvLyBzd2FwQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gUHJvamVjdCdzIEFTQSBJRCAod2hhdCB5aWVsZCBpcyBzd2FwcGVkIHRvKQogICAgYnl0ZWMgNSAvLyAic3dhcEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1OTQKICAgIC8vIGNvbnN0IHN3YXBBc3NldEJhbGFuY2UgPSBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSkuYmFsYW5jZShhcHBBZGRyKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgIHN3YXAKICAgIGFzc2V0X2hvbGRpbmdfZ2V0IEFzc2V0QmFsYW5jZQogICAgYXNzZXJ0IC8vIGFjY291bnQgb3B0ZWQgaW50byBhc3NldAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1OTgKICAgIC8vIHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZSwKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbERlcG9zaXRzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgLy8gVG90YWwgQWxwaGEgZGVwb3NpdGVkIGluIHZhdWx0CiAgICBieXRlY18wIC8vICJ0b3RhbERlcG9zaXRzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1OTgKICAgIC8vIHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU5OQogICAgLy8gdGhpcy55aWVsZFBlclRva2VuLnZhbHVlLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHlpZWxkUGVyVG9rZW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBBY2N1bXVsYXRvciBmb3IgeWllbGQgZGlzdHJpYnV0aW9uIChzY2FsZWQgYnkgU0NBTEUpCiAgICBieXRlYyA2IC8vICJ5aWVsZFBlclRva2VuIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1OTkKICAgIC8vIHRoaXMueWllbGRQZXJUb2tlbi52YWx1ZSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYwMAogICAgLy8gdGhpcy5jcmVhdG9yVW5jbGFpbWVkWWllbGQudmFsdWUsCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZFlpZWxkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCB5aWVsZCBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZFlpZWxkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MDAKICAgIC8vIHRoaXMuY3JlYXRvclVuY2xhaW1lZFlpZWxkLnZhbHVlLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjAzCiAgICAvLyB0aGlzLnRvdGFsWWllbGRHZW5lcmF0ZWQudmFsdWUKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU3CiAgICAvLyB0b3RhbFlpZWxkR2VuZXJhdGVkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBUb3RhbCB5aWVsZCBnZW5lcmF0ZWQgZnJvbSBzd2FwcyAoc3dhcCBvdXRwdXQgaW4gc3dhcEFzc2V0KQogICAgYnl0ZWMgMTUgLy8gInRvdGFsWWllbGRHZW5lcmF0ZWQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYwMwogICAgLy8gdGhpcy50b3RhbFlpZWxkR2VuZXJhdGVkLnZhbHVlCiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1OTctNjA0CiAgICAvLyByZXR1cm4gWwogICAgLy8gICB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWUsCiAgICAvLyAgIHRoaXMueWllbGRQZXJUb2tlbi52YWx1ZSwKICAgIC8vICAgdGhpcy5jcmVhdG9yVW5jbGFpbWVkWWllbGQudmFsdWUsCiAgICAvLyAgIHVzZGNCYWxhbmNlLAogICAgLy8gICBzd2FwQXNzZXRCYWxhbmNlLAogICAgLy8gICB0aGlzLnRvdGFsWWllbGRHZW5lcmF0ZWQudmFsdWUKICAgIC8vIF07CiAgICB1bmNvdmVyIDMKICAgIGl0b2IKICAgIHVuY292ZXIgMwogICAgaXRvYgogICAgY29uY2F0CiAgICB1bmNvdmVyIDIKICAgIGl0b2IKICAgIGNvbmNhdAogICAgdW5jb3ZlciAzCiAgICBpdG9iCiAgICBjb25jYXQKICAgIHVuY292ZXIgMgogICAgaXRvYgogICAgY29uY2F0CiAgICBzd2FwCiAgICBpdG9iCiAgICBjb25jYXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTkwCiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyByZWFkb25seTogdHJ1ZSB9KQogICAgYnl0ZWMgMTIgLy8gMHgxNTFmN2M3NQogICAgc3dhcAogICAgY29uY2F0CiAgICBsb2cKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjpSYXJlRmlWYXVsdC5nZXRQZW5kaW5nWWllbGRbcm91dGluZ10oKSAtPiB2b2lkOgpnZXRQZW5kaW5nWWllbGQ6CiAgICBwdXNoYnl0ZXMgIiIKICAgIGR1cAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MTAKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXBuIDIKICAgIGxlbgogICAgcHVzaGludCAzMiAvLyAzMgogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC5zdGF0aWNfYXJyYXk8YXJjNC51aW50OCwgMzI+CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYxMgogICAgLy8gY29uc3QgZGVwb3NpdGVkID0gdGhpcy5kZXBvc2l0ZWRBbW91bnQodXNlcikudmFsdWU7CiAgICBkdXAKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc0CiAgICAvLyBkZXBvc2l0ZWRBbW91bnQgPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgICAgLy8gVXNlcidzIEFscGhhIGJhbGFuY2UgaW4gdmF1bHQKICAgIGJ5dGVjXzMgLy8gImRlcG9zaXRlZEFtb3VudCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjEyCiAgICAvLyBjb25zdCBkZXBvc2l0ZWQgPSB0aGlzLmRlcG9zaXRlZEFtb3VudCh1c2VyKS52YWx1ZTsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIHN3YXAKICAgIGR1cAogICAgY292ZXIgMwogICAgY292ZXIgMwogICAgYXNzZXJ0IC8vIGNoZWNrIExvY2FsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYxMwogICAgLy8gbGV0IHBlbmRpbmcgPSB0aGlzLmVhcm5lZFlpZWxkKHVzZXIpLnZhbHVlOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzYKICAgIC8vIGVhcm5lZFlpZWxkID0gTG9jYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBBY2N1bXVsYXRlZCB5aWVsZCBub3QgeWV0IGNsYWltZWQKICAgIGJ5dGVjIDcgLy8gImVhcm5lZFlpZWxkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MTMKICAgIC8vIGxldCBwZW5kaW5nID0gdGhpcy5lYXJuZWRZaWVsZCh1c2VyKS52YWx1ZTsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIHN3YXAKICAgIGNvdmVyIDIKICAgIGFzc2VydCAvLyBjaGVjayBMb2NhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MTUKICAgIC8vIGlmIChkZXBvc2l0ZWQgPiBVaW50NjQoMCkpIHsKICAgIGJ6IGdldFBlbmRpbmdZaWVsZF9hZnRlcl9pZl9lbHNlQDUKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjE2CiAgICAvLyBjb25zdCBjdXJyZW50WVBUID0gdGhpcy55aWVsZFBlclRva2VuLnZhbHVlOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHlpZWxkUGVyVG9rZW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBBY2N1bXVsYXRvciBmb3IgeWllbGQgZGlzdHJpYnV0aW9uIChzY2FsZWQgYnkgU0NBTEUpCiAgICBieXRlYyA2IC8vICJ5aWVsZFBlclRva2VuIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MTYKICAgIC8vIGNvbnN0IGN1cnJlbnRZUFQgPSB0aGlzLnlpZWxkUGVyVG9rZW4udmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgc3dhcAogICAgZHVwCiAgICBjb3ZlciAyCiAgICBidXJ5IDcKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjE3CiAgICAvLyBjb25zdCB1c2VyWVBUID0gdGhpcy51c2VyWWllbGRQZXJUb2tlbih1c2VyKS52YWx1ZTsKICAgIGRpZyAzCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NQogICAgLy8gdXNlcllpZWxkUGVyVG9rZW4gPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgIC8vIFNuYXBzaG90IG9mIHlpZWxkUGVyVG9rZW4gYXQgbGFzdCBhY3Rpb24KICAgIGJ5dGVjIDE2IC8vICJ1c2VyWWllbGRQZXJUb2tlbiIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjE3CiAgICAvLyBjb25zdCB1c2VyWVBUID0gdGhpcy51c2VyWWllbGRQZXJUb2tlbih1c2VyKS52YWx1ZTsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIHN3YXAKICAgIGR1cAogICAgY292ZXIgMgogICAgYnVyeSA3CiAgICBhc3NlcnQgLy8gY2hlY2sgTG9jYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjE5CiAgICAvLyBpZiAoY3VycmVudFlQVCA+IHVzZXJZUFQpIHsKICAgID4KICAgIGJ6IGdldFBlbmRpbmdZaWVsZF9hZnRlcl9pZl9lbHNlQDUKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjIwCiAgICAvLyBwZW5kaW5nID0gcGVuZGluZyArIHRoaXMubXVsRGl2Rmxvb3IoZGVwb3NpdGVkLCBjdXJyZW50WVBUIC0gdXNlcllQVCwgU0NBTEUpOwogICAgZGlnIDQKICAgIGRpZyA0CiAgICAtCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg3CiAgICAvLyBjb25zdCBbaGksIGxvXSA9IG11bHcobjEsIG4yKTsKICAgIGRpZyAyCiAgICBtdWx3CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg4CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjIwCiAgICAvLyBwZW5kaW5nID0gcGVuZGluZyArIHRoaXMubXVsRGl2Rmxvb3IoZGVwb3NpdGVkLCBjdXJyZW50WVBUIC0gdXNlcllQVCwgU0NBTEUpOwogICAgaW50YyA1IC8vIDEwMDAwMDAwMDAwMDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODgKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBkaXZtb2R3CiAgICBwb3BuIDIKICAgIHN3YXAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODkKICAgIC8vIGFzc2VydChxX2hpID09PSBVaW50NjQoMCksICdNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcicpOwogICAgIQogICAgYXNzZXJ0IC8vIE11bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYyMAogICAgLy8gcGVuZGluZyA9IHBlbmRpbmcgKyB0aGlzLm11bERpdkZsb29yKGRlcG9zaXRlZCwgY3VycmVudFlQVCAtIHVzZXJZUFQsIFNDQUxFKTsKICAgIGRpZyAxCiAgICArCiAgICBidXJ5IDEKCmdldFBlbmRpbmdZaWVsZF9hZnRlcl9pZl9lbHNlQDU6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYxMAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgcmVhZG9ubHk6IHRydWUgfSkKICAgIGR1cAogICAgaXRvYgogICAgYnl0ZWMgMTIgLy8gMHgxNTFmN2M3NQogICAgc3dhcAogICAgY29uY2F0CiAgICBsb2cKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjpSYXJlRmlWYXVsdC5nZXRVc2VyRGVwb3NpdFtyb3V0aW5nXSgpIC0+IHZvaWQ6CmdldFVzZXJEZXBvc2l0OgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MzAKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgcHVzaGludCAzMiAvLyAzMgogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC5zdGF0aWNfYXJyYXk8YXJjNC51aW50OCwgMzI+CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYzMgogICAgLy8gcmV0dXJuIHRoaXMuZGVwb3NpdGVkQW1vdW50KHVzZXIpLnZhbHVlOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQKICAgIC8vIGRlcG9zaXRlZEFtb3VudCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAvLyBVc2VyJ3MgQWxwaGEgYmFsYW5jZSBpbiB2YXVsdAogICAgYnl0ZWNfMyAvLyAiZGVwb3NpdGVkQW1vdW50IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MzIKICAgIC8vIHJldHVybiB0aGlzLmRlcG9zaXRlZEFtb3VudCh1c2VyKS52YWx1ZTsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBMb2NhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2MzAKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICBpdG9iCiAgICBieXRlYyAxMiAvLyAweDE1MWY3Yzc1CiAgICBzd2FwCiAgICBjb25jYXQKICAgIGxvZwogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LmdldFN3YXBRdW90ZVtyb3V0aW5nXSgpIC0+IHZvaWQ6CmdldFN3YXBRdW90ZToKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQyCiAgICAvLyBjb25zdCBhcHBBZGRyOiBBY2NvdW50ID0gR2xvYmFsLmN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3M7CiAgICBnbG9iYWwgQ3VycmVudEFwcGxpY2F0aW9uQWRkcmVzcwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NDMKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy55aWVsZEFzc2V0LnZhbHVlKS5iYWxhbmNlKGFwcEFkZHIpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDMKICAgIC8vIHlpZWxkQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBVU0RDIEFTQSBJRCAod2hhdCBhaXJkcm9wcyBjb21lIGluIGFzKQogICAgYnl0ZWMgNCAvLyAieWllbGRBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQzCiAgICAvLyBjb25zdCB1c2RjQmFsYW5jZSA9IEFzc2V0KHRoaXMueWllbGRBc3NldC52YWx1ZSkuYmFsYW5jZShhcHBBZGRyKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBhc3NldF9ob2xkaW5nX2dldCBBc3NldEJhbGFuY2UKICAgIHN3YXAKICAgIGR1cAogICAgdW5jb3ZlciAyCiAgICBhc3NlcnQgLy8gYWNjb3VudCBvcHRlZCBpbnRvIGFzc2V0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY0NQogICAgLy8gaWYgKHVzZGNCYWxhbmNlID09PSBVaW50NjQoMCkpIHsKICAgIGJueiBnZXRTd2FwUXVvdGVfYWZ0ZXJfaWZfZWxzZUAzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY0NgogICAgLy8gcmV0dXJuIFtVaW50NjQoMCksIFVpbnQ2NCgwKSwgVWludDY0KDApXTsKICAgIHB1c2hieXRlcyAweDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMAoKZ2V0U3dhcFF1b3RlX2FmdGVyX2lubGluZWRfUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQuZ2V0U3dhcFF1b3RlQDQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY0MAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgcmVhZG9ubHk6IHRydWUgfSkKICAgIGJ5dGVjIDEyIC8vIDB4MTUxZjdjNzUKICAgIHN3YXAKICAgIGNvbmNhdAogICAgbG9nCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgpnZXRTd2FwUXVvdGVfYWZ0ZXJfaWZfZWxzZUAzOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NDkKICAgIC8vIGNvbnN0IGV4cGVjdGVkT3V0cHV0ID0gdGhpcy5nZXRFeHBlY3RlZFN3YXBPdXRwdXQodXNkY0JhbGFuY2UpOwogICAgZHVwbiAyCiAgICBjYWxsc3ViIGdldEV4cGVjdGVkU3dhcE91dHB1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4NwogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBkdXAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjUxCiAgICAvLyBjb25zdCBtaW5BdDUwQnBzID0gdGhpcy5tdWxEaXZGbG9vcihleHBlY3RlZE91dHB1dCwgRkVFX0JQU19CQVNFIC0gVWludDY0KDUwKSwgRkVFX0JQU19CQVNFKTsKICAgIHB1c2hpbnQgOTk1MCAvLyA5OTUwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg3CiAgICAvLyBjb25zdCBbaGksIGxvXSA9IG11bHcobjEsIG4yKTsKICAgIG11bHcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODgKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NTEKICAgIC8vIGNvbnN0IG1pbkF0NTBCcHMgPSB0aGlzLm11bERpdkZsb29yKGV4cGVjdGVkT3V0cHV0LCBGRUVfQlBTX0JBU0UgLSBVaW50NjQoNTApLCBGRUVfQlBTX0JBU0UpOwogICAgaW50YyA0IC8vIDEwMDAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg4CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBzd2FwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg5CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NTMKICAgIC8vIHJldHVybiBbdXNkY0JhbGFuY2UsIGV4cGVjdGVkT3V0cHV0LCBtaW5BdDUwQnBzXTsKICAgIHVuY292ZXIgMgogICAgaXRvYgogICAgdW5jb3ZlciAyCiAgICBpdG9iCiAgICBjb25jYXQKICAgIHN3YXAKICAgIGl0b2IKICAgIGNvbmNhdAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NDAKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICBiIGdldFN3YXBRdW90ZV9hZnRlcl9pbmxpbmVkX1JhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LmdldFN3YXBRdW90ZUA0CgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQudXBkYXRlTWluU3dhcFRocmVzaG9sZFtyb3V0aW5nXSgpIC0+IHZvaWQ6CnVwZGF0ZU1pblN3YXBUaHJlc2hvbGQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY2MwogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjY1CiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY2NgogICAgLy8gY29uc3QgaXNDcmVhdG9yID0gVHhuLnNlbmRlciA9PT0gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZTsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ3CiAgICAvLyBjcmVhdG9yQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7ICAgLy8gVmF1bHQgY3JlYXRvciB3aG8gcmVjZWl2ZXMgZmVlCiAgICBieXRlY18yIC8vICJjcmVhdG9yQWRkcmVzcyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjY2CiAgICAvLyBjb25zdCBpc0NyZWF0b3IgPSBUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY2NwogICAgLy8gY29uc3QgaXNSYXJlZmkgPSBUeG4uc2VuZGVyID09PSB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWU7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0OAogICAgLy8gcmFyZWZpQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7ICAgIC8vIFJhcmVGaSBwbGF0Zm9ybSBhZGRyZXNzIChjYW4gYWxzbyB0cmlnZ2VyIHN3YXBzKQogICAgYnl0ZWMgMTEgLy8gInJhcmVmaUFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY2NwogICAgLy8gY29uc3QgaXNSYXJlZmkgPSBUeG4uc2VuZGVyID09PSB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjY4CiAgICAvLyBhc3NlcnQoaXNDcmVhdG9yIHx8IGlzUmFyZWZpLCAnT25seSBjcmVhdG9yIG9yIFJhcmVGaSBjYW4gdXBkYXRlJyk7CiAgICB8fAogICAgYXNzZXJ0IC8vIE9ubHkgY3JlYXRvciBvciBSYXJlRmkgY2FuIHVwZGF0ZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NjkKICAgIC8vIGFzc2VydChuZXdUaHJlc2hvbGQgPj0gTUlOX1NXQVBfQU1PVU5ULCAnVGhyZXNob2xkIHRvbyBsb3cnKTsKICAgIGR1cAogICAgaW50YyA2IC8vIDIwMDAwMAogICAgPj0KICAgIGFzc2VydCAvLyBUaHJlc2hvbGQgdG9vIGxvdwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NzAKICAgIC8vIGFzc2VydChuZXdUaHJlc2hvbGQgPD0gTUFYX1NXQVBfVEhSRVNIT0xELCAnVGhyZXNob2xkIHRvbyBoaWdoIChtYXggNTAgVVNEQyknKTsKICAgIGR1cAogICAgaW50YyA3IC8vIDUwMDAwMDAwCiAgICA8PQogICAgYXNzZXJ0IC8vIFRocmVzaG9sZCB0b28gaGlnaCAobWF4IDUwIFVTREMpCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU1CiAgICAvLyBtaW5Td2FwVGhyZXNob2xkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgLy8gTWluaW11bSBVU0RDIGJlZm9yZSBzd2FwIGFsbG93ZWQKICAgIGJ5dGVjIDEzIC8vICJtaW5Td2FwVGhyZXNob2xkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NzEKICAgIC8vIHRoaXMubWluU3dhcFRocmVzaG9sZC52YWx1ZSA9IG5ld1RocmVzaG9sZDsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY2MwogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjpSYXJlRmlWYXVsdC51cGRhdGVNYXhTbGlwcGFnZVtyb3V0aW5nXSgpIC0+IHZvaWQ6CnVwZGF0ZU1heFNsaXBwYWdlOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NzgKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgaW50Y18yIC8vIDgKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQudWludDY0CiAgICBidG9pCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY4MAogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2ODEKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiB1cGRhdGUgbWF4IHNsaXBwYWdlJyk7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMiAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY4MQogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIHVwZGF0ZSBtYXggc2xpcHBhZ2UnKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgYXNzZXJ0IC8vIE9ubHkgY3JlYXRvciBjYW4gdXBkYXRlIG1heCBzbGlwcGFnZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2ODIKICAgIC8vIGFzc2VydChuZXdNYXhTbGlwcGFnZUJwcyA+PSBNSU5fTUFYX1NMSVBQQUdFX0JQUywgJ01heCBzbGlwcGFnZSB0b28gbG93IChtaW4gNSUpJyk7CiAgICBkdXAKICAgIHB1c2hpbnQgNTAwIC8vIDUwMAogICAgPj0KICAgIGFzc2VydCAvLyBNYXggc2xpcHBhZ2UgdG9vIGxvdyAobWluIDUlKQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2ODMKICAgIC8vIGFzc2VydChuZXdNYXhTbGlwcGFnZUJwcyA8PSBNQVhfU0xJUFBBR0VfQlBTLCAnTWF4IHNsaXBwYWdlIHRvbyBoaWdoJyk7CiAgICBkdXAKICAgIGludGMgNCAvLyAxMDAwMAogICAgPD0KICAgIGFzc2VydCAvLyBNYXggc2xpcHBhZ2UgdG9vIGhpZ2gKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTYKICAgIC8vIG1heFNsaXBwYWdlQnBzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAvLyBNYXhpbXVtIHNsaXBwYWdlIHRvbGVyYW5jZSBpbiBiYXNpcyBwb2ludHMKICAgIGJ5dGVjIDE0IC8vICJtYXhTbGlwcGFnZUJwcyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Njg0CiAgICAvLyB0aGlzLm1heFNsaXBwYWdlQnBzLnZhbHVlID0gbmV3TWF4U2xpcHBhZ2VCcHM7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NzgKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQudXBkYXRlQ3JlYXRvckFkZHJlc3Nbcm91dGluZ10oKSAtPiB2b2lkOgp1cGRhdGVDcmVhdG9yQWRkcmVzczoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjkxCiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZHVwCiAgICBsZW4KICAgIHB1c2hpbnQgMzIgLy8gMzIKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQuc3RhdGljX2FycmF5PGFyYzQudWludDgsIDMyPgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2OTMKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Njk0CiAgICAvLyBhc3NlcnQoVHhuLnNlbmRlciA9PT0gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZSwgJ09ubHkgY3JlYXRvciBjYW4gdXBkYXRlJyk7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMiAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY5NAogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIHVwZGF0ZScpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICBhc3NlcnQgLy8gT25seSBjcmVhdG9yIGNhbiB1cGRhdGUKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Njk1CiAgICAvLyBhc3NlcnQobmV3Q3JlYXRvckFkZHJlc3MgIT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ0Nhbm5vdCBzZXQgemVybyBhZGRyZXNzJyk7CiAgICBkdXAKICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgIT0KICAgIGFzc2VydCAvLyBDYW5ub3Qgc2V0IHplcm8gYWRkcmVzcwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMiAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY5NgogICAgLy8gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZSA9IG5ld0NyZWF0b3JBZGRyZXNzOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjkxCiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LnVwZGF0ZVJhcmVmaUFkZHJlc3Nbcm91dGluZ10oKSAtPiB2b2lkOgp1cGRhdGVSYXJlZmlBZGRyZXNzOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3MDMKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgcHVzaGludCAzMiAvLyAzMgogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC5zdGF0aWNfYXJyYXk8YXJjNC51aW50OCwgMzI+CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjcwNQogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3MDYKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWUsICdPbmx5IFJhcmVGaSBjYW4gdXBkYXRlJyk7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0OAogICAgLy8gcmFyZWZpQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7ICAgIC8vIFJhcmVGaSBwbGF0Zm9ybSBhZGRyZXNzIChjYW4gYWxzbyB0cmlnZ2VyIHN3YXBzKQogICAgYnl0ZWMgMTEgLy8gInJhcmVmaUFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjcwNgogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMucmFyZWZpQWRkcmVzcy52YWx1ZSwgJ09ubHkgUmFyZUZpIGNhbiB1cGRhdGUnKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgYXNzZXJ0IC8vIE9ubHkgUmFyZUZpIGNhbiB1cGRhdGUKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzA3CiAgICAvLyBhc3NlcnQobmV3UmFyZWZpQWRkcmVzcyAhPT0gR2xvYmFsLnplcm9BZGRyZXNzLCAnQ2Fubm90IHNldCB6ZXJvIGFkZHJlc3MnKTsKICAgIGR1cAogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICAhPQogICAgYXNzZXJ0IC8vIENhbm5vdCBzZXQgemVybyBhZGRyZXNzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQ4CiAgICAvLyByYXJlZmlBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAgLy8gUmFyZUZpIHBsYXRmb3JtIGFkZHJlc3MgKGNhbiBhbHNvIHRyaWdnZXIgc3dhcHMpCiAgICBieXRlYyAxMSAvLyAicmFyZWZpQWRkcmVzcyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzA4CiAgICAvLyB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWUgPSBuZXdSYXJlZmlBZGRyZXNzOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzAzCiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LnVwZGF0ZUNyZWF0b3JGZWVSYXRlW3JvdXRpbmddKCkgLT4gdm9pZDoKdXBkYXRlQ3JlYXRvckZlZVJhdGU6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjcxNQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzE3CiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjcxOAogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIHVwZGF0ZSBmZWUgcmF0ZScpOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDcKICAgIC8vIGNyZWF0b3JBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAvLyBWYXVsdCBjcmVhdG9yIHdobyByZWNlaXZlcyBmZWUKICAgIGJ5dGVjXzIgLy8gImNyZWF0b3JBZGRyZXNzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3MTgKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiB1cGRhdGUgZmVlIHJhdGUnKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgYXNzZXJ0IC8vIE9ubHkgY3JlYXRvciBjYW4gdXBkYXRlIGZlZSByYXRlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjcxOQogICAgLy8gYXNzZXJ0KG5ld0ZlZVJhdGUgPD0gTUFYX0ZFRV9SQVRFLCAnRmVlIHJhdGUgZXhjZWVkcyBtYXhpbXVtICg2JSknKTsKICAgIGR1cAogICAgcHVzaGludCA2IC8vIDYKICAgIDw9CiAgICBhc3NlcnQgLy8gRmVlIHJhdGUgZXhjZWVkcyBtYXhpbXVtICg2JSkKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDkKICAgIC8vIGNyZWF0b3JGZWVSYXRlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAvLyAwLTEwMCwgcGVyY2VudGFnZSBvZiB5aWVsZCB0byBjcmVhdG9yCiAgICBieXRlYyAxNyAvLyAiY3JlYXRvckZlZVJhdGUiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjcyMAogICAgLy8gdGhpcy5jcmVhdG9yRmVlUmF0ZS52YWx1ZSA9IG5ld0ZlZVJhdGU7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3MTUKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQuY29udHJpYnV0ZUZhcm1bcm91dGluZ10oKSAtPiB2b2lkOgpjb250cmlidXRlRmFybToKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzM2CiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjczNwogICAgLy8gY29uc3QgYXBwQWRkcjogQWNjb3VudCA9IEdsb2JhbC5jdXJyZW50QXBwbGljYXRpb25BZGRyZXNzOwogICAgZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzM4CiAgICAvLyBjb25zdCBjdXJyZW50SW5kZXggPSBUeG4uZ3JvdXBJbmRleDsKICAgIHR4biBHcm91cEluZGV4CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjczOQogICAgLy8gYXNzZXJ0KGN1cnJlbnRJbmRleCA+PSBVaW50NjQoMSksICdBcHAgY2FsbCBtdXN0IGZvbGxvdyBhc3NldCB0cmFuc2ZlcicpOwogICAgZHVwCiAgICBhc3NlcnQgLy8gQXBwIGNhbGwgbXVzdCBmb2xsb3cgYXNzZXQgdHJhbnNmZXIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQyCiAgICAvLyBjb25zdCBmYXJtVHJhbnNmZXIgPSBndHhuLkFzc2V0VHJhbnNmZXJUeG4oY3VycmVudEluZGV4IC0gVWludDY0KDEpKTsKICAgIGludGNfMSAvLyAxCiAgICAtCiAgICBkdXAKICAgIGd0eG5zIFR5cGVFbnVtCiAgICBpbnRjXzMgLy8gYXhmZXIKICAgID09CiAgICBhc3NlcnQgLy8gdHJhbnNhY3Rpb24gdHlwZSBpcyBheGZlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NDMKICAgIC8vIGFzc2VydChmYXJtVHJhbnNmZXIueGZlckFzc2V0ID09PSBBc3NldCh0aGlzLnN3YXBBc3NldC52YWx1ZSksICdNdXN0IHRyYW5zZmVyIHN3YXAgYXNzZXQnKTsKICAgIGR1cAogICAgZ3R4bnMgWGZlckFzc2V0CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NAogICAgLy8gc3dhcEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFByb2plY3QncyBBU0EgSUQgKHdoYXQgeWllbGQgaXMgc3dhcHBlZCB0bykKICAgIGJ5dGVjIDUgLy8gInN3YXBBc3NldCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQzCiAgICAvLyBhc3NlcnQoZmFybVRyYW5zZmVyLnhmZXJBc3NldCA9PT0gQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLCAnTXVzdCB0cmFuc2ZlciBzd2FwIGFzc2V0Jyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIGFzc2VydCAvLyBNdXN0IHRyYW5zZmVyIHN3YXAgYXNzZXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzQ0CiAgICAvLyBhc3NlcnQoZmFybVRyYW5zZmVyLmFzc2V0UmVjZWl2ZXIgPT09IGFwcEFkZHIsICdNdXN0IHNlbmQgdG8gY29udHJhY3QnKTsKICAgIGR1cAogICAgZ3R4bnMgQXNzZXRSZWNlaXZlcgogICAgdW5jb3ZlciAyCiAgICA9PQogICAgYXNzZXJ0IC8vIE11c3Qgc2VuZCB0byBjb250cmFjdAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NDUKICAgIC8vIGFzc2VydChmYXJtVHJhbnNmZXIuc2VuZGVyID09PSBUeG4uc2VuZGVyLCAnVHJhbnNmZXIgbXVzdCBiZSBmcm9tIGNhbGxlcicpOwogICAgZHVwCiAgICBndHhucyBTZW5kZXIKICAgIHR4biBTZW5kZXIKICAgID09CiAgICBhc3NlcnQgLy8gVHJhbnNmZXIgbXVzdCBiZSBmcm9tIGNhbGxlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NDgKICAgIC8vIGFzc2VydChmYXJtVHJhbnNmZXIucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIGR1cAogICAgZ3R4bnMgUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc0OQogICAgLy8gYXNzZXJ0KGZhcm1UcmFuc2Zlci5hc3NldENsb3NlVG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ2Fzc2V0Q2xvc2VUbyBtdXN0IGJlIHplcm8nKTsKICAgIGR1cAogICAgZ3R4bnMgQXNzZXRDbG9zZVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gYXNzZXRDbG9zZVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NTEKICAgIC8vIGNvbnN0IGFtb3VudCA9IGZhcm1UcmFuc2Zlci5hc3NldEFtb3VudDsKICAgIGd0eG5zIEFzc2V0QW1vdW50CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc1MgogICAgLy8gYXNzZXJ0KGFtb3VudCA+IFVpbnQ2NCgwKSwgJ0NvbnRyaWJ1dGlvbiBtdXN0IGJlIHBvc2l0aXZlJyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBDb250cmlidXRpb24gbXVzdCBiZSBwb3NpdGl2ZQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NTUKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlICsgYW1vdW50OwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIHN3YXBBc3NldCBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzEgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NTUKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlICsgYW1vdW50OwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgICsKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIHN3YXBBc3NldCBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzEgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NTUKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlICsgYW1vdW50OwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzM0CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LnNldEVtaXNzaW9uUmF0aW9bcm91dGluZ10oKSAtPiB2b2lkOgpzZXRFbWlzc2lvblJhdGlvOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NjUKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgaW50Y18yIC8vIDgKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQudWludDY0CiAgICBidG9pCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc2NwogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NjgKICAgIC8vIGNvbnN0IGlzQ3JlYXRvciA9IFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWU7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMiAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc2OAogICAgLy8gY29uc3QgaXNDcmVhdG9yID0gVHhuLnNlbmRlciA9PT0gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NjkKICAgIC8vIGNvbnN0IGlzUmFyZWZpID0gVHhuLnNlbmRlciA9PT0gdGhpcy5yYXJlZmlBZGRyZXNzLnZhbHVlOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDgKICAgIC8vIHJhcmVmaUFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgICAvLyBSYXJlRmkgcGxhdGZvcm0gYWRkcmVzcyAoY2FuIGFsc28gdHJpZ2dlciBzd2FwcykKICAgIGJ5dGVjIDExIC8vICJyYXJlZmlBZGRyZXNzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NjkKICAgIC8vIGNvbnN0IGlzUmFyZWZpID0gVHhuLnNlbmRlciA9PT0gdGhpcy5yYXJlZmlBZGRyZXNzLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc3MAogICAgLy8gYXNzZXJ0KGlzQ3JlYXRvciB8fCBpc1JhcmVmaSwgJ09ubHkgY3JlYXRvciBvciBSYXJlRmkgY2FuIHNldCBlbWlzc2lvbiByYXRpbycpOwogICAgfHwKICAgIGFzc2VydCAvLyBPbmx5IGNyZWF0b3Igb3IgUmFyZUZpIGNhbiBzZXQgZW1pc3Npb24gcmF0aW8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzcxCiAgICAvLyBhc3NlcnQobmV3UmF0aW8gPiBVaW50NjQoMCksICdFbWlzc2lvbiByYXRpbyBtdXN0IGJlIHBvc2l0aXZlJyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBFbWlzc2lvbiByYXRpbyBtdXN0IGJlIHBvc2l0aXZlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY1CiAgICAvLyBlbWlzc2lvblJhdGlvID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBNdWx0aXBsaWVyIGZvciBkeW5hbWljIHJhdGU6IHJhdGUgPSBmYXJtQmFsYW5jZSAqIGVtaXNzaW9uUmF0aW8gLyB0b3RhbERlcG9zaXRzCiAgICBieXRlYyA5IC8vICJlbWlzc2lvblJhdGlvIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3NzMKICAgIC8vIHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSA9IG5ld1JhdGlvOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzY1CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LmdldEZhcm1TdGF0c1tyb3V0aW5nXSgpIC0+IHZvaWQ6CmdldEZhcm1TdGF0czoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzgyCiAgICAvLyBsZXQgY3VycmVudFJhdGU6IHVpbnQ2NCA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc4MwogICAgLy8gaWYgKHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSA+IFVpbnQ2NCgwKSAmJiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBkdXAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjUKICAgIC8vIGVtaXNzaW9uUmF0aW8gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIE11bHRpcGxpZXIgZm9yIGR5bmFtaWMgcmF0ZTogcmF0ZSA9IGZhcm1CYWxhbmNlICogZW1pc3Npb25SYXRpbyAvIHRvdGFsRGVwb3NpdHMKICAgIGJ5dGVjIDkgLy8gImVtaXNzaW9uUmF0aW8iCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc4MwogICAgLy8gaWYgKHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSA+IFVpbnQ2NCgwKSAmJiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYnogZ2V0RmFybVN0YXRzX2FmdGVyX2lmX2Vsc2VANAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIHN3YXBBc3NldCBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzEgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3ODMKICAgIC8vIGlmICh0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUgPiBVaW50NjQoMCkgJiYgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA+IFVpbnQ2NCgwKSkgewogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGJ6IGdldEZhcm1TdGF0c19hZnRlcl9pZl9lbHNlQDQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Nzg0CiAgICAvLyBjdXJyZW50UmF0ZSA9IHRoaXMuY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZSgpOwogICAgY2FsbHN1YiBjYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlCiAgICBidXJ5IDEKCmdldEZhcm1TdGF0c19hZnRlcl9pZl9lbHNlQDQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc4NgogICAgLy8gcmV0dXJuIFt0aGlzLmZhcm1CYWxhbmNlLnZhbHVlLCB0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUsIGN1cnJlbnRSYXRlXTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBzd2FwQXNzZXQgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18xIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6Nzg2CiAgICAvLyByZXR1cm4gW3RoaXMuZmFybUJhbGFuY2UudmFsdWUsIHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSwgY3VycmVudFJhdGVdOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY1CiAgICAvLyBlbWlzc2lvblJhdGlvID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBNdWx0aXBsaWVyIGZvciBkeW5hbWljIHJhdGU6IHJhdGUgPSBmYXJtQmFsYW5jZSAqIGVtaXNzaW9uUmF0aW8gLyB0b3RhbERlcG9zaXRzCiAgICBieXRlYyA5IC8vICJlbWlzc2lvblJhdGlvIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo3ODYKICAgIC8vIHJldHVybiBbdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSwgdGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlLCBjdXJyZW50UmF0ZV07CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgc3dhcAogICAgaXRvYgogICAgc3dhcAogICAgaXRvYgogICAgY29uY2F0CiAgICBkaWcgMQogICAgaXRvYgogICAgY29uY2F0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc4MAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgcmVhZG9ubHk6IHRydWUgfSkKICAgIGJ5dGVjIDEyIC8vIDB4MTUxZjdjNzUKICAgIHN3YXAKICAgIGNvbmNhdAogICAgbG9nCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQuY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZSgpIC0+IHVpbnQ2NDoKY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZToKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OTcKICAgIC8vIHByaXZhdGUgY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZSgpOiB1aW50NjQgewogICAgcHJvdG8gMCAxCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjk4CiAgICAvLyBjb25zdCB0b3RhbERlcG9zaXRlZCA9IHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbERlcG9zaXRzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgLy8gVG90YWwgQWxwaGEgZGVwb3NpdGVkIGluIHZhdWx0CiAgICBieXRlY18wIC8vICJ0b3RhbERlcG9zaXRzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo5OAogICAgLy8gY29uc3QgdG90YWxEZXBvc2l0ZWQgPSB0aGlzLnRvdGFsRGVwb3NpdHMudmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgc3dhcAogICAgZHVwCiAgICB1bmNvdmVyIDIKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTAwCiAgICAvLyBpZiAodG90YWxEZXBvc2l0ZWQgPT09IFVpbnQ2NCgwKSB8fCB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID09PSBVaW50NjQoMCkpIHsKICAgIGJ6IGNhbGN1bGF0ZUR5bmFtaWNFbWlzc2lvblJhdGVfaWZfYm9keUAyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgc3dhcEFzc2V0IGF2YWlsYWJsZSBmb3IgZmFybSBib251cwogICAgYnl0ZWNfMSAvLyAiZmFybUJhbGFuY2UiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjEwMAogICAgLy8gaWYgKHRvdGFsRGVwb3NpdGVkID09PSBVaW50NjQoMCkgfHwgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA9PT0gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYm56IGNhbGN1bGF0ZUR5bmFtaWNFbWlzc2lvblJhdGVfYWZ0ZXJfaWZfZWxzZUAzCgpjYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlX2lmX2JvZHlAMjoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTAxCiAgICAvLyByZXR1cm4gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIHN3YXAKICAgIHJldHN1YgoKY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZV9hZnRlcl9pZl9lbHNlQDM6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjEwNAogICAgLy8gY29uc3QgZHluYW1pY1JhdGUgPSB0aGlzLm11bERpdkZsb29yKHRoaXMuZmFybUJhbGFuY2UudmFsdWUsIHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSwgdG90YWxEZXBvc2l0ZWQpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIHN3YXBBc3NldCBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzEgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxMDQKICAgIC8vIGNvbnN0IGR5bmFtaWNSYXRlID0gdGhpcy5tdWxEaXZGbG9vcih0aGlzLmZhcm1CYWxhbmNlLnZhbHVlLCB0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUsIHRvdGFsRGVwb3NpdGVkKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NQogICAgLy8gZW1pc3Npb25SYXRpbyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gTXVsdGlwbGllciBmb3IgZHluYW1pYyByYXRlOiByYXRlID0gZmFybUJhbGFuY2UgKiBlbWlzc2lvblJhdGlvIC8gdG90YWxEZXBvc2l0cwogICAgYnl0ZWMgOSAvLyAiZW1pc3Npb25SYXRpbyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTA0CiAgICAvLyBjb25zdCBkeW5hbWljUmF0ZSA9IHRoaXMubXVsRGl2Rmxvb3IodGhpcy5mYXJtQmFsYW5jZS52YWx1ZSwgdGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlLCB0b3RhbERlcG9zaXRlZCk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4NwogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBtdWx3CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg4CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgaW50Y18wIC8vIDAKICAgIGZyYW1lX2RpZyAwCiAgICBkaXZtb2R3CiAgICBwb3BuIDIKICAgIHN3YXAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODkKICAgIC8vIGFzc2VydChxX2hpID09PSBVaW50NjQoMCksICdNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcicpOwogICAgIQogICAgYXNzZXJ0IC8vIE11bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjEwNgogICAgLy8gcmV0dXJuIGR5bmFtaWNSYXRlIDwgTUlOX0ZBUk1fRU1JU1NJT05fQlBTID8gTUlOX0ZBUk1fRU1JU1NJT05fQlBTIDogZHluYW1pY1JhdGU7CiAgICBkdXAKICAgIHB1c2hpbnQgMTAwMCAvLyAxMDAwCiAgICA8CiAgICBwdXNoaW50IDEwMDAgLy8gMTAwMAogICAgc3dhcAogICAgc2VsZWN0CiAgICBzd2FwCiAgICByZXRzdWIKCgovLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjpSYXJlRmlWYXVsdC51cGRhdGVFYXJuZWRZaWVsZCh1c2VyOiBieXRlcykgLT4gdm9pZDoKdXBkYXRlRWFybmVkWWllbGQ6CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjExMwogICAgLy8gcHJpdmF0ZSB1cGRhdGVFYXJuZWRZaWVsZCh1c2VyOiBBY2NvdW50KTogdm9pZCB7CiAgICBwcm90byAxIDAKICAgIHB1c2hieXRlcyAiIgogICAgZHVwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjExNAogICAgLy8gY29uc3QgZGVwb3NpdGVkID0gdGhpcy5kZXBvc2l0ZWRBbW91bnQodXNlcikudmFsdWU7CiAgICBmcmFtZV9kaWcgLTEKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc0CiAgICAvLyBkZXBvc2l0ZWRBbW91bnQgPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgICAgLy8gVXNlcidzIEFscGhhIGJhbGFuY2UgaW4gdmF1bHQKICAgIGJ5dGVjXzMgLy8gImRlcG9zaXRlZEFtb3VudCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTE0CiAgICAvLyBjb25zdCBkZXBvc2l0ZWQgPSB0aGlzLmRlcG9zaXRlZEFtb3VudCh1c2VyKS52YWx1ZTsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIHN3YXAKICAgIGR1cAogICAgdW5jb3ZlciAyCiAgICBhc3NlcnQgLy8gY2hlY2sgTG9jYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTE2CiAgICAvLyBpZiAoZGVwb3NpdGVkID4gVWludDY0KDApKSB7CiAgICBieiB1cGRhdGVFYXJuZWRZaWVsZF9hZnRlcl9pZl9lbHNlQDQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTE4CiAgICAvLyBjb25zdCBjdXJyZW50WVBUID0gdGhpcy55aWVsZFBlclRva2VuLnZhbHVlOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHlpZWxkUGVyVG9rZW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBBY2N1bXVsYXRvciBmb3IgeWllbGQgZGlzdHJpYnV0aW9uIChzY2FsZWQgYnkgU0NBTEUpCiAgICBieXRlYyA2IC8vICJ5aWVsZFBlclRva2VuIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxMTgKICAgIC8vIGNvbnN0IGN1cnJlbnRZUFQgPSB0aGlzLnlpZWxkUGVyVG9rZW4udmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgc3dhcAogICAgZHVwCiAgICBjb3ZlciAyCiAgICBmcmFtZV9idXJ5IDAKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTE5CiAgICAvLyBjb25zdCB1c2VyWVBUID0gdGhpcy51c2VyWWllbGRQZXJUb2tlbih1c2VyKS52YWx1ZTsKICAgIGZyYW1lX2RpZyAtMQogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzUKICAgIC8vIHVzZXJZaWVsZFBlclRva2VuID0gTG9jYWxTdGF0ZTx1aW50NjQ+KCk7ICAvLyBTbmFwc2hvdCBvZiB5aWVsZFBlclRva2VuIGF0IGxhc3QgYWN0aW9uCiAgICBieXRlYyAxNiAvLyAidXNlcllpZWxkUGVyVG9rZW4iCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjExOQogICAgLy8gY29uc3QgdXNlcllQVCA9IHRoaXMudXNlcllpZWxkUGVyVG9rZW4odXNlcikudmFsdWU7CiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBzd2FwCiAgICBkdXAKICAgIGNvdmVyIDIKICAgIGZyYW1lX2J1cnkgMQogICAgYXNzZXJ0IC8vIGNoZWNrIExvY2FsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjEyMQogICAgLy8gaWYgKGN1cnJlbnRZUFQgPiB1c2VyWVBUKSB7CiAgICA+CiAgICBieiB1cGRhdGVFYXJuZWRZaWVsZF9hZnRlcl9pZl9lbHNlQDQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTIyCiAgICAvLyBjb25zdCBwZW5kaW5nID0gdGhpcy5tdWxEaXZGbG9vcihkZXBvc2l0ZWQsIGN1cnJlbnRZUFQgLSB1c2VyWVBULCBTQ0FMRSk7CiAgICBmcmFtZV9kaWcgMAogICAgZnJhbWVfZGlnIDEKICAgIC0KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODcKICAgIC8vIGNvbnN0IFtoaSwgbG9dID0gbXVsdyhuMSwgbjIpOwogICAgZnJhbWVfZGlnIDIKICAgIG11bHcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODgKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxMjIKICAgIC8vIGNvbnN0IHBlbmRpbmcgPSB0aGlzLm11bERpdkZsb29yKGRlcG9zaXRlZCwgY3VycmVudFlQVCAtIHVzZXJZUFQsIFNDQUxFKTsKICAgIGludGMgNSAvLyAxMDAwMDAwMDAwMDAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg4CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBzd2FwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg5CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxMjMKICAgIC8vIHRoaXMuZWFybmVkWWllbGQodXNlcikudmFsdWUgPSB0aGlzLmVhcm5lZFlpZWxkKHVzZXIpLnZhbHVlICsgcGVuZGluZzsKICAgIGZyYW1lX2RpZyAtMQogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NzYKICAgIC8vIGVhcm5lZFlpZWxkID0gTG9jYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBBY2N1bXVsYXRlZCB5aWVsZCBub3QgeWV0IGNsYWltZWQKICAgIGJ5dGVjIDcgLy8gImVhcm5lZFlpZWxkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxMjMKICAgIC8vIHRoaXMuZWFybmVkWWllbGQodXNlcikudmFsdWUgPSB0aGlzLmVhcm5lZFlpZWxkKHVzZXIpLnZhbHVlICsgcGVuZGluZzsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBMb2NhbFN0YXRlIGV4aXN0cwogICAgKwogICAgZnJhbWVfZGlnIC0xCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc2CiAgICAvLyBlYXJuZWRZaWVsZCA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gQWNjdW11bGF0ZWQgeWllbGQgbm90IHlldCBjbGFpbWVkCiAgICBieXRlYyA3IC8vICJlYXJuZWRZaWVsZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTIzCiAgICAvLyB0aGlzLmVhcm5lZFlpZWxkKHVzZXIpLnZhbHVlID0gdGhpcy5lYXJuZWRZaWVsZCh1c2VyKS52YWx1ZSArIHBlbmRpbmc7CiAgICB1bmNvdmVyIDIKICAgIGFwcF9sb2NhbF9wdXQKCnVwZGF0ZUVhcm5lZFlpZWxkX2FmdGVyX2lmX2Vsc2VANDoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTI4CiAgICAvLyB0aGlzLnVzZXJZaWVsZFBlclRva2VuKHVzZXIpLnZhbHVlID0gdGhpcy55aWVsZFBlclRva2VuLnZhbHVlOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHlpZWxkUGVyVG9rZW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAvLyBBY2N1bXVsYXRvciBmb3IgeWllbGQgZGlzdHJpYnV0aW9uIChzY2FsZWQgYnkgU0NBTEUpCiAgICBieXRlYyA2IC8vICJ5aWVsZFBlclRva2VuIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxMjgKICAgIC8vIHRoaXMudXNlcllpZWxkUGVyVG9rZW4odXNlcikudmFsdWUgPSB0aGlzLnlpZWxkUGVyVG9rZW4udmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgZnJhbWVfZGlnIC0xCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjc1CiAgICAvLyB1c2VyWWllbGRQZXJUb2tlbiA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgLy8gU25hcHNob3Qgb2YgeWllbGRQZXJUb2tlbiBhdCBsYXN0IGFjdGlvbgogICAgYnl0ZWMgMTYgLy8gInVzZXJZaWVsZFBlclRva2VuIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxMjgKICAgIC8vIHRoaXMudXNlcllpZWxkUGVyVG9rZW4odXNlcikudmFsdWUgPSB0aGlzLnlpZWxkUGVyVG9rZW4udmFsdWU7CiAgICB1bmNvdmVyIDIKICAgIGFwcF9sb2NhbF9wdXQKICAgIHJldHN1YgoKCi8vIFJhcmVGaVZhdWx0LmFsZ28udHM6OlJhcmVGaVZhdWx0LmdldEV4cGVjdGVkU3dhcE91dHB1dChpbnB1dEFtb3VudDogdWludDY0KSAtPiB1aW50NjQ6CmdldEV4cGVjdGVkU3dhcE91dHB1dDoKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTM4CiAgICAvLyBwcml2YXRlIGdldEV4cGVjdGVkU3dhcE91dHB1dChpbnB1dEFtb3VudDogdWludDY0KTogdWludDY0IHsKICAgIHByb3RvIDEgMQogICAgcHVzaGJ5dGVzICIiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjEzOQogICAgLy8gY29uc3QgcG9vbEFwcCA9IHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYwCiAgICAvLyB0aW55bWFuUG9vbEFwcElkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgLy8gVGlueW1hbiBWMiBwb29sIGFwcCBJRCAoVVNEQy9zd2FwQXNzZXQpCiAgICBieXRlYyAxOCAvLyAidGlueW1hblBvb2xBcHBJZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTM5CiAgICAvLyBjb25zdCBwb29sQXBwID0gdGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTQwCiAgICAvLyBjb25zdCBwb29sQWRkciA9IHRoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjEKICAgIC8vIHRpbnltYW5Qb29sQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7IC8vIFRpbnltYW4gcG9vbCBhZGRyZXNzCiAgICBieXRlYyAxOSAvLyAidGlueW1hblBvb2xBZGRyZXNzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxNDAKICAgIC8vIGNvbnN0IHBvb2xBZGRyID0gdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxNDMKICAgIC8vIGNvbnN0IFthc3NldDFJZCwgaGFzQXNzZXQxSWRdID0gQXBwTG9jYWwuZ2V0RXhVaW50NjQocG9vbEFkZHIsIHBvb2xBcHAsIEJ5dGVzKCdhc3NldF8xX2lkJykpOwogICAgZHVwCiAgICBkaWcgMgogICAgcHVzaGJ5dGVzICJhc3NldF8xX2lkIgogICAgYXBwX2xvY2FsX2dldF9leAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxNDQKICAgIC8vIGFzc2VydChoYXNBc3NldDFJZCwgJ0Nhbm5vdCByZWFkIHBvb2wgYXNzZXRfMV9pZCcpOwogICAgYXNzZXJ0IC8vIENhbm5vdCByZWFkIHBvb2wgYXNzZXRfMV9pZAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxNDYKICAgIC8vIGNvbnN0IFthc3NldDFSZXNlcnZlcywgaGFzQXNzZXQxUmVzZXJ2ZXNdID0gQXBwTG9jYWwuZ2V0RXhVaW50NjQocG9vbEFkZHIsIHBvb2xBcHAsIEJ5dGVzKCdhc3NldF8xX3Jlc2VydmVzJykpOwogICAgZGlnIDEKICAgIGRpZyAzCiAgICBwdXNoYnl0ZXMgImFzc2V0XzFfcmVzZXJ2ZXMiCiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBzd2FwCiAgICBjb3ZlciA0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE0NwogICAgLy8gYXNzZXJ0KGhhc0Fzc2V0MVJlc2VydmVzLCAnQ2Fubm90IHJlYWQgcG9vbCBhc3NldF8xX3Jlc2VydmVzJyk7CiAgICBhc3NlcnQgLy8gQ2Fubm90IHJlYWQgcG9vbCBhc3NldF8xX3Jlc2VydmVzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE0OQogICAgLy8gY29uc3QgW2Fzc2V0MlJlc2VydmVzLCBoYXNBc3NldDJSZXNlcnZlc10gPSBBcHBMb2NhbC5nZXRFeFVpbnQ2NChwb29sQWRkciwgcG9vbEFwcCwgQnl0ZXMoJ2Fzc2V0XzJfcmVzZXJ2ZXMnKSk7CiAgICBkaWcgMQogICAgZGlnIDMKICAgIHB1c2hieXRlcyAiYXNzZXRfMl9yZXNlcnZlcyIKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIHN3YXAKICAgIGNvdmVyIDQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTUwCiAgICAvLyBhc3NlcnQoaGFzQXNzZXQyUmVzZXJ2ZXMsICdDYW5ub3QgcmVhZCBwb29sIGFzc2V0XzJfcmVzZXJ2ZXMnKTsKICAgIGFzc2VydCAvLyBDYW5ub3QgcmVhZCBwb29sIGFzc2V0XzJfcmVzZXJ2ZXMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTUyCiAgICAvLyBjb25zdCBbdG90YWxGZWVTaGFyZSwgaGFzVG90YWxGZWVTaGFyZV0gPSBBcHBMb2NhbC5nZXRFeFVpbnQ2NChwb29sQWRkciwgcG9vbEFwcCwgQnl0ZXMoJ3RvdGFsX2ZlZV9zaGFyZScpKTsKICAgIHN3YXAKICAgIHVuY292ZXIgMgogICAgcHVzaGJ5dGVzICJ0b3RhbF9mZWVfc2hhcmUiCiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBzd2FwCiAgICBjb3ZlciAzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE1MwogICAgLy8gYXNzZXJ0KGhhc1RvdGFsRmVlU2hhcmUsICdDYW5ub3QgcmVhZCBwb29sIHRvdGFsX2ZlZV9zaGFyZScpOwogICAgYXNzZXJ0IC8vIENhbm5vdCByZWFkIHBvb2wgdG90YWxfZmVlX3NoYXJlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE1OQogICAgLy8gaWYgKGFzc2V0MUlkID09PSB0aGlzLnlpZWxkQXNzZXQudmFsdWUpIHsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjQzCiAgICAvLyB5aWVsZEFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gVVNEQyBBU0EgSUQgKHdoYXQgYWlyZHJvcHMgY29tZSBpbiBhcykKICAgIGJ5dGVjIDQgLy8gInlpZWxkQXNzZXQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE1OQogICAgLy8gaWYgKGFzc2V0MUlkID09PSB0aGlzLnlpZWxkQXNzZXQudmFsdWUpIHsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgYnogZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0X2Vsc2VfYm9keUAyCiAgICBmcmFtZV9kaWcgMQogICAgZnJhbWVfYnVyeSAwCgpnZXRFeHBlY3RlZFN3YXBPdXRwdXRfYWZ0ZXJfaWZfZWxzZUAzOgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxNzEKICAgIC8vIGNvbnN0IG5ldElucHV0ID0gdGhpcy5tdWxEaXZGbG9vcihpbnB1dEFtb3VudCwgRkVFX0JQU19CQVNFIC0gZmVlQnBzLCBGRUVfQlBTX0JBU0UpOwogICAgaW50YyA0IC8vIDEwMDAwCiAgICBmcmFtZV9kaWcgMgogICAgLQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4NwogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBmcmFtZV9kaWcgLTEKICAgIG11bHcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODgKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxNzEKICAgIC8vIGNvbnN0IG5ldElucHV0ID0gdGhpcy5tdWxEaXZGbG9vcihpbnB1dEFtb3VudCwgRkVFX0JQU19CQVNFIC0gZmVlQnBzLCBGRUVfQlBTX0JBU0UpOwogICAgaW50YyA0IC8vIDEwMDAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg4CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBzd2FwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg5CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxNzQKICAgIC8vIGNvbnN0IGV4cGVjdGVkT3V0cHV0ID0gdGhpcy5tdWxEaXZGbG9vcihvdXRwdXRSZXNlcnZlcywgbmV0SW5wdXQsIGlucHV0UmVzZXJ2ZXMgKyBuZXRJbnB1dCk7CiAgICBmcmFtZV9kaWcgMAogICAgZGlnIDEKICAgICsKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODcKICAgIC8vIGNvbnN0IFtoaSwgbG9dID0gbXVsdyhuMSwgbjIpOwogICAgY292ZXIgMgogICAgbXVsdwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4OAogICAgLy8gY29uc3QgW3FfaGksIHFfbG8sIF9yX2hpLCBfcl9sb10gPSBkaXZtb2R3KGhpLCBsbywgVWludDY0KDApLCBkKTsKICAgIGludGNfMCAvLyAwCiAgICB1bmNvdmVyIDMKICAgIGRpdm1vZHcKICAgIHBvcG4gMgogICAgc3dhcAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4OQogICAgLy8gYXNzZXJ0KHFfaGkgPT09IFVpbnQ2NCgwKSwgJ011bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yJyk7CiAgICAhCiAgICBhc3NlcnQgLy8gTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3IKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTc2CiAgICAvLyByZXR1cm4gZXhwZWN0ZWRPdXRwdXQ7CiAgICBmcmFtZV9idXJ5IDAKICAgIHJldHN1YgoKZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0X2Vsc2VfYm9keUAyOgogICAgZnJhbWVfYnVyeSAwCiAgICBmcmFtZV9kaWcgMQogICAgYiBnZXRFeHBlY3RlZFN3YXBPdXRwdXRfYWZ0ZXJfaWZfZWxzZUAzCgoKLy8gUmFyZUZpVmF1bHQuYWxnby50czo6UmFyZUZpVmF1bHQuZXhlY3V0ZVN3YXBBbmREaXN0cmlidXRlKHVzZGNCYWxhbmNlOiB1aW50NjQsIHNsaXBwYWdlQnBzOiB1aW50NjQpIC0+IHZvaWQ6CmV4ZWN1dGVTd2FwQW5kRGlzdHJpYnV0ZToKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTgzCiAgICAvLyBwcml2YXRlIGV4ZWN1dGVTd2FwQW5kRGlzdHJpYnV0ZSh1c2RjQmFsYW5jZTogdWludDY0LCBzbGlwcGFnZUJwczogdWludDY0KTogdm9pZCB7CiAgICBwcm90byAyIDAKICAgIHB1c2hieXRlcyAiIgogICAgZHVwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE4NAogICAgLy8gY29uc3QgYXBwQWRkcjogQWNjb3VudCA9IEdsb2JhbC5jdXJyZW50QXBwbGljYXRpb25BZGRyZXNzOwogICAgZ2xvYmFsIEN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3MKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTg3CiAgICAvLyBjb25zdCBleHBlY3RlZE91dHB1dCA9IHRoaXMuZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0KHVzZGNCYWxhbmNlKTsKICAgIGZyYW1lX2RpZyAtMgogICAgY2FsbHN1YiBnZXRFeHBlY3RlZFN3YXBPdXRwdXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTg4CiAgICAvLyBhc3NlcnQoZXhwZWN0ZWRPdXRwdXQgPiBVaW50NjQoMCksICdFeHBlY3RlZCBvdXRwdXQgaXMgemVybycpOwogICAgZHVwCiAgICBhc3NlcnQgLy8gRXhwZWN0ZWQgb3V0cHV0IGlzIHplcm8KICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MTkxCiAgICAvLyBjb25zdCBtaW5BbW91bnRPdXQgPSB0aGlzLm11bERpdkZsb29yKGV4cGVjdGVkT3V0cHV0LCBGRUVfQlBTX0JBU0UgLSBzbGlwcGFnZUJwcywgRkVFX0JQU19CQVNFKTsKICAgIGludGMgNCAvLyAxMDAwMAogICAgZnJhbWVfZGlnIC0xCiAgICAtCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg3CiAgICAvLyBjb25zdCBbaGksIGxvXSA9IG11bHcobjEsIG4yKTsKICAgIG11bHcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODgKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxOTEKICAgIC8vIGNvbnN0IG1pbkFtb3VudE91dCA9IHRoaXMubXVsRGl2Rmxvb3IoZXhwZWN0ZWRPdXRwdXQsIEZFRV9CUFNfQkFTRSAtIHNsaXBwYWdlQnBzLCBGRUVfQlBTX0JBU0UpOwogICAgaW50YyA0IC8vIDEwMDAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg4CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBjb3ZlciAyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg5CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxOTQKICAgIC8vIGNvbnN0IHN3YXBBc3NldEJlZm9yZSA9IEFzc2V0KHRoaXMuc3dhcEFzc2V0LnZhbHVlKS5iYWxhbmNlKGFwcEFkZHIpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDQKICAgIC8vIHN3YXBBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBQcm9qZWN0J3MgQVNBIElEICh3aGF0IHlpZWxkIGlzIHN3YXBwZWQgdG8pCiAgICBieXRlYyA1IC8vICJzd2FwQXNzZXQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE5NAogICAgLy8gY29uc3Qgc3dhcEFzc2V0QmVmb3JlID0gQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgZHVwMgogICAgYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCiAgICBhc3NlcnQgLy8gYWNjb3VudCBvcHRlZCBpbnRvIGFzc2V0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE5Ny0yMTEKICAgIC8vIGl0eG4uc3VibWl0R3JvdXAoCiAgICAvLyAgIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgICAgYXNzZXRSZWNlaXZlcjogdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWUsCiAgICAvLyAgICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnlpZWxkQXNzZXQudmFsdWUpLAogICAgLy8gICAgIGFzc2V0QW1vdW50OiB1c2RjQmFsYW5jZSwKICAgIC8vICAgICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vICAgfSksCiAgICAvLyAgIGl0eG4uYXBwbGljYXRpb25DYWxsKHsKICAgIC8vICAgICBhcHBJZDogQXBwbGljYXRpb24odGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlKSwKICAgIC8vICAgICBhcHBBcmdzOiBbQnl0ZXMoJ3N3YXAnKSwgQnl0ZXMoJ2ZpeGVkLWlucHV0JyksIGl0b2IobWluQW1vdW50T3V0KV0sCiAgICAvLyAgICAgYXNzZXRzOiBbQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpXSwKICAgIC8vICAgICBhY2NvdW50czogW3RoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlXSwKICAgIC8vICAgICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vICAgfSksCiAgICAvLyApOwogICAgaXR4bl9iZWdpbgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxOTkKICAgIC8vIGFzc2V0UmVjZWl2ZXI6IHRoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjEKICAgIC8vIHRpbnltYW5Qb29sQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7IC8vIFRpbnltYW4gcG9vbCBhZGRyZXNzCiAgICBieXRlYyAxOSAvLyAidGlueW1hblBvb2xBZGRyZXNzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxOTkKICAgIC8vIGFzc2V0UmVjZWl2ZXI6IHRoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjAwCiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMueWllbGRBc3NldC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo0MwogICAgLy8geWllbGRBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFVTREMgQVNBIElEICh3aGF0IGFpcmRyb3BzIGNvbWUgaW4gYXMpCiAgICBieXRlYyA0IC8vICJ5aWVsZEFzc2V0IgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMDAKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy55aWVsZEFzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBmcmFtZV9kaWcgLTIKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBkdXAKICAgIGl0eG5fZmllbGQgQXNzZXRSZWNlaXZlcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoxOTgtMjAzCiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiB0aGlzLnRpbnltYW5Qb29sQWRkcmVzcy52YWx1ZSwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnlpZWxkQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogdXNkY0JhbGFuY2UsCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSksCiAgICBpbnRjXzMgLy8gNAogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMDIKICAgIC8vIGZlZTogVWludDY0KDApLAogICAgaW50Y18wIC8vIDAKICAgIGl0eG5fZmllbGQgRmVlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIwNC0yMTAKICAgIC8vIGl0eG4uYXBwbGljYXRpb25DYWxsKHsKICAgIC8vICAgYXBwSWQ6IEFwcGxpY2F0aW9uKHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZSksCiAgICAvLyAgIGFwcEFyZ3M6IFtCeXRlcygnc3dhcCcpLCBCeXRlcygnZml4ZWQtaW5wdXQnKSwgaXRvYihtaW5BbW91bnRPdXQpXSwKICAgIC8vICAgYXNzZXRzOiBbQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpXSwKICAgIC8vICAgYWNjb3VudHM6IFt0aGlzLnRpbnltYW5Qb29sQWRkcmVzcy52YWx1ZV0sCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSksCiAgICBpdHhuX25leHQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjA1CiAgICAvLyBhcHBJZDogQXBwbGljYXRpb24odGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlKSwKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjYwCiAgICAvLyB0aW55bWFuUG9vbEFwcElkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgLy8gVGlueW1hbiBWMiBwb29sIGFwcCBJRCAoVVNEQy9zd2FwQXNzZXQpCiAgICBieXRlYyAxOCAvLyAidGlueW1hblBvb2xBcHBJZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjA1CiAgICAvLyBhcHBJZDogQXBwbGljYXRpb24odGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIwNgogICAgLy8gYXBwQXJnczogW0J5dGVzKCdzd2FwJyksIEJ5dGVzKCdmaXhlZC1pbnB1dCcpLCBpdG9iKG1pbkFtb3VudE91dCldLAogICAgZGlnIDUKICAgIGl0b2IKICAgIHVuY292ZXIgMgogICAgaXR4bl9maWVsZCBBY2NvdW50cwogICAgZGlnIDMKICAgIGl0eG5fZmllbGQgQXNzZXRzCiAgICBwdXNoYnl0ZXMgInN3YXAiCiAgICBpdHhuX2ZpZWxkIEFwcGxpY2F0aW9uQXJncwogICAgcHVzaGJ5dGVzICJmaXhlZC1pbnB1dCIKICAgIGl0eG5fZmllbGQgQXBwbGljYXRpb25BcmdzCiAgICBpdHhuX2ZpZWxkIEFwcGxpY2F0aW9uQXJncwogICAgaXR4bl9maWVsZCBBcHBsaWNhdGlvbklECiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIwNC0yMTAKICAgIC8vIGl0eG4uYXBwbGljYXRpb25DYWxsKHsKICAgIC8vICAgYXBwSWQ6IEFwcGxpY2F0aW9uKHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZSksCiAgICAvLyAgIGFwcEFyZ3M6IFtCeXRlcygnc3dhcCcpLCBCeXRlcygnZml4ZWQtaW5wdXQnKSwgaXRvYihtaW5BbW91bnRPdXQpXSwKICAgIC8vICAgYXNzZXRzOiBbQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpXSwKICAgIC8vICAgYWNjb3VudHM6IFt0aGlzLnRpbnltYW5Qb29sQWRkcmVzcy52YWx1ZV0sCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSksCiAgICBwdXNoaW50IDYgLy8gNgogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMDkKICAgIC8vIGZlZTogVWludDY0KDApLAogICAgaW50Y18wIC8vIDAKICAgIGl0eG5fZmllbGQgRmVlCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjE5Ny0yMTEKICAgIC8vIGl0eG4uc3VibWl0R3JvdXAoCiAgICAvLyAgIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgICAgYXNzZXRSZWNlaXZlcjogdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWUsCiAgICAvLyAgICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnlpZWxkQXNzZXQudmFsdWUpLAogICAgLy8gICAgIGFzc2V0QW1vdW50OiB1c2RjQmFsYW5jZSwKICAgIC8vICAgICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vICAgfSksCiAgICAvLyAgIGl0eG4uYXBwbGljYXRpb25DYWxsKHsKICAgIC8vICAgICBhcHBJZDogQXBwbGljYXRpb24odGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlKSwKICAgIC8vICAgICBhcHBBcmdzOiBbQnl0ZXMoJ3N3YXAnKSwgQnl0ZXMoJ2ZpeGVkLWlucHV0JyksIGl0b2IobWluQW1vdW50T3V0KV0sCiAgICAvLyAgICAgYXNzZXRzOiBbQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpXSwKICAgIC8vICAgICBhY2NvdW50czogW3RoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlXSwKICAgIC8vICAgICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vICAgfSksCiAgICAvLyApOwogICAgaXR4bl9zdWJtaXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjE0CiAgICAvLyBjb25zdCBzd2FwQXNzZXRBZnRlcjogdWludDY0ID0gQXNzZXQodGhpcy5zd2FwQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBjb3ZlciAyCiAgICBhc3NldF9ob2xkaW5nX2dldCBBc3NldEJhbGFuY2UKICAgIGFzc2VydCAvLyBhY2NvdW50IG9wdGVkIGludG8gYXNzZXQKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjE1CiAgICAvLyBjb25zdCBzd2FwT3V0cHV0OiB1aW50NjQgPSBzd2FwQXNzZXRBZnRlciAtIHN3YXBBc3NldEJlZm9yZTsKICAgIHN3YXAKICAgIC0KICAgIGR1cAogICAgdW5jb3ZlciAyCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIxNgogICAgLy8gYXNzZXJ0KHN3YXBPdXRwdXQgPj0gbWluQW1vdW50T3V0LCAnU3dhcCBvdXRwdXQgYmVsb3cgbWluaW11bScpOwogICAgPj0KICAgIGFzc2VydCAvLyBTd2FwIG91dHB1dCBiZWxvdyBtaW5pbXVtCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIxOQogICAgLy8gbGV0IGZhcm1Cb251czogdWludDY0ID0gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjIwCiAgICAvLyBpZiAodGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlID4gVWludDY0KDApICYmIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPiBVaW50NjQoMCkpIHsKICAgIGR1cAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NQogICAgLy8gZW1pc3Npb25SYXRpbyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gTXVsdGlwbGllciBmb3IgZHluYW1pYyByYXRlOiByYXRlID0gZmFybUJhbGFuY2UgKiBlbWlzc2lvblJhdGlvIC8gdG90YWxEZXBvc2l0cwogICAgYnl0ZWMgOSAvLyAiZW1pc3Npb25SYXRpbyIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjIwCiAgICAvLyBpZiAodGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlID4gVWludDY0KDApICYmIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPiBVaW50NjQoMCkpIHsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBieiBleGVjdXRlU3dhcEFuZERpc3RyaWJ1dGVfYWZ0ZXJfaWZfZWxzZUA4CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgc3dhcEFzc2V0IGF2YWlsYWJsZSBmb3IgZmFybSBib251cwogICAgYnl0ZWNfMSAvLyAiZmFybUJhbGFuY2UiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIyMAogICAgLy8gaWYgKHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSA+IFVpbnQ2NCgwKSAmJiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYnogZXhlY3V0ZVN3YXBBbmREaXN0cmlidXRlX2FmdGVyX2lmX2Vsc2VAOAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMjEKICAgIC8vIGNvbnN0IGN1cnJlbnRSYXRlID0gdGhpcy5jYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlKCk7CiAgICBjYWxsc3ViIGNhbGN1bGF0ZUR5bmFtaWNFbWlzc2lvblJhdGUKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODcKICAgIC8vIGNvbnN0IFtoaSwgbG9dID0gbXVsdyhuMSwgbjIpOwogICAgZnJhbWVfZGlnIDIKICAgIG11bHcKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODgKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMjIKICAgIC8vIGNvbnN0IHJlcXVlc3RlZEJvbnVzID0gdGhpcy5tdWxEaXZGbG9vcihzd2FwT3V0cHV0LCBjdXJyZW50UmF0ZSwgRkVFX0JQU19CQVNFKTsKICAgIGludGMgNCAvLyAxMDAwMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4OAogICAgLy8gY29uc3QgW3FfaGksIHFfbG8sIF9yX2hpLCBfcl9sb10gPSBkaXZtb2R3KGhpLCBsbywgVWludDY0KDApLCBkKTsKICAgIGRpdm1vZHcKICAgIHBvcG4gMgogICAgZHVwCiAgICBjb3ZlciAyCiAgICBmcmFtZV9idXJ5IDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODkKICAgIC8vIGFzc2VydChxX2hpID09PSBVaW50NjQoMCksICdNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcicpOwogICAgIQogICAgYXNzZXJ0IC8vIE11bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIyMwogICAgLy8gZmFybUJvbnVzID0gcmVxdWVzdGVkQm9udXMgPCB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID8gcmVxdWVzdGVkQm9udXMgOiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIHN3YXBBc3NldCBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzEgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMjMKICAgIC8vIGZhcm1Cb251cyA9IHJlcXVlc3RlZEJvbnVzIDwgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA/IHJlcXVlc3RlZEJvbnVzIDogdGhpcy5mYXJtQmFsYW5jZS52YWx1ZTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA8CiAgICBieiBleGVjdXRlU3dhcEFuZERpc3RyaWJ1dGVfdGVybmFyeV9mYWxzZUA2CiAgICBmcmFtZV9kaWcgMAogICAgZnJhbWVfYnVyeSAzCgpleGVjdXRlU3dhcEFuZERpc3RyaWJ1dGVfdGVybmFyeV9tZXJnZUA3OgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMjQKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlIC0gZmFybUJvbnVzOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIHN3YXBBc3NldCBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzEgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMjQKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlIC0gZmFybUJvbnVzOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGZyYW1lX2RpZyAzCiAgICAtCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBzd2FwQXNzZXQgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18xIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjI0CiAgICAvLyB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID0gdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSAtIGZhcm1Cb251czsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CgpleGVjdXRlU3dhcEFuZERpc3RyaWJ1dGVfYWZ0ZXJfaWZfZWxzZUA4OgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMjgKICAgIC8vIGNvbnN0IHRvdGFsT3V0cHV0OiB1aW50NjQgPSBzd2FwT3V0cHV0ICsgZmFybUJvbnVzOwogICAgZnJhbWVfZGlnIDIKICAgIGZyYW1lX2RpZyAzCiAgICArCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIzMQogICAgLy8gdGhpcy50b3RhbFlpZWxkR2VuZXJhdGVkLnZhbHVlID0gdGhpcy50b3RhbFlpZWxkR2VuZXJhdGVkLnZhbHVlICsgdG90YWxPdXRwdXQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NwogICAgLy8gdG90YWxZaWVsZEdlbmVyYXRlZCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgLy8gVG90YWwgeWllbGQgZ2VuZXJhdGVkIGZyb20gc3dhcHMgKHN3YXAgb3V0cHV0IGluIHN3YXBBc3NldCkKICAgIGJ5dGVjIDE1IC8vICJ0b3RhbFlpZWxkR2VuZXJhdGVkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMzEKICAgIC8vIHRoaXMudG90YWxZaWVsZEdlbmVyYXRlZC52YWx1ZSA9IHRoaXMudG90YWxZaWVsZEdlbmVyYXRlZC52YWx1ZSArIHRvdGFsT3V0cHV0OwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGRpZyAxCiAgICArCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU3CiAgICAvLyB0b3RhbFlpZWxkR2VuZXJhdGVkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBUb3RhbCB5aWVsZCBnZW5lcmF0ZWQgZnJvbSBzd2FwcyAoc3dhcCBvdXRwdXQgaW4gc3dhcEFzc2V0KQogICAgYnl0ZWMgMTUgLy8gInRvdGFsWWllbGRHZW5lcmF0ZWQiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIzMQogICAgLy8gdGhpcy50b3RhbFlpZWxkR2VuZXJhdGVkLnZhbHVlID0gdGhpcy50b3RhbFlpZWxkR2VuZXJhdGVkLnZhbHVlICsgdG90YWxPdXRwdXQ7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMzQKICAgIC8vIGNvbnN0IGNyZWF0b3JDdXQ6IHVpbnQ2NCA9IHRoaXMubXVsRGl2Rmxvb3IodG90YWxPdXRwdXQsIHRoaXMuY3JlYXRvckZlZVJhdGUudmFsdWUsIEZFRV9QRVJDRU5UX0JBU0UpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NDkKICAgIC8vIGNyZWF0b3JGZWVSYXRlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAvLyAwLTEwMCwgcGVyY2VudGFnZSBvZiB5aWVsZCB0byBjcmVhdG9yCiAgICBieXRlYyAxNyAvLyAiY3JlYXRvckZlZVJhdGUiCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIzNAogICAgLy8gY29uc3QgY3JlYXRvckN1dDogdWludDY0ID0gdGhpcy5tdWxEaXZGbG9vcih0b3RhbE91dHB1dCwgdGhpcy5jcmVhdG9yRmVlUmF0ZS52YWx1ZSwgRkVFX1BFUkNFTlRfQkFTRSk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4NwogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBkaWcgMQogICAgbXVsdwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4OAogICAgLy8gY29uc3QgW3FfaGksIHFfbG8sIF9yX2hpLCBfcl9sb10gPSBkaXZtb2R3KGhpLCBsbywgVWludDY0KDApLCBkKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIzNAogICAgLy8gY29uc3QgY3JlYXRvckN1dDogdWludDY0ID0gdGhpcy5tdWxEaXZGbG9vcih0b3RhbE91dHB1dCwgdGhpcy5jcmVhdG9yRmVlUmF0ZS52YWx1ZSwgRkVFX1BFUkNFTlRfQkFTRSk7CiAgICBwdXNoaW50IDEwMCAvLyAxMDAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODgKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBkaXZtb2R3CiAgICBwb3BuIDIKICAgIHN3YXAKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6ODkKICAgIC8vIGFzc2VydChxX2hpID09PSBVaW50NjQoMCksICdNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcicpOwogICAgIQogICAgYXNzZXJ0IC8vIE11bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIzNQogICAgLy8gY29uc3QgdXNlckN1dDogdWludDY0ID0gdG90YWxPdXRwdXQgLSBjcmVhdG9yQ3V0OwogICAgc3dhcAogICAgZGlnIDEKICAgIC0KICAgIGR1cAogICAgY292ZXIgMgogICAgZnJhbWVfYnVyeSAxCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjIzOAogICAgLy8gdGhpcy5jcmVhdG9yVW5jbGFpbWVkWWllbGQudmFsdWUgPSB0aGlzLmNyZWF0b3JVbmNsYWltZWRZaWVsZC52YWx1ZSArIGNyZWF0b3JDdXQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZFlpZWxkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCB5aWVsZCBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZFlpZWxkIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMzgKICAgIC8vIHRoaXMuY3JlYXRvclVuY2xhaW1lZFlpZWxkLnZhbHVlID0gdGhpcy5jcmVhdG9yVW5jbGFpbWVkWWllbGQudmFsdWUgKyBjcmVhdG9yQ3V0OwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgICsKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6NTAKICAgIC8vIGNyZWF0b3JVbmNsYWltZWRZaWVsZCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgLy8gQWNjdW11bGF0ZWQgeWllbGQgZm9yIGNyZWF0b3IgdG8gY2xhaW0KICAgIGJ5dGVjIDggLy8gImNyZWF0b3JVbmNsYWltZWRZaWVsZCIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjM4CiAgICAvLyB0aGlzLmNyZWF0b3JVbmNsYWltZWRZaWVsZC52YWx1ZSA9IHRoaXMuY3JlYXRvclVuY2xhaW1lZFlpZWxkLnZhbHVlICsgY3JlYXRvckN1dDsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI0MQogICAgLy8gaWYgKHVzZXJDdXQgPiBVaW50NjQoMCkpIHsKICAgIGJ6IGV4ZWN1dGVTd2FwQW5kRGlzdHJpYnV0ZV9hZnRlcl9pZl9lbHNlQDEwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI0MgogICAgLy8gY29uc3QgeWllbGRJbmNyZWFzZTogdWludDY0ID0gdGhpcy5tdWxEaXZGbG9vcih1c2VyQ3V0LCBTQ0FMRSwgdGhpcy50b3RhbERlcG9zaXRzLnZhbHVlKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbERlcG9zaXRzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgLy8gVG90YWwgQWxwaGEgZGVwb3NpdGVkIGluIHZhdWx0CiAgICBieXRlY18wIC8vICJ0b3RhbERlcG9zaXRzIgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyNDIKICAgIC8vIGNvbnN0IHlpZWxkSW5jcmVhc2U6IHVpbnQ2NCA9IHRoaXMubXVsRGl2Rmxvb3IodXNlckN1dCwgU0NBTEUsIHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZSk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4NwogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBmcmFtZV9kaWcgMQogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyNDIKICAgIC8vIGNvbnN0IHlpZWxkSW5jcmVhc2U6IHVpbnQ2NCA9IHRoaXMubXVsRGl2Rmxvb3IodXNlckN1dCwgU0NBTEUsIHRoaXMudG90YWxEZXBvc2l0cy52YWx1ZSk7CiAgICBpbnRjIDUgLy8gMTAwMDAwMDAwMDAwMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo4NwogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBtdWx3CiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg4CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgaW50Y18wIC8vIDAKICAgIHVuY292ZXIgMwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBzd2FwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjg5CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyNDMKICAgIC8vIHRoaXMueWllbGRQZXJUb2tlbi52YWx1ZSA9IHRoaXMueWllbGRQZXJUb2tlbi52YWx1ZSArIHlpZWxkSW5jcmVhc2U7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czo1NAogICAgLy8geWllbGRQZXJUb2tlbiA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgIC8vIEFjY3VtdWxhdG9yIGZvciB5aWVsZCBkaXN0cmlidXRpb24gKHNjYWxlZCBieSBTQ0FMRSkKICAgIGJ5dGVjIDYgLy8gInlpZWxkUGVyVG9rZW4iCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjI0MwogICAgLy8gdGhpcy55aWVsZFBlclRva2VuLnZhbHVlID0gdGhpcy55aWVsZFBlclRva2VuLnZhbHVlICsgeWllbGRJbmNyZWFzZTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICArCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjU0CiAgICAvLyB5aWVsZFBlclRva2VuID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgLy8gQWNjdW11bGF0b3IgZm9yIHlpZWxkIGRpc3RyaWJ1dGlvbiAoc2NhbGVkIGJ5IFNDQUxFKQogICAgYnl0ZWMgNiAvLyAieWllbGRQZXJUb2tlbiIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjQzCiAgICAvLyB0aGlzLnlpZWxkUGVyVG9rZW4udmFsdWUgPSB0aGlzLnlpZWxkUGVyVG9rZW4udmFsdWUgKyB5aWVsZEluY3JlYXNlOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKCmV4ZWN1dGVTd2FwQW5kRGlzdHJpYnV0ZV9hZnRlcl9pZl9lbHNlQDEwOgogICAgcmV0c3ViCgpleGVjdXRlU3dhcEFuZERpc3RyaWJ1dGVfdGVybmFyeV9mYWxzZUA2OgogICAgLy8gUmFyZUZpVmF1bHQuYWxnby50czoyMjMKICAgIC8vIGZhcm1Cb251cyA9IHJlcXVlc3RlZEJvbnVzIDwgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA/IHJlcXVlc3RlZEJvbnVzIDogdGhpcy5mYXJtQmFsYW5jZS52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBzd2FwQXNzZXQgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18xIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaVZhdWx0LmFsZ28udHM6MjIzCiAgICAvLyBmYXJtQm9udXMgPSByZXF1ZXN0ZWRCb251cyA8IHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPyByZXF1ZXN0ZWRCb251cyA6IHRoaXMuZmFybUJhbGFuY2UudmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgZnJhbWVfYnVyeSAzCiAgICBiIGV4ZWN1dGVTd2FwQW5kRGlzdHJpYnV0ZV90ZXJuYXJ5X21lcmdlQDcK",
	clear: "I3ByYWdtYSB2ZXJzaW9uIDExCiNwcmFnbWEgdHlwZXRyYWNrIGZhbHNlCgovLyBAYWxnb3JhbmRmb3VuZGF0aW9uL2FsZ29yYW5kLXR5cGVzY3JpcHQvYmFzZS1jb250cmFjdC5kLnRzOjpCYXNlQ29udHJhY3QuY2xlYXJTdGF0ZVByb2dyYW0oKSAtPiB1aW50NjQ6Cm1haW46CiAgICBwdXNoaW50IDEgLy8gMQogICAgcmV0dXJuCg=="
};
var byteCode$1 = {
	approval: "CyAIAAEIBJBOgKCUpY0dwJoMgOHrFyYVDXRvdGFsRGVwb3NpdHMLZmFybUJhbGFuY2UOY3JlYXRvckFkZHJlc3MPZGVwb3NpdGVkQW1vdW50CnlpZWxkQXNzZXQJc3dhcEFzc2V0DXlpZWxkUGVyVG9rZW4LZWFybmVkWWllbGQVY3JlYXRvclVuY2xhaW1lZFlpZWxkDWVtaXNzaW9uUmF0aW8MZGVwb3NpdEFzc2V0DXJhcmVmaUFkZHJlc3MEFR98dRBtaW5Td2FwVGhyZXNob2xkDm1heFNsaXBwYWdlQnBzE3RvdGFsWWllbGRHZW5lcmF0ZWQRdXNlcllpZWxkUGVyVG9rZW4OY3JlYXRvckZlZVJhdGUQdGlueW1hblBvb2xBcHBJZBJ0aW55bWFuUG9vbEFkZHJlc3MNYXNzZXRzT3B0ZWRJbjEbQQDJggIEKTFNlQRqaR/iNhoAjgIAqQCdMRkURDEYQQCGghIEQU5BtQRuLrybBCHx3f8E8Vd3JgS8mUSeBDbzsvQEADWXogSw31wPBD+4qScE9B2jXQSrbvc7BKriytIEH2XWTgQU+pRzBLxeOMYEr+v8rATQVMGfBBcOcpI2GgCOEgEZAiECtgMTA0YDeAOuA/YEVARpBLsE6wUTBTQFVwV5BcEF6QCABOpwcxk2GgCOAQAsADEZgQISMRgQREIBozEZIxIxGBBEQgF/JYEFMRmOAgAFAAEAMRhEADEYRAA2GgFJFSQSRBc2GgJJFSQSRBc2GgNJFSQSRBc2GgRJFSQSRBc2GgVJFSQSRBc2GgZJFSQSRBc2GgdJFSQSRBc2GghJFYEgEkQ2GglJFYEgEkQxIDIDEkRLBYEGDkRLBCEGD0RLBCEHDkRLA4H0Aw9ESwMhBA5ESwhESwdESwZESwJESwhLCBNESwhLBxNESwdLBxNEJwpPCWcnBE8IZycFTwdnKjEAZycLTGcnEU8FZycIImcoImcnBiJnJw1PBGcnDk8DZycPImcnEk8CZycTTGcpImcnCSJnJxQiZyNDMSAyAxJEMQAiKmVEEkQiJxRlRBREMgoxFklEIwlJOBAjEkRJOAdLAhJESTgIgeDYzwIPREk4ADEAEkRJOCAyAxJEOAkyAxJEsSInCmVEIrISshFJshQlshAisgGzsSInBGVEIrISshFJshQlshAisgGzsSInBWVEIrISshGyFCWyECKyAbMnFCNnI0MxIDIDEkQxACsiZjEAJxAiZjEAJwciZiNDMSAyAxJEMQCIBIUxACIrY0xJTwJEMQAiJwdjTE4CREEAJCIoZURLAklOAgkoTGexMQAiJwplRE8CshKyEbIUJbIQIrIBs0lBABexMQAiJwVlREsCshKyEbIUJbIQIrIBsyNDNhoBSRUkEkQXSTEgMgMSRCInDmVEDkQyCkkiJwRlRHAATElPAkQiJw1lRA9BAA0iKGVEQQAGSUsDiAT1MRZJRCMJSTgQJRJESTgRIicKZUQSREk4FEsDEkRJOAAxABJESTggMgMSREk4FTIDEkQ4EkmBwIQ9D0QxAIgDsTEAIitjREsBCDEAK08CZiIoZUQIKExnI0M2GgFJFSQSRBdJMSAyAxJEMQAiK2NMTgJEQQA9SwFJRElLAklOAg5EMQCIA2tLAQkxACtPAmYiKGVESwEJKExnsTEAIicKZURPArISshGyFCWyECKyAbMjQ0lC/8ExIDIDEkQxAIgDMDEAIicHY0RJRDEAJwciZrExACInBWVETwKyErIRshQlshAisgGzI0MxIDIDEkQxACIqZUQSRCInCGVESUQnCCJnsTEAIicFZURPArISshGyFCWyECKyAbMjQzYaAUkVJBJEFzEgMgMSRCInDmVESwEPRDIKIicEZURwAEQiJw1lREsBDkQiKGVEREyIA6YjQzIKIicEZURLAUxwAEQiJwVlRE8CTHAARCIoZUQiJwZlRCInCGVEIicPZURPAxZPAxZQTwIWUE8DFlBPAhZQTBZQJwxMULAjQ4AASTYaAUcCFYEgEkRJIitjTElOA04DRCInB2NMTgJEQQAyIicGZUxJTgJFB0RLAyInEGNMSU4CRQdEDUEAFksESwQJSwIdIiEFH0YCTBRESwEIRQFJFicMTFCwI0M2GgFJFYEgEkQiK2NEFicMTFCwI0MyCiInBGVEcABMSU8CREAAIYAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJwxMULAjQ0cCiAIKSYHeTR0iIQQfRgJMFERPAhZPAhZQTBZQQv/ZNhoBSRUkEkQXMSAyAxJEMQAiKmVEEjEAIicLZUQSEURJIQYPREkhBw5EJw1MZyNDNhoBSRUkEkQXMSAyAxJEMQAiKmVEEkRJgfQDD0RJIQQORCcOTGcjQzYaAUkVgSASRDEgMgMSRDEAIiplRBJESTIDE0QqTGcjQzYaAUkVgSASRDEgMgMSRDEAIicLZUQSREkyAxNEJwtMZyNDNhoBSRUkEkQXMSAyAxJEMQAiKmVEEkRJgQYORCcRTGcjQzEgMgMSRDIKMRZJRCMJSTgQJRJESTgRIicFZUQSREk4FE8CEkRJOAAxABJESTggMgMSREk4FTIDEkQ4EklEIillRAgpTGcjQzYaAUkVJBJEFzEgMgMSRDEAIiplRBIxACInC2VEEhFESUQnCUxnI0MiSScJZURBAAwiKWVEQQAFiAAbRQEiKWVEIicJZURMFkwWUEsBFlAnDExQsCNDigABIihlTElPAkRBAAciKWVEQAADIkyJIillRCInCWVEHSKLAB9GAkwUREmB6AcMgegHTE1MiYoBAIAASYv/IitjTElPAkRBADwiJwZlTElOAowARIv/IicQY0xJTgKMAUQNQQAgiwCLAQmLAh0iIQUfRgJMFESL/yInB2NECIv/JwdPAmYiJwZlRIv/JxBPAmaJigEBgAAiJxJlRCInE2VESUsCgAphc3NldF8xX2lkY0RLAUsDgBBhc3NldF8xX3Jlc2VydmVzY0xOBERLAUsDgBBhc3NldF8yX3Jlc2VydmVzY0xOBERMTwKAD3RvdGFsX2ZlZV9zaGFyZWNMTgNEIicEZUQSQQApiwGMACEEiwIJi/8dIiEEH0YCTBREiwBLAQhOAh0iTwMfRgJMFESMAImMAIsBQv/UigIAgABJMgqL/oj/S0lEIQSL/wkdIiEEH0YCTgIURCInBWVESnAARLEiJxNlRCInBGVEi/6yErIRSbIUJbIQIrIBtiInEmVESwUWTwKyHEsDsjCABHN3YXCyGoALZml4ZWQtaW5wdXSyGrIashiBBrIQIrIBs04CcABETAlJTwIPRCJJJwllREEAMCIpZURBACmI/jCLAh0iIQQfRgJJTgKMABREIillRAxBAGOLAIwDIillRIsDCSlMZ4sCiwMIIicPZURLAQgnD0xnIicRZURLAR0igWQfRgJMFERMSwEJSU4CjAEiJwhlRAgnCExnQQAcIihlRIsBIQUdIk8DH0YCTBREIicGZUQIJwZMZ4kiKWVEjANC/5g=",
	clear: "C4EBQw=="
};
var compilerInfo$1 = {
	compiler: "puya",
	compilerVersion: {
		major: 5,
		minor: 3,
		patch: 2
	}
};
var events$1 = [
];
var templateVariables$1 = {
};
var arc56Swap = {
	name: name$1,
	structs: structs$1,
	methods: methods$1,
	arcs: arcs$1,
	networks: networks$1,
	state: state$1,
	bareActions: bareActions$1,
	sourceInfo: sourceInfo$1,
	source: source$1,
	byteCode: byteCode$1,
	compilerInfo: compilerInfo$1,
	events: events$1,
	templateVariables: templateVariables$1
};

var name = "RareFiAlphaCompoundingVault";
var structs = {
};
var methods = [
	{
		name: "createVault",
		args: [
			{
				type: "uint64",
				name: "alphaAssetId"
			},
			{
				type: "uint64",
				name: "usdcAssetId"
			},
			{
				type: "uint64",
				name: "creatorFeeRate"
			},
			{
				type: "uint64",
				name: "minSwapThreshold"
			},
			{
				type: "uint64",
				name: "maxSlippageBps"
			},
			{
				type: "uint64",
				name: "tinymanPoolAppId"
			},
			{
				type: "address",
				name: "tinymanPoolAddress"
			},
			{
				type: "address",
				name: "rarefiAddress"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
				"NoOp"
			],
			call: [
			]
		},
		readonly: false,
		desc: "Create and initialize the vault\r\nCalled once at deployment",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "optInAssets",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Opt the contract into required assets\r\nMust be called by creator after deployment with:\r\n- 5.4 ALGO payment (stays in contract for MBR and operational fees)",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "optIn",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"OptIn"
			]
		},
		readonly: false,
		desc: "User opts into the contract to enable local storage",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "closeOut",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"CloseOut"
			]
		},
		readonly: false,
		desc: "User closes out - withdraws all Alpha (deposit + yield)",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "deposit",
		args: [
			{
				type: "uint64",
				name: "slippageBps",
				desc: "- Slippage tolerance for auto-compound (ignored if no compound needed)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "User deposits Alpha into the vault\r\nReceives shares proportional to their deposit\r\n\r\nIf USDC balance >= threshold and has existing depositors, automatically\r\ncompounds yield BEFORE processing deposit. This ensures yield goes to\r\nexisting depositors, not the new one.",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "withdraw",
		args: [
			{
				type: "uint64",
				name: "shareAmount",
				desc: "- Shares to redeem (0 = withdraw all)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "User withdraws Alpha from the vault\r\nReceives proportional share of vault's Alpha (original deposit + compounded yield)",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "claimCreator",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Creator claims their accumulated Alpha from fees",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "compoundYield",
		args: [
			{
				type: "uint64",
				name: "slippageBps",
				desc: "- Slippage tolerance in basis points (e.g., 50 = 0.5%, 100 = 1%)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Swaps accumulated USDC to Alpha and compounds into vault\r\nThe Alpha is added to totalAlpha, increasing the value of all shares\r\nPermissionless - anyone can trigger, slippage capped by maxSlippageBps",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getVaultStats",
		args: [
		],
		returns: {
			type: "(uint64,uint64,uint64,uint64,uint64,uint64)",
			desc: "[totalShares, totalAlpha, creatorUnclaimedAlpha, usdcBalance, totalYieldCompounded, sharePrice]\r\nNote: sharePrice is scaled by SCALE (1e12) for precision"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get vault statistics",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getUserAlphaBalance",
		args: [
			{
				type: "address",
				name: "user"
			}
		],
		returns: {
			type: "uint64"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get user's current Alpha balance (shares converted to Alpha)\r\nThis includes their original deposit + all compounded yield",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getUserShares",
		args: [
			{
				type: "address",
				name: "user"
			}
		],
		returns: {
			type: "uint64"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get user's share balance",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "previewDeposit",
		args: [
			{
				type: "uint64",
				name: "alphaAmount"
			}
		],
		returns: {
			type: "uint64"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Preview how many shares a deposit would receive",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "previewWithdraw",
		args: [
			{
				type: "uint64",
				name: "shareAmount"
			}
		],
		returns: {
			type: "uint64"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Preview how much Alpha a share redemption would receive",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getCompoundQuote",
		args: [
		],
		returns: {
			type: "(uint64,uint64,uint64)",
			desc: "[usdcBalance, expectedAlphaOutput, minOutputAt50bps]"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Preview compound - shows expected Alpha for current USDC balance",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateMinSwapThreshold",
		args: [
			{
				type: "uint64",
				name: "newThreshold"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the minimum swap threshold",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateMaxSlippage",
		args: [
			{
				type: "uint64",
				name: "newMaxSlippageBps"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the maximum slippage tolerance for swaps\r\nOnly callable by creator",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateCreatorAddress",
		args: [
			{
				type: "address",
				name: "newCreatorAddress"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the creator address (key rotation)\r\nOnly callable by current creator",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateRarefiAddress",
		args: [
			{
				type: "address",
				name: "newRarefiAddress"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the RareFi platform address\r\nOnly callable by current RareFi address",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "updateCreatorFeeRate",
		args: [
			{
				type: "uint64",
				name: "newFeeRate"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Update the creator fee rate\r\nOnly callable by creator, constrained to 0-6% range",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "contributeFarm",
		args: [
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Anyone can contribute to the farm by sending Alpha\r\nFarm bonus is distributed proportionally during yield compounds\r\nThis allows projects/sponsors to boost yield for depositors\r\n\r\nExpects an asset transfer of alphaAsset before this call",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "setEmissionRatio",
		args: [
			{
				type: "uint64",
				name: "newRatio",
				desc: "- The emission ratio multiplier (e.g., 4000000 for aggressive distribution)"
			}
		],
		returns: {
			type: "void"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: false,
		desc: "Set the emission ratio (multiplier for dynamic farm rate calculation)\r\nOnly callable by creator or RareFi\r\nDynamic rate = farmBalance * emissionRatio / totalAlpha",
		events: [
		],
		recommendations: {
		}
	},
	{
		name: "getFarmStats",
		args: [
		],
		returns: {
			type: "(uint64,uint64,uint64)",
			desc: "[farmBalance, emissionRatio, currentDynamicRate]"
		},
		actions: {
			create: [
			],
			call: [
				"NoOp"
			]
		},
		readonly: true,
		desc: "Get farm statistics including dynamic emission rate",
		events: [
		],
		recommendations: {
		}
	}
];
var arcs = [
	22,
	28
];
var networks = {
};
var state = {
	schema: {
		global: {
			ints: 13,
			bytes: 3
		},
		local: {
			ints: 1,
			bytes: 0
		}
	},
	keys: {
		global: {
			alphaAsset: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "YWxwaGFBc3NldA=="
			},
			usdcAsset: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dXNkY0Fzc2V0"
			},
			creatorAddress: {
				keyType: "AVMString",
				valueType: "address",
				key: "Y3JlYXRvckFkZHJlc3M="
			},
			rarefiAddress: {
				keyType: "AVMString",
				valueType: "address",
				key: "cmFyZWZpQWRkcmVzcw=="
			},
			creatorFeeRate: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "Y3JlYXRvckZlZVJhdGU="
			},
			creatorUnclaimedAlpha: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "Y3JlYXRvclVuY2xhaW1lZEFscGhh"
			},
			totalShares: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dG90YWxTaGFyZXM="
			},
			totalAlpha: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dG90YWxBbHBoYQ=="
			},
			minSwapThreshold: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "bWluU3dhcFRocmVzaG9sZA=="
			},
			maxSlippageBps: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "bWF4U2xpcHBhZ2VCcHM="
			},
			totalYieldCompounded: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dG90YWxZaWVsZENvbXBvdW5kZWQ="
			},
			tinymanPoolAppId: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dGlueW1hblBvb2xBcHBJZA=="
			},
			tinymanPoolAddress: {
				keyType: "AVMString",
				valueType: "address",
				key: "dGlueW1hblBvb2xBZGRyZXNz"
			},
			farmBalance: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "ZmFybUJhbGFuY2U="
			},
			emissionRatio: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "ZW1pc3Npb25SYXRpbw=="
			},
			assetsOptedIn: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "YXNzZXRzT3B0ZWRJbg=="
			}
		},
		local: {
			userShares: {
				keyType: "AVMString",
				valueType: "AVMUint64",
				key: "dXNlclNoYXJlcw=="
			}
		},
		box: {
		}
	},
	maps: {
		global: {
		},
		local: {
		},
		box: {
		}
	}
};
var bareActions = {
	create: [
	],
	call: [
		"DeleteApplication",
		"UpdateApplication"
	]
};
var sourceInfo = {
	approval: {
		sourceInfo: [
			{
				pc: [
					1114
				],
				errorMessage: "Alpha amount is zero"
			},
			{
				pc: [
					632
				],
				errorMessage: "Alpha and USDC must be different"
			},
			{
				pc: [
					971,
					1739
				],
				errorMessage: "App call must follow asset transfer"
			},
			{
				pc: [
					731
				],
				errorMessage: "App call must follow payment"
			},
			{
				pc: [
					725
				],
				errorMessage: "Assets already opted in"
			},
			{
				pc: [
					1268
				],
				errorMessage: "Below minimum swap threshold"
			},
			{
				pc: [
					2043
				],
				errorMessage: "Cannot read pool asset_1_id"
			},
			{
				pc: [
					2070
				],
				errorMessage: "Cannot read pool asset_1_reserves"
			},
			{
				pc: [
					2097
				],
				errorMessage: "Cannot read pool asset_2_reserves"
			},
			{
				pc: [
					2122
				],
				errorMessage: "Cannot read pool total_fee_share"
			},
			{
				pc: [
					1653,
					1687
				],
				errorMessage: "Cannot set zero address"
			},
			{
				pc: [
					507
				],
				errorMessage: "Contract deletion disabled"
			},
			{
				pc: [
					511
				],
				errorMessage: "Contract updates disabled"
			},
			{
				pc: [
					1789
				],
				errorMessage: "Contribution must be positive"
			},
			{
				pc: [
					595
				],
				errorMessage: "Creator fee rate exceeds maximum (6%)"
			},
			{
				pc: [
					1026
				],
				errorMessage: "Deposit too small"
			},
			{
				pc: [
					1833
				],
				errorMessage: "Emission ratio must be positive"
			},
			{
				pc: [
					2193
				],
				errorMessage: "Expected output is zero"
			},
			{
				pc: [
					1721
				],
				errorMessage: "Fee rate exceeds maximum (6%)"
			},
			{
				pc: [
					756
				],
				errorMessage: "Insufficient ALGO (need 5.4 ALGO)"
			},
			{
				pc: [
					1108
				],
				errorMessage: "Insufficient shares"
			},
			{
				pc: [
					623
				],
				errorMessage: "Invalid Alpha asset"
			},
			{
				pc: [
					635
				],
				errorMessage: "Invalid Tinyman pool app ID"
			},
			{
				pc: [
					626
				],
				errorMessage: "Invalid USDC asset"
			},
			{
				pc: [
					620,
					1619
				],
				errorMessage: "Max slippage too high"
			},
			{
				pc: [
					614,
					1614
				],
				errorMessage: "Max slippage too low (min 5%)"
			},
			{
				pc: [
					1319,
					1524,
					1928,
					1975,
					2010,
					2152,
					2169,
					2209,
					2343,
					2387
				],
				errorMessage: "Multiplication overflow in mulDivFloor"
			},
			{
				pc: [
					996,
					1764
				],
				errorMessage: "Must send to contract"
			},
			{
				pc: [
					989,
					1757
				],
				errorMessage: "Must transfer Alpha asset"
			},
			{
				pc: [
					1273
				],
				errorMessage: "No depositors to compound for"
			},
			{
				pc: [
					1196
				],
				errorMessage: "Nothing to claim"
			},
			{
				pc: [
					1100
				],
				errorMessage: "Nothing to withdraw"
			},
			{
				pc: [
					477
				],
				errorMessage: "OnCompletion must be CloseOut && can only call when not creating"
			},
			{
				pc: [
					308
				],
				errorMessage: "OnCompletion must be NoOp"
			},
			{
				pc: [
					488
				],
				errorMessage: "OnCompletion must be OptIn && can only call when not creating"
			},
			{
				pc: [
					1682
				],
				errorMessage: "Only RareFi can update"
			},
			{
				pc: [
					1189
				],
				errorMessage: "Only creator can claim"
			},
			{
				pc: [
					718
				],
				errorMessage: "Only creator can opt-in assets"
			},
			{
				pc: [
					1648
				],
				errorMessage: "Only creator can update"
			},
			{
				pc: [
					1716
				],
				errorMessage: "Only creator can update fee rate"
			},
			{
				pc: [
					1608
				],
				errorMessage: "Only creator can update max slippage"
			},
			{
				pc: [
					1831
				],
				errorMessage: "Only creator or RareFi can set emission ratio"
			},
			{
				pc: [
					1569
				],
				errorMessage: "Only creator or RareFi can update"
			},
			{
				pc: [
					763
				],
				errorMessage: "Payment must be from caller"
			},
			{
				pc: [
					746
				],
				errorMessage: "Payment must be to app"
			},
			{
				pc: [
					1032
				],
				errorMessage: "Shares to mint is zero"
			},
			{
				pc: [
					930,
					1249
				],
				errorMessage: "Slippage exceeds maximum allowed"
			},
			{
				pc: [
					2308
				],
				errorMessage: "Swap output below minimum"
			},
			{
				pc: [
					607
				],
				errorMessage: "Swap threshold too high (max 50 USDC)"
			},
			{
				pc: [
					601
				],
				errorMessage: "Swap threshold too low"
			},
			{
				pc: [
					1579
				],
				errorMessage: "Threshold too high (max 50 USDC)"
			},
			{
				pc: [
					1574
				],
				errorMessage: "Threshold too low"
			},
			{
				pc: [
					1003,
					1771
				],
				errorMessage: "Transfer must be from caller"
			},
			{
				pc: [
					945,
					1259,
					1289,
					1469,
					2218,
					2301
				],
				errorMessage: "account opted into asset"
			},
			{
				pc: [
					1017,
					1785
				],
				errorMessage: "assetCloseTo must be zero"
			},
			{
				pc: [
					506,
					510
				],
				errorMessage: "can only call when not creating"
			},
			{
				pc: [
					716,
					723,
					782,
					803,
					866,
					876,
					890,
					928,
					938,
					950,
					958,
					987,
					1053,
					1061,
					1130,
					1140,
					1154,
					1187,
					1194,
					1208,
					1245,
					1256,
					1264,
					1272,
					1286,
					1295,
					1302,
					1306,
					1325,
					1329,
					1334,
					1339,
					1462,
					1558,
					1566,
					1606,
					1646,
					1680,
					1714,
					1755,
					1793,
					1820,
					1828,
					1845,
					1852,
					1864,
					1869,
					1896,
					1903,
					1913,
					1918,
					1947,
					1957,
					1961,
					1983,
					1992,
					1996,
					2021,
					2026,
					2127,
					2214,
					2224,
					2229,
					2250,
					2314,
					2321,
					2347,
					2359,
					2375,
					2394,
					2405,
					2414,
					2424
				],
				errorMessage: "check GlobalState exists"
			},
			{
				pc: [
					854,
					1039,
					1093,
					1382,
					1407
				],
				errorMessage: "check LocalState exists"
			},
			{
				pc: [
					776
				],
				errorMessage: "closeRemainderTo must be zero"
			},
			{
				pc: [
					574,
					583,
					1377,
					1402,
					1634,
					1667
				],
				errorMessage: "invalid number of bytes for arc4.static_array<arc4.uint8, 32>"
			},
			{
				pc: [
					519,
					528,
					537,
					546,
					555,
					564,
					915,
					1075,
					1233,
					1423,
					1443,
					1545,
					1593,
					1701,
					1807
				],
				errorMessage: "invalid number of bytes for arc4.uint64"
			},
			{
				pc: [
					589,
					710,
					770,
					829,
					843,
					923,
					1010,
					1083,
					1181,
					1240,
					1552,
					1600,
					1640,
					1673,
					1708,
					1733,
					1778,
					1814
				],
				errorMessage: "rekeyTo must be zero"
			},
			{
				pc: [
					979,
					1747
				],
				errorMessage: "transaction type is axfer"
			},
			{
				pc: [
					739
				],
				errorMessage: "transaction type is pay"
			}
		],
		pcOffsetMethod: "none"
	},
	clear: {
		sourceInfo: [
		],
		pcOffsetMethod: "none"
	}
};
var source = {
	approval: "I3ByYWdtYSB2ZXJzaW9uIDExCiNwcmFnbWEgdHlwZXRyYWNrIGZhbHNlCgovLyBAYWxnb3JhbmRmb3VuZGF0aW9uL2FsZ29yYW5kLXR5cGVzY3JpcHQvYXJjNC9pbmRleC5kLnRzOjpDb250cmFjdC5hcHByb3ZhbFByb2dyYW0oKSAtPiB1aW50NjQ6Cm1haW46CiAgICBpbnRjYmxvY2sgMCAxIDggNCAxMDAwMCAyMDAwMDAgNTAwMDAwMDAgMTAwMDAwMDAwMDAwMAogICAgYnl0ZWNibG9jayAidG90YWxTaGFyZXMiICJ0b3RhbEFscGhhIiAiZmFybUJhbGFuY2UiICJjcmVhdG9yQWRkcmVzcyIgImFscGhhQXNzZXQiICJ1c2RjQXNzZXQiICJ1c2VyU2hhcmVzIiAweDE1MWY3Yzc1ICJjcmVhdG9yVW5jbGFpbWVkQWxwaGEiICJlbWlzc2lvblJhdGlvIiAicmFyZWZpQWRkcmVzcyIgIm1pblN3YXBUaHJlc2hvbGQiICJtYXhTbGlwcGFnZUJwcyIgInRvdGFsWWllbGRDb21wb3VuZGVkIiAiY3JlYXRvckZlZVJhdGUiICJ0aW55bWFuUG9vbEFwcElkIiAidGlueW1hblBvb2xBZGRyZXNzIiAiYXNzZXRzT3B0ZWRJbiIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM3CiAgICAvLyBleHBvcnQgY2xhc3MgUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0IGV4dGVuZHMgYXJjNC5Db250cmFjdCB7CiAgICB0eG4gTnVtQXBwQXJncwogICAgYnogbWFpbl9iYXJlX3JvdXRpbmdAMzEKICAgIHB1c2hieXRlc3MgMHgyOTMxNGQ5NSAweDZhNjkxZmUyIC8vIG1ldGhvZCAib3B0SW4oKXZvaWQiLCBtZXRob2QgImNsb3NlT3V0KCl2b2lkIgogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMAogICAgbWF0Y2ggbWFpbl9vcHRJbl9yb3V0ZUAzIG1haW5fY2xvc2VPdXRfcm91dGVANAoKbWFpbl9zd2l0Y2hfY2FzZV9uZXh0QDU6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNwogICAgLy8gZXhwb3J0IGNsYXNzIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdCBleHRlbmRzIGFyYzQuQ29udHJhY3QgewogICAgdHhuIE9uQ29tcGxldGlvbgogICAgIQogICAgYXNzZXJ0IC8vIE9uQ29tcGxldGlvbiBtdXN0IGJlIE5vT3AKICAgIHR4biBBcHBsaWNhdGlvbklECiAgICBieiBtYWluX2NyZWF0ZV9Ob09wQDI3CiAgICBwdXNoYnl0ZXNzIDB4NDE0ZTQxYjUgMHg2ZTJlYmM5YiAweDIxZjFkZGZmIDB4YmM5OTQ0OWUgMHhjOGIzYzBmMCAweDAwMzU5N2EyIDB4YzdkNGRiZjMgMHgzZTJmN2NiNyAweDNmZDc5ODU2IDB4OTczNjU0YmYgMHgwYzc5M2IxOCAweGFiNmVmNzNiIDB4YWFlMmNhZDIgMHgxZjY1ZDY0ZSAweDE0ZmE5NDczIDB4YmM1ZTM4YzYgMHhhZmViZmNhYyAweGQwNTRjMTlmIDB4MTcwZTcyOTIgLy8gbWV0aG9kICJvcHRJbkFzc2V0cygpdm9pZCIsIG1ldGhvZCAiZGVwb3NpdCh1aW50NjQpdm9pZCIsIG1ldGhvZCAid2l0aGRyYXcodWludDY0KXZvaWQiLCBtZXRob2QgImNsYWltQ3JlYXRvcigpdm9pZCIsIG1ldGhvZCAiY29tcG91bmRZaWVsZCh1aW50NjQpdm9pZCIsIG1ldGhvZCAiZ2V0VmF1bHRTdGF0cygpKHVpbnQ2NCx1aW50NjQsdWludDY0LHVpbnQ2NCx1aW50NjQsdWludDY0KSIsIG1ldGhvZCAiZ2V0VXNlckFscGhhQmFsYW5jZShhZGRyZXNzKXVpbnQ2NCIsIG1ldGhvZCAiZ2V0VXNlclNoYXJlcyhhZGRyZXNzKXVpbnQ2NCIsIG1ldGhvZCAicHJldmlld0RlcG9zaXQodWludDY0KXVpbnQ2NCIsIG1ldGhvZCAicHJldmlld1dpdGhkcmF3KHVpbnQ2NCl1aW50NjQiLCBtZXRob2QgImdldENvbXBvdW5kUXVvdGUoKSh1aW50NjQsdWludDY0LHVpbnQ2NCkiLCBtZXRob2QgInVwZGF0ZU1pblN3YXBUaHJlc2hvbGQodWludDY0KXZvaWQiLCBtZXRob2QgInVwZGF0ZU1heFNsaXBwYWdlKHVpbnQ2NCl2b2lkIiwgbWV0aG9kICJ1cGRhdGVDcmVhdG9yQWRkcmVzcyhhZGRyZXNzKXZvaWQiLCBtZXRob2QgInVwZGF0ZVJhcmVmaUFkZHJlc3MoYWRkcmVzcyl2b2lkIiwgbWV0aG9kICJ1cGRhdGVDcmVhdG9yRmVlUmF0ZSh1aW50NjQpdm9pZCIsIG1ldGhvZCAiY29udHJpYnV0ZUZhcm0oKXZvaWQiLCBtZXRob2QgInNldEVtaXNzaW9uUmF0aW8odWludDY0KXZvaWQiLCBtZXRob2QgImdldEZhcm1TdGF0cygpKHVpbnQ2NCx1aW50NjQsdWludDY0KSIKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDAKICAgIG1hdGNoIG9wdEluQXNzZXRzIGRlcG9zaXQgd2l0aGRyYXcgY2xhaW1DcmVhdG9yIGNvbXBvdW5kWWllbGQgZ2V0VmF1bHRTdGF0cyBnZXRVc2VyQWxwaGFCYWxhbmNlIGdldFVzZXJTaGFyZXMgcHJldmlld0RlcG9zaXQgcHJldmlld1dpdGhkcmF3IGdldENvbXBvdW5kUXVvdGUgdXBkYXRlTWluU3dhcFRocmVzaG9sZCB1cGRhdGVNYXhTbGlwcGFnZSB1cGRhdGVDcmVhdG9yQWRkcmVzcyB1cGRhdGVSYXJlZmlBZGRyZXNzIHVwZGF0ZUNyZWF0b3JGZWVSYXRlIGNvbnRyaWJ1dGVGYXJtIHNldEVtaXNzaW9uUmF0aW8gZ2V0RmFybVN0YXRzCiAgICBlcnIKCm1haW5fY3JlYXRlX05vT3BAMjc6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNwogICAgLy8gZXhwb3J0IGNsYXNzIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdCBleHRlbmRzIGFyYzQuQ29udHJhY3QgewogICAgcHVzaGJ5dGVzIDB4NGQwM2NiMjkgLy8gbWV0aG9kICJjcmVhdGVWYXVsdCh1aW50NjQsdWludDY0LHVpbnQ2NCx1aW50NjQsdWludDY0LHVpbnQ2NCxhZGRyZXNzLGFkZHJlc3Mpdm9pZCIKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDAKICAgIG1hdGNoIGNyZWF0ZVZhdWx0CiAgICBlcnIKCm1haW5fY2xvc2VPdXRfcm91dGVANDoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM2NgogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnQ2xvc2VPdXQnIH0pCiAgICB0eG4gT25Db21wbGV0aW9uCiAgICBwdXNoaW50IDIgLy8gQ2xvc2VPdXQKICAgID09CiAgICB0eG4gQXBwbGljYXRpb25JRAogICAgJiYKICAgIGFzc2VydCAvLyBPbkNvbXBsZXRpb24gbXVzdCBiZSBDbG9zZU91dCAmJiBjYW4gb25seSBjYWxsIHdoZW4gbm90IGNyZWF0aW5nCiAgICBiIGNsb3NlT3V0CgptYWluX29wdEluX3JvdXRlQDM6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNTYKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IGFsbG93QWN0aW9uczogJ09wdEluJyB9KQogICAgdHhuIE9uQ29tcGxldGlvbgogICAgaW50Y18xIC8vIE9wdEluCiAgICA9PQogICAgdHhuIEFwcGxpY2F0aW9uSUQKICAgICYmCiAgICBhc3NlcnQgLy8gT25Db21wbGV0aW9uIG11c3QgYmUgT3B0SW4gJiYgY2FuIG9ubHkgY2FsbCB3aGVuIG5vdCBjcmVhdGluZwogICAgYiBvcHRJbgoKbWFpbl9iYXJlX3JvdXRpbmdAMzE6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNwogICAgLy8gZXhwb3J0IGNsYXNzIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdCBleHRlbmRzIGFyYzQuQ29udHJhY3QgewogICAgaW50Y18zIC8vIFVwZGF0ZUFwcGxpY2F0aW9uCiAgICBwdXNoaW50IDUgLy8gRGVsZXRlQXBwbGljYXRpb24KICAgIHR4biBPbkNvbXBsZXRpb24KICAgIG1hdGNoIG1haW5fdXBkYXRlQXBwbGljYXRpb25AMzIgbWFpbl9kZWxldGVBcHBsaWNhdGlvbkAzMwogICAgZXJyCgptYWluX2RlbGV0ZUFwcGxpY2F0aW9uQDMzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzU3CiAgICAvLyBAYmFyZW1ldGhvZCh7IGFsbG93QWN0aW9uczogJ0RlbGV0ZUFwcGxpY2F0aW9uJyB9KQogICAgdHhuIEFwcGxpY2F0aW9uSUQKICAgIGFzc2VydCAvLyBjYW4gb25seSBjYWxsIHdoZW4gbm90IGNyZWF0aW5nCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NTkKICAgIC8vIGFzc2VydChmYWxzZSwgJ0NvbnRyYWN0IGRlbGV0aW9uIGRpc2FibGVkJyk7CiAgICBlcnIgLy8gQ29udHJhY3QgZGVsZXRpb24gZGlzYWJsZWQKCm1haW5fdXBkYXRlQXBwbGljYXRpb25AMzI6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NTIKICAgIC8vIEBiYXJlbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnVXBkYXRlQXBwbGljYXRpb24nIH0pCiAgICB0eG4gQXBwbGljYXRpb25JRAogICAgYXNzZXJ0IC8vIGNhbiBvbmx5IGNhbGwgd2hlbiBub3QgY3JlYXRpbmcKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjc1NAogICAgLy8gYXNzZXJ0KGZhbHNlLCAnQ29udHJhY3QgdXBkYXRlcyBkaXNhYmxlZCcpOwogICAgZXJyIC8vIENvbnRyYWN0IHVwZGF0ZXMgZGlzYWJsZWQKCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmNyZWF0ZVZhdWx0W3JvdXRpbmddKCkgLT4gdm9pZDoKY3JlYXRlVmF1bHQ6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyNDkKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IG9uQ3JlYXRlOiAncmVxdWlyZScgfSkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDIKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDMKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDQKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDUKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDYKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDcKICAgIGR1cAogICAgbGVuCiAgICBwdXNoaW50IDMyIC8vIDMyCiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnN0YXRpY19hcnJheTxhcmM0LnVpbnQ4LCAzMj4KICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDgKICAgIGR1cAogICAgbGVuCiAgICBwdXNoaW50IDMyIC8vIDMyCiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnN0YXRpY19hcnJheTxhcmM0LnVpbnQ4LCAzMj4KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI2MQogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjY0CiAgICAvLyBhc3NlcnQoY3JlYXRvckZlZVJhdGUgPD0gTUFYX0ZFRV9SQVRFLCAnQ3JlYXRvciBmZWUgcmF0ZSBleGNlZWRzIG1heGltdW0gKDYlKScpOwogICAgZGlnIDUKICAgIHB1c2hpbnQgNiAvLyA2CiAgICA8PQogICAgYXNzZXJ0IC8vIENyZWF0b3IgZmVlIHJhdGUgZXhjZWVkcyBtYXhpbXVtICg2JSkKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI2NQogICAgLy8gYXNzZXJ0KG1pblN3YXBUaHJlc2hvbGQgPj0gTUlOX1NXQVBfQU1PVU5ULCAnU3dhcCB0aHJlc2hvbGQgdG9vIGxvdycpOwogICAgZGlnIDQKICAgIGludGMgNSAvLyAyMDAwMDAKICAgID49CiAgICBhc3NlcnQgLy8gU3dhcCB0aHJlc2hvbGQgdG9vIGxvdwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjY2CiAgICAvLyBhc3NlcnQobWluU3dhcFRocmVzaG9sZCA8PSBNQVhfU1dBUF9USFJFU0hPTEQsICdTd2FwIHRocmVzaG9sZCB0b28gaGlnaCAobWF4IDUwIFVTREMpJyk7CiAgICBkaWcgNAogICAgaW50YyA2IC8vIDUwMDAwMDAwCiAgICA8PQogICAgYXNzZXJ0IC8vIFN3YXAgdGhyZXNob2xkIHRvbyBoaWdoIChtYXggNTAgVVNEQykKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI2NwogICAgLy8gYXNzZXJ0KG1heFNsaXBwYWdlQnBzID49IE1JTl9NQVhfU0xJUFBBR0VfQlBTLCAnTWF4IHNsaXBwYWdlIHRvbyBsb3cgKG1pbiA1JSknKTsKICAgIGRpZyAzCiAgICBwdXNoaW50IDUwMCAvLyA1MDAKICAgID49CiAgICBhc3NlcnQgLy8gTWF4IHNsaXBwYWdlIHRvbyBsb3cgKG1pbiA1JSkKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI2OAogICAgLy8gYXNzZXJ0KG1heFNsaXBwYWdlQnBzIDw9IE1BWF9TTElQUEFHRV9CUFMsICdNYXggc2xpcHBhZ2UgdG9vIGhpZ2gnKTsKICAgIGRpZyAzCiAgICBpbnRjIDQgLy8gMTAwMDAKICAgIDw9CiAgICBhc3NlcnQgLy8gTWF4IHNsaXBwYWdlIHRvbyBoaWdoCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyNjkKICAgIC8vIGFzc2VydChhbHBoYUFzc2V0SWQgIT09IFVpbnQ2NCgwKSwgJ0ludmFsaWQgQWxwaGEgYXNzZXQnKTsKICAgIGRpZyA3CiAgICBhc3NlcnQgLy8gSW52YWxpZCBBbHBoYSBhc3NldAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjcwCiAgICAvLyBhc3NlcnQodXNkY0Fzc2V0SWQgIT09IFVpbnQ2NCgwKSwgJ0ludmFsaWQgVVNEQyBhc3NldCcpOwogICAgZGlnIDYKICAgIGFzc2VydCAvLyBJbnZhbGlkIFVTREMgYXNzZXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI3MQogICAgLy8gYXNzZXJ0KGFscGhhQXNzZXRJZCAhPT0gdXNkY0Fzc2V0SWQsICdBbHBoYSBhbmQgVVNEQyBtdXN0IGJlIGRpZmZlcmVudCcpOwogICAgZGlnIDcKICAgIGRpZyA3CiAgICAhPQogICAgYXNzZXJ0IC8vIEFscGhhIGFuZCBVU0RDIG11c3QgYmUgZGlmZmVyZW50CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyNzIKICAgIC8vIGFzc2VydCh0aW55bWFuUG9vbEFwcElkICE9PSBVaW50NjQoMCksICdJbnZhbGlkIFRpbnltYW4gcG9vbCBhcHAgSUQnKTsKICAgIGRpZyAyCiAgICBhc3NlcnQgLy8gSW52YWxpZCBUaW55bWFuIHBvb2wgYXBwIElECiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MwogICAgLy8gYWxwaGFBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gQWxwaGEgQVNBIElEIChkZXBvc2l0ICYgeWllbGQgYXNzZXQpCiAgICBieXRlYyA0IC8vICJhbHBoYUFzc2V0IgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mjc1CiAgICAvLyB0aGlzLmFscGhhQXNzZXQudmFsdWUgPSBhbHBoYUFzc2V0SWQ7CiAgICB1bmNvdmVyIDgKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NAogICAgLy8gdXNkY0Fzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gVVNEQyBBU0EgSUQgKGFpcmRyb3BzIGNvbWUgaW4gYXMgdGhpcykKICAgIGJ5dGVjIDUgLy8gInVzZGNBc3NldCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI3NgogICAgLy8gdGhpcy51c2RjQXNzZXQudmFsdWUgPSB1c2RjQXNzZXRJZDsKICAgIHVuY292ZXIgNwogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ3CiAgICAvLyBjcmVhdG9yQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7ICAgLy8gVmF1bHQgY3JlYXRvciB3aG8gcmVjZWl2ZXMgZmVlCiAgICBieXRlY18zIC8vICJjcmVhdG9yQWRkcmVzcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI3OQogICAgLy8gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZSA9IFR4bi5zZW5kZXI7CiAgICB0eG4gU2VuZGVyCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDgKICAgIC8vIHJhcmVmaUFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgICAvLyBSYXJlRmkgcGxhdGZvcm0gYWRkcmVzcyAoY2FuIGFsc28gdHJpZ2dlciBzd2FwcykKICAgIGJ5dGVjIDEwIC8vICJyYXJlZmlBZGRyZXNzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjgwCiAgICAvLyB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWUgPSByYXJlZmlBZGRyZXNzOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ5CiAgICAvLyBjcmVhdG9yRmVlUmF0ZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgLy8gMC0xMDAsIHBlcmNlbnRhZ2Ugb2YgeWllbGQgdG8gY3JlYXRvcgogICAgYnl0ZWMgMTQgLy8gImNyZWF0b3JGZWVSYXRlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjgxCiAgICAvLyB0aGlzLmNyZWF0b3JGZWVSYXRlLnZhbHVlID0gY3JlYXRvckZlZVJhdGU7CiAgICB1bmNvdmVyIDUKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZEFscGhhID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCBBbHBoYSBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjgyCiAgICAvLyB0aGlzLmNyZWF0b3JVbmNsYWltZWRBbHBoYS52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsU2hhcmVzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBUb3RhbCBzaGFyZXMgaXNzdWVkIHRvIGFsbCBkZXBvc2l0b3JzCiAgICBieXRlY18wIC8vICJ0b3RhbFNoYXJlcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI4NQogICAgLy8gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mjg2CiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSBVaW50NjQoMCk7CiAgICBpbnRjXzAgLy8gMAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU1CiAgICAvLyBtaW5Td2FwVGhyZXNob2xkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgLy8gTWluaW11bSBVU0RDIGJlZm9yZSBzd2FwIGFsbG93ZWQKICAgIGJ5dGVjIDExIC8vICJtaW5Td2FwVGhyZXNob2xkIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mjg3CiAgICAvLyB0aGlzLm1pblN3YXBUaHJlc2hvbGQudmFsdWUgPSBtaW5Td2FwVGhyZXNob2xkOwogICAgdW5jb3ZlciA0CiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTYKICAgIC8vIG1heFNsaXBwYWdlQnBzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAvLyBNYXhpbXVtIHNsaXBwYWdlIHRvbGVyYW5jZSBpbiBiYXNpcyBwb2ludHMKICAgIGJ5dGVjIDEyIC8vICJtYXhTbGlwcGFnZUJwcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI4OAogICAgLy8gdGhpcy5tYXhTbGlwcGFnZUJwcy52YWx1ZSA9IG1heFNsaXBwYWdlQnBzOwogICAgdW5jb3ZlciAzCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTcKICAgIC8vIHRvdGFsWWllbGRDb21wb3VuZGVkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBUb3RhbCB5aWVsZCBjb21wb3VuZGVkIChmb3Igc3RhdHMpCiAgICBieXRlYyAxMyAvLyAidG90YWxZaWVsZENvbXBvdW5kZWQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyODkKICAgIC8vIHRoaXMudG90YWxZaWVsZENvbXBvdW5kZWQudmFsdWUgPSBVaW50NjQoMCk7CiAgICBpbnRjXzAgLy8gMAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjYwCiAgICAvLyB0aW55bWFuUG9vbEFwcElkID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgLy8gVGlueW1hbiBWMiBwb29sIGFwcCBJRAogICAgYnl0ZWMgMTUgLy8gInRpbnltYW5Qb29sQXBwSWQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyOTIKICAgIC8vIHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZSA9IHRpbnltYW5Qb29sQXBwSWQ7CiAgICB1bmNvdmVyIDIKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MQogICAgLy8gdGlueW1hblBvb2xBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgLy8gVGlueW1hbiBwb29sIGFkZHJlc3MKICAgIGJ5dGVjIDE2IC8vICJ0aW55bWFuUG9vbEFkZHJlc3MiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyOTMKICAgIC8vIHRoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlID0gdGlueW1hblBvb2xBZGRyZXNzOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBBbHBoYSBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzIgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mjk2CiAgICAvLyB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID0gVWludDY0KDApOwogICAgaW50Y18wIC8vIDAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NQogICAgLy8gZW1pc3Npb25SYXRpbyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gTXVsdGlwbGllciBmb3IgZHluYW1pYyByYXRlOiByYXRlID0gZmFybUJhbGFuY2UgKiBlbWlzc2lvblJhdGlvIC8gdG90YWxBbHBoYQogICAgYnl0ZWMgOSAvLyAiZW1pc3Npb25SYXRpbyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjI5NwogICAgLy8gdGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlID0gVWludDY0KDApOyAvLyBEaXNhYmxlZCBieSBkZWZhdWx0LCBjcmVhdG9yIHNldHMgdmlhIHNldEVtaXNzaW9uUmF0aW8KICAgIGludGNfMCAvLyAwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjgKICAgIC8vIGFzc2V0c09wdGVkSW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgLy8gMSBpZiBhc3NldHMgYXJlIG9wdGVkIGluLCAwIG90aGVyd2lzZQogICAgYnl0ZWMgMTcgLy8gImFzc2V0c09wdGVkSW4iCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMDAKICAgIC8vIHRoaXMuYXNzZXRzT3B0ZWRJbi52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjQ5CiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyBvbkNyZWF0ZTogJ3JlcXVpcmUnIH0pCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5vcHRJbkFzc2V0c1tyb3V0aW5nXSgpIC0+IHZvaWQ6Cm9wdEluQXNzZXRzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzEwCiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMTEKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiBvcHQtaW4gYXNzZXRzJyk7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDcKICAgIC8vIGNyZWF0b3JBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAvLyBWYXVsdCBjcmVhdG9yIHdobyByZWNlaXZlcyBmZWUKICAgIGJ5dGVjXzMgLy8gImNyZWF0b3JBZGRyZXNzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzExCiAgICAvLyBhc3NlcnQoVHhuLnNlbmRlciA9PT0gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZSwgJ09ubHkgY3JlYXRvciBjYW4gb3B0LWluIGFzc2V0cycpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICBhc3NlcnQgLy8gT25seSBjcmVhdG9yIGNhbiBvcHQtaW4gYXNzZXRzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMTIKICAgIC8vIGFzc2VydCh0aGlzLmFzc2V0c09wdGVkSW4udmFsdWUgPT09IFVpbnQ2NCgwKSwgJ0Fzc2V0cyBhbHJlYWR5IG9wdGVkIGluJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjgKICAgIC8vIGFzc2V0c09wdGVkSW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgLy8gMSBpZiBhc3NldHMgYXJlIG9wdGVkIGluLCAwIG90aGVyd2lzZQogICAgYnl0ZWMgMTcgLy8gImFzc2V0c09wdGVkSW4iCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMTIKICAgIC8vIGFzc2VydCh0aGlzLmFzc2V0c09wdGVkSW4udmFsdWUgPT09IFVpbnQ2NCgwKSwgJ0Fzc2V0cyBhbHJlYWR5IG9wdGVkIGluJyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgIQogICAgYXNzZXJ0IC8vIEFzc2V0cyBhbHJlYWR5IG9wdGVkIGluCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMTQKICAgIC8vIGNvbnN0IGFwcEFkZHI6IEFjY291bnQgPSBHbG9iYWwuY3VycmVudEFwcGxpY2F0aW9uQWRkcmVzczsKICAgIGdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMTgKICAgIC8vIGNvbnN0IGN1cnJlbnRJbmRleCA9IFR4bi5ncm91cEluZGV4OwogICAgdHhuIEdyb3VwSW5kZXgKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjMxOQogICAgLy8gYXNzZXJ0KGN1cnJlbnRJbmRleCA+PSBVaW50NjQoMSksICdBcHAgY2FsbCBtdXN0IGZvbGxvdyBwYXltZW50Jyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBBcHAgY2FsbCBtdXN0IGZvbGxvdyBwYXltZW50CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMjEKICAgIC8vIGNvbnN0IGFsZ29QYXltZW50ID0gZ3R4bi5QYXltZW50VHhuKGN1cnJlbnRJbmRleCAtIFVpbnQ2NCgxKSk7CiAgICBpbnRjXzEgLy8gMQogICAgLQogICAgZHVwCiAgICBndHhucyBUeXBlRW51bQogICAgaW50Y18xIC8vIHBheQogICAgPT0KICAgIGFzc2VydCAvLyB0cmFuc2FjdGlvbiB0eXBlIGlzIHBheQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzIyCiAgICAvLyBhc3NlcnQoYWxnb1BheW1lbnQucmVjZWl2ZXIgPT09IGFwcEFkZHIsICdQYXltZW50IG11c3QgYmUgdG8gYXBwJyk7CiAgICBkdXAKICAgIGd0eG5zIFJlY2VpdmVyCiAgICBkaWcgMgogICAgPT0KICAgIGFzc2VydCAvLyBQYXltZW50IG11c3QgYmUgdG8gYXBwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMjMKICAgIC8vIGFzc2VydChhbGdvUGF5bWVudC5hbW91bnQgPj0gdG90YWxSZXF1aXJlZCwgJ0luc3VmZmljaWVudCBBTEdPIChuZWVkIDUuNCBBTEdPKScpOwogICAgZHVwCiAgICBndHhucyBBbW91bnQKICAgIHB1c2hpbnQgNTQwMDAwMCAvLyA1NDAwMDAwCiAgICA+PQogICAgYXNzZXJ0IC8vIEluc3VmZmljaWVudCBBTEdPIChuZWVkIDUuNCBBTEdPKQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzI0CiAgICAvLyBhc3NlcnQoYWxnb1BheW1lbnQuc2VuZGVyID09PSBUeG4uc2VuZGVyLCAnUGF5bWVudCBtdXN0IGJlIGZyb20gY2FsbGVyJyk7CiAgICBkdXAKICAgIGd0eG5zIFNlbmRlcgogICAgdHhuIFNlbmRlcgogICAgPT0KICAgIGFzc2VydCAvLyBQYXltZW50IG11c3QgYmUgZnJvbSBjYWxsZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjMyNwogICAgLy8gYXNzZXJ0KGFsZ29QYXltZW50LnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICBkdXAKICAgIGd0eG5zIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzI4CiAgICAvLyBhc3NlcnQoYWxnb1BheW1lbnQuY2xvc2VSZW1haW5kZXJUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAnY2xvc2VSZW1haW5kZXJUbyBtdXN0IGJlIHplcm8nKTsKICAgIGd0eG5zIENsb3NlUmVtYWluZGVyVG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyBjbG9zZVJlbWFpbmRlclRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzMxLTMzNgogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogYXBwQWRkciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogVWludDY0KDApLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9iZWdpbgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzMzCiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuYWxwaGFBc3NldC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDMKICAgIC8vIGFscGhhQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIEFscGhhIEFTQSBJRCAoZGVwb3NpdCAmIHlpZWxkIGFzc2V0KQogICAgYnl0ZWMgNCAvLyAiYWxwaGFBc3NldCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjMzMwogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjMzNAogICAgLy8gYXNzZXRBbW91bnQ6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEFzc2V0QW1vdW50CiAgICBpdHhuX2ZpZWxkIFhmZXJBc3NldAogICAgZHVwCiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjMzMS0zMzYKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IGFwcEFkZHIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IFVpbnQ2NCgwKSwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGludGNfMyAvLyA0CiAgICBpdHhuX2ZpZWxkIFR5cGVFbnVtCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMzUKICAgIC8vIGZlZTogVWludDY0KDApLAogICAgaW50Y18wIC8vIDAKICAgIGl0eG5fZmllbGQgRmVlCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozMzEtMzM2CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBhcHBBZGRyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuYWxwaGFBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpdHhuX3N1Ym1pdAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzM5LTM0NAogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogYXBwQWRkciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnVzZGNBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpdHhuX2JlZ2luCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNDEKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ0CiAgICAvLyB1c2RjQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBVU0RDIEFTQSBJRCAoYWlyZHJvcHMgY29tZSBpbiBhcyB0aGlzKQogICAgYnl0ZWMgNSAvLyAidXNkY0Fzc2V0IgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzQxCiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMudXNkY0Fzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNDIKICAgIC8vIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICBpbnRjXzAgLy8gMAogICAgaXR4bl9maWVsZCBBc3NldEFtb3VudAogICAgaXR4bl9maWVsZCBYZmVyQXNzZXQKICAgIGl0eG5fZmllbGQgQXNzZXRSZWNlaXZlcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzM5LTM0NAogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogYXBwQWRkciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnVzZGNBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpbnRjXzMgLy8gNAogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzQzCiAgICAvLyBmZWU6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEZlZQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzM5LTM0NAogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogYXBwQWRkciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnVzZGNBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBVaW50NjQoMCksCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSkuc3VibWl0KCk7CiAgICBpdHhuX3N1Ym1pdAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjgKICAgIC8vIGFzc2V0c09wdGVkSW4gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgLy8gMSBpZiBhc3NldHMgYXJlIG9wdGVkIGluLCAwIG90aGVyd2lzZQogICAgYnl0ZWMgMTcgLy8gImFzc2V0c09wdGVkSW4iCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNDYKICAgIC8vIHRoaXMuYXNzZXRzT3B0ZWRJbi52YWx1ZSA9IFVpbnQ2NCgxKTsKICAgIGludGNfMSAvLyAxCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzA4CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQub3B0SW5bcm91dGluZ10oKSAtPiB2b2lkOgpvcHRJbjoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM1OAogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzYwCiAgICAvLyB0aGlzLnVzZXJTaGFyZXMoVHhuLnNlbmRlcikudmFsdWUgPSBVaW50NjQoMCk7CiAgICB0eG4gU2VuZGVyCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NAogICAgLy8gdXNlclNoYXJlcyA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFVzZXIncyBzaGFyZSBiYWxhbmNlIChyZXByZXNlbnRzIHByb3BvcnRpb25hbCBvd25lcnNoaXApCiAgICBieXRlYyA2IC8vICJ1c2VyU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzYwCiAgICAvLyB0aGlzLnVzZXJTaGFyZXMoVHhuLnNlbmRlcikudmFsdWUgPSBVaW50NjQoMCk7CiAgICBpbnRjXzAgLy8gMAogICAgYXBwX2xvY2FsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MzU2CiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyBhbGxvd0FjdGlvbnM6ICdPcHRJbicgfSkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmNsb3NlT3V0W3JvdXRpbmddKCkgLT4gdm9pZDoKY2xvc2VPdXQ6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNjgKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM2OQogICAgLy8gY29uc3Qgc2hhcmVzID0gdGhpcy51c2VyU2hhcmVzKFR4bi5zZW5kZXIpLnZhbHVlOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjc0CiAgICAvLyB1c2VyU2hhcmVzID0gTG9jYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVXNlcidzIHNoYXJlIGJhbGFuY2UgKHJlcHJlc2VudHMgcHJvcG9ydGlvbmFsIG93bmVyc2hpcCkKICAgIGJ5dGVjIDYgLy8gInVzZXJTaGFyZXMiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNjkKICAgIC8vIGNvbnN0IHNoYXJlcyA9IHRoaXMudXNlclNoYXJlcyhUeG4uc2VuZGVyKS52YWx1ZTsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIHN3YXAKICAgIGR1cAogICAgdW5jb3ZlciAyCiAgICBhc3NlcnQgLy8gY2hlY2sgTG9jYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM3MQogICAgLy8gaWYgKHNoYXJlcyA+IFVpbnQ2NCgwKSkgewogICAgYnogY2xvc2VPdXRfYWZ0ZXJfaWZfZWxzZUA0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNzMKICAgIC8vIGNvbnN0IGFscGhhQW1vdW50ID0gdGhpcy5zaGFyZXNUb0FscGhhKHNoYXJlcyk7CiAgICBkdXBuIDIKICAgIGNhbGxzdWIgc2hhcmVzVG9BbHBoYQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mzc2CiAgICAvLyB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID0gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSAtIHNoYXJlczsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxTaGFyZXMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIFRvdGFsIHNoYXJlcyBpc3N1ZWQgdG8gYWxsIGRlcG9zaXRvcnMKICAgIGJ5dGVjXzAgLy8gInRvdGFsU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mzc2CiAgICAvLyB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID0gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSAtIHNoYXJlczsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgIC0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbFNoYXJlcyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gVG90YWwgc2hhcmVzIGlzc3VlZCB0byBhbGwgZGVwb3NpdG9ycwogICAgYnl0ZWNfMCAvLyAidG90YWxTaGFyZXMiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozNzYKICAgIC8vIHRoaXMudG90YWxTaGFyZXMudmFsdWUgPSB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlIC0gc2hhcmVzOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM3NwogICAgLy8gdGhpcy50b3RhbEFscGhhLnZhbHVlID0gdGhpcy50b3RhbEFscGhhLnZhbHVlIC0gYWxwaGFBbW91bnQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mzc3CiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgLSBhbHBoYUFtb3VudDsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBkaWcgMQogICAgLQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Mzc3CiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgLSBhbHBoYUFtb3VudDsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozODAtMzg1CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBUeG4uc2VuZGVyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuYWxwaGFBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBhbHBoYUFtb3VudCwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fYmVnaW4KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM4MQogICAgLy8gYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIHR4biBTZW5kZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM4MgogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzCiAgICAvLyBhbHBoYUFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBBbHBoYSBBU0EgSUQgKGRlcG9zaXQgJiB5aWVsZCBhc3NldCkKICAgIGJ5dGVjIDQgLy8gImFscGhhQXNzZXQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czozODIKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM4MC0zODUKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IGFscGhhQW1vdW50LAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaW50Y18zIC8vIDQKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM4NAogICAgLy8gZmVlOiBVaW50NjQoMCksCiAgICBpbnRjXzAgLy8gMAogICAgaXR4bl9maWVsZCBGZWUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM4MC0zODUKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IGFscGhhQW1vdW50LAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9zdWJtaXQKCmNsb3NlT3V0X2FmdGVyX2lmX2Vsc2VANDoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjM2NgogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgYWxsb3dBY3Rpb25zOiAnQ2xvc2VPdXQnIH0pCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5kZXBvc2l0W3JvdXRpbmddKCkgLT4gdm9pZDoKZGVwb3NpdDoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQwMwogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIGR1cAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDA1CiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MDYKICAgIC8vIGFzc2VydChzbGlwcGFnZUJwcyA8PSB0aGlzLm1heFNsaXBwYWdlQnBzLnZhbHVlLCAnU2xpcHBhZ2UgZXhjZWVkcyBtYXhpbXVtIGFsbG93ZWQnKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NgogICAgLy8gbWF4U2xpcHBhZ2VCcHMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgIC8vIE1heGltdW0gc2xpcHBhZ2UgdG9sZXJhbmNlIGluIGJhc2lzIHBvaW50cwogICAgYnl0ZWMgMTIgLy8gIm1heFNsaXBwYWdlQnBzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDA2CiAgICAvLyBhc3NlcnQoc2xpcHBhZ2VCcHMgPD0gdGhpcy5tYXhTbGlwcGFnZUJwcy52YWx1ZSwgJ1NsaXBwYWdlIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkJyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPD0KICAgIGFzc2VydCAvLyBTbGlwcGFnZSBleGNlZWRzIG1heGltdW0gYWxsb3dlZAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDA4CiAgICAvLyBjb25zdCBhcHBBZGRyOiBBY2NvdW50ID0gR2xvYmFsLmN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3M7CiAgICBnbG9iYWwgQ3VycmVudEFwcGxpY2F0aW9uQWRkcmVzcwogICAgZHVwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MDkKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDQKICAgIC8vIHVzZGNBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFVTREMgQVNBIElEIChhaXJkcm9wcyBjb21lIGluIGFzIHRoaXMpCiAgICBieXRlYyA1IC8vICJ1c2RjQXNzZXQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MDkKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCiAgICBzd2FwCiAgICBkdXAKICAgIHVuY292ZXIgMgogICAgYXNzZXJ0IC8vIGFjY291bnQgb3B0ZWQgaW50byBhc3NldAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDEzCiAgICAvLyBpZiAodXNkY0JhbGFuY2UgPj0gdGhpcy5taW5Td2FwVGhyZXNob2xkLnZhbHVlICYmIHRoaXMudG90YWxTaGFyZXMudmFsdWUgPiBVaW50NjQoMCkpIHsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NQogICAgLy8gbWluU3dhcFRocmVzaG9sZCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgIC8vIE1pbmltdW0gVVNEQyBiZWZvcmUgc3dhcCBhbGxvd2VkCiAgICBieXRlYyAxMSAvLyAibWluU3dhcFRocmVzaG9sZCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQxMwogICAgLy8gaWYgKHVzZGNCYWxhbmNlID49IHRoaXMubWluU3dhcFRocmVzaG9sZC52YWx1ZSAmJiB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPj0KICAgIGJ6IGRlcG9zaXRfYWZ0ZXJfaWZfZWxzZUA0CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsU2hhcmVzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBUb3RhbCBzaGFyZXMgaXNzdWVkIHRvIGFsbCBkZXBvc2l0b3JzCiAgICBieXRlY18wIC8vICJ0b3RhbFNoYXJlcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQxMwogICAgLy8gaWYgKHVzZGNCYWxhbmNlID49IHRoaXMubWluU3dhcFRocmVzaG9sZC52YWx1ZSAmJiB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYnogZGVwb3NpdF9hZnRlcl9pZl9lbHNlQDQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQxNAogICAgLy8gdGhpcy5leGVjdXRlQ29tcG91bmQodXNkY0JhbGFuY2UsIHNsaXBwYWdlQnBzKTsKICAgIGR1cAogICAgZGlnIDMKICAgIGNhbGxzdWIgZXhlY3V0ZUNvbXBvdW5kCgpkZXBvc2l0X2FmdGVyX2lmX2Vsc2VANDoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQxOAogICAgLy8gY29uc3QgY3VycmVudEluZGV4ID0gVHhuLmdyb3VwSW5kZXg7CiAgICB0eG4gR3JvdXBJbmRleAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDE5CiAgICAvLyBhc3NlcnQoY3VycmVudEluZGV4ID49IFVpbnQ2NCgxKSwgJ0FwcCBjYWxsIG11c3QgZm9sbG93IGFzc2V0IHRyYW5zZmVyJyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBBcHAgY2FsbCBtdXN0IGZvbGxvdyBhc3NldCB0cmFuc2ZlcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDIxCiAgICAvLyBjb25zdCBkZXBvc2l0VHJhbnNmZXIgPSBndHhuLkFzc2V0VHJhbnNmZXJUeG4oY3VycmVudEluZGV4IC0gVWludDY0KDEpKTsKICAgIGludGNfMSAvLyAxCiAgICAtCiAgICBkdXAKICAgIGd0eG5zIFR5cGVFbnVtCiAgICBpbnRjXzMgLy8gYXhmZXIKICAgID09CiAgICBhc3NlcnQgLy8gdHJhbnNhY3Rpb24gdHlwZSBpcyBheGZlcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDIyCiAgICAvLyBhc3NlcnQoZGVwb3NpdFRyYW5zZmVyLnhmZXJBc3NldCA9PT0gQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwgJ011c3QgdHJhbnNmZXIgQWxwaGEgYXNzZXQnKTsKICAgIGR1cAogICAgZ3R4bnMgWGZlckFzc2V0CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDMKICAgIC8vIGFscGhhQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIEFscGhhIEFTQSBJRCAoZGVwb3NpdCAmIHlpZWxkIGFzc2V0KQogICAgYnl0ZWMgNCAvLyAiYWxwaGFBc3NldCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQyMgogICAgLy8gYXNzZXJ0KGRlcG9zaXRUcmFuc2Zlci54ZmVyQXNzZXQgPT09IEFzc2V0KHRoaXMuYWxwaGFBc3NldC52YWx1ZSksICdNdXN0IHRyYW5zZmVyIEFscGhhIGFzc2V0Jyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIGFzc2VydCAvLyBNdXN0IHRyYW5zZmVyIEFscGhhIGFzc2V0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MjMKICAgIC8vIGFzc2VydChkZXBvc2l0VHJhbnNmZXIuYXNzZXRSZWNlaXZlciA9PT0gYXBwQWRkciwgJ011c3Qgc2VuZCB0byBjb250cmFjdCcpOwogICAgZHVwCiAgICBndHhucyBBc3NldFJlY2VpdmVyCiAgICBkaWcgMwogICAgPT0KICAgIGFzc2VydCAvLyBNdXN0IHNlbmQgdG8gY29udHJhY3QKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQyNAogICAgLy8gYXNzZXJ0KGRlcG9zaXRUcmFuc2Zlci5zZW5kZXIgPT09IFR4bi5zZW5kZXIsICdUcmFuc2ZlciBtdXN0IGJlIGZyb20gY2FsbGVyJyk7CiAgICBkdXAKICAgIGd0eG5zIFNlbmRlcgogICAgdHhuIFNlbmRlcgogICAgPT0KICAgIGFzc2VydCAvLyBUcmFuc2ZlciBtdXN0IGJlIGZyb20gY2FsbGVyCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MjcKICAgIC8vIGFzc2VydChkZXBvc2l0VHJhbnNmZXIucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIGR1cAogICAgZ3R4bnMgUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MjgKICAgIC8vIGFzc2VydChkZXBvc2l0VHJhbnNmZXIuYXNzZXRDbG9zZVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdhc3NldENsb3NlVG8gbXVzdCBiZSB6ZXJvJyk7CiAgICBkdXAKICAgIGd0eG5zIEFzc2V0Q2xvc2VUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIGFzc2V0Q2xvc2VUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzMAogICAgLy8gY29uc3QgYW1vdW50ID0gZGVwb3NpdFRyYW5zZmVyLmFzc2V0QW1vdW50OwogICAgZ3R4bnMgQXNzZXRBbW91bnQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzMQogICAgLy8gYXNzZXJ0KGFtb3VudCA+PSBNSU5fREVQT1NJVF9BTU9VTlQsICdEZXBvc2l0IHRvbyBzbWFsbCcpOwogICAgZHVwCiAgICBwdXNoaW50IDEwMDAwMDAgLy8gMTAwMDAwMAogICAgPj0KICAgIGFzc2VydCAvLyBEZXBvc2l0IHRvbyBzbWFsbAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDM0CiAgICAvLyBjb25zdCBzaGFyZXNUb01pbnQgPSB0aGlzLmFscGhhVG9TaGFyZXMoYW1vdW50KTsKICAgIGR1cAogICAgY2FsbHN1YiBhbHBoYVRvU2hhcmVzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MzUKICAgIC8vIGFzc2VydChzaGFyZXNUb01pbnQgPiBVaW50NjQoMCksICdTaGFyZXMgdG8gbWludCBpcyB6ZXJvJyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBTaGFyZXMgdG8gbWludCBpcyB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0MzgKICAgIC8vIHRoaXMudXNlclNoYXJlcyhUeG4uc2VuZGVyKS52YWx1ZSA9IHRoaXMudXNlclNoYXJlcyhUeG4uc2VuZGVyKS52YWx1ZSArIHNoYXJlc1RvTWludDsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NAogICAgLy8gdXNlclNoYXJlcyA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFVzZXIncyBzaGFyZSBiYWxhbmNlIChyZXByZXNlbnRzIHByb3BvcnRpb25hbCBvd25lcnNoaXApCiAgICBieXRlYyA2IC8vICJ1c2VyU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDM4CiAgICAvLyB0aGlzLnVzZXJTaGFyZXMoVHhuLnNlbmRlcikudmFsdWUgPSB0aGlzLnVzZXJTaGFyZXMoVHhuLnNlbmRlcikudmFsdWUgKyBzaGFyZXNUb01pbnQ7CiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgTG9jYWxTdGF0ZSBleGlzdHMKICAgIGRpZyAxCiAgICArCiAgICB0eG4gU2VuZGVyCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NAogICAgLy8gdXNlclNoYXJlcyA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFVzZXIncyBzaGFyZSBiYWxhbmNlIChyZXByZXNlbnRzIHByb3BvcnRpb25hbCBvd25lcnNoaXApCiAgICBieXRlYyA2IC8vICJ1c2VyU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDM4CiAgICAvLyB0aGlzLnVzZXJTaGFyZXMoVHhuLnNlbmRlcikudmFsdWUgPSB0aGlzLnVzZXJTaGFyZXMoVHhuLnNlbmRlcikudmFsdWUgKyBzaGFyZXNUb01pbnQ7CiAgICB1bmNvdmVyIDIKICAgIGFwcF9sb2NhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzOQogICAgLy8gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSA9IHRoaXMudG90YWxTaGFyZXMudmFsdWUgKyBzaGFyZXNUb01pbnQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsU2hhcmVzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBUb3RhbCBzaGFyZXMgaXNzdWVkIHRvIGFsbCBkZXBvc2l0b3JzCiAgICBieXRlY18wIC8vICJ0b3RhbFNoYXJlcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzOQogICAgLy8gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSA9IHRoaXMudG90YWxTaGFyZXMudmFsdWUgKyBzaGFyZXNUb01pbnQ7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgKwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsU2hhcmVzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBUb3RhbCBzaGFyZXMgaXNzdWVkIHRvIGFsbCBkZXBvc2l0b3JzCiAgICBieXRlY18wIC8vICJ0b3RhbFNoYXJlcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzOQogICAgLy8gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSA9IHRoaXMudG90YWxTaGFyZXMudmFsdWUgKyBzaGFyZXNUb01pbnQ7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDQwCiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgKyBhbW91bnQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDQwCiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgKyBhbW91bnQ7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgKwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDQwCiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgKyBhbW91bnQ7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDAzCiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQud2l0aGRyYXdbcm91dGluZ10oKSAtPiB2b2lkOgp3aXRoZHJhdzoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ0OAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIGR1cAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDUwCiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NTEKICAgIC8vIGNvbnN0IHVzZXJTaGFyZUJhbGFuY2UgPSB0aGlzLnVzZXJTaGFyZXMoVHhuLnNlbmRlcikudmFsdWU7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzQKICAgIC8vIHVzZXJTaGFyZXMgPSBMb2NhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBVc2VyJ3Mgc2hhcmUgYmFsYW5jZSAocmVwcmVzZW50cyBwcm9wb3J0aW9uYWwgb3duZXJzaGlwKQogICAgYnl0ZWMgNiAvLyAidXNlclNoYXJlcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ1MQogICAgLy8gY29uc3QgdXNlclNoYXJlQmFsYW5jZSA9IHRoaXMudXNlclNoYXJlcyhUeG4uc2VuZGVyKS52YWx1ZTsKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIHN3YXAKICAgIGNvdmVyIDIKICAgIGFzc2VydCAvLyBjaGVjayBMb2NhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDU1CiAgICAvLyBpZiAoc2hhcmVzVG9SZWRlZW0gPT09IFVpbnQ2NCgwKSkgewogICAgYnogd2l0aGRyYXdfaWZfYm9keUAyCiAgICBkaWcgMQoKd2l0aGRyYXdfYWZ0ZXJfaWZfZWxzZUAzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDU5CiAgICAvLyBhc3NlcnQoc2hhcmVzVG9SZWRlZW0gPiBVaW50NjQoMCksICdOb3RoaW5nIHRvIHdpdGhkcmF3Jyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBOb3RoaW5nIHRvIHdpdGhkcmF3CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NjAKICAgIC8vIGFzc2VydChzaGFyZXNUb1JlZGVlbSA8PSB1c2VyU2hhcmVCYWxhbmNlLCAnSW5zdWZmaWNpZW50IHNoYXJlcycpOwogICAgZHVwCiAgICBkaWcgMgogICAgZHVwCiAgICBjb3ZlciAzCiAgICA8PQogICAgYXNzZXJ0IC8vIEluc3VmZmljaWVudCBzaGFyZXMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ2MwogICAgLy8gY29uc3QgYWxwaGFBbW91bnQgPSB0aGlzLnNoYXJlc1RvQWxwaGEoc2hhcmVzVG9SZWRlZW0pOwogICAgZHVwCiAgICBjYWxsc3ViIHNoYXJlc1RvQWxwaGEKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ2NAogICAgLy8gYXNzZXJ0KGFscGhhQW1vdW50ID4gVWludDY0KDApLCAnQWxwaGEgYW1vdW50IGlzIHplcm8nKTsKICAgIGR1cAogICAgYXNzZXJ0IC8vIEFscGhhIGFtb3VudCBpcyB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NjcKICAgIC8vIHRoaXMudXNlclNoYXJlcyhUeG4uc2VuZGVyKS52YWx1ZSA9IHVzZXJTaGFyZUJhbGFuY2UgLSBzaGFyZXNUb1JlZGVlbTsKICAgIHVuY292ZXIgMgogICAgZGlnIDIKICAgIC0KICAgIHR4biBTZW5kZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjc0CiAgICAvLyB1c2VyU2hhcmVzID0gTG9jYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVXNlcidzIHNoYXJlIGJhbGFuY2UgKHJlcHJlc2VudHMgcHJvcG9ydGlvbmFsIG93bmVyc2hpcCkKICAgIGJ5dGVjIDYgLy8gInVzZXJTaGFyZXMiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NjcKICAgIC8vIHRoaXMudXNlclNoYXJlcyhUeG4uc2VuZGVyKS52YWx1ZSA9IHVzZXJTaGFyZUJhbGFuY2UgLSBzaGFyZXNUb1JlZGVlbTsKICAgIHVuY292ZXIgMgogICAgYXBwX2xvY2FsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDY4CiAgICAvLyB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID0gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSAtIHNoYXJlc1RvUmVkZWVtOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbFNoYXJlcyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gVG90YWwgc2hhcmVzIGlzc3VlZCB0byBhbGwgZGVwb3NpdG9ycwogICAgYnl0ZWNfMCAvLyAidG90YWxTaGFyZXMiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NjgKICAgIC8vIHRoaXMudG90YWxTaGFyZXMudmFsdWUgPSB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlIC0gc2hhcmVzVG9SZWRlZW07CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgdW5jb3ZlciAyCiAgICAtCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxTaGFyZXMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIFRvdGFsIHNoYXJlcyBpc3N1ZWQgdG8gYWxsIGRlcG9zaXRvcnMKICAgIGJ5dGVjXzAgLy8gInRvdGFsU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDY4CiAgICAvLyB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID0gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSAtIHNoYXJlc1RvUmVkZWVtOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ2OQogICAgLy8gdGhpcy50b3RhbEFscGhhLnZhbHVlID0gdGhpcy50b3RhbEFscGhhLnZhbHVlIC0gYWxwaGFBbW91bnQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDY5CiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgLSBhbHBoYUFtb3VudDsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBkaWcgMQogICAgLQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDY5CiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgLSBhbHBoYUFtb3VudDsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NzItNDc3CiAgICAvLyBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICBhc3NldFJlY2VpdmVyOiBUeG4uc2VuZGVyLAogICAgLy8gICB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuYWxwaGFBc3NldC52YWx1ZSksCiAgICAvLyAgIGFzc2V0QW1vdW50OiBhbHBoYUFtb3VudCwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fYmVnaW4KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ3MwogICAgLy8gYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIHR4biBTZW5kZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ3NAogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzCiAgICAvLyBhbHBoYUFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBBbHBoYSBBU0EgSUQgKGRlcG9zaXQgJiB5aWVsZCBhc3NldCkKICAgIGJ5dGVjIDQgLy8gImFscGhhQXNzZXQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NzQKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBpdHhuX2ZpZWxkIEFzc2V0UmVjZWl2ZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ3Mi00NzcKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IGFscGhhQW1vdW50LAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaW50Y18zIC8vIDQKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ3NgogICAgLy8gZmVlOiBVaW50NjQoMCksCiAgICBpbnRjXzAgLy8gMAogICAgaXR4bl9maWVsZCBGZWUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ3Mi00NzcKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IGFscGhhQW1vdW50LAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9zdWJtaXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ0OAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCndpdGhkcmF3X2lmX2JvZHlAMjoKICAgIGR1cAogICAgYiB3aXRoZHJhd19hZnRlcl9pZl9lbHNlQDMKCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmNsYWltQ3JlYXRvcltyb3V0aW5nXSgpIC0+IHZvaWQ6CmNsYWltQ3JlYXRvcjoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ4OQogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDkwCiAgICAvLyBhc3NlcnQoVHhuLnNlbmRlciA9PT0gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZSwgJ09ubHkgY3JlYXRvciBjYW4gY2xhaW0nKTsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMyAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0OTAKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiBjbGFpbScpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICBhc3NlcnQgLy8gT25seSBjcmVhdG9yIGNhbiBjbGFpbQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDkyCiAgICAvLyBjb25zdCBjbGFpbWFibGUgPSB0aGlzLmNyZWF0b3JVbmNsYWltZWRBbHBoYS52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZEFscGhhID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCBBbHBoYSBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDkyCiAgICAvLyBjb25zdCBjbGFpbWFibGUgPSB0aGlzLmNyZWF0b3JVbmNsYWltZWRBbHBoYS52YWx1ZTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0OTMKICAgIC8vIGFzc2VydChjbGFpbWFibGUgPiBVaW50NjQoMCksICdOb3RoaW5nIHRvIGNsYWltJyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBOb3RoaW5nIHRvIGNsYWltCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZEFscGhhID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCBBbHBoYSBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDk2CiAgICAvLyB0aGlzLmNyZWF0b3JVbmNsYWltZWRBbHBoYS52YWx1ZSA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDk5LTUwNAogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogY2xhaW1hYmxlLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaXR4bl9iZWdpbgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTAwCiAgICAvLyBhc3NldFJlY2VpdmVyOiBUeG4uc2VuZGVyLAogICAgdHhuIFNlbmRlcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTAxCiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMuYWxwaGFBc3NldC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDMKICAgIC8vIGFscGhhQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIEFscGhhIEFTQSBJRCAoZGVwb3NpdCAmIHlpZWxkIGFzc2V0KQogICAgYnl0ZWMgNCAvLyAiYWxwaGFBc3NldCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUwMQogICAgLy8geGZlckFzc2V0OiBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIHVuY292ZXIgMgogICAgaXR4bl9maWVsZCBBc3NldEFtb3VudAogICAgaXR4bl9maWVsZCBYZmVyQXNzZXQKICAgIGl0eG5fZmllbGQgQXNzZXRSZWNlaXZlcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDk5LTUwNAogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogVHhuLnNlbmRlciwKICAgIC8vICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogY2xhaW1hYmxlLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLnN1Ym1pdCgpOwogICAgaW50Y18zIC8vIDQKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUwMwogICAgLy8gZmVlOiBVaW50NjQoMCksCiAgICBpbnRjXzAgLy8gMAogICAgaXR4bl9maWVsZCBGZWUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ5OS01MDQKICAgIC8vIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgIGFzc2V0UmVjZWl2ZXI6IFR4bi5zZW5kZXIsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKSwKICAgIC8vICAgYXNzZXRBbW91bnQ6IGNsYWltYWJsZSwKICAgIC8vICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyB9KS5zdWJtaXQoKTsKICAgIGl0eG5fc3VibWl0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0ODcKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5jb21wb3VuZFlpZWxkW3JvdXRpbmddKCkgLT4gdm9pZDoKY29tcG91bmRZaWVsZDoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUxOAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBpbnRjXzIgLy8gOAogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC51aW50NjQKICAgIGJ0b2kKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUyMAogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTIxCiAgICAvLyBhc3NlcnQoc2xpcHBhZ2VCcHMgPD0gdGhpcy5tYXhTbGlwcGFnZUJwcy52YWx1ZSwgJ1NsaXBwYWdlIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTYKICAgIC8vIG1heFNsaXBwYWdlQnBzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAvLyBNYXhpbXVtIHNsaXBwYWdlIHRvbGVyYW5jZSBpbiBiYXNpcyBwb2ludHMKICAgIGJ5dGVjIDEyIC8vICJtYXhTbGlwcGFnZUJwcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUyMQogICAgLy8gYXNzZXJ0KHNsaXBwYWdlQnBzIDw9IHRoaXMubWF4U2xpcHBhZ2VCcHMudmFsdWUsICdTbGlwcGFnZSBleGNlZWRzIG1heGltdW0gYWxsb3dlZCcpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGRpZyAxCiAgICA+PQogICAgYXNzZXJ0IC8vIFNsaXBwYWdlIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MjMKICAgIC8vIGNvbnN0IGFwcEFkZHI6IEFjY291bnQgPSBHbG9iYWwuY3VycmVudEFwcGxpY2F0aW9uQWRkcmVzczsKICAgIGdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MjQKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDQKICAgIC8vIHVzZGNBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFVTREMgQVNBIElEIChhaXJkcm9wcyBjb21lIGluIGFzIHRoaXMpCiAgICBieXRlYyA1IC8vICJ1c2RjQXNzZXQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MjQKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCiAgICBhc3NlcnQgLy8gYWNjb3VudCBvcHRlZCBpbnRvIGFzc2V0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MjYKICAgIC8vIGFzc2VydCh1c2RjQmFsYW5jZSA+PSB0aGlzLm1pblN3YXBUaHJlc2hvbGQudmFsdWUsICdCZWxvdyBtaW5pbXVtIHN3YXAgdGhyZXNob2xkJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTUKICAgIC8vIG1pblN3YXBUaHJlc2hvbGQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAvLyBNaW5pbXVtIFVTREMgYmVmb3JlIHN3YXAgYWxsb3dlZAogICAgYnl0ZWMgMTEgLy8gIm1pblN3YXBUaHJlc2hvbGQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MjYKICAgIC8vIGFzc2VydCh1c2RjQmFsYW5jZSA+PSB0aGlzLm1pblN3YXBUaHJlc2hvbGQudmFsdWUsICdCZWxvdyBtaW5pbXVtIHN3YXAgdGhyZXNob2xkJyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgZGlnIDEKICAgIDw9CiAgICBhc3NlcnQgLy8gQmVsb3cgbWluaW11bSBzd2FwIHRocmVzaG9sZAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTI3CiAgICAvLyBhc3NlcnQodGhpcy50b3RhbFNoYXJlcy52YWx1ZSA+IFVpbnQ2NCgwKSwgJ05vIGRlcG9zaXRvcnMgdG8gY29tcG91bmQgZm9yJyk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTMKICAgIC8vIHRvdGFsU2hhcmVzID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBUb3RhbCBzaGFyZXMgaXNzdWVkIHRvIGFsbCBkZXBvc2l0b3JzCiAgICBieXRlY18wIC8vICJ0b3RhbFNoYXJlcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUyNwogICAgLy8gYXNzZXJ0KHRoaXMudG90YWxTaGFyZXMudmFsdWUgPiBVaW50NjQoMCksICdObyBkZXBvc2l0b3JzIHRvIGNvbXBvdW5kIGZvcicpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGFzc2VydCAvLyBObyBkZXBvc2l0b3JzIHRvIGNvbXBvdW5kIGZvcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTI5CiAgICAvLyB0aGlzLmV4ZWN1dGVDb21wb3VuZCh1c2RjQmFsYW5jZSwgc2xpcHBhZ2VCcHMpOwogICAgc3dhcAogICAgY2FsbHN1YiBleGVjdXRlQ29tcG91bmQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUxOAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmdldFZhdWx0U3RhdHNbcm91dGluZ10oKSAtPiB2b2lkOgpnZXRWYXVsdFN0YXRzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQzCiAgICAvLyBjb25zdCBhcHBBZGRyOiBBY2NvdW50ID0gR2xvYmFsLmN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3M7CiAgICBnbG9iYWwgQ3VycmVudEFwcGxpY2F0aW9uQWRkcmVzcwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQ0CiAgICAvLyBjb25zdCB1c2RjQmFsYW5jZSA9IEFzc2V0KHRoaXMudXNkY0Fzc2V0LnZhbHVlKS5iYWxhbmNlKGFwcEFkZHIpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ0CiAgICAvLyB1c2RjQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBVU0RDIEFTQSBJRCAoYWlyZHJvcHMgY29tZSBpbiBhcyB0aGlzKQogICAgYnl0ZWMgNSAvLyAidXNkY0Fzc2V0IgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQ0CiAgICAvLyBjb25zdCB1c2RjQmFsYW5jZSA9IEFzc2V0KHRoaXMudXNkY0Fzc2V0LnZhbHVlKS5iYWxhbmNlKGFwcEFkZHIpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGFzc2V0X2hvbGRpbmdfZ2V0IEFzc2V0QmFsYW5jZQogICAgYXNzZXJ0IC8vIGFjY291bnQgb3B0ZWQgaW50byBhc3NldAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQ3CiAgICAvLyBsZXQgc2hhcmVQcmljZTogdWludDY0ID0gU0NBTEU7IC8vIERlZmF1bHQgMToxIGlmIG5vIHNoYXJlcwogICAgaW50YyA3IC8vIDEwMDAwMDAwMDAwMDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU0OAogICAgLy8gaWYgKHRoaXMudG90YWxTaGFyZXMudmFsdWUgPiBVaW50NjQoMCkpIHsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxTaGFyZXMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIFRvdGFsIHNoYXJlcyBpc3N1ZWQgdG8gYWxsIGRlcG9zaXRvcnMKICAgIGJ5dGVjXzAgLy8gInRvdGFsU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQ4CiAgICAvLyBpZiAodGhpcy50b3RhbFNoYXJlcy52YWx1ZSA+IFVpbnQ2NCgwKSkgewogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGJ6IGdldFZhdWx0U3RhdHNfYWZ0ZXJfaWZfZWxzZUAzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NDkKICAgIC8vIHNoYXJlUHJpY2UgPSB0aGlzLm11bERpdkZsb29yKHRoaXMudG90YWxBbHBoYS52YWx1ZSwgU0NBTEUsIHRoaXMudG90YWxTaGFyZXMudmFsdWUpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU0CiAgICAvLyB0b3RhbEFscGhhID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gVG90YWwgQWxwaGEgaGVsZCAoZGVwb3NpdHMgKyBjb21wb3VuZGVkIHlpZWxkKQogICAgYnl0ZWNfMSAvLyAidG90YWxBbHBoYSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU0OQogICAgLy8gc2hhcmVQcmljZSA9IHRoaXMubXVsRGl2Rmxvb3IodGhpcy50b3RhbEFscGhhLnZhbHVlLCBTQ0FMRSwgdGhpcy50b3RhbFNoYXJlcy52YWx1ZSk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbFNoYXJlcyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gVG90YWwgc2hhcmVzIGlzc3VlZCB0byBhbGwgZGVwb3NpdG9ycwogICAgYnl0ZWNfMCAvLyAidG90YWxTaGFyZXMiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NDkKICAgIC8vIHNoYXJlUHJpY2UgPSB0aGlzLm11bERpdkZsb29yKHRoaXMudG90YWxBbHBoYS52YWx1ZSwgU0NBTEUsIHRoaXMudG90YWxTaGFyZXMudmFsdWUpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg1CiAgICAvLyBjb25zdCBbaGksIGxvXSA9IG11bHcobjEsIG4yKTsKICAgIHN3YXAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU0OQogICAgLy8gc2hhcmVQcmljZSA9IHRoaXMubXVsRGl2Rmxvb3IodGhpcy50b3RhbEFscGhhLnZhbHVlLCBTQ0FMRSwgdGhpcy50b3RhbFNoYXJlcy52YWx1ZSk7CiAgICBpbnRjIDcgLy8gMTAwMDAwMDAwMDAwMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODUKICAgIC8vIGNvbnN0IFtoaSwgbG9dID0gbXVsdyhuMSwgbjIpOwogICAgbXVsdwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODYKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgdW5jb3ZlciAzCiAgICBkaXZtb2R3CiAgICBwb3BuIDIKICAgIHN3YXAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg3CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgYnVyeSAxCgpnZXRWYXVsdFN0YXRzX2FmdGVyX2lmX2Vsc2VAMzoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU1MwogICAgLy8gdGhpcy50b3RhbFNoYXJlcy52YWx1ZSwKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxTaGFyZXMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIFRvdGFsIHNoYXJlcyBpc3N1ZWQgdG8gYWxsIGRlcG9zaXRvcnMKICAgIGJ5dGVjXzAgLy8gInRvdGFsU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTUzCiAgICAvLyB0aGlzLnRvdGFsU2hhcmVzLnZhbHVlLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU1NAogICAgLy8gdGhpcy50b3RhbEFscGhhLnZhbHVlLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU0CiAgICAvLyB0b3RhbEFscGhhID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gVG90YWwgQWxwaGEgaGVsZCAoZGVwb3NpdHMgKyBjb21wb3VuZGVkIHlpZWxkKQogICAgYnl0ZWNfMSAvLyAidG90YWxBbHBoYSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU1NAogICAgLy8gdGhpcy50b3RhbEFscGhhLnZhbHVlLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU1NQogICAgLy8gdGhpcy5jcmVhdG9yVW5jbGFpbWVkQWxwaGEudmFsdWUsCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTAKICAgIC8vIGNyZWF0b3JVbmNsYWltZWRBbHBoYSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgLy8gQWNjdW11bGF0ZWQgQWxwaGEgZm9yIGNyZWF0b3IgdG8gY2xhaW0KICAgIGJ5dGVjIDggLy8gImNyZWF0b3JVbmNsYWltZWRBbHBoYSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU1NQogICAgLy8gdGhpcy5jcmVhdG9yVW5jbGFpbWVkQWxwaGEudmFsdWUsCiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTU3CiAgICAvLyB0aGlzLnRvdGFsWWllbGRDb21wb3VuZGVkLnZhbHVlLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU3CiAgICAvLyB0b3RhbFlpZWxkQ29tcG91bmRlZCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgLy8gVG90YWwgeWllbGQgY29tcG91bmRlZCAoZm9yIHN0YXRzKQogICAgYnl0ZWMgMTMgLy8gInRvdGFsWWllbGRDb21wb3VuZGVkIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTU3CiAgICAvLyB0aGlzLnRvdGFsWWllbGRDb21wb3VuZGVkLnZhbHVlLAogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU1Mi01NTkKICAgIC8vIHJldHVybiBbCiAgICAvLyAgIHRoaXMudG90YWxTaGFyZXMudmFsdWUsCiAgICAvLyAgIHRoaXMudG90YWxBbHBoYS52YWx1ZSwKICAgIC8vICAgdGhpcy5jcmVhdG9yVW5jbGFpbWVkQWxwaGEudmFsdWUsCiAgICAvLyAgIHVzZGNCYWxhbmNlLAogICAgLy8gICB0aGlzLnRvdGFsWWllbGRDb21wb3VuZGVkLnZhbHVlLAogICAgLy8gICBzaGFyZVByaWNlCiAgICAvLyBdOwogICAgdW5jb3ZlciAzCiAgICBpdG9iCiAgICB1bmNvdmVyIDMKICAgIGl0b2IKICAgIGNvbmNhdAogICAgdW5jb3ZlciAyCiAgICBpdG9iCiAgICBjb25jYXQKICAgIGRpZyAzCiAgICBpdG9iCiAgICBjb25jYXQKICAgIHN3YXAKICAgIGl0b2IKICAgIGNvbmNhdAogICAgZGlnIDEKICAgIGl0b2IKICAgIGNvbmNhdAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQxCiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyByZWFkb25seTogdHJ1ZSB9KQogICAgYnl0ZWMgNyAvLyAweDE1MWY3Yzc1CiAgICBzd2FwCiAgICBjb25jYXQKICAgIGxvZwogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuZ2V0VXNlckFscGhhQmFsYW5jZVtyb3V0aW5nXSgpIC0+IHZvaWQ6CmdldFVzZXJBbHBoYUJhbGFuY2U6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NjYKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgcHVzaGludCAzMiAvLyAzMgogICAgPT0KICAgIGFzc2VydCAvLyBpbnZhbGlkIG51bWJlciBvZiBieXRlcyBmb3IgYXJjNC5zdGF0aWNfYXJyYXk8YXJjNC51aW50OCwgMzI+CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NjgKICAgIC8vIGNvbnN0IHNoYXJlcyA9IHRoaXMudXNlclNoYXJlcyh1c2VyKS52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NAogICAgLy8gdXNlclNoYXJlcyA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFVzZXIncyBzaGFyZSBiYWxhbmNlIChyZXByZXNlbnRzIHByb3BvcnRpb25hbCBvd25lcnNoaXApCiAgICBieXRlYyA2IC8vICJ1c2VyU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTY4CiAgICAvLyBjb25zdCBzaGFyZXMgPSB0aGlzLnVzZXJTaGFyZXModXNlcikudmFsdWU7CiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgTG9jYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU2OQogICAgLy8gcmV0dXJuIHRoaXMuc2hhcmVzVG9BbHBoYShzaGFyZXMpOwogICAgY2FsbHN1YiBzaGFyZXNUb0FscGhhCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NjYKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICBpdG9iCiAgICBieXRlYyA3IC8vIDB4MTUxZjdjNzUKICAgIHN3YXAKICAgIGNvbmNhdAogICAgbG9nCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5nZXRVc2VyU2hhcmVzW3JvdXRpbmddKCkgLT4gdm9pZDoKZ2V0VXNlclNoYXJlczoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU3NQogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgcmVhZG9ubHk6IHRydWUgfSkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBwdXNoaW50IDMyIC8vIDMyCiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnN0YXRpY19hcnJheTxhcmM0LnVpbnQ4LCAzMj4KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU3NwogICAgLy8gcmV0dXJuIHRoaXMudXNlclNoYXJlcyh1c2VyKS52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NAogICAgLy8gdXNlclNoYXJlcyA9IExvY2FsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFVzZXIncyBzaGFyZSBiYWxhbmNlIChyZXByZXNlbnRzIHByb3BvcnRpb25hbCBvd25lcnNoaXApCiAgICBieXRlYyA2IC8vICJ1c2VyU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTc3CiAgICAvLyByZXR1cm4gdGhpcy51c2VyU2hhcmVzKHVzZXIpLnZhbHVlOwogICAgYXBwX2xvY2FsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIExvY2FsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NzUKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICBpdG9iCiAgICBieXRlYyA3IC8vIDB4MTUxZjdjNzUKICAgIHN3YXAKICAgIGNvbmNhdAogICAgbG9nCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5wcmV2aWV3RGVwb3NpdFtyb3V0aW5nXSgpIC0+IHZvaWQ6CnByZXZpZXdEZXBvc2l0OgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTgzCiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyByZWFkb25seTogdHJ1ZSB9KQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTg1CiAgICAvLyByZXR1cm4gdGhpcy5hbHBoYVRvU2hhcmVzKGFscGhhQW1vdW50KTsKICAgIGNhbGxzdWIgYWxwaGFUb1NoYXJlcwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTgzCiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyByZWFkb25seTogdHJ1ZSB9KQogICAgaXRvYgogICAgYnl0ZWMgNyAvLyAweDE1MWY3Yzc1CiAgICBzd2FwCiAgICBjb25jYXQKICAgIGxvZwogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQucHJldmlld1dpdGhkcmF3W3JvdXRpbmddKCkgLT4gdm9pZDoKcHJldmlld1dpdGhkcmF3OgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTkxCiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyByZWFkb25seTogdHJ1ZSB9KQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTkzCiAgICAvLyByZXR1cm4gdGhpcy5zaGFyZXNUb0FscGhhKHNoYXJlQW1vdW50KTsKICAgIGNhbGxzdWIgc2hhcmVzVG9BbHBoYQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTkxCiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyByZWFkb25seTogdHJ1ZSB9KQogICAgaXRvYgogICAgYnl0ZWMgNyAvLyAweDE1MWY3Yzc1CiAgICBzd2FwCiAgICBjb25jYXQKICAgIGxvZwogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuZ2V0Q29tcG91bmRRdW90ZVtyb3V0aW5nXSgpIC0+IHZvaWQ6CmdldENvbXBvdW5kUXVvdGU6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MDIKICAgIC8vIGNvbnN0IGFwcEFkZHI6IEFjY291bnQgPSBHbG9iYWwuY3VycmVudEFwcGxpY2F0aW9uQWRkcmVzczsKICAgIGdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MDMKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDQKICAgIC8vIHVzZGNBc3NldCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFVTREMgQVNBIElEIChhaXJkcm9wcyBjb21lIGluIGFzIHRoaXMpCiAgICBieXRlYyA1IC8vICJ1c2RjQXNzZXQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MDMKICAgIC8vIGNvbnN0IHVzZGNCYWxhbmNlID0gQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCiAgICBzd2FwCiAgICBkdXAKICAgIHVuY292ZXIgMgogICAgYXNzZXJ0IC8vIGFjY291bnQgb3B0ZWQgaW50byBhc3NldAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjA1CiAgICAvLyBpZiAodXNkY0JhbGFuY2UgPT09IFVpbnQ2NCgwKSkgewogICAgYm56IGdldENvbXBvdW5kUXVvdGVfYWZ0ZXJfaWZfZWxzZUAzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MDYKICAgIC8vIHJldHVybiBbVWludDY0KDApLCBVaW50NjQoMCksIFVpbnQ2NCgwKV07CiAgICBwdXNoYnl0ZXMgMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAKCmdldENvbXBvdW5kUXVvdGVfYWZ0ZXJfaW5saW5lZF9SYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmdldENvbXBvdW5kUXVvdGVANDoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjYwMAogICAgLy8gQGFyYzQuYWJpbWV0aG9kKHsgcmVhZG9ubHk6IHRydWUgfSkKICAgIGJ5dGVjIDcgLy8gMHgxNTFmN2M3NQogICAgc3dhcAogICAgY29uY2F0CiAgICBsb2cKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCmdldENvbXBvdW5kUXVvdGVfYWZ0ZXJfaWZfZWxzZUAzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjA5CiAgICAvLyBjb25zdCBleHBlY3RlZE91dHB1dCA9IHRoaXMuZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0KHVzZGNCYWxhbmNlKTsKICAgIGR1cG4gMgogICAgY2FsbHN1YiBnZXRFeHBlY3RlZFN3YXBPdXRwdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg1CiAgICAvLyBjb25zdCBbaGksIGxvXSA9IG11bHcobjEsIG4yKTsKICAgIGR1cAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjEwCiAgICAvLyBjb25zdCBtaW5BdDUwQnBzID0gdGhpcy5tdWxEaXZGbG9vcihleHBlY3RlZE91dHB1dCwgRkVFX0JQU19CQVNFIC0gVWludDY0KDUwKSwgRkVFX0JQU19CQVNFKTsKICAgIHB1c2hpbnQgOTk1MCAvLyA5OTUwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NQogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBtdWx3CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NgogICAgLy8gY29uc3QgW3FfaGksIHFfbG8sIF9yX2hpLCBfcl9sb10gPSBkaXZtb2R3KGhpLCBsbywgVWludDY0KDApLCBkKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MTAKICAgIC8vIGNvbnN0IG1pbkF0NTBCcHMgPSB0aGlzLm11bERpdkZsb29yKGV4cGVjdGVkT3V0cHV0LCBGRUVfQlBTX0JBU0UgLSBVaW50NjQoNTApLCBGRUVfQlBTX0JBU0UpOwogICAgaW50YyA0IC8vIDEwMDAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NgogICAgLy8gY29uc3QgW3FfaGksIHFfbG8sIF9yX2hpLCBfcl9sb10gPSBkaXZtb2R3KGhpLCBsbywgVWludDY0KDApLCBkKTsKICAgIGRpdm1vZHcKICAgIHBvcG4gMgogICAgc3dhcAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODcKICAgIC8vIGFzc2VydChxX2hpID09PSBVaW50NjQoMCksICdNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcicpOwogICAgIQogICAgYXNzZXJ0IC8vIE11bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MTIKICAgIC8vIHJldHVybiBbdXNkY0JhbGFuY2UsIGV4cGVjdGVkT3V0cHV0LCBtaW5BdDUwQnBzXTsKICAgIHVuY292ZXIgMgogICAgaXRvYgogICAgdW5jb3ZlciAyCiAgICBpdG9iCiAgICBjb25jYXQKICAgIHN3YXAKICAgIGl0b2IKICAgIGNvbmNhdAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjAwCiAgICAvLyBAYXJjNC5hYmltZXRob2QoeyByZWFkb25seTogdHJ1ZSB9KQogICAgYiBnZXRDb21wb3VuZFF1b3RlX2FmdGVyX2lubGluZWRfUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5nZXRDb21wb3VuZFF1b3RlQDQKCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LnVwZGF0ZU1pblN3YXBUaHJlc2hvbGRbcm91dGluZ10oKSAtPiB2b2lkOgp1cGRhdGVNaW5Td2FwVGhyZXNob2xkOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjIyCiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZHVwCiAgICBsZW4KICAgIGludGNfMiAvLyA4CiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnVpbnQ2NAogICAgYnRvaQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjI0CiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MjUKICAgIC8vIGNvbnN0IGlzQ3JlYXRvciA9IFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWU7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDcKICAgIC8vIGNyZWF0b3JBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAvLyBWYXVsdCBjcmVhdG9yIHdobyByZWNlaXZlcyBmZWUKICAgIGJ5dGVjXzMgLy8gImNyZWF0b3JBZGRyZXNzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjI1CiAgICAvLyBjb25zdCBpc0NyZWF0b3IgPSBUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MjYKICAgIC8vIGNvbnN0IGlzUmFyZWZpID0gVHhuLnNlbmRlciA9PT0gdGhpcy5yYXJlZmlBZGRyZXNzLnZhbHVlOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ4CiAgICAvLyByYXJlZmlBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAgLy8gUmFyZUZpIHBsYXRmb3JtIGFkZHJlc3MgKGNhbiBhbHNvIHRyaWdnZXIgc3dhcHMpCiAgICBieXRlYyAxMCAvLyAicmFyZWZpQWRkcmVzcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjYyNgogICAgLy8gY29uc3QgaXNSYXJlZmkgPSBUeG4uc2VuZGVyID09PSB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjYyNwogICAgLy8gYXNzZXJ0KGlzQ3JlYXRvciB8fCBpc1JhcmVmaSwgJ09ubHkgY3JlYXRvciBvciBSYXJlRmkgY2FuIHVwZGF0ZScpOwogICAgfHwKICAgIGFzc2VydCAvLyBPbmx5IGNyZWF0b3Igb3IgUmFyZUZpIGNhbiB1cGRhdGUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjYyOAogICAgLy8gYXNzZXJ0KG5ld1RocmVzaG9sZCA+PSBNSU5fU1dBUF9BTU9VTlQsICdUaHJlc2hvbGQgdG9vIGxvdycpOwogICAgZHVwCiAgICBpbnRjIDUgLy8gMjAwMDAwCiAgICA+PQogICAgYXNzZXJ0IC8vIFRocmVzaG9sZCB0b28gbG93CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MjkKICAgIC8vIGFzc2VydChuZXdUaHJlc2hvbGQgPD0gTUFYX1NXQVBfVEhSRVNIT0xELCAnVGhyZXNob2xkIHRvbyBoaWdoIChtYXggNTAgVVNEQyknKTsKICAgIGR1cAogICAgaW50YyA2IC8vIDUwMDAwMDAwCiAgICA8PQogICAgYXNzZXJ0IC8vIFRocmVzaG9sZCB0b28gaGlnaCAobWF4IDUwIFVTREMpCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NQogICAgLy8gbWluU3dhcFRocmVzaG9sZCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgIC8vIE1pbmltdW0gVVNEQyBiZWZvcmUgc3dhcCBhbGxvd2VkCiAgICBieXRlYyAxMSAvLyAibWluU3dhcFRocmVzaG9sZCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjYzMAogICAgLy8gdGhpcy5taW5Td2FwVGhyZXNob2xkLnZhbHVlID0gbmV3VGhyZXNob2xkOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjYyMgogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LnVwZGF0ZU1heFNsaXBwYWdlW3JvdXRpbmddKCkgLT4gdm9pZDoKdXBkYXRlTWF4U2xpcHBhZ2U6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MzcKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgaW50Y18yIC8vIDgKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQudWludDY0CiAgICBidG9pCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MzkKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY0MAogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIHVwZGF0ZSBtYXggc2xpcHBhZ2UnKTsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMyAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NDAKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiB1cGRhdGUgbWF4IHNsaXBwYWdlJyk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIGFzc2VydCAvLyBPbmx5IGNyZWF0b3IgY2FuIHVwZGF0ZSBtYXggc2xpcHBhZ2UKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY0MQogICAgLy8gYXNzZXJ0KG5ld01heFNsaXBwYWdlQnBzID49IE1JTl9NQVhfU0xJUFBBR0VfQlBTLCAnTWF4IHNsaXBwYWdlIHRvbyBsb3cgKG1pbiA1JSknKTsKICAgIGR1cAogICAgcHVzaGludCA1MDAgLy8gNTAwCiAgICA+PQogICAgYXNzZXJ0IC8vIE1heCBzbGlwcGFnZSB0b28gbG93IChtaW4gNSUpCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NDIKICAgIC8vIGFzc2VydChuZXdNYXhTbGlwcGFnZUJwcyA8PSBNQVhfU0xJUFBBR0VfQlBTLCAnTWF4IHNsaXBwYWdlIHRvbyBoaWdoJyk7CiAgICBkdXAKICAgIGludGMgNCAvLyAxMDAwMAogICAgPD0KICAgIGFzc2VydCAvLyBNYXggc2xpcHBhZ2UgdG9vIGhpZ2gKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU2CiAgICAvLyBtYXhTbGlwcGFnZUJwcyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgLy8gTWF4aW11bSBzbGlwcGFnZSB0b2xlcmFuY2UgaW4gYmFzaXMgcG9pbnRzCiAgICBieXRlYyAxMiAvLyAibWF4U2xpcHBhZ2VCcHMiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NDMKICAgIC8vIHRoaXMubWF4U2xpcHBhZ2VCcHMudmFsdWUgPSBuZXdNYXhTbGlwcGFnZUJwczsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MzcKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC51cGRhdGVDcmVhdG9yQWRkcmVzc1tyb3V0aW5nXSgpIC0+IHZvaWQ6CnVwZGF0ZUNyZWF0b3JBZGRyZXNzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjUwCiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMQogICAgZHVwCiAgICBsZW4KICAgIHB1c2hpbnQgMzIgLy8gMzIKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQuc3RhdGljX2FycmF5PGFyYzQudWludDgsIDMyPgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjUyCiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NTMKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiB1cGRhdGUnKTsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMyAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NTMKICAgIC8vIGFzc2VydChUeG4uc2VuZGVyID09PSB0aGlzLmNyZWF0b3JBZGRyZXNzLnZhbHVlLCAnT25seSBjcmVhdG9yIGNhbiB1cGRhdGUnKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgYXNzZXJ0IC8vIE9ubHkgY3JlYXRvciBjYW4gdXBkYXRlCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NTQKICAgIC8vIGFzc2VydChuZXdDcmVhdG9yQWRkcmVzcyAhPT0gR2xvYmFsLnplcm9BZGRyZXNzLCAnQ2Fubm90IHNldCB6ZXJvIGFkZHJlc3MnKTsKICAgIGR1cAogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICAhPQogICAgYXNzZXJ0IC8vIENhbm5vdCBzZXQgemVybyBhZGRyZXNzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMyAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NTUKICAgIC8vIHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUgPSBuZXdDcmVhdG9yQWRkcmVzczsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NTAKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC51cGRhdGVSYXJlZmlBZGRyZXNzW3JvdXRpbmddKCkgLT4gdm9pZDoKdXBkYXRlUmFyZWZpQWRkcmVzczoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY2MgogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIHR4bmEgQXBwbGljYXRpb25BcmdzIDEKICAgIGR1cAogICAgbGVuCiAgICBwdXNoaW50IDMyIC8vIDMyCiAgICA9PQogICAgYXNzZXJ0IC8vIGludmFsaWQgbnVtYmVyIG9mIGJ5dGVzIGZvciBhcmM0LnN0YXRpY19hcnJheTxhcmM0LnVpbnQ4LCAzMj4KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY2NAogICAgLy8gYXNzZXJ0KFR4bi5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgdHhuIFJla2V5VG8KICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgPT0KICAgIGFzc2VydCAvLyByZWtleVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjY1CiAgICAvLyBhc3NlcnQoVHhuLnNlbmRlciA9PT0gdGhpcy5yYXJlZmlBZGRyZXNzLnZhbHVlLCAnT25seSBSYXJlRmkgY2FuIHVwZGF0ZScpOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ4CiAgICAvLyByYXJlZmlBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgICAgLy8gUmFyZUZpIHBsYXRmb3JtIGFkZHJlc3MgKGNhbiBhbHNvIHRyaWdnZXIgc3dhcHMpCiAgICBieXRlYyAxMCAvLyAicmFyZWZpQWRkcmVzcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY2NQogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMucmFyZWZpQWRkcmVzcy52YWx1ZSwgJ09ubHkgUmFyZUZpIGNhbiB1cGRhdGUnKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgYXNzZXJ0IC8vIE9ubHkgUmFyZUZpIGNhbiB1cGRhdGUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY2NgogICAgLy8gYXNzZXJ0KG5ld1JhcmVmaUFkZHJlc3MgIT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ0Nhbm5vdCBzZXQgemVybyBhZGRyZXNzJyk7CiAgICBkdXAKICAgIGdsb2JhbCBaZXJvQWRkcmVzcwogICAgIT0KICAgIGFzc2VydCAvLyBDYW5ub3Qgc2V0IHplcm8gYWRkcmVzcwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDgKICAgIC8vIHJhcmVmaUFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgICAvLyBSYXJlRmkgcGxhdGZvcm0gYWRkcmVzcyAoY2FuIGFsc28gdHJpZ2dlciBzd2FwcykKICAgIGJ5dGVjIDEwIC8vICJyYXJlZmlBZGRyZXNzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjY3CiAgICAvLyB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWUgPSBuZXdSYXJlZmlBZGRyZXNzOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY2MgogICAgLy8gQGFyYzQuYWJpbWV0aG9kKCkKICAgIGludGNfMSAvLyAxCiAgICByZXR1cm4KCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LnVwZGF0ZUNyZWF0b3JGZWVSYXRlW3JvdXRpbmddKCkgLT4gdm9pZDoKdXBkYXRlQ3JlYXRvckZlZVJhdGU6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NzQKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgaW50Y18yIC8vIDgKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQudWludDY0CiAgICBidG9pCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NzYKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY3NwogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIHVwZGF0ZSBmZWUgcmF0ZScpOwogICAgdHhuIFNlbmRlcgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ3CiAgICAvLyBjcmVhdG9yQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7ICAgLy8gVmF1bHQgY3JlYXRvciB3aG8gcmVjZWl2ZXMgZmVlCiAgICBieXRlY18zIC8vICJjcmVhdG9yQWRkcmVzcyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY3NwogICAgLy8gYXNzZXJ0KFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWUsICdPbmx5IGNyZWF0b3IgY2FuIHVwZGF0ZSBmZWUgcmF0ZScpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICBhc3NlcnQgLy8gT25seSBjcmVhdG9yIGNhbiB1cGRhdGUgZmVlIHJhdGUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY3OAogICAgLy8gYXNzZXJ0KG5ld0ZlZVJhdGUgPD0gTUFYX0ZFRV9SQVRFLCAnRmVlIHJhdGUgZXhjZWVkcyBtYXhpbXVtICg2JSknKTsKICAgIGR1cAogICAgcHVzaGludCA2IC8vIDYKICAgIDw9CiAgICBhc3NlcnQgLy8gRmVlIHJhdGUgZXhjZWVkcyBtYXhpbXVtICg2JSkKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ5CiAgICAvLyBjcmVhdG9yRmVlUmF0ZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgLy8gMC0xMDAsIHBlcmNlbnRhZ2Ugb2YgeWllbGQgdG8gY3JlYXRvcgogICAgYnl0ZWMgMTQgLy8gImNyZWF0b3JGZWVSYXRlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Njc5CiAgICAvLyB0aGlzLmNyZWF0b3JGZWVSYXRlLnZhbHVlID0gbmV3RmVlUmF0ZTsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NzQKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5jb250cmlidXRlRmFybVtyb3V0aW5nXSgpIC0+IHZvaWQ6CmNvbnRyaWJ1dGVGYXJtOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6Njk1CiAgICAvLyBhc3NlcnQoVHhuLnJla2V5VG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ3Jla2V5VG8gbXVzdCBiZSB6ZXJvJyk7CiAgICB0eG4gUmVrZXlUbwogICAgZ2xvYmFsIFplcm9BZGRyZXNzCiAgICA9PQogICAgYXNzZXJ0IC8vIHJla2V5VG8gbXVzdCBiZSB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2OTYKICAgIC8vIGNvbnN0IGFwcEFkZHI6IEFjY291bnQgPSBHbG9iYWwuY3VycmVudEFwcGxpY2F0aW9uQWRkcmVzczsKICAgIGdsb2JhbCBDdXJyZW50QXBwbGljYXRpb25BZGRyZXNzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2OTcKICAgIC8vIGNvbnN0IGN1cnJlbnRJbmRleCA9IFR4bi5ncm91cEluZGV4OwogICAgdHhuIEdyb3VwSW5kZXgKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY5OAogICAgLy8gYXNzZXJ0KGN1cnJlbnRJbmRleCA+PSBVaW50NjQoMSksICdBcHAgY2FsbCBtdXN0IGZvbGxvdyBhc3NldCB0cmFuc2ZlcicpOwogICAgZHVwCiAgICBhc3NlcnQgLy8gQXBwIGNhbGwgbXVzdCBmb2xsb3cgYXNzZXQgdHJhbnNmZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjcwMQogICAgLy8gY29uc3QgZmFybVRyYW5zZmVyID0gZ3R4bi5Bc3NldFRyYW5zZmVyVHhuKGN1cnJlbnRJbmRleCAtIFVpbnQ2NCgxKSk7CiAgICBpbnRjXzEgLy8gMQogICAgLQogICAgZHVwCiAgICBndHhucyBUeXBlRW51bQogICAgaW50Y18zIC8vIGF4ZmVyCiAgICA9PQogICAgYXNzZXJ0IC8vIHRyYW5zYWN0aW9uIHR5cGUgaXMgYXhmZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjcwMgogICAgLy8gYXNzZXJ0KGZhcm1UcmFuc2Zlci54ZmVyQXNzZXQgPT09IEFzc2V0KHRoaXMuYWxwaGFBc3NldC52YWx1ZSksICdNdXN0IHRyYW5zZmVyIEFscGhhIGFzc2V0Jyk7CiAgICBkdXAKICAgIGd0eG5zIFhmZXJBc3NldAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQzCiAgICAvLyBhbHBoYUFzc2V0ID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAvLyBBbHBoYSBBU0EgSUQgKGRlcG9zaXQgJiB5aWVsZCBhc3NldCkKICAgIGJ5dGVjIDQgLy8gImFscGhhQXNzZXQiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3MDIKICAgIC8vIGFzc2VydChmYXJtVHJhbnNmZXIueGZlckFzc2V0ID09PSBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLCAnTXVzdCB0cmFuc2ZlciBBbHBoYSBhc3NldCcpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgID09CiAgICBhc3NlcnQgLy8gTXVzdCB0cmFuc2ZlciBBbHBoYSBhc3NldAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzAzCiAgICAvLyBhc3NlcnQoZmFybVRyYW5zZmVyLmFzc2V0UmVjZWl2ZXIgPT09IGFwcEFkZHIsICdNdXN0IHNlbmQgdG8gY29udHJhY3QnKTsKICAgIGR1cAogICAgZ3R4bnMgQXNzZXRSZWNlaXZlcgogICAgdW5jb3ZlciAyCiAgICA9PQogICAgYXNzZXJ0IC8vIE11c3Qgc2VuZCB0byBjb250cmFjdAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzA0CiAgICAvLyBhc3NlcnQoZmFybVRyYW5zZmVyLnNlbmRlciA9PT0gVHhuLnNlbmRlciwgJ1RyYW5zZmVyIG11c3QgYmUgZnJvbSBjYWxsZXInKTsKICAgIGR1cAogICAgZ3R4bnMgU2VuZGVyCiAgICB0eG4gU2VuZGVyCiAgICA9PQogICAgYXNzZXJ0IC8vIFRyYW5zZmVyIG11c3QgYmUgZnJvbSBjYWxsZXIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjcwNwogICAgLy8gYXNzZXJ0KGZhcm1UcmFuc2Zlci5yZWtleVRvID09PSBHbG9iYWwuemVyb0FkZHJlc3MsICdyZWtleVRvIG11c3QgYmUgemVybycpOwogICAgZHVwCiAgICBndHhucyBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjcwOAogICAgLy8gYXNzZXJ0KGZhcm1UcmFuc2Zlci5hc3NldENsb3NlVG8gPT09IEdsb2JhbC56ZXJvQWRkcmVzcywgJ2Fzc2V0Q2xvc2VUbyBtdXN0IGJlIHplcm8nKTsKICAgIGR1cAogICAgZ3R4bnMgQXNzZXRDbG9zZVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gYXNzZXRDbG9zZVRvIG11c3QgYmUgemVybwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzEwCiAgICAvLyBjb25zdCBhbW91bnQgPSBmYXJtVHJhbnNmZXIuYXNzZXRBbW91bnQ7CiAgICBndHhucyBBc3NldEFtb3VudAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzExCiAgICAvLyBhc3NlcnQoYW1vdW50ID4gVWludDY0KDApLCAnQ29udHJpYnV0aW9uIG11c3QgYmUgcG9zaXRpdmUnKTsKICAgIGR1cAogICAgYXNzZXJ0IC8vIENvbnRyaWJ1dGlvbiBtdXN0IGJlIHBvc2l0aXZlCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3MTQKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlICsgYW1vdW50OwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBBbHBoYSBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzIgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzE0CiAgICAvLyB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID0gdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSArIGFtb3VudDsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICArCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgQWxwaGEgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18yIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjcxNAogICAgLy8gdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA9IHRoaXMuZmFybUJhbGFuY2UudmFsdWUgKyBhbW91bnQ7CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjkzCiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuc2V0RW1pc3Npb25SYXRpb1tyb3V0aW5nXSgpIC0+IHZvaWQ6CnNldEVtaXNzaW9uUmF0aW86CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3MjQKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCgpCiAgICB0eG5hIEFwcGxpY2F0aW9uQXJncyAxCiAgICBkdXAKICAgIGxlbgogICAgaW50Y18yIC8vIDgKICAgID09CiAgICBhc3NlcnQgLy8gaW52YWxpZCBudW1iZXIgb2YgYnl0ZXMgZm9yIGFyYzQudWludDY0CiAgICBidG9pCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3MjYKICAgIC8vIGFzc2VydChUeG4ucmVrZXlUbyA9PT0gR2xvYmFsLnplcm9BZGRyZXNzLCAncmVrZXlUbyBtdXN0IGJlIHplcm8nKTsKICAgIHR4biBSZWtleVRvCiAgICBnbG9iYWwgWmVyb0FkZHJlc3MKICAgID09CiAgICBhc3NlcnQgLy8gcmVrZXlUbyBtdXN0IGJlIHplcm8KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjcyNwogICAgLy8gY29uc3QgaXNDcmVhdG9yID0gVHhuLnNlbmRlciA9PT0gdGhpcy5jcmVhdG9yQWRkcmVzcy52YWx1ZTsKICAgIHR4biBTZW5kZXIKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo0NwogICAgLy8gY3JlYXRvckFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgIC8vIFZhdWx0IGNyZWF0b3Igd2hvIHJlY2VpdmVzIGZlZQogICAgYnl0ZWNfMyAvLyAiY3JlYXRvckFkZHJlc3MiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3MjcKICAgIC8vIGNvbnN0IGlzQ3JlYXRvciA9IFR4bi5zZW5kZXIgPT09IHRoaXMuY3JlYXRvckFkZHJlc3MudmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjcyOAogICAgLy8gY29uc3QgaXNSYXJlZmkgPSBUeG4uc2VuZGVyID09PSB0aGlzLnJhcmVmaUFkZHJlc3MudmFsdWU7CiAgICB0eG4gU2VuZGVyCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDgKICAgIC8vIHJhcmVmaUFkZHJlc3MgPSBHbG9iYWxTdGF0ZTxBY2NvdW50PigpOyAgICAvLyBSYXJlRmkgcGxhdGZvcm0gYWRkcmVzcyAoY2FuIGFsc28gdHJpZ2dlciBzd2FwcykKICAgIGJ5dGVjIDEwIC8vICJyYXJlZmlBZGRyZXNzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzI4CiAgICAvLyBjb25zdCBpc1JhcmVmaSA9IFR4bi5zZW5kZXIgPT09IHRoaXMucmFyZWZpQWRkcmVzcy52YWx1ZTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICA9PQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzI5CiAgICAvLyBhc3NlcnQoaXNDcmVhdG9yIHx8IGlzUmFyZWZpLCAnT25seSBjcmVhdG9yIG9yIFJhcmVGaSBjYW4gc2V0IGVtaXNzaW9uIHJhdGlvJyk7CiAgICB8fAogICAgYXNzZXJ0IC8vIE9ubHkgY3JlYXRvciBvciBSYXJlRmkgY2FuIHNldCBlbWlzc2lvbiByYXRpbwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzMwCiAgICAvLyBhc3NlcnQobmV3UmF0aW8gPiBVaW50NjQoMCksICdFbWlzc2lvbiByYXRpbyBtdXN0IGJlIHBvc2l0aXZlJyk7CiAgICBkdXAKICAgIGFzc2VydCAvLyBFbWlzc2lvbiByYXRpbyBtdXN0IGJlIHBvc2l0aXZlCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NQogICAgLy8gZW1pc3Npb25SYXRpbyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gTXVsdGlwbGllciBmb3IgZHluYW1pYyByYXRlOiByYXRlID0gZmFybUJhbGFuY2UgKiBlbWlzc2lvblJhdGlvIC8gdG90YWxBbHBoYQogICAgYnl0ZWMgOSAvLyAiZW1pc3Npb25SYXRpbyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjczMgogICAgLy8gdGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlID0gbmV3UmF0aW87CiAgICBzd2FwCiAgICBhcHBfZ2xvYmFsX3B1dAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzI0CiAgICAvLyBAYXJjNC5hYmltZXRob2QoKQogICAgaW50Y18xIC8vIDEKICAgIHJldHVybgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuZ2V0RmFybVN0YXRzW3JvdXRpbmddKCkgLT4gdm9pZDoKZ2V0RmFybVN0YXRzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzQxCiAgICAvLyBsZXQgY3VycmVudFJhdGU6IHVpbnQ2NCA9IFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NDIKICAgIC8vIGlmICh0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUgPiBVaW50NjQoMCkgJiYgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA+IFVpbnQ2NCgwKSkgewogICAgZHVwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NQogICAgLy8gZW1pc3Npb25SYXRpbyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gTXVsdGlwbGllciBmb3IgZHluYW1pYyByYXRlOiByYXRlID0gZmFybUJhbGFuY2UgKiBlbWlzc2lvblJhdGlvIC8gdG90YWxBbHBoYQogICAgYnl0ZWMgOSAvLyAiZW1pc3Npb25SYXRpbyIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjc0MgogICAgLy8gaWYgKHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSA+IFVpbnQ2NCgwKSAmJiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYnogZ2V0RmFybVN0YXRzX2FmdGVyX2lmX2Vsc2VANAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBBbHBoYSBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzIgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NzQyCiAgICAvLyBpZiAodGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlID4gVWludDY0KDApICYmIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPiBVaW50NjQoMCkpIHsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBieiBnZXRGYXJtU3RhdHNfYWZ0ZXJfaWZfZWxzZUA0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NDMKICAgIC8vIGN1cnJlbnRSYXRlID0gdGhpcy5jYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlKCk7CiAgICBjYWxsc3ViIGNhbGN1bGF0ZUR5bmFtaWNFbWlzc2lvblJhdGUKICAgIGJ1cnkgMQoKZ2V0RmFybVN0YXRzX2FmdGVyX2lmX2Vsc2VANDoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjc0NQogICAgLy8gcmV0dXJuIFt0aGlzLmZhcm1CYWxhbmNlLnZhbHVlLCB0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUsIGN1cnJlbnRSYXRlXTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgQWxwaGEgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18yIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjc0NQogICAgLy8gcmV0dXJuIFt0aGlzLmZhcm1CYWxhbmNlLnZhbHVlLCB0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUsIGN1cnJlbnRSYXRlXTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjUKICAgIC8vIGVtaXNzaW9uUmF0aW8gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIE11bHRpcGxpZXIgZm9yIGR5bmFtaWMgcmF0ZTogcmF0ZSA9IGZhcm1CYWxhbmNlICogZW1pc3Npb25SYXRpbyAvIHRvdGFsQWxwaGEKICAgIGJ5dGVjIDkgLy8gImVtaXNzaW9uUmF0aW8iCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3NDUKICAgIC8vIHJldHVybiBbdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSwgdGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlLCBjdXJyZW50UmF0ZV07CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgc3dhcAogICAgaXRvYgogICAgc3dhcAogICAgaXRvYgogICAgY29uY2F0CiAgICBkaWcgMQogICAgaXRvYgogICAgY29uY2F0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo3MzkKICAgIC8vIEBhcmM0LmFiaW1ldGhvZCh7IHJlYWRvbmx5OiB0cnVlIH0pCiAgICBieXRlYyA3IC8vIDB4MTUxZjdjNzUKICAgIHN3YXAKICAgIGNvbmNhdAogICAgbG9nCiAgICBpbnRjXzEgLy8gMQogICAgcmV0dXJuCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5jYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlKCkgLT4gdWludDY0OgpjYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OTUKICAgIC8vIHByaXZhdGUgY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZSgpOiB1aW50NjQgewogICAgcHJvdG8gMCAxCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo5NgogICAgLy8gY29uc3QgdG90YWxEZXBvc2l0ZWQgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWU7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OTYKICAgIC8vIGNvbnN0IHRvdGFsRGVwb3NpdGVkID0gdGhpcy50b3RhbEFscGhhLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIHN3YXAKICAgIGR1cAogICAgdW5jb3ZlciAyCiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo5OAogICAgLy8gaWYgKHRvdGFsRGVwb3NpdGVkID09PSBVaW50NjQoMCkgfHwgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA9PT0gVWludDY0KDApKSB7CiAgICBieiBjYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlX2lmX2JvZHlAMgogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBBbHBoYSBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzIgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OTgKICAgIC8vIGlmICh0b3RhbERlcG9zaXRlZCA9PT0gVWludDY0KDApIHx8IHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPT09IFVpbnQ2NCgwKSkgewogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGJueiBjYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlX2FmdGVyX2lmX2Vsc2VAMwoKY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZV9pZl9ib2R5QDI6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo5OQogICAgLy8gcmV0dXJuIFVpbnQ2NCgwKTsKICAgIGludGNfMCAvLyAwCiAgICBzd2FwCiAgICByZXRzdWIKCmNhbGN1bGF0ZUR5bmFtaWNFbWlzc2lvblJhdGVfYWZ0ZXJfaWZfZWxzZUAzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTAyCiAgICAvLyBjb25zdCBkeW5hbWljUmF0ZSA9IHRoaXMubXVsRGl2Rmxvb3IodGhpcy5mYXJtQmFsYW5jZS52YWx1ZSwgdGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlLCB0b3RhbERlcG9zaXRlZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIEFscGhhIGF2YWlsYWJsZSBmb3IgZmFybSBib251cwogICAgYnl0ZWNfMiAvLyAiZmFybUJhbGFuY2UiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxMDIKICAgIC8vIGNvbnN0IGR5bmFtaWNSYXRlID0gdGhpcy5tdWxEaXZGbG9vcih0aGlzLmZhcm1CYWxhbmNlLnZhbHVlLCB0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUsIHRvdGFsRGVwb3NpdGVkKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjUKICAgIC8vIGVtaXNzaW9uUmF0aW8gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIE11bHRpcGxpZXIgZm9yIGR5bmFtaWMgcmF0ZTogcmF0ZSA9IGZhcm1CYWxhbmNlICogZW1pc3Npb25SYXRpbyAvIHRvdGFsQWxwaGEKICAgIGJ5dGVjIDkgLy8gImVtaXNzaW9uUmF0aW8iCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxMDIKICAgIC8vIGNvbnN0IGR5bmFtaWNSYXRlID0gdGhpcy5tdWxEaXZGbG9vcih0aGlzLmZhcm1CYWxhbmNlLnZhbHVlLCB0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUsIHRvdGFsRGVwb3NpdGVkKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NQogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBtdWx3CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NgogICAgLy8gY29uc3QgW3FfaGksIHFfbG8sIF9yX2hpLCBfcl9sb10gPSBkaXZtb2R3KGhpLCBsbywgVWludDY0KDApLCBkKTsKICAgIGludGNfMCAvLyAwCiAgICBmcmFtZV9kaWcgMAogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBzd2FwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NwogICAgLy8gYXNzZXJ0KHFfaGkgPT09IFVpbnQ2NCgwKSwgJ011bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yJyk7CiAgICAhCiAgICBhc3NlcnQgLy8gTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3IKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjEwNAogICAgLy8gcmV0dXJuIGR5bmFtaWNSYXRlIDwgTUlOX0ZBUk1fRU1JU1NJT05fQlBTID8gTUlOX0ZBUk1fRU1JU1NJT05fQlBTIDogZHluYW1pY1JhdGU7CiAgICBkdXAKICAgIHB1c2hpbnQgMTAwMCAvLyAxMDAwCiAgICA8CiAgICBwdXNoaW50IDEwMDAgLy8gMTAwMAogICAgc3dhcAogICAgc2VsZWN0CiAgICBzd2FwCiAgICByZXRzdWIKCgovLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo6UmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFscGhhVG9TaGFyZXMoYWxwaGFBbW91bnQ6IHVpbnQ2NCkgLT4gdWludDY0OgphbHBoYVRvU2hhcmVzOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTEyCiAgICAvLyBwcml2YXRlIGFscGhhVG9TaGFyZXMoYWxwaGFBbW91bnQ6IHVpbnQ2NCk6IHVpbnQ2NCB7CiAgICBwcm90byAxIDEKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjExMwogICAgLy8gaWYgKHRoaXMudG90YWxTaGFyZXMudmFsdWUgPT09IFVpbnQ2NCgwKSkgewogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUzCiAgICAvLyB0b3RhbFNoYXJlcyA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgLy8gVG90YWwgc2hhcmVzIGlzc3VlZCB0byBhbGwgZGVwb3NpdG9ycwogICAgYnl0ZWNfMCAvLyAidG90YWxTaGFyZXMiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxMTMKICAgIC8vIGlmICh0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID09PSBVaW50NjQoMCkpIHsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBibnogYWxwaGFUb1NoYXJlc19hZnRlcl9pZl9lbHNlQDIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjExNQogICAgLy8gcmV0dXJuIGFscGhhQW1vdW50OwogICAgZnJhbWVfZGlnIC0xCiAgICByZXRzdWIKCmFscGhhVG9TaGFyZXNfYWZ0ZXJfaWZfZWxzZUAyOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTE3CiAgICAvLyByZXR1cm4gdGhpcy5tdWxEaXZGbG9vcihhbHBoYUFtb3VudCwgdGhpcy50b3RhbFNoYXJlcy52YWx1ZSwgdGhpcy50b3RhbEFscGhhLnZhbHVlKTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxTaGFyZXMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIFRvdGFsIHNoYXJlcyBpc3N1ZWQgdG8gYWxsIGRlcG9zaXRvcnMKICAgIGJ5dGVjXzAgLy8gInRvdGFsU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTE3CiAgICAvLyByZXR1cm4gdGhpcy5tdWxEaXZGbG9vcihhbHBoYUFtb3VudCwgdGhpcy50b3RhbFNoYXJlcy52YWx1ZSwgdGhpcy50b3RhbEFscGhhLnZhbHVlKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTE3CiAgICAvLyByZXR1cm4gdGhpcy5tdWxEaXZGbG9vcihhbHBoYUFtb3VudCwgdGhpcy50b3RhbFNoYXJlcy52YWx1ZSwgdGhpcy50b3RhbEFscGhhLnZhbHVlKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NQogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBmcmFtZV9kaWcgLTEKICAgIHVuY292ZXIgMgogICAgbXVsdwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODYKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgdW5jb3ZlciAzCiAgICBkaXZtb2R3CiAgICBwb3BuIDIKICAgIHN3YXAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg3CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTE3CiAgICAvLyByZXR1cm4gdGhpcy5tdWxEaXZGbG9vcihhbHBoYUFtb3VudCwgdGhpcy50b3RhbFNoYXJlcy52YWx1ZSwgdGhpcy50b3RhbEFscGhhLnZhbHVlKTsKICAgIHJldHN1YgoKCi8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjpSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuc2hhcmVzVG9BbHBoYShzaGFyZXM6IHVpbnQ2NCkgLT4gdWludDY0OgpzaGFyZXNUb0FscGhhOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTI0CiAgICAvLyBwcml2YXRlIHNoYXJlc1RvQWxwaGEoc2hhcmVzOiB1aW50NjQpOiB1aW50NjQgewogICAgcHJvdG8gMSAxCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxMjUKICAgIC8vIGlmICh0aGlzLnRvdGFsU2hhcmVzLnZhbHVlID09PSBVaW50NjQoMCkpIHsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxTaGFyZXMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIFRvdGFsIHNoYXJlcyBpc3N1ZWQgdG8gYWxsIGRlcG9zaXRvcnMKICAgIGJ5dGVjXzAgLy8gInRvdGFsU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTI1CiAgICAvLyBpZiAodGhpcy50b3RhbFNoYXJlcy52YWx1ZSA9PT0gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYm56IHNoYXJlc1RvQWxwaGFfYWZ0ZXJfaWZfZWxzZUAyCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxMjYKICAgIC8vIHJldHVybiBVaW50NjQoMCk7CiAgICBpbnRjXzAgLy8gMAogICAgcmV0c3ViCgpzaGFyZXNUb0FscGhhX2FmdGVyX2lmX2Vsc2VAMjoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjEyOAogICAgLy8gcmV0dXJuIHRoaXMubXVsRGl2Rmxvb3Ioc2hhcmVzLCB0aGlzLnRvdGFsQWxwaGEudmFsdWUsIHRoaXMudG90YWxTaGFyZXMudmFsdWUpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjU0CiAgICAvLyB0b3RhbEFscGhhID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgLy8gVG90YWwgQWxwaGEgaGVsZCAoZGVwb3NpdHMgKyBjb21wb3VuZGVkIHlpZWxkKQogICAgYnl0ZWNfMSAvLyAidG90YWxBbHBoYSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjEyOAogICAgLy8gcmV0dXJuIHRoaXMubXVsRGl2Rmxvb3Ioc2hhcmVzLCB0aGlzLnRvdGFsQWxwaGEudmFsdWUsIHRoaXMudG90YWxTaGFyZXMudmFsdWUpOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MwogICAgLy8gdG90YWxTaGFyZXMgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIFRvdGFsIHNoYXJlcyBpc3N1ZWQgdG8gYWxsIGRlcG9zaXRvcnMKICAgIGJ5dGVjXzAgLy8gInRvdGFsU2hhcmVzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTI4CiAgICAvLyByZXR1cm4gdGhpcy5tdWxEaXZGbG9vcihzaGFyZXMsIHRoaXMudG90YWxBbHBoYS52YWx1ZSwgdGhpcy50b3RhbFNoYXJlcy52YWx1ZSk7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODUKICAgIC8vIGNvbnN0IFtoaSwgbG9dID0gbXVsdyhuMSwgbjIpOwogICAgZnJhbWVfZGlnIC0xCiAgICB1bmNvdmVyIDIKICAgIG11bHcKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg2CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgaW50Y18wIC8vIDAKICAgIHVuY292ZXIgMwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBzd2FwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NwogICAgLy8gYXNzZXJ0KHFfaGkgPT09IFVpbnQ2NCgwKSwgJ011bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yJyk7CiAgICAhCiAgICBhc3NlcnQgLy8gTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3IKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjEyOAogICAgLy8gcmV0dXJuIHRoaXMubXVsRGl2Rmxvb3Ioc2hhcmVzLCB0aGlzLnRvdGFsQWxwaGEudmFsdWUsIHRoaXMudG90YWxTaGFyZXMudmFsdWUpOwogICAgcmV0c3ViCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5nZXRFeHBlY3RlZFN3YXBPdXRwdXQoaW5wdXRBbW91bnQ6IHVpbnQ2NCkgLT4gdWludDY0OgpnZXRFeHBlY3RlZFN3YXBPdXRwdXQ6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxMzUKICAgIC8vIHByaXZhdGUgZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0KGlucHV0QW1vdW50OiB1aW50NjQpOiB1aW50NjQgewogICAgcHJvdG8gMSAxCiAgICBwdXNoYnl0ZXMgIiIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjEzNgogICAgLy8gY29uc3QgcG9vbEFwcCA9IHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MAogICAgLy8gdGlueW1hblBvb2xBcHBJZCA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgIC8vIFRpbnltYW4gVjIgcG9vbCBhcHAgSUQKICAgIGJ5dGVjIDE1IC8vICJ0aW55bWFuUG9vbEFwcElkIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTM2CiAgICAvLyBjb25zdCBwb29sQXBwID0gdGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjEzNwogICAgLy8gY29uc3QgcG9vbEFkZHIgPSB0aGlzLnRpbnltYW5Qb29sQWRkcmVzcy52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2MQogICAgLy8gdGlueW1hblBvb2xBZGRyZXNzID0gR2xvYmFsU3RhdGU8QWNjb3VudD4oKTsgLy8gVGlueW1hbiBwb29sIGFkZHJlc3MKICAgIGJ5dGVjIDE2IC8vICJ0aW55bWFuUG9vbEFkZHJlc3MiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxMzcKICAgIC8vIGNvbnN0IHBvb2xBZGRyID0gdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWU7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTQwCiAgICAvLyBjb25zdCBbYXNzZXQxSWQsIGhhc0Fzc2V0MUlkXSA9IEFwcExvY2FsLmdldEV4VWludDY0KHBvb2xBZGRyLCBwb29sQXBwLCBCeXRlcygnYXNzZXRfMV9pZCcpKTsKICAgIGR1cAogICAgZGlnIDIKICAgIHB1c2hieXRlcyAiYXNzZXRfMV9pZCIKICAgIGFwcF9sb2NhbF9nZXRfZXgKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE0MQogICAgLy8gYXNzZXJ0KGhhc0Fzc2V0MUlkLCAnQ2Fubm90IHJlYWQgcG9vbCBhc3NldF8xX2lkJyk7CiAgICBhc3NlcnQgLy8gQ2Fubm90IHJlYWQgcG9vbCBhc3NldF8xX2lkCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxNDMKICAgIC8vIGNvbnN0IFthc3NldDFSZXNlcnZlcywgaGFzQXNzZXQxUmVzZXJ2ZXNdID0gQXBwTG9jYWwuZ2V0RXhVaW50NjQocG9vbEFkZHIsIHBvb2xBcHAsIEJ5dGVzKCdhc3NldF8xX3Jlc2VydmVzJykpOwogICAgZGlnIDEKICAgIGRpZyAzCiAgICBwdXNoYnl0ZXMgImFzc2V0XzFfcmVzZXJ2ZXMiCiAgICBhcHBfbG9jYWxfZ2V0X2V4CiAgICBzd2FwCiAgICBjb3ZlciA0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxNDQKICAgIC8vIGFzc2VydChoYXNBc3NldDFSZXNlcnZlcywgJ0Nhbm5vdCByZWFkIHBvb2wgYXNzZXRfMV9yZXNlcnZlcycpOwogICAgYXNzZXJ0IC8vIENhbm5vdCByZWFkIHBvb2wgYXNzZXRfMV9yZXNlcnZlcwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTQ2CiAgICAvLyBjb25zdCBbYXNzZXQyUmVzZXJ2ZXMsIGhhc0Fzc2V0MlJlc2VydmVzXSA9IEFwcExvY2FsLmdldEV4VWludDY0KHBvb2xBZGRyLCBwb29sQXBwLCBCeXRlcygnYXNzZXRfMl9yZXNlcnZlcycpKTsKICAgIGRpZyAxCiAgICBkaWcgMwogICAgcHVzaGJ5dGVzICJhc3NldF8yX3Jlc2VydmVzIgogICAgYXBwX2xvY2FsX2dldF9leAogICAgc3dhcAogICAgY292ZXIgNAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTQ3CiAgICAvLyBhc3NlcnQoaGFzQXNzZXQyUmVzZXJ2ZXMsICdDYW5ub3QgcmVhZCBwb29sIGFzc2V0XzJfcmVzZXJ2ZXMnKTsKICAgIGFzc2VydCAvLyBDYW5ub3QgcmVhZCBwb29sIGFzc2V0XzJfcmVzZXJ2ZXMKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE0OQogICAgLy8gY29uc3QgW3RvdGFsRmVlU2hhcmUsIGhhc1RvdGFsRmVlU2hhcmVdID0gQXBwTG9jYWwuZ2V0RXhVaW50NjQocG9vbEFkZHIsIHBvb2xBcHAsIEJ5dGVzKCd0b3RhbF9mZWVfc2hhcmUnKSk7CiAgICBzd2FwCiAgICB1bmNvdmVyIDIKICAgIHB1c2hieXRlcyAidG90YWxfZmVlX3NoYXJlIgogICAgYXBwX2xvY2FsX2dldF9leAogICAgc3dhcAogICAgY292ZXIgMwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTUwCiAgICAvLyBhc3NlcnQoaGFzVG90YWxGZWVTaGFyZSwgJ0Nhbm5vdCByZWFkIHBvb2wgdG90YWxfZmVlX3NoYXJlJyk7CiAgICBhc3NlcnQgLy8gQ2Fubm90IHJlYWQgcG9vbCB0b3RhbF9mZWVfc2hhcmUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE1NgogICAgLy8gaWYgKGFzc2V0MUlkID09PSB0aGlzLnVzZGNBc3NldC52YWx1ZSkgewogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ0CiAgICAvLyB1c2RjQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBVU0RDIEFTQSBJRCAoYWlyZHJvcHMgY29tZSBpbiBhcyB0aGlzKQogICAgYnl0ZWMgNSAvLyAidXNkY0Fzc2V0IgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTU2CiAgICAvLyBpZiAoYXNzZXQxSWQgPT09IHRoaXMudXNkY0Fzc2V0LnZhbHVlKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgPT0KICAgIGJ6IGdldEV4cGVjdGVkU3dhcE91dHB1dF9lbHNlX2JvZHlAMgogICAgZnJhbWVfZGlnIDEKICAgIGZyYW1lX2J1cnkgMAoKZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0X2FmdGVyX2lmX2Vsc2VAMzoKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE2OAogICAgLy8gY29uc3QgbmV0SW5wdXQgPSB0aGlzLm11bERpdkZsb29yKGlucHV0QW1vdW50LCBGRUVfQlBTX0JBU0UgLSBmZWVCcHMsIEZFRV9CUFNfQkFTRSk7CiAgICBpbnRjIDQgLy8gMTAwMDAKICAgIGZyYW1lX2RpZyAyCiAgICAtCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NQogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBmcmFtZV9kaWcgLTEKICAgIG11bHcKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg2CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE2OAogICAgLy8gY29uc3QgbmV0SW5wdXQgPSB0aGlzLm11bERpdkZsb29yKGlucHV0QW1vdW50LCBGRUVfQlBTX0JBU0UgLSBmZWVCcHMsIEZFRV9CUFNfQkFTRSk7CiAgICBpbnRjIDQgLy8gMTAwMDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg2CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBzd2FwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NwogICAgLy8gYXNzZXJ0KHFfaGkgPT09IFVpbnQ2NCgwKSwgJ011bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yJyk7CiAgICAhCiAgICBhc3NlcnQgLy8gTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3IKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE3MQogICAgLy8gY29uc3QgZXhwZWN0ZWRPdXRwdXQgPSB0aGlzLm11bERpdkZsb29yKG91dHB1dFJlc2VydmVzLCBuZXRJbnB1dCwgaW5wdXRSZXNlcnZlcyArIG5ldElucHV0KTsKICAgIGZyYW1lX2RpZyAwCiAgICBkaWcgMQogICAgKwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODUKICAgIC8vIGNvbnN0IFtoaSwgbG9dID0gbXVsdyhuMSwgbjIpOwogICAgY292ZXIgMgogICAgbXVsdwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODYKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgdW5jb3ZlciAzCiAgICBkaXZtb2R3CiAgICBwb3BuIDIKICAgIHN3YXAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg3CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTczCiAgICAvLyByZXR1cm4gZXhwZWN0ZWRPdXRwdXQ7CiAgICBmcmFtZV9idXJ5IDAKICAgIHJldHN1YgoKZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0X2Vsc2VfYm9keUAyOgogICAgZnJhbWVfYnVyeSAwCiAgICBmcmFtZV9kaWcgMQogICAgYiBnZXRFeHBlY3RlZFN3YXBPdXRwdXRfYWZ0ZXJfaWZfZWxzZUAzCgoKLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6OlJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5leGVjdXRlQ29tcG91bmQodXNkY0JhbGFuY2U6IHVpbnQ2NCwgc2xpcHBhZ2VCcHM6IHVpbnQ2NCkgLT4gdm9pZDoKZXhlY3V0ZUNvbXBvdW5kOgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTgwCiAgICAvLyBwcml2YXRlIGV4ZWN1dGVDb21wb3VuZCh1c2RjQmFsYW5jZTogdWludDY0LCBzbGlwcGFnZUJwczogdWludDY0KTogdm9pZCB7CiAgICBwcm90byAyIDAKICAgIHB1c2hieXRlcyAiIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTgxCiAgICAvLyBjb25zdCBhcHBBZGRyOiBBY2NvdW50ID0gR2xvYmFsLmN1cnJlbnRBcHBsaWNhdGlvbkFkZHJlc3M7CiAgICBnbG9iYWwgQ3VycmVudEFwcGxpY2F0aW9uQWRkcmVzcwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTg0CiAgICAvLyBjb25zdCBleHBlY3RlZE91dHB1dCA9IHRoaXMuZ2V0RXhwZWN0ZWRTd2FwT3V0cHV0KHVzZGNCYWxhbmNlKTsKICAgIGZyYW1lX2RpZyAtMgogICAgY2FsbHN1YiBnZXRFeHBlY3RlZFN3YXBPdXRwdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE4NQogICAgLy8gYXNzZXJ0KGV4cGVjdGVkT3V0cHV0ID4gVWludDY0KDApLCAnRXhwZWN0ZWQgb3V0cHV0IGlzIHplcm8nKTsKICAgIGR1cAogICAgYXNzZXJ0IC8vIEV4cGVjdGVkIG91dHB1dCBpcyB6ZXJvCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxODgKICAgIC8vIGNvbnN0IG1pbkFtb3VudE91dCA9IHRoaXMubXVsRGl2Rmxvb3IoZXhwZWN0ZWRPdXRwdXQsIEZFRV9CUFNfQkFTRSAtIHNsaXBwYWdlQnBzLCBGRUVfQlBTX0JBU0UpOwogICAgaW50YyA0IC8vIDEwMDAwCiAgICBmcmFtZV9kaWcgLTEKICAgIC0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg1CiAgICAvLyBjb25zdCBbaGksIGxvXSA9IG11bHcobjEsIG4yKTsKICAgIG11bHcKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg2CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE4OAogICAgLy8gY29uc3QgbWluQW1vdW50T3V0ID0gdGhpcy5tdWxEaXZGbG9vcihleHBlY3RlZE91dHB1dCwgRkVFX0JQU19CQVNFIC0gc2xpcHBhZ2VCcHMsIEZFRV9CUFNfQkFTRSk7CiAgICBpbnRjIDQgLy8gMTAwMDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg2CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBjb3ZlciAyCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NwogICAgLy8gYXNzZXJ0KHFfaGkgPT09IFVpbnQ2NCgwKSwgJ011bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yJyk7CiAgICAhCiAgICBhc3NlcnQgLy8gTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3IKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE5MQogICAgLy8gY29uc3QgYWxwaGFCZWZvcmUgPSBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NDMKICAgIC8vIGFscGhhQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIEFscGhhIEFTQSBJRCAoZGVwb3NpdCAmIHlpZWxkIGFzc2V0KQogICAgYnl0ZWMgNCAvLyAiYWxwaGFBc3NldCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE5MQogICAgLy8gY29uc3QgYWxwaGFCZWZvcmUgPSBBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpLmJhbGFuY2UoYXBwQWRkcik7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgZHVwMgogICAgYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCiAgICBhc3NlcnQgLy8gYWNjb3VudCBvcHRlZCBpbnRvIGFzc2V0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxOTQtMjA4CiAgICAvLyBpdHhuLnN1Ym1pdEdyb3VwKAogICAgLy8gICBpdHhuLmFzc2V0VHJhbnNmZXIoewogICAgLy8gICAgIGFzc2V0UmVjZWl2ZXI6IHRoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlLAogICAgLy8gICAgIHhmZXJBc3NldDogQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLAogICAgLy8gICAgIGFzc2V0QW1vdW50OiB1c2RjQmFsYW5jZSwKICAgIC8vICAgICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vICAgfSksCiAgICAvLyAgIGl0eG4uYXBwbGljYXRpb25DYWxsKHsKICAgIC8vICAgICBhcHBJZDogQXBwbGljYXRpb24odGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlKSwKICAgIC8vICAgICBhcHBBcmdzOiBbQnl0ZXMoJ3N3YXAnKSwgQnl0ZXMoJ2ZpeGVkLWlucHV0JyksIGl0b2IobWluQW1vdW50T3V0KV0sCiAgICAvLyAgICAgYXNzZXRzOiBbQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKV0sCiAgICAvLyAgICAgYWNjb3VudHM6IFt0aGlzLnRpbnltYW5Qb29sQWRkcmVzcy52YWx1ZV0sCiAgICAvLyAgICAgZmVlOiBVaW50NjQoMCksCiAgICAvLyAgIH0pLAogICAgLy8gKTsKICAgIGl0eG5fYmVnaW4KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE5NgogICAgLy8gYXNzZXRSZWNlaXZlcjogdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWUsCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjEKICAgIC8vIHRpbnltYW5Qb29sQWRkcmVzcyA9IEdsb2JhbFN0YXRlPEFjY291bnQ+KCk7IC8vIFRpbnltYW4gcG9vbCBhZGRyZXNzCiAgICBieXRlYyAxNiAvLyAidGlueW1hblBvb2xBZGRyZXNzIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTk2CiAgICAvLyBhc3NldFJlY2VpdmVyOiB0aGlzLnRpbnltYW5Qb29sQWRkcmVzcy52YWx1ZSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoxOTcKICAgIC8vIHhmZXJBc3NldDogQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLAogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ0CiAgICAvLyB1c2RjQXNzZXQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBVU0RDIEFTQSBJRCAoYWlyZHJvcHMgY29tZSBpbiBhcyB0aGlzKQogICAgYnl0ZWMgNSAvLyAidXNkY0Fzc2V0IgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTk3CiAgICAvLyB4ZmVyQXNzZXQ6IEFzc2V0KHRoaXMudXNkY0Fzc2V0LnZhbHVlKSwKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBmcmFtZV9kaWcgLTIKICAgIGl0eG5fZmllbGQgQXNzZXRBbW91bnQKICAgIGl0eG5fZmllbGQgWGZlckFzc2V0CiAgICBkdXAKICAgIGl0eG5fZmllbGQgQXNzZXRSZWNlaXZlcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTk1LTIwMAogICAgLy8gaXR4bi5hc3NldFRyYW5zZmVyKHsKICAgIC8vICAgYXNzZXRSZWNlaXZlcjogdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWUsCiAgICAvLyAgIHhmZXJBc3NldDogQXNzZXQodGhpcy51c2RjQXNzZXQudmFsdWUpLAogICAgLy8gICBhc3NldEFtb3VudDogdXNkY0JhbGFuY2UsCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSksCiAgICBpbnRjXzMgLy8gNAogICAgaXR4bl9maWVsZCBUeXBlRW51bQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MTk5CiAgICAvLyBmZWU6IFVpbnQ2NCgwKSwKICAgIGludGNfMCAvLyAwCiAgICBpdHhuX2ZpZWxkIEZlZQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjAxLTIwNwogICAgLy8gaXR4bi5hcHBsaWNhdGlvbkNhbGwoewogICAgLy8gICBhcHBJZDogQXBwbGljYXRpb24odGhpcy50aW55bWFuUG9vbEFwcElkLnZhbHVlKSwKICAgIC8vICAgYXBwQXJnczogW0J5dGVzKCdzd2FwJyksIEJ5dGVzKCdmaXhlZC1pbnB1dCcpLCBpdG9iKG1pbkFtb3VudE91dCldLAogICAgLy8gICBhc3NldHM6IFtBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpXSwKICAgIC8vICAgYWNjb3VudHM6IFt0aGlzLnRpbnltYW5Qb29sQWRkcmVzcy52YWx1ZV0sCiAgICAvLyAgIGZlZTogVWludDY0KDApLAogICAgLy8gfSksCiAgICBpdHhuX25leHQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIwMgogICAgLy8gYXBwSWQ6IEFwcGxpY2F0aW9uKHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZSksCiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjAKICAgIC8vIHRpbnltYW5Qb29sQXBwSWQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAvLyBUaW55bWFuIFYyIHBvb2wgYXBwIElECiAgICBieXRlYyAxNSAvLyAidGlueW1hblBvb2xBcHBJZCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIwMgogICAgLy8gYXBwSWQ6IEFwcGxpY2F0aW9uKHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZSksCiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjAzCiAgICAvLyBhcHBBcmdzOiBbQnl0ZXMoJ3N3YXAnKSwgQnl0ZXMoJ2ZpeGVkLWlucHV0JyksIGl0b2IobWluQW1vdW50T3V0KV0sCiAgICBkaWcgNQogICAgaXRvYgogICAgdW5jb3ZlciAyCiAgICBpdHhuX2ZpZWxkIEFjY291bnRzCiAgICBkaWcgMwogICAgaXR4bl9maWVsZCBBc3NldHMKICAgIHB1c2hieXRlcyAic3dhcCIKICAgIGl0eG5fZmllbGQgQXBwbGljYXRpb25BcmdzCiAgICBwdXNoYnl0ZXMgImZpeGVkLWlucHV0IgogICAgaXR4bl9maWVsZCBBcHBsaWNhdGlvbkFyZ3MKICAgIGl0eG5fZmllbGQgQXBwbGljYXRpb25BcmdzCiAgICBpdHhuX2ZpZWxkIEFwcGxpY2F0aW9uSUQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIwMS0yMDcKICAgIC8vIGl0eG4uYXBwbGljYXRpb25DYWxsKHsKICAgIC8vICAgYXBwSWQ6IEFwcGxpY2F0aW9uKHRoaXMudGlueW1hblBvb2xBcHBJZC52YWx1ZSksCiAgICAvLyAgIGFwcEFyZ3M6IFtCeXRlcygnc3dhcCcpLCBCeXRlcygnZml4ZWQtaW5wdXQnKSwgaXRvYihtaW5BbW91bnRPdXQpXSwKICAgIC8vICAgYXNzZXRzOiBbQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKV0sCiAgICAvLyAgIGFjY291bnRzOiBbdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWVdLAogICAgLy8gICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vIH0pLAogICAgcHVzaGludCA2IC8vIDYKICAgIGl0eG5fZmllbGQgVHlwZUVudW0KICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIwNgogICAgLy8gZmVlOiBVaW50NjQoMCksCiAgICBpbnRjXzAgLy8gMAogICAgaXR4bl9maWVsZCBGZWUKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjE5NC0yMDgKICAgIC8vIGl0eG4uc3VibWl0R3JvdXAoCiAgICAvLyAgIGl0eG4uYXNzZXRUcmFuc2Zlcih7CiAgICAvLyAgICAgYXNzZXRSZWNlaXZlcjogdGhpcy50aW55bWFuUG9vbEFkZHJlc3MudmFsdWUsCiAgICAvLyAgICAgeGZlckFzc2V0OiBBc3NldCh0aGlzLnVzZGNBc3NldC52YWx1ZSksCiAgICAvLyAgICAgYXNzZXRBbW91bnQ6IHVzZGNCYWxhbmNlLAogICAgLy8gICAgIGZlZTogVWludDY0KDApLAogICAgLy8gICB9KSwKICAgIC8vICAgaXR4bi5hcHBsaWNhdGlvbkNhbGwoewogICAgLy8gICAgIGFwcElkOiBBcHBsaWNhdGlvbih0aGlzLnRpbnltYW5Qb29sQXBwSWQudmFsdWUpLAogICAgLy8gICAgIGFwcEFyZ3M6IFtCeXRlcygnc3dhcCcpLCBCeXRlcygnZml4ZWQtaW5wdXQnKSwgaXRvYihtaW5BbW91bnRPdXQpXSwKICAgIC8vICAgICBhc3NldHM6IFtBc3NldCh0aGlzLmFscGhhQXNzZXQudmFsdWUpXSwKICAgIC8vICAgICBhY2NvdW50czogW3RoaXMudGlueW1hblBvb2xBZGRyZXNzLnZhbHVlXSwKICAgIC8vICAgICBmZWU6IFVpbnQ2NCgwKSwKICAgIC8vICAgfSksCiAgICAvLyApOwogICAgaXR4bl9zdWJtaXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIxMQogICAgLy8gY29uc3QgYWxwaGFBZnRlcjogdWludDY0ID0gQXNzZXQodGhpcy5hbHBoYUFzc2V0LnZhbHVlKS5iYWxhbmNlKGFwcEFkZHIpOwogICAgY292ZXIgMgogICAgYXNzZXRfaG9sZGluZ19nZXQgQXNzZXRCYWxhbmNlCiAgICBhc3NlcnQgLy8gYWNjb3VudCBvcHRlZCBpbnRvIGFzc2V0CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMTIKICAgIC8vIGNvbnN0IHN3YXBPdXRwdXQ6IHVpbnQ2NCA9IGFscGhhQWZ0ZXIgLSBhbHBoYUJlZm9yZTsKICAgIHN3YXAKICAgIC0KICAgIGR1cAogICAgdW5jb3ZlciAyCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMTMKICAgIC8vIGFzc2VydChzd2FwT3V0cHV0ID49IG1pbkFtb3VudE91dCwgJ1N3YXAgb3V0cHV0IGJlbG93IG1pbmltdW0nKTsKICAgID49CiAgICBhc3NlcnQgLy8gU3dhcCBvdXRwdXQgYmVsb3cgbWluaW11bQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjE2CiAgICAvLyBsZXQgZmFybUJvbnVzOiB1aW50NjQgPSBVaW50NjQoMCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjE3CiAgICAvLyBpZiAodGhpcy5lbWlzc2lvblJhdGlvLnZhbHVlID4gVWludDY0KDApICYmIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPiBVaW50NjQoMCkpIHsKICAgIGR1cAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjUKICAgIC8vIGVtaXNzaW9uUmF0aW8gPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgIC8vIE11bHRpcGxpZXIgZm9yIGR5bmFtaWMgcmF0ZTogcmF0ZSA9IGZhcm1CYWxhbmNlICogZW1pc3Npb25SYXRpbyAvIHRvdGFsQWxwaGEKICAgIGJ5dGVjIDkgLy8gImVtaXNzaW9uUmF0aW8iCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMTcKICAgIC8vIGlmICh0aGlzLmVtaXNzaW9uUmF0aW8udmFsdWUgPiBVaW50NjQoMCkgJiYgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA+IFVpbnQ2NCgwKSkgewogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGJ6IGV4ZWN1dGVDb21wb3VuZF9hZnRlcl9pZl9lbHNlQDgKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgQWxwaGEgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18yIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIxNwogICAgLy8gaWYgKHRoaXMuZW1pc3Npb25SYXRpby52YWx1ZSA+IFVpbnQ2NCgwKSAmJiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID4gVWludDY0KDApKSB7CiAgICBhcHBfZ2xvYmFsX2dldF9leAogICAgYXNzZXJ0IC8vIGNoZWNrIEdsb2JhbFN0YXRlIGV4aXN0cwogICAgYnogZXhlY3V0ZUNvbXBvdW5kX2FmdGVyX2lmX2Vsc2VAOAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjE4CiAgICAvLyBjb25zdCBjdXJyZW50UmF0ZSA9IHRoaXMuY2FsY3VsYXRlRHluYW1pY0VtaXNzaW9uUmF0ZSgpOwogICAgY2FsbHN1YiBjYWxjdWxhdGVEeW5hbWljRW1pc3Npb25SYXRlCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NQogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBmcmFtZV9kaWcgMQogICAgbXVsdwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODYKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjE5CiAgICAvLyBjb25zdCByZXF1ZXN0ZWRCb251cyA9IHRoaXMubXVsRGl2Rmxvb3Ioc3dhcE91dHB1dCwgY3VycmVudFJhdGUsIEZFRV9CUFNfQkFTRSk7CiAgICBpbnRjIDQgLy8gMTAwMDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg2CiAgICAvLyBjb25zdCBbcV9oaSwgcV9sbywgX3JfaGksIF9yX2xvXSA9IGRpdm1vZHcoaGksIGxvLCBVaW50NjQoMCksIGQpOwogICAgZGl2bW9kdwogICAgcG9wbiAyCiAgICBkdXAKICAgIGNvdmVyIDIKICAgIGZyYW1lX2J1cnkgMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODcKICAgIC8vIGFzc2VydChxX2hpID09PSBVaW50NjQoMCksICdNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcicpOwogICAgIQogICAgYXNzZXJ0IC8vIE11bHRpcGxpY2F0aW9uIG92ZXJmbG93IGluIG11bERpdkZsb29yCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMjAKICAgIC8vIGZhcm1Cb251cyA9IHJlcXVlc3RlZEJvbnVzIDwgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA/IHJlcXVlc3RlZEJvbnVzIDogdGhpcy5mYXJtQmFsYW5jZS52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgQWxwaGEgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18yIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIyMAogICAgLy8gZmFybUJvbnVzID0gcmVxdWVzdGVkQm9udXMgPCB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID8gcmVxdWVzdGVkQm9udXMgOiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIDwKICAgIGJ6IGV4ZWN1dGVDb21wb3VuZF90ZXJuYXJ5X2ZhbHNlQDYKICAgIGZyYW1lX2RpZyAwCiAgICBmcmFtZV9idXJ5IDIKCmV4ZWN1dGVDb21wb3VuZF90ZXJuYXJ5X21lcmdlQDc6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMjEKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlIC0gZmFybUJvbnVzOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjY0CiAgICAvLyBmYXJtQmFsYW5jZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgICAvLyBUb3RhbCBBbHBoYSBhdmFpbGFibGUgZm9yIGZhcm0gYm9udXMKICAgIGJ5dGVjXzIgLy8gImZhcm1CYWxhbmNlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjIxCiAgICAvLyB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID0gdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSAtIGZhcm1Cb251czsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICBmcmFtZV9kaWcgMgogICAgLQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NjQKICAgIC8vIGZhcm1CYWxhbmNlID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAgICAgICAgIC8vIFRvdGFsIEFscGhhIGF2YWlsYWJsZSBmb3IgZmFybSBib251cwogICAgYnl0ZWNfMiAvLyAiZmFybUJhbGFuY2UiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMjEKICAgIC8vIHRoaXMuZmFybUJhbGFuY2UudmFsdWUgPSB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlIC0gZmFybUJvbnVzOwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKCmV4ZWN1dGVDb21wb3VuZF9hZnRlcl9pZl9lbHNlQDg6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMjUKICAgIC8vIGNvbnN0IHRvdGFsT3V0cHV0OiB1aW50NjQgPSBzd2FwT3V0cHV0ICsgZmFybUJvbnVzOwogICAgZnJhbWVfZGlnIDEKICAgIGZyYW1lX2RpZyAyCiAgICArCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMjgKICAgIC8vIGNvbnN0IGNyZWF0b3JDdXQ6IHVpbnQ2NCA9IHRoaXMubXVsRGl2Rmxvb3IodG90YWxPdXRwdXQsIHRoaXMuY3JlYXRvckZlZVJhdGUudmFsdWUsIEZFRV9QRVJDRU5UX0JBU0UpOwogICAgaW50Y18wIC8vIDAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjQ5CiAgICAvLyBjcmVhdG9yRmVlUmF0ZSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgLy8gMC0xMDAsIHBlcmNlbnRhZ2Ugb2YgeWllbGQgdG8gY3JlYXRvcgogICAgYnl0ZWMgMTQgLy8gImNyZWF0b3JGZWVSYXRlIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjI4CiAgICAvLyBjb25zdCBjcmVhdG9yQ3V0OiB1aW50NjQgPSB0aGlzLm11bERpdkZsb29yKHRvdGFsT3V0cHV0LCB0aGlzLmNyZWF0b3JGZWVSYXRlLnZhbHVlLCBGRUVfUEVSQ0VOVF9CQVNFKTsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo4NQogICAgLy8gY29uc3QgW2hpLCBsb10gPSBtdWx3KG4xLCBuMik7CiAgICBkaWcgMQogICAgbXVsdwogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODYKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjI4CiAgICAvLyBjb25zdCBjcmVhdG9yQ3V0OiB1aW50NjQgPSB0aGlzLm11bERpdkZsb29yKHRvdGFsT3V0cHV0LCB0aGlzLmNyZWF0b3JGZWVSYXRlLnZhbHVlLCBGRUVfUEVSQ0VOVF9CQVNFKTsKICAgIHB1c2hpbnQgMTAwIC8vIDEwMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6ODYKICAgIC8vIGNvbnN0IFtxX2hpLCBxX2xvLCBfcl9oaSwgX3JfbG9dID0gZGl2bW9kdyhoaSwgbG8sIFVpbnQ2NCgwKSwgZCk7CiAgICBkaXZtb2R3CiAgICBwb3BuIDIKICAgIHN3YXAKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjg3CiAgICAvLyBhc3NlcnQocV9oaSA9PT0gVWludDY0KDApLCAnTXVsdGlwbGljYXRpb24gb3ZlcmZsb3cgaW4gbXVsRGl2Rmxvb3InKTsKICAgICEKICAgIGFzc2VydCAvLyBNdWx0aXBsaWNhdGlvbiBvdmVyZmxvdyBpbiBtdWxEaXZGbG9vcgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjI5CiAgICAvLyBjb25zdCB2YXVsdEN1dDogdWludDY0ID0gdG90YWxPdXRwdXQgLSBjcmVhdG9yQ3V0OwogICAgZHVwMgogICAgLQogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjMyCiAgICAvLyB0aGlzLmNyZWF0b3JVbmNsYWltZWRBbHBoYS52YWx1ZSA9IHRoaXMuY3JlYXRvclVuY2xhaW1lZEFscGhhLnZhbHVlICsgY3JlYXRvckN1dDsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1MAogICAgLy8gY3JlYXRvclVuY2xhaW1lZEFscGhhID0gR2xvYmFsU3RhdGU8dWludDY0PigpOyAvLyBBY2N1bXVsYXRlZCBBbHBoYSBmb3IgY3JlYXRvciB0byBjbGFpbQogICAgYnl0ZWMgOCAvLyAiY3JlYXRvclVuY2xhaW1lZEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjMyCiAgICAvLyB0aGlzLmNyZWF0b3JVbmNsYWltZWRBbHBoYS52YWx1ZSA9IHRoaXMuY3JlYXRvclVuY2xhaW1lZEFscGhhLnZhbHVlICsgY3JlYXRvckN1dDsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICB1bmNvdmVyIDIKICAgICsKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjUwCiAgICAvLyBjcmVhdG9yVW5jbGFpbWVkQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7IC8vIEFjY3VtdWxhdGVkIEFscGhhIGZvciBjcmVhdG9yIHRvIGNsYWltCiAgICBieXRlYyA4IC8vICJjcmVhdG9yVW5jbGFpbWVkQWxwaGEiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMzIKICAgIC8vIHRoaXMuY3JlYXRvclVuY2xhaW1lZEFscGhhLnZhbHVlID0gdGhpcy5jcmVhdG9yVW5jbGFpbWVkQWxwaGEudmFsdWUgKyBjcmVhdG9yQ3V0OwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIzNQogICAgLy8gdGhpcy50b3RhbEFscGhhLnZhbHVlID0gdGhpcy50b3RhbEFscGhhLnZhbHVlICsgdmF1bHRDdXQ7CiAgICBpbnRjXzAgLy8gMAogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6NTQKICAgIC8vIHRvdGFsQWxwaGEgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAvLyBUb3RhbCBBbHBoYSBoZWxkIChkZXBvc2l0cyArIGNvbXBvdW5kZWQgeWllbGQpCiAgICBieXRlY18xIC8vICJ0b3RhbEFscGhhIgogICAgLy8gUmFyZUZpQWxwaGFDb21wb3VuZGluZ1ZhdWx0LmFsZ28udHM6MjM1CiAgICAvLyB0aGlzLnRvdGFsQWxwaGEudmFsdWUgPSB0aGlzLnRvdGFsQWxwaGEudmFsdWUgKyB2YXVsdEN1dDsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICArCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NAogICAgLy8gdG90YWxBbHBoYSA9IEdsb2JhbFN0YXRlPHVpbnQ2ND4oKTsgICAgICAgIC8vIFRvdGFsIEFscGhhIGhlbGQgKGRlcG9zaXRzICsgY29tcG91bmRlZCB5aWVsZCkKICAgIGJ5dGVjXzEgLy8gInRvdGFsQWxwaGEiCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMzUKICAgIC8vIHRoaXMudG90YWxBbHBoYS52YWx1ZSA9IHRoaXMudG90YWxBbHBoYS52YWx1ZSArIHZhdWx0Q3V0OwogICAgc3dhcAogICAgYXBwX2dsb2JhbF9wdXQKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIzOAogICAgLy8gdGhpcy50b3RhbFlpZWxkQ29tcG91bmRlZC52YWx1ZSA9IHRoaXMudG90YWxZaWVsZENvbXBvdW5kZWQudmFsdWUgKyB0b3RhbE91dHB1dDsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NwogICAgLy8gdG90YWxZaWVsZENvbXBvdW5kZWQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7IC8vIFRvdGFsIHlpZWxkIGNvbXBvdW5kZWQgKGZvciBzdGF0cykKICAgIGJ5dGVjIDEzIC8vICJ0b3RhbFlpZWxkQ29tcG91bmRlZCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIzOAogICAgLy8gdGhpcy50b3RhbFlpZWxkQ29tcG91bmRlZC52YWx1ZSA9IHRoaXMudG90YWxZaWVsZENvbXBvdW5kZWQudmFsdWUgKyB0b3RhbE91dHB1dDsKICAgIGFwcF9nbG9iYWxfZ2V0X2V4CiAgICBhc3NlcnQgLy8gY2hlY2sgR2xvYmFsU3RhdGUgZXhpc3RzCiAgICArCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo1NwogICAgLy8gdG90YWxZaWVsZENvbXBvdW5kZWQgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7IC8vIFRvdGFsIHlpZWxkIGNvbXBvdW5kZWQgKGZvciBzdGF0cykKICAgIGJ5dGVjIDEzIC8vICJ0b3RhbFlpZWxkQ29tcG91bmRlZCIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIzOAogICAgLy8gdGhpcy50b3RhbFlpZWxkQ29tcG91bmRlZC52YWx1ZSA9IHRoaXMudG90YWxZaWVsZENvbXBvdW5kZWQudmFsdWUgKyB0b3RhbE91dHB1dDsKICAgIHN3YXAKICAgIGFwcF9nbG9iYWxfcHV0CiAgICByZXRzdWIKCmV4ZWN1dGVDb21wb3VuZF90ZXJuYXJ5X2ZhbHNlQDY6CiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czoyMjAKICAgIC8vIGZhcm1Cb251cyA9IHJlcXVlc3RlZEJvbnVzIDwgdGhpcy5mYXJtQmFsYW5jZS52YWx1ZSA/IHJlcXVlc3RlZEJvbnVzIDogdGhpcy5mYXJtQmFsYW5jZS52YWx1ZTsKICAgIGludGNfMCAvLyAwCiAgICAvLyBSYXJlRmlBbHBoYUNvbXBvdW5kaW5nVmF1bHQuYWxnby50czo2NAogICAgLy8gZmFybUJhbGFuY2UgPSBHbG9iYWxTdGF0ZTx1aW50NjQ+KCk7ICAgICAgICAgLy8gVG90YWwgQWxwaGEgYXZhaWxhYmxlIGZvciBmYXJtIGJvbnVzCiAgICBieXRlY18yIC8vICJmYXJtQmFsYW5jZSIKICAgIC8vIFJhcmVGaUFscGhhQ29tcG91bmRpbmdWYXVsdC5hbGdvLnRzOjIyMAogICAgLy8gZmFybUJvbnVzID0gcmVxdWVzdGVkQm9udXMgPCB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlID8gcmVxdWVzdGVkQm9udXMgOiB0aGlzLmZhcm1CYWxhbmNlLnZhbHVlOwogICAgYXBwX2dsb2JhbF9nZXRfZXgKICAgIGFzc2VydCAvLyBjaGVjayBHbG9iYWxTdGF0ZSBleGlzdHMKICAgIGZyYW1lX2J1cnkgMgogICAgYiBleGVjdXRlQ29tcG91bmRfdGVybmFyeV9tZXJnZUA3Cg==",
	clear: "I3ByYWdtYSB2ZXJzaW9uIDExCiNwcmFnbWEgdHlwZXRyYWNrIGZhbHNlCgovLyBAYWxnb3JhbmRmb3VuZGF0aW9uL2FsZ29yYW5kLXR5cGVzY3JpcHQvYmFzZS1jb250cmFjdC5kLnRzOjpCYXNlQ29udHJhY3QuY2xlYXJTdGF0ZVByb2dyYW0oKSAtPiB1aW50NjQ6Cm1haW46CiAgICBwdXNoaW50IDEgLy8gMQogICAgcmV0dXJuCg=="
};
var byteCode = {
	approval: "CyAIAAEIBJBOwJoMgOHrF4CglKWNHSYSC3RvdGFsU2hhcmVzCnRvdGFsQWxwaGELZmFybUJhbGFuY2UOY3JlYXRvckFkZHJlc3MKYWxwaGFBc3NldAl1c2RjQXNzZXQKdXNlclNoYXJlcwQVH3x1FWNyZWF0b3JVbmNsYWltZWRBbHBoYQ1lbWlzc2lvblJhdGlvDXJhcmVmaUFkZHJlc3MQbWluU3dhcFRocmVzaG9sZA5tYXhTbGlwcGFnZUJwcxR0b3RhbFlpZWxkQ29tcG91bmRlZA5jcmVhdG9yRmVlUmF0ZRB0aW55bWFuUG9vbEFwcElkEnRpbnltYW5Qb29sQWRkcmVzcw1hc3NldHNPcHRlZEluMRtBANCCAgQpMU2VBGppH+I2GgCOAgCwAKQxGRREMRhBAI2CEwRBTkG1BG4uvJsEIfHd/wS8mUSeBMizwPAEADWXogTH1NvzBD4vfLcEP9eYVgSXNlS/BAx5OxgEq273OwSq4srSBB9l1k4EFPqUcwS8XjjGBK/r/KwE0FTBnwQXDnKSNhoAjhMA+wHGAmYC0gMEAzoDkwOsA8ID1gPqBDwEbASUBLUE2AT6BUIFagCABE0Dyyk2GgCOAQAsADEZgQISMRgQREIBZTEZIxIxGBBEQgFMJYEFMRmOAgAFAAEAMRhEADEYRAA2GgFJFSQSRBc2GgJJFSQSRBc2GgNJFSQSRBc2GgRJFSQSRBc2GgVJFSQSRBc2GgZJFSQSRBc2GgdJFYEgEkQ2GghJFYEgEkQxIDIDEkRLBYEGDkRLBCEFD0RLBCEGDkRLA4H0Aw9ESwMhBA5ESwdESwZESwdLBxNESwJEJwRPCGcnBU8HZysxAGcnCkxnJw5PBWcnCCJnKCJnKSJnJwtPBGcnDE8DZycNImcnD08CZycQTGcqImcnCSJnJxEiZyNDMSAyAxJEMQAiK2VEEkQiJxFlRBREMgoxFklEIwlJOBAjEkRJOAdLAhJESTgIgcDLyQIPREk4ADEAEkRJOCAyAxJEOAkyAxJEsSInBGVEIrISshFJshQlshAisgGzsSInBWVEIrISshGyFCWyECKyAbMnESNnI0MxIDIDEkQxACcGImYjQzEgMgMSRDEAIicGY0xJTwJEQQAwRwKIBFoiKGVETwIJKExnIillREsBCSlMZ7ExACInBGVETwKyErIRshQlshAisgGzI0M2GgFJFSQSRBdJMSAyAxJEIicMZUQORDIKSSInBWVEcABMSU8CRCInC2VED0EADSIoZURBAAZJSwOIBLwxFklEIwlJOBAlEkRJOBEiJwRlRBJESTgUSwMSREk4ADEAEkRJOCAyAxJESTgVMgMSRDgSSYHAhD0PREmIA45JRDEAIicGY0RLAQgxACcGTwJmIihlRAgoTGciKWVECClMZyNDNhoBSRUkEkQXSTEgMgMSRDEAIicGY0xOAkRBAEtLAUlESUsCSU4DDkRJiANgSURPAksCCTEAJwZPAmYiKGVETwIJKExnIillREsBCSlMZ7ExACInBGVETwKyErIRshQlshAisgGzI0NJQv+zMSAyAxJEMQAiK2VEEkQiJwhlRElEJwgiZ7ExACInBGVETwKyErIRshQlshAisgGzI0M2GgFJFSQSRBcxIDIDEkQiJwxlREsBD0QyCiInBWVEcABEIicLZURLAQ5EIihlRERMiAOGI0MyCiInBWVEcABEIQciKGVEQQAXIillRCIoZURMIQcdIk8DH0YCTBRERQEiKGVEIillRCInCGVEIicNZURPAxZPAxZQTwIWUEsDFlBMFlBLARZQJwdMULAjQzYaAUkVgSASRCInBmNEiAJPFicHTFCwI0M2GgFJFYEgEkQiJwZjRBYnB0xQsCNDNhoBSRUkEkQXiAIBFicHTFCwI0M2GgFJFSQSRBeIAhEWJwdMULAjQzIKIicFZURwAExJTwJEQAAhgBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAnB0xQsCNDRwKIAfVJgd5NHSIhBB9GAkwURE8CFk8CFlBMFlBC/9k2GgFJFSQSRBcxIDIDEkQxACIrZUQSMQAiJwplRBIRREkhBQ9ESSEGDkQnC0xnI0M2GgFJFSQSRBcxIDIDEkQxACIrZUQSREmB9AMPREkhBA5EJwxMZyNDNhoBSRWBIBJEMSAyAxJEMQAiK2VEEkRJMgMTRCtMZyNDNhoBSRWBIBJEMSAyAxJEMQAiJwplRBJESTIDE0QnCkxnI0M2GgFJFSQSRBcxIDIDEkQxACIrZUQSREmBBg5EJw5MZyNDMSAyAxJEMgoxFklEIwlJOBAlEkRJOBEiJwRlRBJESTgUTwISREk4ADEAEkRJOCAyAxJESTgVMgMSRDgSSUQiKmVECCpMZyNDNhoBSRUkEkQXMSAyAxJEMQAiK2VEEjEAIicKZUQSEURJRCcJTGcjQyJJJwllREEADCIqZURBAAWIABtFASIqZUQiJwllREwWTBZQSwEWUCcHTFCwI0OKAAEiKWVMSU8CREEAByIqZURAAAMiTIkiKmVEIicJZUQdIosAH0YCTBRESYHoBwyB6AdMTUyJigEBIihlREAAA4v/iSIoZUQiKWVEi/9PAh0iTwMfRgJMFESJigEBIihlREAAAiKJIillRCIoZUSL/08CHSJPAx9GAkwURImKAQGAACInD2VEIicQZURJSwKACmFzc2V0XzFfaWRjREsBSwOAEGFzc2V0XzFfcmVzZXJ2ZXNjTE4EREsBSwOAEGFzc2V0XzJfcmVzZXJ2ZXNjTE4ERExPAoAPdG90YWxfZmVlX3NoYXJlY0xOA0QiJwVlRBJBACmLAYwAIQSLAgmL/x0iIQQfRgJMFESLAEsBCE4CHSJPAx9GAkwURIwAiYwAiwFC/9SKAgCAADIKi/6I/0xJRCEEi/8JHSIhBB9GAk4CFEQiJwRlREpwAESxIicQZUQiJwVlRIv+shKyEUmyFCWyECKyAbYiJw9lREsFFk8CshxLA7IwgARzd2FwshqAC2ZpeGVkLWlucHV0shqyGrIYgQayECKyAbNOAnAAREwJSU8CD0QiSScJZURBADAiKmVEQQApiP5GiwEdIiEEH0YCSU4CjAAURCIqZUQMQQBFiwCMAiIqZUSLAgkqTGeLAYsCCCInDmVESwEdIoFkH0YCTBRESgkiJwhlRE8CCCcITGciKWVECClMZyInDWVECCcNTGeJIiplRIwCQv+2",
	clear: "C4EBQw=="
};
var compilerInfo = {
	compiler: "puya",
	compilerVersion: {
		major: 5,
		minor: 3,
		patch: 2
	}
};
var events = [
];
var templateVariables = {
};
var arc56Compound = {
	name: name,
	structs: structs,
	methods: methods,
	arcs: arcs,
	networks: networks,
	state: state,
	bareActions: bareActions,
	sourceInfo: sourceInfo,
	source: source,
	byteCode: byteCode,
	compilerInfo: compilerInfo,
	events: events,
	templateVariables: templateVariables
};

var abiSwap = new algosdk.ABIContract(arc56Swap);
var abiCompound = new algosdk.ABIContract(arc56Compound);
function getSelector(methodName, poolType) {
  if (poolType === void 0) {
    poolType = 'swap';
  }
  var contract = poolType === 'compound' ? abiCompound : abiSwap;
  var actualName = poolType === 'compound' && methodName === 'swapYield' ? 'compoundYield' : methodName;
  return contract.getMethodByName(actualName).getSelector();
}
var DEPOSIT_SELECTOR = getSelector('deposit');
var WITHDRAW_SELECTOR = getSelector('withdraw');
var CLAIM_SELECTOR = getSelector('claim');
var MAX_TXN_FEE_UALGOS = 50000;
function getSender(txn) {
  if (!txn.sender) return '';
  return txn.sender.toString();
}
function validateSafety(txnGroup) {
  for (var i = 0; i < txnGroup.length; i++) {
    var _txn$assetTransfer, _txn$payment;
    var txn = txnGroup[i];
    if (txn.rekeyTo) return {
      valid: false,
      error: "Transaction " + i + " has a rekey \u2014 refusing to sign"
    };
    if ((_txn$assetTransfer = txn.assetTransfer) != null && _txn$assetTransfer.closeRemainderTo) return {
      valid: false,
      error: "Transaction " + i + " has close-remainder-to on asset transfer \u2014 refusing to sign"
    };
    if ((_txn$payment = txn.payment) != null && _txn$payment.closeRemainderTo) return {
      valid: false,
      error: "Transaction " + i + " has close-remainder-to on payment \u2014 refusing to sign"
    };
  }
  return {
    valid: true
  };
}
function validateOptInTxn(txnGroup, _ref) {
  var _txn$applicationCall;
  var sender = _ref.sender,
    appId = _ref.appId;
  if (!(txnGroup != null && txnGroup.length)) return {
    valid: false,
    error: 'Empty transaction group'
  };
  if (txnGroup.length > 1) return {
    valid: false,
    error: "Opt-in should be 1 transaction, got " + txnGroup.length
  };
  var safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;
  var txn = txnGroup[0];
  if (txn.type !== 'appl') return {
    valid: false,
    error: "Opt-in should be an app call, got: " + txn.type
  };
  if (sender && getSender(txn) !== sender) return {
    valid: false,
    error: 'Transaction sender does not match your wallet'
  };
  if (appId && txn.applicationCall && Number(txn.applicationCall.appIndex) !== appId) {
    return {
      valid: false,
      error: "App call targets wrong vault: " + txn.applicationCall.appIndex + " (expected " + appId + ")"
    };
  }
  if (((_txn$applicationCall = txn.applicationCall) == null ? void 0 : _txn$applicationCall.onComplete) !== 1) return {
    valid: false,
    error: 'Opt-in app call should have OptIn on-complete'
  };
  return {
    valid: true
  };
}
function validateDepositTxn(txnGroup, _ref2) {
  var sender = _ref2.sender,
    appId = _ref2.appId,
    appAddress = _ref2.appAddress,
    amount = _ref2.amount,
    depositAssetId = _ref2.depositAssetId;
  if (!txnGroup || txnGroup.length < 2) return {
    valid: false,
    error: 'Deposit requires at least 2 transactions'
  };
  if (txnGroup.length > 4) return {
    valid: false,
    error: "Deposit has too many transactions: " + txnGroup.length
  };
  var safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;
  if (sender) {
    for (var i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return {
        valid: false,
        error: "Transaction " + i + " has unexpected sender"
      };
    }
  }
  var foundAxfer = false;
  var foundAppCall = false;
  for (var _i = 0; _i < txnGroup.length; _i++) {
    var txn = txnGroup[_i];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) {
      return {
        valid: false,
        error: "Transaction " + _i + " fee is too high: " + txn.fee + " \xB5ALGO"
      };
    }
    if (txn.type === 'axfer' && txn.assetTransfer) {
      var _txn$assetTransfer$re;
      var txnAmount = Number(txn.assetTransfer.amount);
      var receiver = (_txn$assetTransfer$re = txn.assetTransfer.receiver) == null ? void 0 : _txn$assetTransfer$re.toString();
      if (txnAmount === 0) {
        if (sender && receiver !== sender) return {
          valid: false,
          error: 'Asset opt-in receiver is not the user — possible theft attempt'
        };
      } else {
        if (foundAxfer) return {
          valid: false,
          error: 'Deposit should have only one asset transfer with value'
        };
        foundAxfer = true;
        if (appAddress && receiver && receiver !== appAddress) return {
          valid: false,
          error: 'Asset transfer is not going to the vault address'
        };
        if (depositAssetId && Number(txn.assetTransfer.assetIndex) !== depositAssetId) return {
          valid: false,
          error: "Wrong asset being transferred"
        };
        if (amount && txnAmount !== amount) return {
          valid: false,
          error: "Transfer amount mismatch: " + txnAmount + " (expected " + amount + ")"
        };
      }
    } else if (txn.type === 'appl' && txn.applicationCall) {
      var _args$;
      if (foundAppCall) return {
        valid: false,
        error: 'Deposit should have only one app call'
      };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return {
        valid: false,
        error: "App call targets wrong vault"
      };
      if (txn.applicationCall.onComplete !== 0) return {
        valid: false,
        error: 'Deposit app call should be NoOp'
      };
      var args = txn.applicationCall.appArgs;
      if (!(args != null && args.length) || ((_args$ = args[0]) == null ? void 0 : _args$.length) !== 4) return {
        valid: false,
        error: 'Deposit app call missing method selector'
      };
      for (var j = 0; j < 4; j++) {
        if (args[0][j] !== DEPOSIT_SELECTOR[j]) return {
          valid: false,
          error: 'App call method does not match deposit — refusing to sign'
        };
      }
    } else {
      return {
        valid: false,
        error: "Unexpected transaction type in deposit group: " + txn.type
      };
    }
  }
  if (!foundAxfer) return {
    valid: false,
    error: 'No deposit asset transfer found'
  };
  if (!foundAppCall) return {
    valid: false,
    error: 'No app call found in deposit group'
  };
  return {
    valid: true
  };
}
function validateWithdrawTxn(txnGroup, _ref3) {
  var sender = _ref3.sender,
    appId = _ref3.appId;
  if (!(txnGroup != null && txnGroup.length)) return {
    valid: false,
    error: 'Empty transaction group'
  };
  if (txnGroup.length > 2) return {
    valid: false,
    error: "Withdraw has too many transactions: " + txnGroup.length
  };
  var safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;
  if (sender) {
    for (var i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return {
        valid: false,
        error: "Transaction " + i + " has unexpected sender"
      };
    }
  }
  var foundAppCall = false;
  for (var _i2 = 0; _i2 < txnGroup.length; _i2++) {
    var txn = txnGroup[_i2];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return {
      valid: false,
      error: "Transaction " + _i2 + " fee is too high"
    };
    if (txn.type === 'appl' && txn.applicationCall) {
      var _args$2;
      if (foundAppCall) return {
        valid: false,
        error: 'Withdraw should have only one app call'
      };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return {
        valid: false,
        error: "App call targets wrong vault"
      };
      if (txn.applicationCall.onComplete !== 0) return {
        valid: false,
        error: 'Withdraw app call should be NoOp'
      };
      var args = txn.applicationCall.appArgs;
      if (!(args != null && args.length) || ((_args$2 = args[0]) == null ? void 0 : _args$2.length) !== 4) return {
        valid: false,
        error: 'Withdraw app call missing method selector'
      };
      for (var j = 0; j < 4; j++) {
        if (args[0][j] !== WITHDRAW_SELECTOR[j]) return {
          valid: false,
          error: 'App call method does not match withdraw — refusing to sign'
        };
      }
    } else if (txn.type === 'axfer' && txn.assetTransfer) {
      var _txn$assetTransfer$re2;
      if (Number(txn.assetTransfer.amount) !== 0) return {
        valid: false,
        error: 'Unexpected asset transfer in withdraw group'
      };
      if (sender && ((_txn$assetTransfer$re2 = txn.assetTransfer.receiver) == null ? void 0 : _txn$assetTransfer$re2.toString()) !== sender) return {
        valid: false,
        error: 'Asset transfer receiver is not the user'
      };
    } else {
      return {
        valid: false,
        error: "Unexpected transaction type in withdraw group: " + txn.type
      };
    }
  }
  if (!foundAppCall) return {
    valid: false,
    error: 'No app call found in withdraw group'
  };
  return {
    valid: true
  };
}
function validateClaimTxn(txnGroup, _ref4) {
  var sender = _ref4.sender,
    appId = _ref4.appId;
  if (!(txnGroup != null && txnGroup.length)) return {
    valid: false,
    error: 'Empty transaction group'
  };
  if (txnGroup.length > 3) return {
    valid: false,
    error: "Claim has too many transactions: " + txnGroup.length
  };
  var safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;
  if (sender) {
    for (var i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return {
        valid: false,
        error: "Transaction " + i + " has unexpected sender"
      };
    }
  }
  var foundAppCall = false;
  for (var _i3 = 0; _i3 < txnGroup.length; _i3++) {
    var txn = txnGroup[_i3];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return {
      valid: false,
      error: "Transaction " + _i3 + " fee is too high"
    };
    if (txn.type === 'appl' && txn.applicationCall) {
      var _args$3;
      if (foundAppCall) return {
        valid: false,
        error: 'Claim should have only one app call'
      };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return {
        valid: false,
        error: "App call targets wrong vault"
      };
      if (txn.applicationCall.onComplete !== 0) return {
        valid: false,
        error: 'Claim app call should be NoOp'
      };
      var args = txn.applicationCall.appArgs;
      if (!(args != null && args.length) || ((_args$3 = args[0]) == null ? void 0 : _args$3.length) !== 4) return {
        valid: false,
        error: 'Claim app call missing method selector'
      };
      for (var j = 0; j < 4; j++) {
        if (args[0][j] !== CLAIM_SELECTOR[j]) return {
          valid: false,
          error: 'App call method does not match claim — refusing to sign'
        };
      }
    } else if (txn.type === 'axfer' && txn.assetTransfer) {
      var _txn$assetTransfer$re3;
      if (Number(txn.assetTransfer.amount) !== 0) return {
        valid: false,
        error: 'Unexpected asset transfer in claim group'
      };
      if (sender && ((_txn$assetTransfer$re3 = txn.assetTransfer.receiver) == null ? void 0 : _txn$assetTransfer$re3.toString()) !== sender) return {
        valid: false,
        error: 'Asset transfer receiver is not the user'
      };
    } else {
      return {
        valid: false,
        error: "Unexpected transaction type in claim group: " + txn.type
      };
    }
  }
  if (!foundAppCall) return {
    valid: false,
    error: 'No app call found in claim group'
  };
  return {
    valid: true
  };
}
function validateCloseOutTxn(txnGroup, _ref5) {
  var sender = _ref5.sender,
    appId = _ref5.appId;
  if (!(txnGroup != null && txnGroup.length)) return {
    valid: false,
    error: 'Empty transaction group'
  };
  if (txnGroup.length > 2) return {
    valid: false,
    error: "Close-out has too many transactions: " + txnGroup.length
  };
  var safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;
  if (sender) {
    for (var i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return {
        valid: false,
        error: "Transaction " + i + " has unexpected sender"
      };
    }
  }
  var foundAppCall = false;
  for (var _i4 = 0; _i4 < txnGroup.length; _i4++) {
    var txn = txnGroup[_i4];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return {
      valid: false,
      error: "Transaction " + _i4 + " fee is too high"
    };
    if (txn.type === 'appl' && txn.applicationCall) {
      if (foundAppCall) return {
        valid: false,
        error: 'Close-out should have only one app call'
      };
      foundAppCall = true;
      if (appId && Number(txn.applicationCall.appIndex) !== appId) return {
        valid: false,
        error: "App call targets wrong vault"
      };
      if (txn.applicationCall.onComplete !== 2) return {
        valid: false,
        error: 'Close-out app call should have CloseOut on-complete'
      };
    } else if (txn.type === 'axfer' && txn.assetTransfer) {
      var _txn$assetTransfer$re4;
      if (Number(txn.assetTransfer.amount) !== 0) return {
        valid: false,
        error: 'Unexpected asset transfer in close-out group'
      };
      if (sender && ((_txn$assetTransfer$re4 = txn.assetTransfer.receiver) == null ? void 0 : _txn$assetTransfer$re4.toString()) !== sender) return {
        valid: false,
        error: 'Asset transfer receiver is not the user'
      };
    } else {
      return {
        valid: false,
        error: "Unexpected transaction type in close-out group: " + txn.type
      };
    }
  }
  if (!foundAppCall) return {
    valid: false,
    error: 'No app call found in close-out group'
  };
  return {
    valid: true
  };
}
function validateSwitchPoolTxn(txnGroup, _ref6) {
  var sender = _ref6.sender,
    fromAppId = _ref6.fromAppId,
    toAppId = _ref6.toAppId;
  if (!txnGroup || txnGroup.length < 3) return {
    valid: false,
    error: 'Switch pool requires at least 3 transactions'
  };
  if (txnGroup.length > 6) return {
    valid: false,
    error: "Switch pool has too many transactions: " + txnGroup.length
  };
  var safety = validateSafety(txnGroup);
  if (!safety.valid) return safety;
  if (sender) {
    for (var i = 0; i < txnGroup.length; i++) {
      if (getSender(txnGroup[i]) !== sender) return {
        valid: false,
        error: "Transaction " + i + " has unexpected sender"
      };
    }
  }
  var referencedAppIds = new Set();
  var hasAxfer = false;
  for (var _i5 = 0; _i5 < txnGroup.length; _i5++) {
    var txn = txnGroup[_i5];
    if (txn.fee !== undefined && Number(txn.fee) > MAX_TXN_FEE_UALGOS) return {
      valid: false,
      error: "Transaction " + _i5 + " fee is too high"
    };
    if (txn.type === 'appl' && txn.applicationCall) {
      var callAppId = Number(txn.applicationCall.appIndex);
      referencedAppIds.add(callAppId);
      if (fromAppId && toAppId && callAppId !== 0 && callAppId !== fromAppId && callAppId !== toAppId) {
        return {
          valid: false,
          error: "App call targets unexpected app: " + callAppId
        };
      }
    } else if (txn.type === 'axfer') {
      hasAxfer = true;
    } else {
      return {
        valid: false,
        error: "Unexpected transaction type in switch group: " + txn.type
      };
    }
  }
  if (referencedAppIds.size < 2) return {
    valid: false,
    error: 'Switch vault should reference at least 2 different apps'
  };
  if (!hasAxfer) return {
    valid: false,
    error: 'Switch vault should include an asset transfer'
  };
  return {
    valid: true
  };
}

function _catch$1(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
var EXPLORER_URL = 'https://explorer.perawallet.app';
var INDEXER_URL = 'https://mainnet-idx.algonode.cloud';

// ── Asset avatar ──────────────────────────────────────────────────────────────
function AssetAvatar(_ref) {
  var name = _ref.name,
    imageUrl = _ref.imageUrl,
    _ref$size = _ref.size,
    size = _ref$size === void 0 ? 28 : _ref$size;
  var _useState = useState(false),
    err = _useState[0],
    setErr = _useState[1];
  if (imageUrl && !err) {
    return /*#__PURE__*/React.createElement("img", {
      src: imageUrl,
      alt: name,
      onError: function onError() {
        return setErr(true);
      },
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
function Spinner(_ref2) {
  var _ref2$size = _ref2.size,
    size = _ref2$size === void 0 ? 20 : _ref2$size;
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
function TxStatus(_ref3) {
  var step = _ref3.step,
    txId = _ref3.txId,
    label = _ref3.label,
    onDone = _ref3.onDone;
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
      href: EXPLORER_URL + "/tx/" + txId,
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
  var _useState2 = useState(null),
    balance = _useState2[0],
    setBalance = _useState2[1];
  useEffect(function () {
    if (!userAddress || !assetId) return;
    fetch(INDEXER_URL + "/v2/accounts/" + userAddress).then(function (r) {
      return r.json();
    }).then(function (data) {
      var _data$account, _found$amount;
      var assets = ((_data$account = data.account) == null ? void 0 : _data$account.assets) || [];
      var found = assets.find(function (a) {
        return a['asset-id'] === assetId;
      });
      setBalance((_found$amount = found == null ? void 0 : found.amount) != null ? _found$amount : 0);
    })["catch"](function () {
      return setBalance(null);
    });
  }, [userAddress, assetId]);
  return balance;
}

// ── Deposit panel ─────────────────────────────────────────────────────────────
function DepositPanel(_ref4) {
  var pools = _ref4.pools,
    userAddress = _ref4.userAddress,
    signTransactions = _ref4.signTransactions,
    apiUrl = _ref4.apiUrl,
    assetName = _ref4.assetName,
    onBack = _ref4.onBack,
    onSuccess = _ref4.onSuccess;
  var _useState3 = useState(pools[0] || null),
    selectedPool = _useState3[0],
    setSelectedPool = _useState3[1];
  var _useState4 = useState(''),
    amount = _useState4[0],
    setAmount = _useState4[1];
  var _useState5 = useState(null),
    isOptedIn = _useState5[0],
    setIsOptedIn = _useState5[1];
  var _useState6 = useState('input'),
    step = _useState6[0],
    setStep = _useState6[1];
  var _useState7 = useState(''),
    txId = _useState7[0],
    setTxId = _useState7[1];
  var _useState8 = useState(''),
    error = _useState8[0],
    setError = _useState8[1];
  var walletBalance = useWalletBalance(userAddress, selectedPool == null ? void 0 : selectedPool.depositAssetId);
  useEffect(function () {
    if (!selectedPool || !userAddress) {
      setIsOptedIn(false);
      return;
    }
    setIsOptedIn(null);
    axios.get(apiUrl + "/pools/" + selectedPool.id + "/position/" + userAddress).then(function (r) {
      var _r$data$position;
      return setIsOptedIn(((_r$data$position = r.data.position) == null ? void 0 : _r$data$position.isOptedIn) || false);
    })["catch"](function () {
      return setIsOptedIn(false);
    });
  }, [selectedPool == null ? void 0 : selectedPool.id, userAddress, apiUrl]);
  var handleOptIn = function handleOptIn() {
    try {
      setStep('signing');
      setError('');
      return Promise.resolve(_catch$1(function () {
        return Promise.resolve(axios.post(apiUrl + "/pools/" + selectedPool.id + "/opt-in", {
          userAddress: userAddress
        })).then(function (res) {
          var b64Txns = res.data.transactions;
          var txnGroup = decodeTxns(b64Txns);
          var validation = validateOptInTxn(txnGroup, {
            sender: userAddress,
            appId: selectedPool.appId
          });
          if (!validation.valid) {
            setError(validation.error);
            setStep('input');
            return;
          }
          return Promise.resolve(signAndSubmit(b64Txns, signTransactions, apiUrl)).then(function () {
            setIsOptedIn(true);
            setStep('input');
          });
        });
      }, function (err) {
        var _err$response;
        setError(((_err$response = err.response) == null || (_err$response = _err$response.data) == null ? void 0 : _err$response.error) || err.message || 'Opt-in failed');
        setStep('input');
      }));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  var handleDeposit = function handleDeposit(e) {
    try {
      e.preventDefault();
      var units = parseTokenAmount(amount);
      if (units <= 0) {
        setError('Enter a valid amount');
        return Promise.resolve();
      }
      if (units < 1000000) {
        setError('Minimum deposit is 1 ' + assetName);
        return Promise.resolve();
      }
      if (walletBalance !== null && units > walletBalance) {
        setError('Insufficient balance');
        return Promise.resolve();
      }
      setStep('signing');
      setError('');
      return Promise.resolve(_catch$1(function () {
        return Promise.resolve(axios.post(apiUrl + "/pools/" + selectedPool.id + "/deposit", {
          userAddress: userAddress,
          amount: units
        })).then(function (res) {
          var b64Txns = res.data.transactions;
          var txnGroup = decodeTxns(b64Txns);
          var validation = validateDepositTxn(txnGroup, {
            sender: userAddress,
            appId: selectedPool.appId,
            appAddress: selectedPool.appAddress,
            amount: units,
            depositAssetId: selectedPool.depositAssetId
          });
          if (!validation.valid) {
            setError(validation.error);
            setStep('input');
            return;
          }
          return Promise.resolve(signAndSubmit(b64Txns, signTransactions, apiUrl)).then(function (id) {
            setTxId(id);
            setStep('success');
          });
        });
      }, function (err) {
        var _err$response2;
        setError(((_err$response2 = err.response) == null || (_err$response2 = _err$response2.data) == null ? void 0 : _err$response2.error) || err.message || 'Deposit failed');
        setStep('input');
      }));
    } catch (e) {
      return Promise.reject(e);
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
  }, pools.map(function (p) {
    var isCompound = p.poolType === 'compound';
    var yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
      onClick: function onClick() {
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
    onChange: function onChange(e) {
      return setAmount(e.target.value);
    },
    step: "0.01",
    min: "0"
  }), walletBalance !== null && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: function onClick() {
      return setAmount(formatMaxAmount(walletBalance));
    }
  }, "MAX"))), error && /*#__PURE__*/React.createElement("p", {
    className: "rfw-error"
  }, error), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "rfw-btn rfw-btn-primary rfw-btn-full",
    disabled: !amount || parseFloat(amount) <= 0
  }, "Deposit ", assetName)));
}

// ── Withdraw panel ────────────────────────────────────────────────────────────
function WithdrawPanel(_ref5) {
  var _positions$selectedPo, _positions$selectedPo2;
  var pools = _ref5.pools,
    positions = _ref5.positions,
    userAddress = _ref5.userAddress,
    signTransactions = _ref5.signTransactions,
    apiUrl = _ref5.apiUrl,
    assetName = _ref5.assetName,
    onBack = _ref5.onBack,
    onSuccess = _ref5.onSuccess;
  var poolsWithDeposits = pools.filter(function (p) {
    var _positions$p$id;
    return (((_positions$p$id = positions[p.id]) == null ? void 0 : _positions$p$id.depositedAmount) || 0) > 0;
  });
  var _useState9 = useState(poolsWithDeposits[0] || null),
    selectedPool = _useState9[0],
    setSelectedPool = _useState9[1];
  var _useState0 = useState(''),
    amount = _useState0[0],
    setAmount = _useState0[1];
  var _useState1 = useState('input'),
    step = _useState1[0],
    setStep = _useState1[1];
  var _useState10 = useState(''),
    txId = _useState10[0],
    setTxId = _useState10[1];
  var _useState11 = useState(''),
    error = _useState11[0],
    setError = _useState11[1];
  var deposited = selectedPool ? ((_positions$selectedPo = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo.depositedAmount) || 0 : 0;
  var pendingYield = selectedPool ? ((_positions$selectedPo2 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo2.pendingYield) || 0 : 0;
  var handleWithdraw = function handleWithdraw(e) {
    try {
      e.preventDefault();
      var units = parseTokenAmount(amount);
      if (units <= 0) {
        setError('Enter a valid amount');
        return Promise.resolve();
      }
      if (units > deposited) {
        setError('Exceeds deposited balance');
        return Promise.resolve();
      }
      setStep('signing');
      setError('');
      return Promise.resolve(_catch$1(function () {
        return Promise.resolve(axios.post(apiUrl + "/pools/" + selectedPool.id + "/withdraw", {
          userAddress: userAddress,
          amount: units
        })).then(function (res) {
          var b64Txns = res.data.transactions;
          var txnGroup = decodeTxns(b64Txns);
          var validation = validateWithdrawTxn(txnGroup, {
            sender: userAddress,
            appId: selectedPool.appId
          });
          if (!validation.valid) {
            setError(validation.error);
            setStep('input');
            return;
          }
          return Promise.resolve(signAndSubmit(b64Txns, signTransactions, apiUrl)).then(function (id) {
            setTxId(id);
            setStep('success');
          });
        });
      }, function (err) {
        var _err$response3;
        setError(((_err$response3 = err.response) == null || (_err$response3 = _err$response3.data) == null ? void 0 : _err$response3.error) || err.message || 'Withdraw failed');
        setStep('input');
      }));
    } catch (e) {
      return Promise.reject(e);
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
  }, poolsWithDeposits.map(function (p) {
    var _positions$p$id2;
    var isCompound = p.poolType === 'compound';
    var yieldAsset = isCompound ? assetName : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
      onClick: function onClick() {
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
    onChange: function onChange(e) {
      return setAmount(e.target.value);
    },
    step: "0.01",
    min: "0"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: function onClick() {
      return setAmount(formatMaxAmount(deposited));
    }
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
function ClaimPanel(_ref6) {
  var _positions$selectedPo3;
  var pools = _ref6.pools,
    positions = _ref6.positions,
    userAddress = _ref6.userAddress,
    signTransactions = _ref6.signTransactions,
    apiUrl = _ref6.apiUrl,
    onBack = _ref6.onBack,
    onSuccess = _ref6.onSuccess;
  var poolsWithYield = pools.filter(function (p) {
    var _positions$p$id3;
    return (((_positions$p$id3 = positions[p.id]) == null ? void 0 : _positions$p$id3.pendingYield) || 0) > 0;
  });
  var _useState12 = useState(poolsWithYield[0] || null),
    selectedPool = _useState12[0],
    setSelectedPool = _useState12[1];
  var _useState13 = useState('confirm'),
    step = _useState13[0],
    setStep = _useState13[1];
  var _useState14 = useState(''),
    txId = _useState14[0],
    setTxId = _useState14[1];
  var _useState15 = useState(''),
    error = _useState15[0],
    setError = _useState15[1];
  var pending = selectedPool ? ((_positions$selectedPo3 = positions[selectedPool.id]) == null ? void 0 : _positions$selectedPo3.pendingYield) || 0 : 0;
  var yieldAsset = (selectedPool == null ? void 0 : selectedPool.swapAssetName) || 'ASA';
  var handleClaim = function handleClaim() {
    try {
      setStep('signing');
      setError('');
      return Promise.resolve(_catch$1(function () {
        return Promise.resolve(axios.post(apiUrl + "/pools/" + selectedPool.id + "/claim", {
          userAddress: userAddress
        })).then(function (res) {
          var b64Txns = res.data.transactions;
          var txnGroup = decodeTxns(b64Txns);
          var validation = validateClaimTxn(txnGroup, {
            sender: userAddress,
            appId: selectedPool.appId
          });
          if (!validation.valid) {
            setError(validation.error);
            setStep('confirm');
            return;
          }
          return Promise.resolve(signAndSubmit(b64Txns, signTransactions, apiUrl)).then(function (id) {
            setTxId(id);
            setStep('success');
          });
        });
      }, function (err) {
        var _err$response4;
        setError(((_err$response4 = err.response) == null || (_err$response4 = _err$response4.data) == null ? void 0 : _err$response4.error) || err.message || 'Claim failed');
        setStep('confirm');
      }));
    } catch (e) {
      return Promise.reject(e);
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
  }, poolsWithYield.map(function (p) {
    var _positions$p$id4;
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
      onClick: function onClick() {
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
function SwitchPanel(_ref7) {
  var _positions$fromPool$i;
  var pools = _ref7.pools,
    positions = _ref7.positions,
    userAddress = _ref7.userAddress,
    signTransactions = _ref7.signTransactions,
    apiUrl = _ref7.apiUrl,
    assetName = _ref7.assetName,
    onBack = _ref7.onBack,
    onSuccess = _ref7.onSuccess;
  var poolsWithDeposits = pools.filter(function (p) {
    var _positions$p$id5;
    return (((_positions$p$id5 = positions[p.id]) == null ? void 0 : _positions$p$id5.depositedAmount) || 0) > 0;
  });
  var _useState16 = useState(poolsWithDeposits[0] || null),
    fromPool = _useState16[0],
    setFromPool = _useState16[1];
  var _useState17 = useState(null),
    toPool = _useState17[0],
    setToPool = _useState17[1];
  var _useState18 = useState(''),
    amount = _useState18[0],
    setAmount = _useState18[1];
  var _useState19 = useState('select'),
    step = _useState19[0],
    setStep = _useState19[1];
  var _useState20 = useState(''),
    txId = _useState20[0],
    setTxId = _useState20[1];
  var _useState21 = useState(''),
    error = _useState21[0],
    setError = _useState21[1];
  var availableTargets = pools.filter(function (p) {
    return p.id !== (fromPool == null ? void 0 : fromPool.id);
  });
  var deposited = fromPool ? ((_positions$fromPool$i = positions[fromPool.id]) == null ? void 0 : _positions$fromPool$i.depositedAmount) || 0 : 0;
  var handleSwitch = function handleSwitch() {
    try {
      if (!fromPool || !toPool) {
        setError('Select source and target vault');
        return Promise.resolve();
      }
      var units = parseTokenAmount(amount);
      if (units <= 0) {
        setError('Enter a valid amount');
        return Promise.resolve();
      }
      if (units > deposited) {
        setError('Exceeds deposited balance');
        return Promise.resolve();
      }
      setStep('signing');
      setError('');
      return Promise.resolve(_catch$1(function () {
        return Promise.resolve(axios.post(apiUrl + "/pools/switch-pool", {
          userAddress: userAddress,
          fromPoolId: fromPool.id,
          toPoolId: toPool.id,
          amount: units
        })).then(function (res) {
          var b64Txns = res.data.transactions;
          var txnGroup = decodeTxns(b64Txns);
          var validation = validateSwitchPoolTxn(txnGroup, {
            sender: userAddress,
            fromAppId: fromPool.appId,
            toAppId: toPool.appId
          });
          if (!validation.valid) {
            setError(validation.error);
            setStep('select');
            return;
          }
          return Promise.resolve(signAndSubmit(b64Txns, signTransactions, apiUrl)).then(function (id) {
            setTxId(id);
            setStep('success');
          });
        });
      }, function (err) {
        var _err$response5;
        setError(((_err$response5 = err.response) == null || (_err$response5 = _err$response5.data) == null ? void 0 : _err$response5.error) || err.message || 'Switch failed');
        setStep('select');
      }));
    } catch (e) {
      return Promise.reject(e);
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
  }, poolsWithDeposits.map(function (p) {
    var _positions$p$id6;
    var isCompound = p.poolType === 'compound';
    var label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "rfw-vault-btn " + ((fromPool == null ? void 0 : fromPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
      onClick: function onClick() {
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
  }, availableTargets.map(function (p) {
    var isCompound = p.poolType === 'compound';
    var label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "rfw-vault-btn " + ((toPool == null ? void 0 : toPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
      onClick: function onClick() {
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
    onChange: function onChange(e) {
      return setAmount(e.target.value);
    },
    step: "0.01",
    min: "0"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "rfw-max-btn",
    onClick: function onClick() {
      return setAmount(formatMaxAmount(deposited));
    }
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
function ExitPanel(_ref8) {
  var pools = _ref8.pools,
    positions = _ref8.positions,
    userAddress = _ref8.userAddress,
    signTransactions = _ref8.signTransactions,
    apiUrl = _ref8.apiUrl,
    assetName = _ref8.assetName,
    onBack = _ref8.onBack,
    onSuccess = _ref8.onSuccess;
  var poolsWithPosition = pools.filter(function (p) {
    var pos = positions[p.id];
    return ((pos == null ? void 0 : pos.depositedAmount) || 0) > 0 || ((pos == null ? void 0 : pos.pendingYield) || 0) > 0;
  });
  var _useState22 = useState(poolsWithPosition[0] || null),
    selectedPool = _useState22[0],
    setSelectedPool = _useState22[1];
  var _useState23 = useState('confirm'),
    step = _useState23[0],
    setStep = _useState23[1];
  var _useState24 = useState(''),
    txId = _useState24[0],
    setTxId = _useState24[1];
  var _useState25 = useState(''),
    error = _useState25[0],
    setError = _useState25[1];
  var pos = selectedPool ? positions[selectedPool.id] : null;
  var handleExit = function handleExit() {
    try {
      setStep('signing');
      setError('');
      return Promise.resolve(_catch$1(function () {
        return Promise.resolve(axios.post(apiUrl + "/pools/" + selectedPool.id + "/close-out", {
          userAddress: userAddress
        })).then(function (res) {
          var b64Txns = res.data.transactions;
          var txnGroup = decodeTxns(b64Txns);
          var validation = validateCloseOutTxn(txnGroup, {
            sender: userAddress,
            appId: selectedPool.appId
          });
          if (!validation.valid) {
            setError(validation.error);
            setStep('confirm');
            return;
          }
          return Promise.resolve(signAndSubmit(b64Txns, signTransactions, apiUrl)).then(function (id) {
            setTxId(id);
            setStep('success');
          });
        });
      }, function (err) {
        var _err$response6;
        setError(((_err$response6 = err.response) == null || (_err$response6 = _err$response6.data) == null ? void 0 : _err$response6.error) || err.message || 'Exit failed');
        setStep('confirm');
      }));
    } catch (e) {
      return Promise.reject(e);
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
  }, poolsWithPosition.map(function (p) {
    var isCompound = p.poolType === 'compound';
    var label = isCompound ? assetName + ' (auto)' : p.swapAssetName || 'ASA';
    return /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "rfw-vault-btn " + ((selectedPool == null ? void 0 : selectedPool.id) === p.id ? 'rfw-vault-btn--selected' : ''),
      onClick: function onClick() {
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
var TX_CONFIG = {
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
function ActivityPanel(_ref9) {
  var transactions = _ref9.transactions,
    assetName = _ref9.assetName,
    onBack = _ref9.onBack;
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
  }, transactions.map(function (tx) {
    var _tx$pool, _tx$pool2;
    var cfg = TX_CONFIG[tx.type] || {
      label: 'Transaction',
      color: '#6b7280',
      bg: '#f9fafb'
    };
    var poolLabel = ((_tx$pool = tx.pool) == null ? void 0 : _tx$pool.poolType) === 'compound' ? assetName + ' Vault (auto)' : (((_tx$pool2 = tx.pool) == null ? void 0 : _tx$pool2.swapAssetName) || 'ASA') + " Vault";
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
      href: EXPLORER_URL + "/tx/" + tx.id,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "rfw-explorer-link"
    }, "\u2197"))));
  })));
}

// ── Yield history panel ───────────────────────────────────────────────────────
function YieldHistoryPanel(_ref0) {
  var userAddress = _ref0.userAddress,
    apiUrl = _ref0.apiUrl,
    assetName = _ref0.assetName,
    onBack = _ref0.onBack;
  var _useState26 = useState(true),
    loading = _useState26[0],
    setLoading = _useState26[1];
  var _useState27 = useState([]),
    history = _useState27[0],
    setHistory = _useState27[1];
  var _useState28 = useState(null),
    error = _useState28[0],
    setError = _useState28[1];
  useEffect(function () {
    if (!userAddress) return;
    setLoading(true);
    axios.get(apiUrl + "/pools/yield-history/" + userAddress).then(function (r) {
      var filtered = (r.data.yieldHistory || []).filter(function (item) {
        return item.poolType === 'compound' || item.yieldAsset;
      });
      setHistory(filtered);
    })["catch"](function () {
      return setError('Failed to load yield history');
    })["finally"](function () {
      return setLoading(false);
    });
  }, [userAddress, apiUrl]);
  var totalByToken = {};
  history.forEach(function (item) {
    var token = item.poolType === 'compound' ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
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
  }, Object.entries(totalByToken).map(function (_ref1) {
    var token = _ref1[0],
      amt = _ref1[1];
    return /*#__PURE__*/React.createElement("div", {
      key: token,
      className: "rfw-yield-total-row"
    }, /*#__PURE__*/React.createElement("span", null, token), /*#__PURE__*/React.createElement("span", {
      className: "rfw-positive"
    }, "+", formatTokenAmount(amt)));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "rfw-yield-list"
  }, history.map(function (item, i) {
    var _item$swapDays;
    var isCompound = item.poolType === 'compound';
    var yieldToken = isCompound ? assetName : item.yieldAsset || item.swapAssetName || 'ASA';
    var vaultLabel = isCompound ? assetName + ' Vault (auto-compound)' : yieldToken + ' Vault';
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
function HomeView(_ref10) {
  var pools = _ref10.pools,
    positions = _ref10.positions,
    positionsLoading = _ref10.positionsLoading,
    assetName = _ref10.assetName,
    onAction = _ref10.onAction;
  var totalDeposit = Object.values(positions).reduce(function (s, p) {
    return s + (p.depositedAmount || 0);
  }, 0);
  var hasDeposit = totalDeposit > 0;
  var pendingByToken = {};
  pools.forEach(function (pool) {
    var pos = positions[pool.id];
    if ((pos == null ? void 0 : pos.pendingYield) > 0) {
      var token = pool.swapAssetName || 'ASA';
      pendingByToken[token] = (pendingByToken[token] || 0) + pos.pendingYield;
    }
  });
  var hasPendingYield = Object.keys(pendingByToken).length > 0;
  var activeVaults = pools.filter(function (p) {
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
  }, hasPendingYield ? Object.entries(pendingByToken).map(function (_ref11) {
    var t = _ref11[0],
      a = _ref11[1];
    return "+" + formatTokenAmount(a) + " " + t;
  }).join(' · ') : '—')), activeVaults.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rfw-pos-vaults"
  }, activeVaults.map(function (p) {
    var isCompound = p.poolType === 'compound';
    var label = isCompound ? assetName + ' (auto)' : (p.swapAssetName || 'ASA') + ' Vault';
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
    onClick: function onClick() {
      return onAction('deposit');
    }
  }, "Deposit"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-secondary",
    onClick: function onClick() {
      return onAction('withdraw');
    },
    disabled: !hasDeposit
  }, "Withdraw"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-success",
    onClick: function onClick() {
      return onAction('claim');
    },
    disabled: !hasPendingYield
  }, "Claim Yield")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-actions-secondary"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-outline",
    onClick: function onClick() {
      return onAction('switch');
    },
    disabled: !hasDeposit || pools.length <= 1
  }, "Switch Vault"), /*#__PURE__*/React.createElement("button", {
    className: "rfw-btn rfw-btn-danger-outline",
    onClick: function onClick() {
      return onAction('exit');
    },
    disabled: !hasDeposit && !hasPendingYield
  }, "Exit")), /*#__PURE__*/React.createElement("div", {
    className: "rfw-history-links"
  }, /*#__PURE__*/React.createElement("button", {
    className: "rfw-history-link",
    onClick: function onClick() {
      return onAction('activity');
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB"), " Activity"), /*#__PURE__*/React.createElement("div", {
    className: "rfw-history-divider"
  }), /*#__PURE__*/React.createElement("button", {
    className: "rfw-history-link",
    onClick: function onClick() {
      return onAction('yieldHistory');
    }
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC8"), " Yield History")));
}

// ── Main modal ────────────────────────────────────────────────────────────────
function WidgetModal(_ref12) {
  var open = _ref12.open,
    onClose = _ref12.onClose,
    pools = _ref12.pools,
    positions = _ref12.positions,
    transactions = _ref12.transactions,
    loading = _ref12.loading,
    positionsLoading = _ref12.positionsLoading,
    onRefresh = _ref12.onRefresh,
    userAddress = _ref12.userAddress,
    signTransactions = _ref12.signTransactions,
    apiUrl = _ref12.apiUrl,
    asset = _ref12.asset,
    assetImageUrl = _ref12.assetImageUrl;
  var _useState29 = useState('home'),
    view = _useState29[0],
    setView = _useState29[1];
  if (!open) return null;
  var goHome = function goHome() {
    setView('home');
    onRefresh();
  };
  var common = {
    pools: pools,
    positions: positions,
    userAddress: userAddress,
    signTransactions: signTransactions,
    apiUrl: apiUrl,
    assetName: asset,
    onBack: function onBack() {
      return setView('home');
    },
    onSuccess: goHome
  };
  var renderView = function renderView() {
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
          onBack: function onBack() {
            return setView('home');
          }
        });
      case 'yieldHistory':
        return /*#__PURE__*/React.createElement(YieldHistoryPanel, {
          userAddress: userAddress,
          apiUrl: apiUrl,
          assetName: asset,
          onBack: function onBack() {
            return setView('home');
          }
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
    onClick: function onClick(e) {
      return e.stopPropagation();
    }
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

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
function useWidgetData(_ref) {
  var asset = _ref.asset,
    userAddress = _ref.userAddress,
    apiUrl = _ref.apiUrl;
  var _useState = useState([]),
    pools = _useState[0],
    setPools = _useState[1];
  var _useState2 = useState({}),
    positions = _useState2[0],
    setPositions = _useState2[1];
  var _useState3 = useState([]),
    transactions = _useState3[0],
    setTransactions = _useState3[1];
  var _useState4 = useState(true),
    loading = _useState4[0],
    setLoading = _useState4[1];
  var _useState5 = useState(false),
    positionsLoading = _useState5[0],
    setPositionsLoading = _useState5[1];
  var fetchPools = useCallback(function () {
    return Promise.resolve(_catch(function () {
      return Promise.resolve(axios.get(apiUrl + "/pools")).then(function (res) {
        var all = res.data.pools || [];
        return all.filter(function (p) {
          return (p.depositAssetName || 'ALPHA') === asset;
        });
      });
    }, function () {
      return [];
    }));
  }, [asset, apiUrl]);
  var fetchPositions = useCallback(function (poolList, address) {
    try {
      if (!address || poolList.length === 0) return Promise.resolve({});
      var result = {};
      return Promise.resolve(Promise.all(poolList.map(function (pool) {
        try {
          var _temp = _catch(function () {
            return Promise.resolve(axios.get(apiUrl + "/pools/" + pool.id + "/position/" + address)).then(function (res) {
              if (res.data.position) result[pool.id] = res.data.position;
            });
          }, function () {});
          return Promise.resolve(_temp && _temp.then ? _temp.then(function () {}) : void 0);
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        return result;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }, [apiUrl]);
  var fetchTransactions = useCallback(function (address) {
    return address ? Promise.resolve(_catch(function () {
      return Promise.resolve(axios.get(apiUrl + "/pools/transactions/" + address)).then(function (res) {
        return res.data.transactions || [];
      });
    }, function () {
      return [];
    })) : Promise.resolve([]);
  }, [apiUrl]);
  var refresh = useCallback(function () {
    try {
      setLoading(true);
      return Promise.resolve(fetchPools()).then(function (poolList) {
        setPools(poolList);
        setPositionsLoading(true);
        return Promise.resolve(Promise.all([fetchPositions(poolList, userAddress), fetchTransactions(userAddress)])).then(function (_ref2) {
          var pos = _ref2[0],
            txns = _ref2[1];
          setPositions(pos);
          setTransactions(txns);
          setPositionsLoading(false);
          setLoading(false);
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }, [fetchPools, fetchPositions, fetchTransactions, userAddress]);
  useEffect(function () {
    refresh();
  }, [refresh]);
  return {
    pools: pools,
    positions: positions,
    transactions: transactions,
    loading: loading,
    positionsLoading: positionsLoading,
    refresh: refresh
  };
}

var CSS = "\n@keyframes rfw-spin { to { transform: rotate(360deg); } }\n@keyframes rfw-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }\n\n/* Trigger */\n.rfw-trigger-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; font-family: inherit; letter-spacing: 0.01em; }\n.rfw-trigger-btn:hover:not(:disabled) { opacity: 0.82; }\n.rfw-trigger-btn:disabled { opacity: 0.35; cursor: not-allowed; }\n.rfw-trigger-icon { font-size: 14px; }\n\n/* Overlay */\n.rfw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9998; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(2px); }\n\n/* Modal */\n.rfw-modal { background: #fff; border-radius: 18px; width: 100%; max-width: 380px; box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.07); animation: rfw-fadein 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }\n\n/* Header */\n.rfw-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }\n.rfw-modal-title { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: #111; }\n.rfw-modal-header-right { display: flex; align-items: center; gap: 10px; }\n.rfw-powered { font-size: 10px; color: #c4c4c4; text-decoration: none; transition: color 0.15s; letter-spacing: 0.02em; }\n.rfw-powered:hover { color: #888; }\n.rfw-close { background: none; border: none; font-size: 22px; line-height: 1; cursor: pointer; color: #c4c4c4; padding: 0 2px; transition: color 0.15s; }\n.rfw-close:hover { color: #111; }\n\n/* Body */\n.rfw-modal-body { padding: 16px; max-height: 540px; overflow-y: auto; }\n.rfw-loading { display: flex; align-items: center; gap: 10px; padding: 32px 0; color: #9ca3af; font-size: 13px; justify-content: center; }\n\n/* Position card */\n.rfw-pos-card { background: #111; border-radius: 12px; padding: 16px; margin-bottom: 14px; }\n.rfw-pos-row { display: flex; justify-content: space-between; align-items: center; }\n.rfw-pos-label { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; }\n.rfw-pos-value { font-size: 15px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }\n.rfw-pos-asset { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.6); margin-left: 2px; }\n.rfw-pos-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 10px 0; }\n.rfw-pos-vaults { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }\n.rfw-vault-tag { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; }\n.rfw-positive { color: #4ade80 !important; }\n.rfw-pending { color: #fbbf24 !important; }\n.rfw-no-position { text-align: center; padding: 8px 0; }\n.rfw-no-position-icon { font-size: 28px; margin-bottom: 6px; opacity: 0.3; color: #fff; }\n.rfw-no-position p { color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; margin: 0 0 3px; }\n.rfw-no-position span { color: rgba(255,255,255,0.35); font-size: 11px; }\n\n/* Actions */\n.rfw-actions-primary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; margin-bottom: 7px; }\n.rfw-actions-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 12px; }\n\n/* Buttons */\n.rfw-btn { border: none; border-radius: 9px; padding: 9px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; text-align: center; white-space: nowrap; letter-spacing: 0.01em; }\n.rfw-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }\n.rfw-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }\n.rfw-btn-full { width: 100%; padding: 11px; font-size: 13px; }\n.rfw-btn-primary { background: #111; color: #fff; }\n.rfw-btn-secondary { background: #f0f0f0; color: #111; }\n.rfw-btn-success { background: #16a34a; color: #fff; }\n.rfw-btn-outline { background: transparent; color: #111; border: 1.5px solid #e0e0e0; }\n.rfw-btn-danger { background: #dc2626; color: #fff; }\n.rfw-btn-danger-outline { background: transparent; color: #dc2626; border: 1.5px solid #fca5a5; }\n\n/* History links */\n.rfw-history-links { display: flex; align-items: center; border: 1.5px solid #f0f0f0; border-radius: 10px; overflow: hidden; }\n.rfw-history-link { flex: 1; background: none; border: none; padding: 9px 12px; font-size: 12px; font-weight: 600; color: #6b7280; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 5px; transition: background 0.15s, color 0.15s; }\n.rfw-history-link:hover { background: #f9fafb; color: #111; }\n.rfw-history-divider { width: 1px; height: 32px; background: #f0f0f0; }\n\n/* Panel */\n.rfw-panel { display: flex; flex-direction: column; }\n.rfw-back { background: #fff; border: none; font-size: 12px; color: #9ca3af; cursor: pointer; padding: 6px 0; margin-bottom: 14px; font-family: inherit; text-align: left; transition: color 0.15s; display: inline-flex; align-items: center; gap: 3px; position: sticky; top: 0; z-index: 10; }\n.rfw-back:hover { color: #111; }\n.rfw-panel-title { font-size: 15px; font-weight: 700; color: #111; margin: 0 0 16px; }\n.rfw-label { display: block; font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px; }\n\n/* Vault selector grid */\n.rfw-vault-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 16px; }\n.rfw-vault-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 14px; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 9px; cursor: pointer; transition: border-color 0.15s, background 0.15s; position: relative; font-family: inherit; min-width: 64px; }\n.rfw-vault-btn:hover { border-color: #9ca3af; background: #f3f4f6; }\n.rfw-vault-btn--selected { border-color: #111; background: #f0f0f0; }\n.rfw-vault-btn-label { font-size: 12px; font-weight: 700; color: #111; }\n.rfw-vault-btn-sub { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }\n.rfw-vault-btn-amount { font-size: 10px; color: #9ca3af; font-variant-numeric: tabular-nums; }\n.rfw-compound-badge { position: absolute; top: -5px; right: -5px; background: #6366f1; color: #fff; font-size: 9px; width: 15px; height: 15px; border-radius: 50%; display: flex; align-items: center; justify-content: center; line-height: 1; }\n\n/* Amount input block */\n.rfw-amount-block { margin-bottom: 12px; }\n.rfw-amount-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }\n.rfw-balance-hint { font-size: 11px; color: #9ca3af; }\n.rfw-balance-hint strong { color: #374151; }\n.rfw-input-row { display: flex; gap: 7px; }\n.rfw-input { flex: 1; padding: 10px 13px; border: 1.5px solid #e5e7eb; border-radius: 9px; font-size: 15px; font-family: inherit; color: #111; background: #fff; transition: border-color 0.15s; outline: none; }\n.rfw-input:focus { border-color: #111; }\n.rfw-max-btn { padding: 0 12px; background: #f0f0f0; border: none; border-radius: 7px; font-size: 11px; font-weight: 700; color: #111; cursor: pointer; font-family: inherit; letter-spacing: 0.03em; }\n.rfw-max-btn:hover { background: #e5e7eb; }\n\n/* Info & states */\n.rfw-info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 3px solid #111; border-radius: 7px; padding: 10px 12px; font-size: 12px; color: #374151; margin-bottom: 12px; line-height: 1.45; }\n.rfw-helper { font-size: 11px; color: #9ca3af; margin: 0 0 12px; }\n.rfw-muted { font-size: 13px; color: #9ca3af; margin: 0 0 12px; }\n.rfw-error { font-size: 12px; color: #dc2626; background: #fef2f2; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }\n.rfw-warning { font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 7px; padding: 9px 11px; margin: 0 0 11px; }\n.rfw-empty-state { text-align: center; padding: 32px 0; color: #9ca3af; font-size: 13px; line-height: 1.6; }\n\n/* Claim card */\n.rfw-claim-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-bottom: 14px; text-align: center; }\n.rfw-claim-card-label { font-size: 11px; color: #16a34a; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 6px; }\n.rfw-claim-card-amount { font-size: 26px; font-weight: 800; color: #15803d; font-variant-numeric: tabular-nums; }\n.rfw-claim-card-amount span { font-size: 14px; font-weight: 600; margin-left: 4px; }\n\n/* Exit summary */\n.rfw-exit-summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 13px 15px; margin-bottom: 12px; }\n.rfw-exit-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #374151; padding: 4px 0; }\n.rfw-exit-row-value { font-weight: 600; }\n\n/* Activity list */\n.rfw-activity-list { display: flex; flex-direction: column; gap: 8px; }\n.rfw-activity-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 11px 13px; background: #fff; }\n.rfw-activity-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-bottom: 6px; letter-spacing: 0.03em; }\n.rfw-activity-body {}\n.rfw-activity-main { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }\n.rfw-activity-pool { font-size: 13px; font-weight: 600; color: #111; }\n.rfw-activity-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }\n.rfw-activity-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9ca3af; }\n.rfw-explorer-link { color: #c4c4c4; text-decoration: none; transition: color 0.15s; font-size: 12px; }\n.rfw-explorer-link:hover { color: #111; }\n\n/* Yield history */\n.rfw-yield-totals { background: #111; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }\n.rfw-yield-totals-label { font-size: 10px; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-bottom: 8px; }\n.rfw-yield-totals-amounts {}\n.rfw-yield-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: #fff; padding: 2px 0; }\n.rfw-yield-list { display: flex; flex-direction: column; gap: 8px; }\n.rfw-yield-item { border: 1px solid #f0f0f0; border-radius: 10px; padding: 12px 14px; }\n.rfw-yield-item-header { margin-bottom: 10px; }\n.rfw-yield-item-vault { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #111; }\n.rfw-compound-dot { background: #6366f1; color: #fff; font-size: 9px; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }\n.rfw-yield-item-rows { display: flex; flex-direction: column; gap: 5px; }\n.rfw-yield-stat { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #374151; }\n.rfw-yield-stat-label { color: #9ca3af; }\n\n/* Tx status */\n.rfw-txstatus { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 16px; text-align: center; }\n.rfw-txstatus-title { font-size: 15px; font-weight: 700; color: #111; margin: 0; }\n.rfw-txstatus-sub { font-size: 12px; color: #9ca3af; margin: 0; }\n.rfw-txstatus-check { width: 48px; height: 48px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; }\n";
function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('rarefi-widget-styles')) return;
  var style = document.createElement('style');
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
function RareFiWidget(_ref) {
  var _ref$asset = _ref.asset,
    asset = _ref$asset === void 0 ? 'ALPHA' : _ref$asset,
    userAddress = _ref.userAddress,
    signTransactions = _ref.signTransactions,
    _ref$apiUrl = _ref.apiUrl,
    apiUrl = _ref$apiUrl === void 0 ? 'https://api.rarefi.app/api' : _ref$apiUrl,
    assetImageUrl = _ref.assetImageUrl,
    _ref$theme = _ref.theme,
    theme = _ref$theme === void 0 ? 'light' : _ref$theme,
    renderTrigger = _ref.renderTrigger;
  injectStyles();
  var _useState = useState(false),
    open = _useState[0],
    setOpen = _useState[1];
  var _useWidgetData = useWidgetData({
      asset: asset,
      userAddress: userAddress,
      apiUrl: apiUrl
    }),
    pools = _useWidgetData.pools,
    positions = _useWidgetData.positions,
    transactions = _useWidgetData.transactions,
    loading = _useWidgetData.loading,
    positionsLoading = _useWidgetData.positionsLoading,
    refresh = _useWidgetData.refresh;
  var handleOpen = function handleOpen() {
    if (!userAddress) {
      console.warn('[RareFiWidget] No userAddress provided — wallet not connected in host app.');
      return;
    }
    setOpen(true);
  };
  var trigger = renderTrigger ? renderTrigger({
    onClick: handleOpen
  }) : /*#__PURE__*/React.createElement("button", {
    className: "rfw-trigger-btn",
    "data-theme": theme,
    onClick: handleOpen,
    disabled: !userAddress,
    title: userAddress ? asset + " Vaults" : 'Connect wallet to use vaults'
  }, /*#__PURE__*/React.createElement("span", {
    className: "rfw-trigger-icon"
  }, "\u2B21"), /*#__PURE__*/React.createElement("span", {
    className: "rfw-trigger-label"
  }, asset, " Vaults"));
  return /*#__PURE__*/React.createElement(React.Fragment, null, trigger, /*#__PURE__*/React.createElement(WidgetModal, {
    open: open,
    onClose: function onClose() {
      return setOpen(false);
    },
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
//# sourceMappingURL=index.module.js.map
