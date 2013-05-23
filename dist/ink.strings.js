(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/node_modules/lodash/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"./dist/lodash.js"}
});

require.define("/node_modules/lodash/dist/lodash.js",function(require,module,exports,__dirname,__filename,process,global){/**
 * @license
 * Lo-Dash 1.2.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modern -o ./dist/lodash.js`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.4.4 <http://underscorejs.org/>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window) {

  /** Used as a safe reference for `undefined` in pre ES5 environments */
  var undefined;

  /** Detect free variable `exports` */
  var freeExports = typeof exports == 'object' && exports;

  /** Detect free variable `module` */
  var freeModule = typeof module == 'object' && module && module.exports == freeExports && module;

  /** Detect free variable `global`, from Node.js or Browserified code, and use it as `window` */
  var freeGlobal = typeof global == 'object' && global;
  if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
    window = freeGlobal;
  }

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used internally to indicate various things */
  var indicatorObject = {};

  /** Used to prefix keys to avoid issues with `__proto__` and properties on `Object.prototype` */
  var keyPrefix = +new Date + '';

  /** Used as the size when optimizations are enabled for large arrays */
  var largeArraySize = 200;

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match HTML entities */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g;

  /**
   * Used to match ES6 template delimiters
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-7.8.6
   */
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to match "interpolate" template delimiters */
  var reInterpolate = /<%=([\s\S]+?)%>/g;

  /** Used to detect and test whitespace */
  var whitespace = (
    // whitespace
    ' \t\x0B\f\xA0\ufeff' +

    // line terminators
    '\n\r\u2028\u2029' +

    // unicode category "Zs" space separators
    '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000'
  );

  /** Used to match leading whitespace and zeros to be removed */
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');

  /** Used to ensure capturing order of template delimiters */
  var reNoMatch = /($^)/;

  /** Used to match HTML characters */
  var reUnescapedHtml = /[&<>"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to assign default `context` object properties */
  var contextProps = [
    'Array', 'Boolean', 'Date', 'Function', 'Math', 'Number', 'Object', 'RegExp',
    'String', '_', 'attachEvent', 'clearTimeout', 'isFinite', 'isNaN', 'parseInt',
    'setImmediate', 'setTimeout'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] =
  cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] =
  cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Create a new `lodash` function using the given `context` object.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} [context=window] The context object.
   * @returns {Function} Returns the `lodash` function.
   */
  function runInContext(context) {
    // Avoid issues with some ES3 environments that attempt to use values, named
    // after built-in constructors like `Object`, for the creation of literals.
    // ES5 clears this up by stating that literals must use built-in constructors.
    // See http://es5.github.com/#x11.1.5.
    context = context ? _.defaults(window.Object(), context, _.pick(window, contextProps)) : window;

    /** Native constructor references */
    var Array = context.Array,
        Boolean = context.Boolean,
        Date = context.Date,
        Function = context.Function,
        Math = context.Math,
        Number = context.Number,
        Object = context.Object,
        RegExp = context.RegExp,
        String = context.String,
        TypeError = context.TypeError;

    /** Used for `Array` and `Object` method references */
    var arrayRef = Array(),
        objectRef = Object();

    /** Used to restore the original `_` reference in `noConflict` */
    var oldDash = context._;

    /** Used to detect if a method is native */
    var reNative = RegExp('^' +
      String(objectRef.valueOf)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
    );

    /** Native method shortcuts */
    var ceil = Math.ceil,
        clearTimeout = context.clearTimeout,
        concat = arrayRef.concat,
        floor = Math.floor,
        getPrototypeOf = reNative.test(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
        hasOwnProperty = objectRef.hasOwnProperty,
        push = arrayRef.push,
        setImmediate = context.setImmediate,
        setTimeout = context.setTimeout,
        toString = objectRef.toString;

    /* Native method shortcuts for methods with the same name as other `lodash` methods */
    var nativeBind = reNative.test(nativeBind = toString.bind) && nativeBind,
        nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
        nativeIsFinite = context.isFinite,
        nativeIsNaN = context.isNaN,
        nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys,
        nativeMax = Math.max,
        nativeMin = Math.min,
        nativeParseInt = context.parseInt,
        nativeRandom = Math.random,
        nativeSlice = arrayRef.slice;

    /** Detect various environments */
    var isIeOpera = reNative.test(context.attachEvent),
        isV8 = nativeBind && !/\n|true/.test(nativeBind + isIeOpera);

    /** Used to lookup a built-in constructor by [[Class]] */
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a `lodash` object, which wraps the given `value`, to enable method
     * chaining.
     *
     * In addition to Lo-Dash methods, wrappers also have the following `Array` methods:
     * `concat`, `join`, `pop`, `push`, `reverse`, `shift`, `slice`, `sort`, `splice`,
     * and `unshift`
     *
     * Chaining is supported in custom builds as long as the `value` method is
     * implicitly or explicitly included in the build.
     *
     * The chainable wrapper functions are:
     * `after`, `assign`, `bind`, `bindAll`, `bindKey`, `chain`, `compact`,
     * `compose`, `concat`, `countBy`, `createCallback`, `debounce`, `defaults`,
     * `defer`, `delay`, `difference`, `filter`, `flatten`, `forEach`, `forIn`,
     * `forOwn`, `functions`, `groupBy`, `initial`, `intersection`, `invert`,
     * `invoke`, `keys`, `map`, `max`, `memoize`, `merge`, `min`, `object`, `omit`,
     * `once`, `pairs`, `partial`, `partialRight`, `pick`, `pluck`, `push`, `range`,
     * `reject`, `rest`, `reverse`, `shuffle`, `slice`, `sort`, `sortBy`, `splice`,
     * `tap`, `throttle`, `times`, `toArray`, `union`, `uniq`, `unshift`, `unzip`,
     * `values`, `where`, `without`, `wrap`, and `zip`
     *
     * The non-chainable wrapper functions are:
     * `clone`, `cloneDeep`, `contains`, `escape`, `every`, `find`, `has`,
     * `identity`, `indexOf`, `isArguments`, `isArray`, `isBoolean`, `isDate`,
     * `isElement`, `isEmpty`, `isEqual`, `isFinite`, `isFunction`, `isNaN`,
     * `isNull`, `isNumber`, `isObject`, `isPlainObject`, `isRegExp`, `isString`,
     * `isUndefined`, `join`, `lastIndexOf`, `mixin`, `noConflict`, `parseInt`,
     * `pop`, `random`, `reduce`, `reduceRight`, `result`, `shift`, `size`, `some`,
     * `sortedIndex`, `runInContext`, `template`, `unescape`, `uniqueId`, and `value`
     *
     * The wrapper functions `first` and `last` return wrapped values when `n` is
     * passed, otherwise they return unwrapped values.
     *
     * @name _
     * @constructor
     * @category Chaining
     * @param {Mixed} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     * @example
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // returns an unwrapped value
     * wrapped.reduce(function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * // returns a wrapped value
     * var squares = wrapped.map(function(num) {
     *   return num * num;
     * });
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */
    function lodash(value) {
      // don't wrap if already wrapped, even if wrapped by a different `lodash` constructor
      return (value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__'))
       ? value
       : new lodashWrapper(value);
    }

    /**
     * An object used to flag environments features.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    var support = lodash.support = {};

    /**
     * Detect if `Function#bind` exists and is inferred to be fast (all but V8).
     *
     * @memberOf _.support
     * @type Boolean
     */
    support.fastBind = nativeBind && !isV8;

    /**
     * By default, the template delimiters used by Lo-Dash are similar to those in
     * embedded Ruby (ERB). Change the following template settings to use alternative
     * delimiters.
     *
     * @static
     * @memberOf _
     * @type Object
     */
    lodash.templateSettings = {

      /**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'escape': /<%-([\s\S]+?)%>/g,

      /**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'evaluate': /<%([\s\S]+?)%>/g,

      /**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type RegExp
       */
      'interpolate': reInterpolate,

      /**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type String
       */
      'variable': '',

      /**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type Object
       */
      'imports': {

        /**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type Function
         */
        '_': lodash
      }
    };

    /*--------------------------------------------------------------------------*/

    /**
     * Creates a function optimized to search large arrays for a given `value`,
     * starting at `fromIndex`, using strict equality for comparisons, i.e. `===`.
     *
     * @private
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @returns {Boolean} Returns `true`, if `value` is found, else `false`.
     */
    function cachedContains(array) {
      var length = array.length,
          isLarge = length >= largeArraySize;

      if (isLarge) {
        var cache = {},
            index = -1;

        while (++index < length) {
          var key = keyPrefix + array[index];
          (cache[key] || (cache[key] = [])).push(array[index]);
        }
      }
      return function(value) {
        if (isLarge) {
          var key = keyPrefix + value;
          return  cache[key] && indexOf(cache[key], value) > -1;
        }
        return indexOf(array, value) > -1;
      }
    }

    /**
     * Used by `_.max` and `_.min` as the default `callback` when a given
     * `collection` is a string value.
     *
     * @private
     * @param {String} value The character to inspect.
     * @returns {Number} Returns the code unit of given character.
     */
    function charAtCallback(value) {
      return value.charCodeAt(0);
    }

    /**
     * Used by `sortBy` to compare transformed `collection` values, stable sorting
     * them in ascending order.
     *
     * @private
     * @param {Object} a The object to compare to `b`.
     * @param {Object} b The object to compare to `a`.
     * @returns {Number} Returns the sort order indicator of `1` or `-1`.
     */
    function compareAscending(a, b) {
      var ai = a.index,
          bi = b.index;

      a = a.criteria;
      b = b.criteria;

      // ensure a stable sort in V8 and other engines
      // http://code.google.com/p/v8/issues/detail?id=90
      if (a !== b) {
        if (a > b || typeof a == 'undefined') {
          return 1;
        }
        if (a < b || typeof b == 'undefined') {
          return -1;
        }
      }
      return ai < bi ? -1 : 1;
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this` binding
     * of `thisArg` and prepends any `partialArgs` to the arguments passed to the
     * bound function.
     *
     * @private
     * @param {Function|String} func The function to bind or the method name.
     * @param {Mixed} [thisArg] The `this` binding of `func`.
     * @param {Array} partialArgs An array of arguments to be partially applied.
     * @param {Object} [idicator] Used to indicate binding by key or partially
     *  applying arguments from the right.
     * @returns {Function} Returns the new bound function.
     */
    function createBound(func, thisArg, partialArgs, indicator) {
      var isFunc = isFunction(func),
          isPartial = !partialArgs,
          key = thisArg;

      // juggle arguments
      if (isPartial) {
        var rightIndicator = indicator;
        partialArgs = thisArg;
      }
      else if (!isFunc) {
        if (!indicator) {
          throw new TypeError;
        }
        thisArg = func;
      }

      function bound() {
        // `Function#bind` spec
        // http://es5.github.com/#x15.3.4.5
        var args = arguments,
            thisBinding = isPartial ? this : thisArg;

        if (!isFunc) {
          func = thisArg[key];
        }
        if (partialArgs.length) {
          args = args.length
            ? (args = nativeSlice.call(args), rightIndicator ? args.concat(partialArgs) : partialArgs.concat(args))
            : partialArgs;
        }
        if (this instanceof bound) {
          // ensure `new bound` is an instance of `func`
          noop.prototype = func.prototype;
          thisBinding = new noop;
          noop.prototype = null;

          // mimic the constructor's `return` behavior
          // http://es5.github.com/#x13.2.2
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      return bound;
    }

    /**
     * Used by `template` to escape characters for inclusion in compiled
     * string literals.
     *
     * @private
     * @param {String} match The matched character to escape.
     * @returns {String} Returns the escaped character.
     */
    function escapeStringChar(match) {
      return '\\' + stringEscapes[match];
    }

    /**
     * Used by `escape` to convert characters to HTML entities.
     *
     * @private
     * @param {String} match The matched character to escape.
     * @returns {String} Returns the escaped character.
     */
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }

    /**
     * A fast path for creating `lodash` wrapper objects.
     *
     * @private
     * @param {Mixed} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns a `lodash` instance.
     */
    function lodashWrapper(value) {
      this.__wrapped__ = value;
    }
    // ensure `new lodashWrapper` is an instance of `lodash`
    lodashWrapper.prototype = lodash.prototype;

    /**
     * A no-operation function.
     *
     * @private
     */
    function noop() {
      // no operation performed
    }

    /**
     * A fallback implementation of `isPlainObject` which checks if a given `value`
     * is an object created by the `Object` constructor, assuming objects created
     * by the `Object` constructor have no inherited enumerable properties and that
     * there are no `Object.prototype` extensions.
     *
     * @private
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if `value` is a plain object, else `false`.
     */
    function shimIsPlainObject(value) {
      // avoid non-objects and false positives for `arguments` objects
      var result = false;
      if (!(value && toString.call(value) == objectClass)) {
        return result;
      }
      // check that the constructor is `Object` (i.e. `Object instanceof Object`)
      var ctor = value.constructor;

      if (isFunction(ctor) ? ctor instanceof ctor : true) {
        // In most environments an object's own properties are iterated before
        // its inherited properties. If the last iterated property is an object's
        // own property then there are no inherited enumerable properties.
        forIn(value, function(value, key) {
          result = key;
        });
        return result === false || hasOwnProperty.call(value, result);
      }
      return result;
    }

    /**
     * Slices the `collection` from the `start` index up to, but not including,
     * the `end` index.
     *
     * Note: This function is used, instead of `Array#slice`, to support node lists
     * in IE < 9 and to ensure dense arrays are returned.
     *
     * @private
     * @param {Array|Object|String} collection The collection to slice.
     * @param {Number} start The start index.
     * @param {Number} end The end index.
     * @returns {Array} Returns the new array.
     */
    function slice(array, start, end) {
      start || (start = 0);
      if (typeof end == 'undefined') {
        end = array ? array.length : 0;
      }
      var index = -1,
          length = end - start || 0,
          result = Array(length < 0 ? 0 : length);

      while (++index < length) {
        result[index] = array[start + index];
      }
      return result;
    }

    /**
     * Used by `unescape` to convert HTML entities to characters.
     *
     * @private
     * @param {String} match The matched character to unescape.
     * @returns {String} Returns the unescaped character.
     */
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Checks if `value` is an `arguments` object.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an `arguments` object, else `false`.
     * @example
     *
     * (function() { return _.isArguments(arguments); })(1, 2, 3);
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */
    function isArguments(value) {
      return toString.call(value) == argsClass;
    }

    /**
     * Checks if `value` is an array.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an array, else `false`.
     * @example
     *
     * (function() { return _.isArray(arguments); })();
     * // => false
     *
     * _.isArray([1, 2, 3]);
     * // => true
     */
    var isArray = nativeIsArray;

    /**
     * A fallback implementation of `Object.keys` which produces an array of the
     * given object's own enumerable property names.
     *
     * @private
     * @type Function
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names.
     */
    var shimKeys = function (object) {
      var index, iterable = object, result = [];
      if (!iterable) return result;
      if (!(objectTypes[typeof object])) return result;

        for (index in iterable) {
          if (hasOwnProperty.call(iterable, index)) {    
          result.push(index);    
          }
        }    
      return result
    };

    /**
     * Creates an array composed of the own enumerable property names of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names.
     * @example
     *
     * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
     * // => ['one', 'two', 'three'] (order is not guaranteed)
     */
    var keys = !nativeKeys ? shimKeys : function(object) {
      if (!isObject(object)) {
        return [];
      }
      return nativeKeys(object);
    };

    /**
     * Used to convert characters to HTML entities:
     *
     * Though the `>` character is escaped for symmetry, characters like `>` and `/`
     * don't require escaping in HTML and have no special meaning unless they're part
     * of a tag or an unquoted attribute value.
     * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
     */
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    /** Used to convert HTML entities to characters */
    var htmlUnescapes = invert(htmlEscapes);

    /*--------------------------------------------------------------------------*/

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object. Subsequent sources will overwrite property assignments of previous
     * sources. If a `callback` function is passed, it will be executed to produce
     * the assigned values. The `callback` is bound to `thisArg` and invoked with
     * two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @type Function
     * @alias extend
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param {Function} [callback] The function to customize assigning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * _.assign({ 'name': 'moe' }, { 'age': 40 });
     * // => { 'name': 'moe', 'age': 40 }
     *
     * var defaults = _.partialRight(_.assign, function(a, b) {
     *   return typeof a == 'undefined' ? b : a;
     * });
     *
     * var food = { 'name': 'apple' };
     * defaults(food, { 'name': 'banana', 'type': 'fruit' });
     * // => { 'name': 'apple', 'type': 'fruit' }
     */
    var assign = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = lodash.createCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {;
      var length = iterable.length; index = -1;
      if (isArray(iterable)) {
        while (++index < length) {
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index]
        }
      }
      else {    
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] ? keys(iterable) : [],
            length = ownProps.length;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          result[index] = callback ? callback(result[index], iterable[index]) : iterable[index]
        }    
      }
        }
      };
      return result
    };

    /**
     * Creates a clone of `value`. If `deep` is `true`, nested objects will also
     * be cloned, otherwise they will be assigned by reference. If a `callback`
     * function is passed, it will be executed to produce the cloned values. If
     * `callback` returns `undefined`, cloning will be handled by the method instead.
     * The `callback` is bound to `thisArg` and invoked with one argument; (value).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to clone.
     * @param {Boolean} [deep=false] A flag to indicate a deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Array} [stackA=[]] Tracks traversed source objects.
     * @param- {Array} [stackB=[]] Associates clones with source counterparts.
     * @returns {Mixed} Returns the cloned `value`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * var shallow = _.clone(stooges);
     * shallow[0] === stooges[0];
     * // => true
     *
     * var deep = _.clone(stooges, true);
     * deep[0] === stooges[0];
     * // => false
     *
     * _.mixin({
     *   'clone': _.partialRight(_.clone, function(value) {
     *     return _.isElement(value) ? value.cloneNode(false) : undefined;
     *   })
     * });
     *
     * var clone = _.clone(document.body);
     * clone.childNodes.length;
     * // => 0
     */
    function clone(value, deep, callback, thisArg, stackA, stackB) {
      var result = value;

      // allows working with "Collections" methods without using their `callback`
      // argument, `index|key`, for this method's `callback`
      if (typeof deep == 'function') {
        thisArg = callback;
        callback = deep;
        deep = false;
      }
      if (typeof callback == 'function') {
        callback = (typeof thisArg == 'undefined')
          ? callback
          : lodash.createCallback(callback, thisArg, 1);

        result = callback(result);
        if (typeof result != 'undefined') {
          return result;
        }
        result = value;
      }
      // inspect [[Class]]
      var isObj = isObject(result);
      if (isObj) {
        var className = toString.call(result);
        if (!cloneableClasses[className]) {
          return result;
        }
        var isArr = isArray(result);
      }
      // shallow clone
      if (!isObj || !deep) {
        return isObj
          ? (isArr ? slice(result) : assign({}, result))
          : result;
      }
      var ctor = ctorByClass[className];
      switch (className) {
        case boolClass:
        case dateClass:
          return new ctor(+result);

        case numberClass:
        case stringClass:
          return new ctor(result);

        case regexpClass:
          return ctor(result.source, reFlags.exec(result));
      }
      // check for circular references and return corresponding clone
      stackA || (stackA = []);
      stackB || (stackB = []);

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == value) {
          return stackB[length];
        }
      }
      // init cloned object
      result = isArr ? ctor(result.length) : {};

      // add array properties assigned by `RegExp#exec`
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      // add the source value to the stack of traversed objects
      // and associate it with its clone
      stackA.push(value);
      stackB.push(result);

      // recursively populate clone (susceptible to call stack limits)
      (isArr ? forEach : forOwn)(value, function(objValue, key) {
        result[key] = clone(objValue, deep, callback, undefined, stackA, stackB);
      });

      return result;
    }

    /**
     * Creates a deep clone of `value`. If a `callback` function is passed,
     * it will be executed to produce the cloned values. If `callback` returns
     * `undefined`, cloning will be handled by the method instead. The `callback`
     * is bound to `thisArg` and invoked with one argument; (value).
     *
     * Note: This function is loosely based on the structured clone algorithm. Functions
     * and DOM nodes are **not** cloned. The enumerable properties of `arguments` objects and
     * objects created by constructors other than `Object` are cloned to plain `Object` objects.
     * See http://www.w3.org/TR/html5/infrastructure.html#internal-structured-cloning-algorithm.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to deep clone.
     * @param {Function} [callback] The function to customize cloning values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the deep cloned `value`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * var deep = _.cloneDeep(stooges);
     * deep[0] === stooges[0];
     * // => false
     *
     * var view = {
     *   'label': 'docs',
     *   'node': element
     * };
     *
     * var clone = _.cloneDeep(view, function(value) {
     *   return _.isElement(value) ? value.cloneNode(true) : undefined;
     * });
     *
     * clone.node == view.node;
     * // => false
     */
    function cloneDeep(value, callback, thisArg) {
      return clone(value, true, callback, thisArg);
    }

    /**
     * Assigns own enumerable properties of source object(s) to the destination
     * object for all destination properties that resolve to `undefined`. Once a
     * property is set, additional defaults of the same property will be ignored.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param- {Object} [guard] Allows working with `_.reduce` without using its
     *  callback's `key` and `object` arguments as sources.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var food = { 'name': 'apple' };
     * _.defaults(food, { 'name': 'banana', 'type': 'fruit' });
     * // => { 'name': 'apple', 'type': 'fruit' }
     */
    var defaults = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable) return result;
      var args = arguments,
          argsIndex = 0,
          argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {;
      var length = iterable.length; index = -1;
      if (isArray(iterable)) {
        while (++index < length) {
          if (typeof result[index] == 'undefined') result[index] = iterable[index]
        }
      }
      else {    
        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] ? keys(iterable) : [],
            length = ownProps.length;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (typeof result[index] == 'undefined') result[index] = iterable[index]
        }    
      }
        }
      };
      return result
    };

    /**
     * This method is similar to `_.find`, except that it returns the key of the
     * element that passes the callback check, instead of the element itself.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to search.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the key of the found element, else `undefined`.
     * @example
     *
     * _.findKey({ 'a': 1, 'b': 2, 'c': 3, 'd': 4 }, function(num) {
     *   return num % 2 == 0;
     * });
     * // => 'b'
     */
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg);
      forOwn(object, function(value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }

    /**
     * Iterates over `object`'s own and inherited enumerable properties, executing
     * the `callback` for each property. The `callback` is bound to `thisArg` and
     * invoked with three arguments; (value, key, object). Callbacks may exit iteration
     * early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function Dog(name) {
     *   this.name = name;
     * }
     *
     * Dog.prototype.bark = function() {
     *   alert('Woof, woof!');
     * };
     *
     * _.forIn(new Dog('Dagny'), function(value, key) {
     *   alert(key);
     * });
     * // => alerts 'name' and 'bark' (order is not guaranteed)
     */
    var forIn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);

        for (index in iterable) {
          if (callback(iterable[index], index, collection) === false) return result;    
        }    
      return result
    };

    /**
     * Iterates over an object's own enumerable properties, executing the `callback`
     * for each property. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, key, object). Callbacks may exit iteration early by explicitly
     * returning `false`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Objects
     * @param {Object} object The object to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns `object`.
     * @example
     *
     * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
     *   alert(key);
     * });
     * // => alerts '0', '1', and 'length' (order is not guaranteed)
     */
    var forOwn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable) return result;
      if (!objectTypes[typeof iterable]) return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);

        var ownIndex = -1,
            ownProps = objectTypes[typeof iterable] ? keys(iterable) : [],
            length = ownProps.length;

        while (++ownIndex < length) {
          index = ownProps[ownIndex];
          if (callback(iterable[index], index, collection) === false) return result
        }    
      return result
    };

    /**
     * Creates a sorted array of all enumerable properties, own and inherited,
     * of `object` that have function values.
     *
     * @static
     * @memberOf _
     * @alias methods
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property names that have function values.
     * @example
     *
     * _.functions(_);
     * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
     */
    function functions(object) {
      var result = [];
      forIn(object, function(value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }

    /**
     * Checks if the specified object `property` exists and is a direct property,
     * instead of an inherited property.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to check.
     * @param {String} property The property to check for.
     * @returns {Boolean} Returns `true` if key is a direct property, else `false`.
     * @example
     *
     * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
     * // => true
     */
    function has(object, property) {
      return object ? hasOwnProperty.call(object, property) : false;
    }

    /**
     * Creates an object composed of the inverted keys and values of the given `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the created inverted object.
     * @example
     *
     *  _.invert({ 'first': 'moe', 'second': 'larry' });
     * // => { 'moe': 'first', 'larry': 'second' }
     */
    function invert(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = {};

      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }

    /**
     * Checks if `value` is a boolean value.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a boolean value, else `false`.
     * @example
     *
     * _.isBoolean(null);
     * // => false
     */
    function isBoolean(value) {
      return value === true || value === false || toString.call(value) == boolClass;
    }

    /**
     * Checks if `value` is a date.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a date, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     */
    function isDate(value) {
      return value ? (typeof value == 'object' && toString.call(value) == dateClass) : false;
    }

    /**
     * Checks if `value` is a DOM element.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     */
    function isElement(value) {
      return value ? value.nodeType === 1 : false;
    }

    /**
     * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
     * length of `0` and objects with no own enumerable properties are considered
     * "empty".
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Array|Object|String} value The value to inspect.
     * @returns {Boolean} Returns `true`, if the `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({});
     * // => true
     *
     * _.isEmpty('');
     * // => true
     */
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value),
          length = value.length;

      if ((className == arrayClass || className == stringClass || className == argsClass ) ||
          (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
        return !length;
      }
      forOwn(value, function() {
        return (result = false);
      });
      return result;
    }

    /**
     * Performs a deep comparison between two values to determine if they are
     * equivalent to each other. If `callback` is passed, it will be executed to
     * compare values. If `callback` returns `undefined`, comparisons will be handled
     * by the method instead. The `callback` is bound to `thisArg` and invoked with
     * two arguments; (a, b).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} a The value to compare.
     * @param {Mixed} b The other value to compare.
     * @param {Function} [callback] The function to customize comparing values.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Array} [stackA=[]] Tracks traversed `a` objects.
     * @param- {Array} [stackB=[]] Tracks traversed `b` objects.
     * @returns {Boolean} Returns `true`, if the values are equivalent, else `false`.
     * @example
     *
     * var moe = { 'name': 'moe', 'age': 40 };
     * var copy = { 'name': 'moe', 'age': 40 };
     *
     * moe == copy;
     * // => false
     *
     * _.isEqual(moe, copy);
     * // => true
     *
     * var words = ['hello', 'goodbye'];
     * var otherWords = ['hi', 'goodbye'];
     *
     * _.isEqual(words, otherWords, function(a, b) {
     *   var reGreet = /^(?:hello|hi)$/i,
     *       aGreet = _.isString(a) && reGreet.test(a),
     *       bGreet = _.isString(b) && reGreet.test(b);
     *
     *   return (aGreet || bGreet) ? (aGreet == bGreet) : undefined;
     * });
     * // => true
     */
    function isEqual(a, b, callback, thisArg, stackA, stackB) {
      // used to indicate that when comparing objects, `a` has at least the properties of `b`
      var whereIndicator = callback === indicatorObject;
      if (typeof callback == 'function' && !whereIndicator) {
        callback = lodash.createCallback(callback, thisArg, 2);
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      // exit early for identical values
      if (a === b) {
        // treat `+0` vs. `-0` as not equal
        return a !== 0 || (1 / a == 1 / b);
      }
      var type = typeof a,
          otherType = typeof b;

      // exit early for unlike primitive values
      if (a === a &&
          (!a || (type != 'function' && type != 'object')) &&
          (!b || (otherType != 'function' && otherType != 'object'))) {
        return false;
      }
      // exit early for `null` and `undefined`, avoiding ES3's Function#call behavior
      // http://es5.github.com/#x15.3.4.4
      if (a == null || b == null) {
        return a === b;
      }
      // compare [[Class]] names
      var className = toString.call(a),
          otherClass = toString.call(b);

      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
        case boolClass:
        case dateClass:
          // coerce dates and booleans to numbers, dates to milliseconds and booleans
          // to `1` or `0`, treating invalid dates coerced to `NaN` as not equal
          return +a == +b;

        case numberClass:
          // treat `NaN` vs. `NaN` as equal
          return (a != +a)
            ? b != +b
            // but treat `+0` vs. `-0` as not equal
            : (a == 0 ? (1 / a == 1 / b) : a == +b);

        case regexpClass:
        case stringClass:
          // coerce regexes to strings (http://es5.github.com/#x15.10.6.4)
          // treat string primitives and their corresponding object instances as equal
          return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        // unwrap any `lodash` wrapped values
        if (hasOwnProperty.call(a, '__wrapped__ ') || hasOwnProperty.call(b, '__wrapped__')) {
          return isEqual(a.__wrapped__ || a, b.__wrapped__ || b, callback, thisArg, stackA, stackB);
        }
        // exit for functions and DOM nodes
        if (className != objectClass) {
          return false;
        }
        // in older versions of Opera, `arguments` objects have `Array` constructors
        var ctorA = a.constructor,
            ctorB = b.constructor;

        // non `Object` object instances with different constructors are not equal
        if (ctorA != ctorB && !(
              isFunction(ctorA) && ctorA instanceof ctorA &&
              isFunction(ctorB) && ctorB instanceof ctorB
            )) {
          return false;
        }
      }
      // assume cyclic structures are equal
      // the algorithm for detecting cyclic structures is adapted from ES 5.1
      // section 15.12.3, abstract operation `JO` (http://es5.github.com/#x15.12.3)
      stackA || (stackA = []);
      stackB || (stackB = []);

      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;

      // add `a` and `b` to the stack of traversed objects
      stackA.push(a);
      stackB.push(b);

      // recursively compare objects and arrays (susceptible to call stack limits)
      if (isArr) {
        length = a.length;
        size = b.length;

        // compare lengths to determine if a deep comparison is necessary
        result = size == a.length;
        if (!result && !whereIndicator) {
          return result;
        }
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          var index = length,
              value = b[size];

          if (whereIndicator) {
            while (index--) {
              if ((result = isEqual(a[index], value, callback, thisArg, stackA, stackB))) {
                break;
              }
            }
          } else if (!(result = isEqual(a[size], value, callback, thisArg, stackA, stackB))) {
            break;
          }
        }
        return result;
      }
      // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
      // which, in this case, is more costly
      forIn(b, function(value, key, b) {
        if (hasOwnProperty.call(b, key)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          return (result = hasOwnProperty.call(a, key) && isEqual(a[key], value, callback, thisArg, stackA, stackB));
        }
      });

      if (result && !whereIndicator) {
        // ensure both objects have the same number of properties
        forIn(a, function(value, key, a) {
          if (hasOwnProperty.call(a, key)) {
            // `size` will be `-1` if `a` has more properties than `b`
            return (result = --size > -1);
          }
        });
      }
      return result;
    }

    /**
     * Checks if `value` is, or can be coerced to, a finite number.
     *
     * Note: This is not the same as native `isFinite`, which will return true for
     * booleans and empty strings. See http://es5.github.com/#x15.1.2.5.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is finite, else `false`.
     * @example
     *
     * _.isFinite(-101);
     * // => true
     *
     * _.isFinite('10');
     * // => true
     *
     * _.isFinite(true);
     * // => false
     *
     * _.isFinite('');
     * // => false
     *
     * _.isFinite(Infinity);
     * // => false
     */
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }

    /**
     * Checks if `value` is a function.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     */
    function isFunction(value) {
      return typeof value == 'function';
    }

    /**
     * Checks if `value` is the language type of Object.
     * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(1);
     * // => false
     */
    function isObject(value) {
      // check if the value is the ECMAScript language type of Object
      // http://es5.github.com/#x8
      // and avoid a V8 bug
      // http://code.google.com/p/v8/issues/detail?id=2291
      return value ? objectTypes[typeof value] : false;
    }

    /**
     * Checks if `value` is `NaN`.
     *
     * Note: This is not the same as native `isNaN`, which will return `true` for
     * `undefined` and other values. See http://es5.github.com/#x15.1.2.4.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */
    function isNaN(value) {
      // `NaN` as a primitive is the only value that is not equal to itself
      // (perform the [[Class]] check first to avoid errors with some host objects in IE)
      return isNumber(value) && value != +value
    }

    /**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(undefined);
     * // => false
     */
    function isNull(value) {
      return value === null;
    }

    /**
     * Checks if `value` is a number.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(8.4 * 5);
     * // => true
     */
    function isNumber(value) {
      return typeof value == 'number' || toString.call(value) == numberClass;
    }

    /**
     * Checks if a given `value` is an object created by the `Object` constructor.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if `value` is a plain object, else `false`.
     * @example
     *
     * function Stooge(name, age) {
     *   this.name = name;
     *   this.age = age;
     * }
     *
     * _.isPlainObject(new Stooge('moe', 40));
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'name': 'moe', 'age': 40 });
     * // => true
     */
    var isPlainObject = function(value) {
      if (!(value && toString.call(value) == objectClass)) {
        return false;
      }
      var valueOf = value.valueOf,
          objProto = typeof valueOf == 'function' && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

      return objProto
        ? (value == objProto || getPrototypeOf(value) == objProto)
        : shimIsPlainObject(value);
    };

    /**
     * Checks if `value` is a regular expression.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a regular expression, else `false`.
     * @example
     *
     * _.isRegExp(/moe/);
     * // => true
     */
    function isRegExp(value) {
      return value ? (typeof value == 'object' && toString.call(value) == regexpClass) : false;
    }

    /**
     * Checks if `value` is a string.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is a string, else `false`.
     * @example
     *
     * _.isString('moe');
     * // => true
     */
    function isString(value) {
      return typeof value == 'string' || toString.call(value) == stringClass;
    }

    /**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Mixed} value The value to check.
     * @returns {Boolean} Returns `true`, if the `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     */
    function isUndefined(value) {
      return typeof value == 'undefined';
    }

    /**
     * Recursively merges own enumerable properties of the source object(s), that
     * don't resolve to `undefined`, into the destination object. Subsequent sources
     * will overwrite property assignments of previous sources. If a `callback` function
     * is passed, it will be executed to produce the merged values of the destination
     * and source properties. If `callback` returns `undefined`, merging will be
     * handled by the method instead. The `callback` is bound to `thisArg` and
     * invoked with two arguments; (objectValue, sourceValue).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The destination object.
     * @param {Object} [source1, source2, ...] The source objects.
     * @param {Function} [callback] The function to customize merging properties.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @param- {Object} [deepIndicator] Indicates that `stackA` and `stackB` are
     *  arrays of traversed objects, instead of source objects.
     * @param- {Array} [stackA=[]] Tracks traversed source objects.
     * @param- {Array} [stackB=[]] Associates values with source counterparts.
     * @returns {Object} Returns the destination object.
     * @example
     *
     * var names = {
     *   'stooges': [
     *     { 'name': 'moe' },
     *     { 'name': 'larry' }
     *   ]
     * };
     *
     * var ages = {
     *   'stooges': [
     *     { 'age': 40 },
     *     { 'age': 50 }
     *   ]
     * };
     *
     * _.merge(names, ages);
     * // => { 'stooges': [{ 'name': 'moe', 'age': 40 }, { 'name': 'larry', 'age': 50 }] }
     *
     * var food = {
     *   'fruits': ['apple'],
     *   'vegetables': ['beet']
     * };
     *
     * var otherFood = {
     *   'fruits': ['banana'],
     *   'vegetables': ['carrot']
     * };
     *
     * _.merge(food, otherFood, function(a, b) {
     *   return _.isArray(a) ? a.concat(b) : undefined;
     * });
     * // => { 'fruits': ['apple', 'banana'], 'vegetables': ['beet', 'carrot] }
     */
    function merge(object, source, deepIndicator) {
      var args = arguments,
          index = 0,
          length = 2;

      if (!isObject(object)) {
        return object;
      }
      if (deepIndicator === indicatorObject) {
        var callback = args[3],
            stackA = args[4],
            stackB = args[5];
      } else {
        stackA = [];
        stackB = [];

        // allows working with `_.reduce` and `_.reduceRight` without
        // using their `callback` arguments, `index|key` and `collection`
        if (typeof deepIndicator != 'number') {
          length = args.length;
        }
        if (length > 3 && typeof args[length - 2] == 'function') {
          callback = lodash.createCallback(args[--length - 1], args[length--], 2);
        } else if (length > 2 && typeof args[length - 1] == 'function') {
          callback = args[--length];
        }
      }
      while (++index < length) {
        (isArray(args[index]) ? forEach : forOwn)(args[index], function(source, key) {
          var found,
              isArr,
              result = source,
              value = object[key];

          if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
            // avoid merging previously merged cyclic sources
            var stackLength = stackA.length;
            while (stackLength--) {
              if ((found = stackA[stackLength] == source)) {
                value = stackB[stackLength];
                break;
              }
            }
            if (!found) {
              var isShallow;
              if (callback) {
                result = callback(value, source);
                if ((isShallow = typeof result != 'undefined')) {
                  value = result;
                }
              }
              if (!isShallow) {
                value = isArr
                  ? (isArray(value) ? value : [])
                  : (isPlainObject(value) ? value : {});
              }
              // add `source` and associated `value` to the stack of traversed objects
              stackA.push(source);
              stackB.push(value);

              // recursively merge objects and arrays (susceptible to call stack limits)
              if (!isShallow) {
                value = merge(value, source, indicatorObject, callback, stackA, stackB);
              }
            }
          }
          else {
            if (callback) {
              result = callback(value, source);
              if (typeof result == 'undefined') {
                result = source;
              }
            }
            if (typeof result != 'undefined') {
              value = result;
            }
          }
          object[key] = value;
        });
      }
      return object;
    }

    /**
     * Creates a shallow clone of `object` excluding the specified properties.
     * Property names may be specified as individual arguments or as arrays of
     * property names. If a `callback` function is passed, it will be executed
     * for each property in the `object`, omitting the properties `callback`
     * returns truthy for. The `callback` is bound to `thisArg` and invoked
     * with three arguments; (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Function|String} callback|[prop1, prop2, ...] The properties to omit
     *  or the function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object without the omitted properties.
     * @example
     *
     * _.omit({ 'name': 'moe', 'age': 40 }, 'age');
     * // => { 'name': 'moe' }
     *
     * _.omit({ 'name': 'moe', 'age': 40 }, function(value) {
     *   return typeof value == 'number';
     * });
     * // => { 'name': 'moe' }
     */
    function omit(object, callback, thisArg) {
      var isFunc = typeof callback == 'function',
          result = {};

      if (isFunc) {
        callback = lodash.createCallback(callback, thisArg);
      } else {
        var props = concat.apply(arrayRef, nativeSlice.call(arguments, 1));
      }
      forIn(object, function(value, key, object) {
        if (isFunc
              ? !callback(value, key, object)
              : indexOf(props, key) < 0
            ) {
          result[key] = value;
        }
      });
      return result;
    }

    /**
     * Creates a two dimensional array of the given object's key-value pairs,
     * i.e. `[[key1, value1], [key2, value2]]`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns new array of key-value pairs.
     * @example
     *
     * _.pairs({ 'moe': 30, 'larry': 40 });
     * // => [['moe', 30], ['larry', 40]] (order is not guaranteed)
     */
    function pairs(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        var key = props[index];
        result[index] = [key, object[key]];
      }
      return result;
    }

    /**
     * Creates a shallow clone of `object` composed of the specified properties.
     * Property names may be specified as individual arguments or as arrays of property
     * names. If `callback` is passed, it will be executed for each property in the
     * `object`, picking the properties `callback` returns truthy for. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, key, object).
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The source object.
     * @param {Array|Function|String} callback|[prop1, prop2, ...] The function called
     *  per iteration or properties to pick, either as individual arguments or arrays.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns an object composed of the picked properties.
     * @example
     *
     * _.pick({ 'name': 'moe', '_userid': 'moe1' }, 'name');
     * // => { 'name': 'moe' }
     *
     * _.pick({ 'name': 'moe', '_userid': 'moe1' }, function(value, key) {
     *   return key.charAt(0) != '_';
     * });
     * // => { 'name': 'moe' }
     */
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1,
            props = concat.apply(arrayRef, nativeSlice.call(arguments, 1)),
            length = isObject(object) ? props.length : 0;

        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg);
        forIn(object, function(value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }

    /**
     * Creates an array composed of the own enumerable property values of `object`.
     *
     * @static
     * @memberOf _
     * @category Objects
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * _.values({ 'one': 1, 'two': 2, 'three': 3 });
     * // => [1, 2, 3] (order is not guaranteed)
     */
    function values(object) {
      var index = -1,
          props = keys(object),
          length = props.length,
          result = Array(length);

      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array of elements from the specified indexes, or keys, of the
     * `collection`. Indexes may be specified as individual arguments or as arrays
     * of indexes.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Array|Number|String} [index1, index2, ...] The indexes of
     *  `collection` to retrieve, either as individual arguments or arrays.
     * @returns {Array} Returns a new array of elements corresponding to the
     *  provided indexes.
     * @example
     *
     * _.at(['a', 'b', 'c', 'd', 'e'], [0, 2, 4]);
     * // => ['a', 'c', 'e']
     *
     * _.at(['moe', 'larry', 'curly'], 0, 2);
     * // => ['moe', 'curly']
     */
    function at(collection) {
      var index = -1,
          props = concat.apply(arrayRef, nativeSlice.call(arguments, 1)),
          length = props.length,
          result = Array(length);

      while(++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }

    /**
     * Checks if a given `target` element is present in a `collection` using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @alias include
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Mixed} target The value to check for.
     * @param {Number} [fromIndex=0] The index to search from.
     * @returns {Boolean} Returns `true` if the `target` element is found, else `false`.
     * @example
     *
     * _.contains([1, 2, 3], 1);
     * // => true
     *
     * _.contains([1, 2, 3], 1, 2);
     * // => false
     *
     * _.contains({ 'name': 'moe', 'age': 40 }, 'moe');
     * // => true
     *
     * _.contains('curly', 'ur');
     * // => true
     */
    function contains(collection, target, fromIndex) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = false;

      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (typeof length == 'number') {
        result = (isString(collection)
          ? collection.indexOf(target, fromIndex)
          : indexOf(collection, target, fromIndex)
        ) > -1;
      } else {
        forOwn(collection, function(value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }

    /**
     * Creates an object composed of keys returned from running each element of the
     * `collection` through the given `callback`. The corresponding value of each key
     * is the number of times the key was returned by the `callback`. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': 1, '6': 2 }
     *
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */
    function countBy(collection, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg);

      forEach(collection, function(value, key, collection) {
        key = String(callback(value, key, collection));
        (hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1);
      });
      return result;
    }

    /**
     * Checks if the `callback` returns a truthy value for **all** elements of a
     * `collection`. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias all
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Boolean} Returns `true` if all elements pass the callback check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes'], Boolean);
     * // => false
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.every(stooges, 'age');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.every(stooges, { 'age': 50 });
     * // => false
     */
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return (result = !!callback(value, index, collection));
        });
      }
      return result;
    }

    /**
     * Examines each element in a `collection`, returning an array of all elements
     * the `callback` returns truthy for. The `callback` is bound to `thisArg` and
     * invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias select
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that passed the callback check.
     * @example
     *
     * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [2, 4, 6]
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.filter(food, 'organic');
     * // => [{ 'name': 'carrot', 'organic': true, 'type': 'vegetable' }]
     *
     * // using "_.where" callback shorthand
     * _.filter(food, { 'type': 'fruit' });
     * // => [{ 'name': 'apple', 'organic': false, 'type': 'fruit' }]
     */
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }

    /**
     * Examines each element in a `collection`, returning the first that the `callback`
     * returns truthy for. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias detect
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the found element, else `undefined`.
     * @example
     *
     * _.find([1, 2, 3, 4], function(num) {
     *   return num % 2 == 0;
     * });
     * // => 2
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'banana', 'organic': true,  'type': 'fruit' },
     *   { 'name': 'beet',   'organic': false, 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.find(food, { 'type': 'vegetable' });
     * // => { 'name': 'beet', 'organic': false, 'type': 'vegetable' }
     *
     * // using "_.pluck" callback shorthand
     * _.find(food, 'organic');
     * // => { 'name': 'banana', 'organic': true, 'type': 'fruit' }
     */
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function(value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }

    /**
     * Iterates over a `collection`, executing the `callback` for each element in
     * the `collection`. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection). Callbacks may exit iteration early
     * by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @alias each
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array|Object|String} Returns `collection`.
     * @example
     *
     * _([1, 2, 3]).forEach(alert).join(',');
     * // => alerts each number and returns '1,2,3'
     *
     * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
     * // => alerts each number value (order is not guaranteed)
     */
    function forEach(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = callback && typeof thisArg == 'undefined' ? callback : lodash.createCallback(callback, thisArg);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }

    /**
     * Creates an object composed of keys returned from running each element of the
     * `collection` through the `callback`. The corresponding value of each key is
     * an array of elements passed to `callback` that returned the key. The `callback`
     * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
     * // => { '4': [4.2], '6': [6.1, 6.4] }
     *
     * // using "_.pluck" callback shorthand
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */
    function groupBy(collection, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg);

      forEach(collection, function(value, key, collection) {
        key = String(callback(value, key, collection));
        (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
      });
      return result;
    }

    /**
     * Invokes the method named by `methodName` on each element in the `collection`,
     * returning an array of the results of each invoked method. Additional arguments
     * will be passed to each invoked method. If `methodName` is a function, it will
     * be invoked for, and `this` bound to, each element in the `collection`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|String} methodName The name of the method to invoke or
     *  the function invoked per iteration.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the method with.
     * @returns {Array} Returns a new array of the results of each invoked method.
     * @example
     *
     * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invoke([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */
    function invoke(collection, methodName) {
      var args = nativeSlice.call(arguments, 2),
          index = -1,
          isFunc = typeof methodName == 'function',
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }

    /**
     * Creates an array of values by running each element in the `collection`
     * through the `callback`. The `callback` is bound to `thisArg` and invoked with
     * three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias collect
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * _.map([1, 2, 3], function(num) { return num * 3; });
     * // => [3, 6, 9]
     *
     * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
     * // => [3, 6, 9] (order is not guaranteed)
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.map(stooges, 'name');
     * // => ['moe', 'larry']
     */
    function map(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0;

      callback = lodash.createCallback(callback, thisArg);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function(value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }

    /**
     * Retrieves the maximum value of an `array`. If `callback` is passed,
     * it will be executed for each value in the `array` to generate the
     * criterion by which the value is ranked. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.max(stooges, function(stooge) { return stooge.age; });
     * // => { 'name': 'larry', 'age': 50 };
     *
     * // using "_.pluck" callback shorthand
     * _.max(stooges, 'age');
     * // => { 'name': 'larry', 'age': 50 };
     */
    function max(collection, callback, thisArg) {
      var computed = -Infinity,
          result = computed;

      if (!callback && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = (!callback && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the minimum value of an `array`. If `callback` is passed,
     * it will be executed for each value in the `array` to generate the
     * criterion by which the value is ranked. The `callback` is bound to `thisArg`
     * and invoked with three arguments; (value, index, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.min(stooges, function(stooge) { return stooge.age; });
     * // => { 'name': 'moe', 'age': 40 };
     *
     * // using "_.pluck" callback shorthand
     * _.min(stooges, 'age');
     * // => { 'name': 'moe', 'age': 40 };
     */
    function min(collection, callback, thisArg) {
      var computed = Infinity,
          result = computed;

      if (!callback && isArray(collection)) {
        var index = -1,
            length = collection.length;

        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = (!callback && isString(collection))
          ? charAtCallback
          : lodash.createCallback(callback, thisArg);

        forEach(collection, function(value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }

    /**
     * Retrieves the value of a specified property from all elements in the `collection`.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {String} property The property to pluck.
     * @returns {Array} Returns a new array of property values.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.pluck(stooges, 'name');
     * // => ['moe', 'larry']
     */
    function pluck(collection, property) {
      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = collection[index][property];
        }
      }
      return result || map(collection, property);
    }

    /**
     * Reduces a `collection` to a value which is the accumulated result of running
     * each element in the `collection` through the `callback`, where each successive
     * `callback` execution consumes the return value of the previous execution.
     * If `accumulator` is not passed, the first element of the `collection` will be
     * used as the initial `accumulator` value. The `callback` is bound to `thisArg`
     * and invoked with four arguments; (accumulator, value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @alias foldl, inject
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [accumulator] Initial value of the accumulator.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the accumulated value.
     * @example
     *
     * var sum = _.reduce([1, 2, 3], function(sum, num) {
     *   return sum + num;
     * });
     * // => 6
     *
     * var mapped = _.reduce({ 'a': 1, 'b': 2, 'c': 3 }, function(result, num, key) {
     *   result[key] = num * 3;
     *   return result;
     * }, {});
     * // => { 'a': 3, 'b': 6, 'c': 9 }
     */
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection) return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);

      var index = -1,
          length = collection.length;

      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          accumulator = noaccum
            ? (noaccum = false, value)
            : callback(accumulator, value, index, collection)
        });
      }
      return accumulator;
    }

    /**
     * This method is similar to `_.reduce`, except that it iterates over a
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @alias foldr
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function} [callback=identity] The function called per iteration.
     * @param {Mixed} [accumulator] Initial value of the accumulator.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the accumulated value.
     * @example
     *
     * var list = [[0, 1], [2, 3], [4, 5]];
     * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */
    function reduceRight(collection, callback, accumulator, thisArg) {
      var iterable = collection,
          length = collection ? collection.length : 0,
          noaccum = arguments.length < 3;

      if (typeof length != 'number') {
        var props = keys(collection);
        length = props.length;
      }
      callback = lodash.createCallback(callback, thisArg, 4);
      forEach(collection, function(value, index, collection) {
        index = props ? props[--length] : --length;
        accumulator = noaccum
          ? (noaccum = false, iterable[index])
          : callback(accumulator, iterable[index], index, collection);
      });
      return accumulator;
    }

    /**
     * The opposite of `_.filter`, this method returns the elements of a
     * `collection` that `callback` does **not** return truthy for.
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of elements that did **not** pass the
     *  callback check.
     * @example
     *
     * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
     * // => [1, 3, 5]
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.reject(food, 'organic');
     * // => [{ 'name': 'apple', 'organic': false, 'type': 'fruit' }]
     *
     * // using "_.where" callback shorthand
     * _.reject(food, { 'type': 'fruit' });
     * // => [{ 'name': 'carrot', 'organic': true, 'type': 'vegetable' }]
     */
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg);
      return filter(collection, function(value, index, collection) {
        return !callback(value, index, collection);
      });
    }

    /**
     * Creates an array of shuffled `array` values, using a version of the
     * Fisher-Yates shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to shuffle.
     * @returns {Array} Returns a new shuffled collection.
     * @example
     *
     * _.shuffle([1, 2, 3, 4, 5, 6]);
     * // => [4, 1, 6, 3, 5, 2]
     */
    function shuffle(collection) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      forEach(collection, function(value) {
        var rand = floor(nativeRandom() * (++index + 1));
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }

    /**
     * Gets the size of the `collection` by returning `collection.length` for arrays
     * and array-like objects or the number of own enumerable properties for objects.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to inspect.
     * @returns {Number} Returns `collection.length` or number of own enumerable properties.
     * @example
     *
     * _.size([1, 2]);
     * // => 2
     *
     * _.size({ 'one': 1, 'two': 2, 'three': 3 });
     * // => 3
     *
     * _.size('curly');
     * // => 5
     */
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }

    /**
     * Checks if the `callback` returns a truthy value for **any** element of a
     * `collection`. The function returns as soon as it finds passing value, and
     * does not iterate over the entire `collection`. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias any
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Boolean} Returns `true` if any element passes the callback check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var food = [
     *   { 'name': 'apple',  'organic': false, 'type': 'fruit' },
     *   { 'name': 'carrot', 'organic': true,  'type': 'vegetable' }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.some(food, 'organic');
     * // => true
     *
     * // using "_.where" callback shorthand
     * _.some(food, { 'type': 'meat' });
     * // => false
     */
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg);

      var index = -1,
          length = collection ? collection.length : 0;

      if (typeof length == 'number') {
        while (++index < length) {
          if ((result = callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function(value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }

    /**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in the `collection` through the `callback`. This method
     * performs a stable sort, that is, it will preserve the original sort order of
     * equal elements. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index|key, collection).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of sorted elements.
     * @example
     *
     * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
     * // => [3, 1, 2]
     *
     * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
     * // => [3, 1, 2]
     *
     * // using "_.pluck" callback shorthand
     * _.sortBy(['banana', 'strawberry', 'apple'], 'length');
     * // => ['apple', 'banana', 'strawberry']
     */
    function sortBy(collection, callback, thisArg) {
      var index = -1,
          length = collection ? collection.length : 0,
          result = Array(typeof length == 'number' ? length : 0);

      callback = lodash.createCallback(callback, thisArg);
      forEach(collection, function(value, key, collection) {
        result[++index] = {
          'criteria': callback(value, key, collection),
          'index': index,
          'value': value
        };
      });

      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        result[length] = result[length].value;
      }
      return result;
    }

    /**
     * Converts the `collection` to an array.
     *
     * @static
     * @memberOf _
     * @category Collections
     * @param {Array|Object|String} collection The collection to convert.
     * @returns {Array} Returns the new converted array.
     * @example
     *
     * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
     * // => [2, 3, 4]
     */
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }

    /**
     * Examines each element in a `collection`, returning an array of all elements
     * that have the given `properties`. When checking `properties`, this method
     * performs a deep comparison between values to determine if they are equivalent
     * to each other.
     *
     * @static
     * @memberOf _
     * @type Function
     * @category Collections
     * @param {Array|Object|String} collection The collection to iterate over.
     * @param {Object} properties The object of property values to filter by.
     * @returns {Array} Returns a new array of elements that have the given `properties`.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * _.where(stooges, { 'age': 40 });
     * // => [{ 'name': 'moe', 'age': 40 }]
     */
    var where = filter;

    /*--------------------------------------------------------------------------*/

    /**
     * Creates an array with all falsey values of `array` removed. The values
     * `false`, `null`, `0`, `""`, `undefined` and `NaN` are all falsey.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to compact.
     * @returns {Array} Returns a new filtered array.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */
    function compact(array) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Creates an array of `array` elements not present in the other arrays
     * using strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {Array} [array1, array2, ...] Arrays to check.
     * @returns {Array} Returns a new array of `array` elements not present in the
     *  other arrays.
     * @example
     *
     * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
     * // => [1, 3, 4]
     */
    function difference(array) {
      var index = -1,
          length = array ? array.length : 0,
          flattened = concat.apply(arrayRef, nativeSlice.call(arguments, 1)),
          contains = cachedContains(flattened),
          result = [];

      while (++index < length) {
        var value = array[index];
        if (!contains(value)) {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * This method is similar to `_.find`, except that it returns the index of
     * the element that passes the callback check, instead of the element itself.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the index of the found element, else `-1`.
     * @example
     *
     * _.findIndex(['apple', 'banana', 'beet'], function(food) {
     *   return /^b/.test(food);
     * });
     * // => 1
     */
    function findIndex(array, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0;

      callback = lodash.createCallback(callback, thisArg);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Gets the first element of the `array`. If a number `n` is passed, the first
     * `n` elements of the `array` are returned. If a `callback` function is passed,
     * elements at the beginning of the array are returned as long as the `callback`
     * returns truthy. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias head, take
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the first element(s) of `array`.
     * @example
     *
     * _.first([1, 2, 3]);
     * // => 1
     *
     * _.first([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.first([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [1, 2]
     *
     * var food = [
     *   { 'name': 'banana', 'organic': true },
     *   { 'name': 'beet',   'organic': false },
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.first(food, 'organic');
     * // => [{ 'name': 'banana', 'organic': true }]
     *
     * var food = [
     *   { 'name': 'apple',  'type': 'fruit' },
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.first(food, { 'type': 'fruit' });
     * // => [{ 'name': 'apple', 'type': 'fruit' }, { 'name': 'banana', 'type': 'fruit' }]
     */
    function first(array, callback, thisArg) {
      if (array) {
        var n = 0,
            length = array.length;

        if (typeof callback != 'number' && callback != null) {
          var index = -1;
          callback = lodash.createCallback(callback, thisArg);
          while (++index < length && callback(array[index], index, array)) {
            n++;
          }
        } else {
          n = callback;
          if (n == null || thisArg) {
            return array[0];
          }
        }
        return slice(array, 0, nativeMin(nativeMax(0, n), length));
      }
    }

    /**
     * Flattens a nested array (the nesting can be to any depth). If `isShallow`
     * is truthy, `array` will only be flattened a single level. If `callback`
     * is passed, each element of `array` is passed through a `callback` before
     * flattening. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to flatten.
     * @param {Boolean} [isShallow=false] A flag to indicate only flattening a single level.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new flattened array.
     * @example
     *
     * _.flatten([1, [2], [3, [[4]]]]);
     * // => [1, 2, 3, 4];
     *
     * _.flatten([1, [2], [3, [[4]]]], true);
     * // => [1, 2, 3, [[4]]];
     *
     * var stooges = [
     *   { 'name': 'curly', 'quotes': ['Oh, a wise guy, eh?', 'Poifect!'] },
     *   { 'name': 'moe', 'quotes': ['Spread out!', 'You knucklehead!'] }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.flatten(stooges, 'quotes');
     * // => ['Oh, a wise guy, eh?', 'Poifect!', 'Spread out!', 'You knucklehead!']
     */
    function flatten(array, isShallow, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [];

      // juggle arguments
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = isShallow;
        isShallow = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg);
      }
      while (++index < length) {
        var value = array[index];
        if (callback) {
          value = callback(value, index, array);
        }
        // recursively flatten arrays (susceptible to call stack limits)
        if (isArray(value)) {
          push.apply(result, isShallow ? value : flatten(value));
        } else {
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Gets the index at which the first occurrence of `value` is found using
     * strict equality for comparisons, i.e. `===`. If the `array` is already
     * sorted, passing `true` for `fromIndex` will run a faster binary search.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @param {Boolean|Number} [fromIndex=0] The index to search from or `true` to
     *  perform a binary search on a sorted `array`.
     * @returns {Number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 1
     *
     * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 4
     *
     * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
     * // => 2
     */
    function indexOf(array, value, fromIndex) {
      var index = -1,
          length = array ? array.length : 0;

      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0) - 1;
      } else if (fromIndex) {
        index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      while (++index < length) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Gets all but the last element of `array`. If a number `n` is passed, the
     * last `n` elements are excluded from the result. If a `callback` function
     * is passed, elements at the end of the array are excluded from the result
     * as long as the `callback` returns truthy. The `callback` is bound to
     * `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     *
     * _.initial([1, 2, 3], 2);
     * // => [1]
     *
     * _.initial([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [1]
     *
     * var food = [
     *   { 'name': 'beet',   'organic': false },
     *   { 'name': 'carrot', 'organic': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.initial(food, 'organic');
     * // => [{ 'name': 'beet',   'organic': false }]
     *
     * var food = [
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' },
     *   { 'name': 'carrot', 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.initial(food, { 'type': 'vegetable' });
     * // => [{ 'name': 'banana', 'type': 'fruit' }]
     */
    function initial(array, callback, thisArg) {
      if (!array) {
        return [];
      }
      var n = 0,
          length = array.length;

      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }

    /**
     * Computes the intersection of all the passed-in arrays using strict equality
     * for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of unique elements that are present
     *  in **all** of the arrays.
     * @example
     *
     * _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
     * // => [1, 2]
     */
    function intersection(array) {
      var args = arguments,
          argsLength = args.length,
          cache = { '0': {} },
          index = -1,
          length = array ? array.length : 0,
          isLarge = length >= largeArraySize,
          result = [],
          seen = result;

      outer:
      while (++index < length) {
        var value = array[index];
        if (isLarge) {
          var key = keyPrefix + value;
          var inited = cache[0][key]
            ? !(seen = cache[0][key])
            : (seen = cache[0][key] = []);
        }
        if (inited || indexOf(seen, value) < 0) {
          if (isLarge) {
            seen.push(value);
          }
          var argsIndex = argsLength;
          while (--argsIndex) {
            if (!(cache[argsIndex] || (cache[argsIndex] = cachedContains(args[argsIndex])))(value)) {
              continue outer;
            }
          }
          result.push(value);
        }
      }
      return result;
    }

    /**
     * Gets the last element of the `array`. If a number `n` is passed, the
     * last `n` elements of the `array` are returned. If a `callback` function
     * is passed, elements at the end of the array are returned as long as the
     * `callback` returns truthy. The `callback` is bound to `thisArg` and
     * invoked with three arguments;(value, index, array).
     *
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n] The function called
     *  per element or the number of elements to return. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Mixed} Returns the last element(s) of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     *
     * _.last([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.last([1, 2, 3], function(num) {
     *   return num > 1;
     * });
     * // => [2, 3]
     *
     * var food = [
     *   { 'name': 'beet',   'organic': false },
     *   { 'name': 'carrot', 'organic': true }
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.last(food, 'organic');
     * // => [{ 'name': 'carrot', 'organic': true }]
     *
     * var food = [
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' },
     *   { 'name': 'carrot', 'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.last(food, { 'type': 'vegetable' });
     * // => [{ 'name': 'beet', 'type': 'vegetable' }, { 'name': 'carrot', 'type': 'vegetable' }]
     */
    function last(array, callback, thisArg) {
      if (array) {
        var n = 0,
            length = array.length;

        if (typeof callback != 'number' && callback != null) {
          var index = length;
          callback = lodash.createCallback(callback, thisArg);
          while (index-- && callback(array[index], index, array)) {
            n++;
          }
        } else {
          n = callback;
          if (n == null || thisArg) {
            return array[length - 1];
          }
        }
        return slice(array, nativeMax(0, length - n));
      }
    }

    /**
     * Gets the index at which the last occurrence of `value` is found using strict
     * equality for comparisons, i.e. `===`. If `fromIndex` is negative, it is used
     * as the offset from the end of the collection.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to search.
     * @param {Mixed} value The value to search for.
     * @param {Number} [fromIndex=array.length-1] The index to search from.
     * @returns {Number} Returns the index of the matched value or `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
     * // => 4
     *
     * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
     * // => 1
     */
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }

    /**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to but not including `end`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Number} [start=0] The start of the range.
     * @param {Number} end The end of the range.
     * @param {Number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns a new range array.
     * @example
     *
     * _.range(10);
     * // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
     *
     * _.range(1, 11);
     * // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     *
     * _.range(0, 30, 5);
     * // => [0, 5, 10, 15, 20, 25]
     *
     * _.range(0, -10, -1);
     * // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
     *
     * _.range(0);
     * // => []
     */
    function range(start, end, step) {
      start = +start || 0;
      step = +step || 1;

      if (end == null) {
        end = start;
        start = 0;
      }
      // use `Array(length)` so V8 will avoid the slower "dictionary" mode
      // http://youtu.be/XAqIpGU8ZZk#t=17m25s
      var index = -1,
          length = nativeMax(0, ceil((end - start) / step)),
          result = Array(length);

      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }

    /**
     * The opposite of `_.initial`, this method gets all but the first value of
     * `array`. If a number `n` is passed, the first `n` values are excluded from
     * the result. If a `callback` function is passed, elements at the beginning
     * of the array are excluded from the result as long as the `callback` returns
     * truthy. The `callback` is bound to `thisArg` and invoked with three
     * arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias drop, tail
     * @category Arrays
     * @param {Array} array The array to query.
     * @param {Function|Object|Number|String} [callback|n=1] The function called
     *  per element or the number of elements to exclude. If a property name or
     *  object is passed, it will be used to create a "_.pluck" or "_.where"
     *  style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a slice of `array`.
     * @example
     *
     * _.rest([1, 2, 3]);
     * // => [2, 3]
     *
     * _.rest([1, 2, 3], 2);
     * // => [3]
     *
     * _.rest([1, 2, 3], function(num) {
     *   return num < 3;
     * });
     * // => [3]
     *
     * var food = [
     *   { 'name': 'banana', 'organic': true },
     *   { 'name': 'beet',   'organic': false },
     * ];
     *
     * // using "_.pluck" callback shorthand
     * _.rest(food, 'organic');
     * // => [{ 'name': 'beet', 'organic': false }]
     *
     * var food = [
     *   { 'name': 'apple',  'type': 'fruit' },
     *   { 'name': 'banana', 'type': 'fruit' },
     *   { 'name': 'beet',   'type': 'vegetable' }
     * ];
     *
     * // using "_.where" callback shorthand
     * _.rest(food, { 'type': 'fruit' });
     * // => [{ 'name': 'beet', 'type': 'vegetable' }]
     */
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0,
            index = -1,
            length = array ? array.length : 0;

        callback = lodash.createCallback(callback, thisArg);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = (callback == null || thisArg) ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }

    /**
     * Uses a binary search to determine the smallest index at which the `value`
     * should be inserted into `array` in order to maintain the sort order of the
     * sorted `array`. If `callback` is passed, it will be executed for `value` and
     * each element in `array` to compute their sort ranking. The `callback` is
     * bound to `thisArg` and invoked with one argument; (value).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to inspect.
     * @param {Mixed} value The value to evaluate.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Number} Returns the index at which the value should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([20, 30, 50], 40);
     * // => 2
     *
     * // using "_.pluck" callback shorthand
     * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
     * // => 2
     *
     * var dict = {
     *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
     * };
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return dict.wordToNumber[word];
     * });
     * // => 2
     *
     * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
     *   return this.wordToNumber[word];
     * }, dict);
     * // => 2
     */
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0,
          high = array ? array.length : low;

      // explicitly reference `identity` for better inlining in Firefox
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);

      while (low < high) {
        var mid = (low + high) >>> 1;
        (callback(array[mid]) < value)
          ? low = mid + 1
          : high = mid;
      }
      return low;
    }

    /**
     * Computes the union of the passed-in arrays using strict equality for
     * comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of unique values, in order, that are
     *  present in one or more of the arrays.
     * @example
     *
     * _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
     * // => [1, 2, 3, 101, 10]
     */
    function union(array) {
      if (!isArray(array)) {
        arguments[0] = array ? nativeSlice.call(array) : arrayRef;
      }
      return uniq(concat.apply(arrayRef, arguments));
    }

    /**
     * Creates a duplicate-value-free version of the `array` using strict equality
     * for comparisons, i.e. `===`. If the `array` is already sorted, passing `true`
     * for `isSorted` will run a faster algorithm. If `callback` is passed, each
     * element of `array` is passed through a `callback` before uniqueness is computed.
     * The `callback` is bound to `thisArg` and invoked with three arguments; (value, index, array).
     *
     * If a property name is passed for `callback`, the created "_.pluck" style
     * callback will return the property value of the given element.
     *
     * If an object is passed for `callback`, the created "_.where" style callback
     * will return `true` for elements that have the properties of the given object,
     * else `false`.
     *
     * @static
     * @memberOf _
     * @alias unique
     * @category Arrays
     * @param {Array} array The array to process.
     * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
     * @param {Function|Object|String} [callback=identity] The function called per
     *  iteration. If a property name or object is passed, it will be used to create
     *  a "_.pluck" or "_.where" style callback, respectively.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a duplicate-value-free array.
     * @example
     *
     * _.uniq([1, 2, 1, 3, 1]);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 1, 2, 2, 3], true);
     * // => [1, 2, 3]
     *
     * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return Math.floor(num); });
     * // => [1, 2, 3]
     *
     * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return this.floor(num); }, Math);
     * // => [1, 2, 3]
     *
     * // using "_.pluck" callback shorthand
     * _.uniq([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */
    function uniq(array, isSorted, callback, thisArg) {
      var index = -1,
          length = array ? array.length : 0,
          result = [],
          seen = result;

      // juggle arguments
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = isSorted;
        isSorted = false;
      }
      // init value cache for large arrays
      var isLarge = !isSorted && length >= largeArraySize;
      if (isLarge) {
        var cache = {};
      }
      if (callback != null) {
        seen = [];
        callback = lodash.createCallback(callback, thisArg);
      }
      while (++index < length) {
        var value = array[index],
            computed = callback ? callback(value, index, array) : value;

        if (isLarge) {
          var key = keyPrefix + computed;
          var inited = cache[key]
            ? !(seen = cache[key])
            : (seen = cache[key] = []);
        }
        if (isSorted
              ? !index || seen[seen.length - 1] !== computed
              : inited || indexOf(seen, computed) < 0
            ) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      return result;
    }

    /**
     * The inverse of `_.zip`, this method splits groups of elements into arrays
     * composed of elements from each group at their corresponding indexes.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to process.
     * @returns {Array} Returns a new array of the composed arrays.
     * @example
     *
     * _.unzip([['moe', 30, true], ['larry', 40, false]]);
     * // => [['moe', 'larry'], [30, 40], [true, false]];
     */
    function unzip(array) {
      var index = -1,
          length = array ? array.length : 0,
          tupleLength = length ? max(pluck(array, 'length')) : 0,
          result = Array(tupleLength);

      while (++index < length) {
        var tupleIndex = -1,
            tuple = array[index];

        while (++tupleIndex < tupleLength) {
          (result[tupleIndex] || (result[tupleIndex] = Array(length)))[index] = tuple[tupleIndex];
        }
      }
      return result;
    }

    /**
     * Creates an array with all occurrences of the passed values removed using
     * strict equality for comparisons, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} array The array to filter.
     * @param {Mixed} [value1, value2, ...] Values to remove.
     * @returns {Array} Returns a new filtered array.
     * @example
     *
     * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
     * // => [2, 3, 4]
     */
    function without(array) {
      return difference(array, nativeSlice.call(arguments, 1));
    }

    /**
     * Groups the elements of each array at their corresponding indexes. Useful for
     * separate data sources that are coordinated through matching array indexes.
     * For a matrix of nested arrays, `_.zip.apply(...)` can transpose the matrix
     * in a similar fashion.
     *
     * @static
     * @memberOf _
     * @category Arrays
     * @param {Array} [array1, array2, ...] Arrays to process.
     * @returns {Array} Returns a new array of grouped elements.
     * @example
     *
     * _.zip(['moe', 'larry'], [30, 40], [true, false]);
     * // => [['moe', 30, true], ['larry', 40, false]]
     */
    function zip(array) {
      var index = -1,
          length = array ? max(pluck(arguments, 'length')) : 0,
          result = Array(length);

      while (++index < length) {
        result[index] = pluck(arguments, index);
      }
      return result;
    }

    /**
     * Creates an object composed from arrays of `keys` and `values`. Pass either
     * a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`, or
     * two arrays, one of `keys` and one of corresponding `values`.
     *
     * @static
     * @memberOf _
     * @alias object
     * @category Arrays
     * @param {Array} keys The array of keys.
     * @param {Array} [values=[]] The array of values.
     * @returns {Object} Returns an object composed of the given keys and
     *  corresponding values.
     * @example
     *
     * _.zipObject(['moe', 'larry'], [30, 40]);
     * // => { 'moe': 30, 'larry': 40 }
     */
    function zipObject(keys, values) {
      var index = -1,
          length = keys ? keys.length : 0,
          result = {};

      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else {
          result[key[0]] = key[1];
        }
      }
      return result;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * If `n` is greater than `0`, a function is created that is restricted to
     * executing `func`, with the `this` binding and arguments of the created
     * function, only after it is called `n` times. If `n` is less than `1`,
     * `func` is executed immediately, without a `this` binding or additional
     * arguments, and its result is returned.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Number} n The number of times the function must be called before
     * it is executed.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var renderNotes = _.after(notes.length, render);
     * _.forEach(notes, function(note) {
     *   note.asyncSave({ 'success': renderNotes });
     * });
     * // `renderNotes` is run once, after all notes have saved
     */
    function after(n, func) {
      if (n < 1) {
        return func();
      }
      return function() {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with the `this`
     * binding of `thisArg` and prepends any additional `bind` arguments to those
     * passed to the bound function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to bind.
     * @param {Mixed} [thisArg] The `this` binding of `func`.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var func = function(greeting) {
     *   return greeting + ' ' + this.name;
     * };
     *
     * func = _.bind(func, { 'name': 'moe' }, 'hi');
     * func();
     * // => 'hi moe'
     */
    function bind(func, thisArg) {
      // use `Function#bind` if it exists and is fast
      // (in V8 `Function#bind` is slower except when partially applied)
      return support.fastBind || (nativeBind && arguments.length > 2)
        ? nativeBind.call.apply(nativeBind, arguments)
        : createBound(func, thisArg, nativeSlice.call(arguments, 2));
    }

    /**
     * Binds methods on `object` to `object`, overwriting the existing method.
     * Method names may be specified as individual arguments or as arrays of method
     * names. If no method names are provided, all the function properties of `object`
     * will be bound.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {String} [methodName1, methodName2, ...] Method names on the object to bind.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *  'label': 'docs',
     *  'onClick': function() { alert('clicked ' + this.label); }
     * };
     *
     * _.bindAll(view);
     * jQuery('#docs').on('click', view.onClick);
     * // => alerts 'clicked docs', when the button is clicked
     */
    function bindAll(object) {
      var funcs = arguments.length > 1 ? concat.apply(arrayRef, nativeSlice.call(arguments, 1)) : functions(object),
          index = -1,
          length = funcs.length;

      while (++index < length) {
        var key = funcs[index];
        object[key] = bind(object[key], object);
      }
      return object;
    }

    /**
     * Creates a function that, when called, invokes the method at `object[key]`
     * and prepends any additional `bindKey` arguments to those passed to the bound
     * function. This method differs from `_.bind` by allowing bound functions to
     * reference methods that will be redefined or don't yet exist.
     * See http://michaux.ca/articles/lazy-function-definition-pattern.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Object} object The object the method belongs to.
     * @param {String} key The key of the method.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'name': 'moe',
     *   'greet': function(greeting) {
     *     return greeting + ' ' + this.name;
     *   }
     * };
     *
     * var func = _.bindKey(object, 'greet', 'hi');
     * func();
     * // => 'hi moe'
     *
     * object.greet = function(greeting) {
     *   return greeting + ', ' + this.name + '!';
     * };
     *
     * func();
     * // => 'hi, moe!'
     */
    function bindKey(object, key) {
      return createBound(object, key, nativeSlice.call(arguments, 2), indicatorObject);
    }

    /**
     * Creates a function that is the composition of the passed functions,
     * where each function consumes the return value of the function that follows.
     * For example, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
     * Each function is executed with the `this` binding of the composed function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} [func1, func2, ...] Functions to compose.
     * @returns {Function} Returns the new composed function.
     * @example
     *
     * var greet = function(name) { return 'hi ' + name; };
     * var exclaim = function(statement) { return statement + '!'; };
     * var welcome = _.compose(exclaim, greet);
     * welcome('moe');
     * // => 'hi moe!'
     */
    function compose() {
      var funcs = arguments;
      return function() {
        var args = arguments,
            length = funcs.length;

        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }

    /**
     * Produces a callback bound to an optional `thisArg`. If `func` is a property
     * name, the created callback will return the property value for a given element.
     * If `func` is an object, the created callback will return `true` for elements
     * that contain the equivalent object properties, otherwise it will return `false`.
     *
     * Note: All Lo-Dash methods, that accept a `callback` argument, use `_.createCallback`.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Mixed} [func=identity] The value to convert to a callback.
     * @param {Mixed} [thisArg] The `this` binding of the created callback.
     * @param {Number} [argCount=3] The number of arguments the callback accepts.
     * @returns {Function} Returns a callback function.
     * @example
     *
     * var stooges = [
     *   { 'name': 'moe', 'age': 40 },
     *   { 'name': 'larry', 'age': 50 }
     * ];
     *
     * // wrap to create custom callback shorthands
     * _.createCallback = _.wrap(_.createCallback, function(func, callback, thisArg) {
     *   var match = /^(.+?)__([gl]t)(.+)$/.exec(callback);
     *   return !match ? func(callback, thisArg) : function(object) {
     *     return match[2] == 'gt' ? object[match[1]] > match[3] : object[match[1]] < match[3];
     *   };
     * });
     *
     * _.filter(stooges, 'age__gt45');
     * // => [{ 'name': 'larry', 'age': 50 }]
     *
     * // create mixins with support for "_.pluck" and "_.where" callback shorthands
     * _.mixin({
     *   'toLookup': function(collection, callback, thisArg) {
     *     callback = _.createCallback(callback, thisArg);
     *     return _.reduce(collection, function(result, value, index, collection) {
     *       return (result[callback(value, index, collection)] = value, result);
     *     }, {});
     *   }
     * });
     *
     * _.toLookup(stooges, 'name');
     * // => { 'moe': { 'name': 'moe', 'age': 40 }, 'larry': { 'name': 'larry', 'age': 50 } }
     */
    function createCallback(func, thisArg, argCount) {
      if (func == null) {
        return identity;
      }
      var type = typeof func;
      if (type != 'function') {
        if (type != 'object') {
          return function(object) {
            return object[func];
          };
        }
        var props = keys(func);
        return function(object) {
          var length = props.length,
              result = false;
          while (length--) {
            if (!(result = isEqual(object[props[length]], func[props[length]], indicatorObject))) {
              break;
            }
          }
          return result;
        };
      }
      if (typeof thisArg != 'undefined') {
        if (argCount === 1) {
          return function(value) {
            return func.call(thisArg, value);
          };
        }
        if (argCount === 2) {
          return function(a, b) {
            return func.call(thisArg, a, b);
          };
        }
        if (argCount === 4) {
          return function(accumulator, value, index, collection) {
            return func.call(thisArg, accumulator, value, index, collection);
          };
        }
        return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
      }
      return func;
    }

    /**
     * Creates a function that will delay the execution of `func` until after
     * `wait` milliseconds have elapsed since the last time it was invoked. Pass
     * an `options` object to indicate that `func` should be invoked on the leading
     * and/or trailing edge of the `wait` timeout. Subsequent calls to the debounced
     * function will return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true`, `func` will be called
     * on the trailing edge of the timeout only if the the debounced function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to debounce.
     * @param {Number} wait The number of milliseconds to delay.
     * @param {Object} options The options object.
     *  [leading=false] A boolean to specify execution on the leading edge of the timeout.
     *  [trailing=true] A boolean to specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * var lazyLayout = _.debounce(calculateLayout, 300);
     * jQuery(window).on('resize', lazyLayout);
     *
     * jQuery('#postbox').on('click', _.debounce(sendMail, 200, {
     *   'leading': true,
     *   'trailing': false
     * });
     */
    function debounce(func, wait, options) {
      var args,
          inited,
          result,
          thisArg,
          timeoutId,
          trailing = true;

      function delayed() {
        inited = timeoutId = null;
        if (trailing) {
          result = func.apply(thisArg, args);
        }
      }
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (options && objectTypes[typeof options]) {
        leading = options.leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      return function() {
        args = arguments;
        thisArg = this;
        clearTimeout(timeoutId);

        if (!inited && leading) {
          inited = true;
          result = func.apply(thisArg, args);
        } else {
          timeoutId = setTimeout(delayed, wait);
        }
        return result;
      };
    }

    /**
     * Defers executing the `func` function until the current call stack has cleared.
     * Additional arguments will be passed to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to defer.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
     * @returns {Number} Returns the timer id.
     * @example
     *
     * _.defer(function() { alert('deferred'); });
     * // returns from the function before `alert` is called
     */
    function defer(func) {
      var args = nativeSlice.call(arguments, 1);
      return setTimeout(function() { func.apply(undefined, args); }, 1);
    }
    // use `setImmediate` if it's available in Node.js
    if (isV8 && freeModule && typeof setImmediate == 'function') {
      defer = bind(setImmediate, context);
    }

    /**
     * Executes the `func` function after `wait` milliseconds. Additional arguments
     * will be passed to `func` when it is invoked.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to delay.
     * @param {Number} wait The number of milliseconds to delay execution.
     * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
     * @returns {Number} Returns the timer id.
     * @example
     *
     * var log = _.bind(console.log, console);
     * _.delay(log, 1000, 'logged later');
     * // => 'logged later' (Appears after one second.)
     */
    function delay(func, wait) {
      var args = nativeSlice.call(arguments, 2);
      return setTimeout(function() { func.apply(undefined, args); }, wait);
    }

    /**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * passed, it will be used to determine the cache key for storing the result
     * based on the arguments passed to the memoized function. By default, the first
     * argument passed to the memoized function is used as the cache key. The `func`
     * is executed with the `this` binding of the memoized function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] A function used to resolve the cache key.
     * @returns {Function} Returns the new memoizing function.
     * @example
     *
     * var fibonacci = _.memoize(function(n) {
     *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
     * });
     */
    function memoize(func, resolver) {
      var cache = {};
      return function() {
        var key = keyPrefix + (resolver ? resolver.apply(this, arguments) : arguments[0]);
        return hasOwnProperty.call(cache, key)
          ? cache[key]
          : (cache[key] = func.apply(this, arguments));
      };
    }

    /**
     * Creates a function that is restricted to execute `func` once. Repeat calls to
     * the function will return the value of the first call. The `func` is executed
     * with the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // `initialize` executes `createApplication` once
     */
    function once(func) {
      var ran,
          result;

      return function() {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);

        // clear the `func` variable so the function may be garbage collected
        func = null;
        return result;
      };
    }

    /**
     * Creates a function that, when called, invokes `func` with any additional
     * `partial` arguments prepended to those passed to the new function. This
     * method is similar to `_.bind`, except it does **not** alter the `this` binding.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var greet = function(greeting, name) { return greeting + ' ' + name; };
     * var hi = _.partial(greet, 'hi');
     * hi('moe');
     * // => 'hi moe'
     */
    function partial(func) {
      return createBound(func, nativeSlice.call(arguments, 1));
    }

    /**
     * This method is similar to `_.partial`, except that `partial` arguments are
     * appended to those passed to the new function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to partially apply arguments to.
     * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * var defaultsDeep = _.partialRight(_.merge, _.defaults);
     *
     * var options = {
     *   'variable': 'data',
     *   'imports': { 'jq': $ }
     * };
     *
     * defaultsDeep(options, _.templateSettings);
     *
     * options.variable
     * // => 'data'
     *
     * options.imports
     * // => { '_': _, 'jq': $ }
     */
    function partialRight(func) {
      return createBound(func, nativeSlice.call(arguments, 1), null, indicatorObject);
    }

    /**
     * Creates a function that, when executed, will only call the `func` function
     * at most once per every `wait` milliseconds. Pass an `options` object to
     * indicate that `func` should be invoked on the leading and/or trailing edge
     * of the `wait` timeout. Subsequent calls to the throttled function will
     * return the result of the last `func` call.
     *
     * Note: If `leading` and `trailing` options are `true`, `func` will be called
     * on the trailing edge of the timeout only if the the throttled function is
     * invoked more than once during the `wait` timeout.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Function} func The function to throttle.
     * @param {Number} wait The number of milliseconds to throttle executions to.
     * @param {Object} options The options object.
     *  [leading=true] A boolean to specify execution on the leading edge of the timeout.
     *  [trailing=true] A boolean to specify execution on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * var throttled = _.throttle(updatePosition, 100);
     * jQuery(window).on('scroll', throttled);
     *
     * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
     *   'trailing': false
     * }));
     */
    function throttle(func, wait, options) {
      var args,
          result,
          thisArg,
          timeoutId,
          lastCalled = 0,
          leading = true,
          trailing = true;

      function trailingCall() {
        timeoutId = null;
        if (trailing) {
          lastCalled = new Date;
          result = func.apply(thisArg, args);
        }
      }
      if (options === false) {
        leading = false;
      } else if (options && objectTypes[typeof options]) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      return function() {
        var now = new Date;
        if (!timeoutId && !leading) {
          lastCalled = now;
        }
        var remaining = wait - (now - lastCalled);
        args = arguments;
        thisArg = this;

        if (remaining <= 0) {
          clearTimeout(timeoutId);
          timeoutId = null;
          lastCalled = now;
          result = func.apply(thisArg, args);
        }
        else if (!timeoutId) {
          timeoutId = setTimeout(trailingCall, remaining);
        }
        return result;
      };
    }

    /**
     * Creates a function that passes `value` to the `wrapper` function as its
     * first argument. Additional arguments passed to the function are appended
     * to those passed to the `wrapper` function. The `wrapper` is executed with
     * the `this` binding of the created function.
     *
     * @static
     * @memberOf _
     * @category Functions
     * @param {Mixed} value The value to wrap.
     * @param {Function} wrapper The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var hello = function(name) { return 'hello ' + name; };
     * hello = _.wrap(hello, function(func) {
     *   return 'before, ' + func('moe') + ', after';
     * });
     * hello();
     * // => 'before, hello moe, after'
     */
    function wrap(value, wrapper) {
      return function() {
        var args = [value];
        push.apply(args, arguments);
        return wrapper.apply(this, args);
      };
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
     * corresponding HTML entities.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} string The string to escape.
     * @returns {String} Returns the escaped string.
     * @example
     *
     * _.escape('Moe, Larry & Curly');
     * // => 'Moe, Larry &amp; Curly'
     */
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }

    /**
     * This function returns the first argument passed to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Mixed} value Any value.
     * @returns {Mixed} Returns `value`.
     * @example
     *
     * var moe = { 'name': 'moe' };
     * moe === _.identity(moe);
     * // => true
     */
    function identity(value) {
      return value;
    }

    /**
     * Adds functions properties of `object` to the `lodash` function and chainable
     * wrapper.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object of function properties to add to `lodash`.
     * @example
     *
     * _.mixin({
     *   'capitalize': function(string) {
     *     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
     *   }
     * });
     *
     * _.capitalize('moe');
     * // => 'Moe'
     *
     * _('moe').capitalize();
     * // => 'Moe'
     */
    function mixin(object) {
      forEach(functions(object), function(methodName) {
        var func = lodash[methodName] = object[methodName];

        lodash.prototype[methodName] = function() {
          var value = this.__wrapped__,
              args = [value];

          push.apply(args, arguments);
          var result = func.apply(lodash, args);
          return (value && typeof value == 'object' && value == result)
            ? this
            : new lodashWrapper(result);
        };
      });
    }

    /**
     * Reverts the '_' variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */
    function noConflict() {
      context._ = oldDash;
      return this;
    }

    /**
     * Converts the given `value` into an integer of the specified `radix`.
     * If `radix` is `undefined` or `0`, a `radix` of `10` is used unless the
     * `value` is a hexadecimal, in which case a `radix` of `16` is used.
     *
     * Note: This method avoids differences in native ES3 and ES5 `parseInt`
     * implementations. See http://es5.github.com/#E.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} value The value to parse.
     * @param {Number} [radix] The radix used to interpret the value to parse.
     * @returns {Number} Returns the new integer value.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     */
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function(value, radix) {
      // Firefox and Opera still follow the ES3 specified implementation of `parseInt`
      return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
    };

    /**
     * Produces a random number between `min` and `max` (inclusive). If only one
     * argument is passed, a number between `0` and the given number will be returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Number} [min=0] The minimum possible value.
     * @param {Number} [max=1] The maximum possible value.
     * @returns {Number} Returns a random number.
     * @example
     *
     * _.random(0, 5);
     * // => a number between 0 and 5
     *
     * _.random(5);
     * // => also a number between 0 and 5
     */
    function random(min, max) {
      if (min == null && max == null) {
        max = 1;
      }
      min = +min || 0;
      if (max == null) {
        max = min;
        min = 0;
      }
      return min + floor(nativeRandom() * ((+max || 0) - min + 1));
    }

    /**
     * Resolves the value of `property` on `object`. If `property` is a function,
     * it will be invoked with the `this` binding of `object` and its result returned,
     * else the property value is returned. If `object` is falsey, then `undefined`
     * is returned.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Object} object The object to inspect.
     * @param {String} property The property to get the value of.
     * @returns {Mixed} Returns the resolved value.
     * @example
     *
     * var object = {
     *   'cheese': 'crumpets',
     *   'stuff': function() {
     *     return 'nonsense';
     *   }
     * };
     *
     * _.result(object, 'cheese');
     * // => 'crumpets'
     *
     * _.result(object, 'stuff');
     * // => 'nonsense'
     */
    function result(object, property) {
      var value = object ? object[property] : undefined;
      return isFunction(value) ? object[property]() : value;
    }

    /**
     * A micro-templating method that handles arbitrary delimiters, preserves
     * whitespace, and correctly escapes quotes within interpolated code.
     *
     * Note: In the development build, `_.template` utilizes sourceURLs for easier
     * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
     *
     * For more information on precompiling templates see:
     * http://lodash.com/#custom-builds
     *
     * For more information on Chrome extension sandboxes see:
     * http://developer.chrome.com/stable/extensions/sandboxingEval.html
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} text The template text.
     * @param {Object} data The data object used to populate the text.
     * @param {Object} options The options object.
     *  escape - The "escape" delimiter regexp.
     *  evaluate - The "evaluate" delimiter regexp.
     *  interpolate - The "interpolate" delimiter regexp.
     *  sourceURL - The sourceURL of the template's compiled source.
     *  variable - The data object variable name.
     * @returns {Function|String} Returns a compiled function when no `data` object
     *  is given, else it returns the interpolated text.
     * @example
     *
     * // using a compiled template
     * var compiled = _.template('hello <%= name %>');
     * compiled({ 'name': 'moe' });
     * // => 'hello moe'
     *
     * var list = '<% _.forEach(people, function(name) { %><li><%= name %></li><% }); %>';
     * _.template(list, { 'people': ['moe', 'larry'] });
     * // => '<li>moe</li><li>larry</li>'
     *
     * // using the "escape" delimiter to escape HTML in data property values
     * _.template('<b><%- value %></b>', { 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
     * _.template('hello ${ name }', { 'name': 'curly' });
     * // => 'hello curly'
     *
     * // using the internal `print` function in "evaluate" delimiters
     * _.template('<% print("hello " + epithet); %>!', { 'epithet': 'stooge' });
     * // => 'hello stooge!'
     *
     * // using custom template delimiters
     * _.templateSettings = {
     *   'interpolate': /{{([\s\S]+?)}}/g
     * };
     *
     * _.template('hello {{ name }}!', { 'name': 'mustache' });
     * // => 'hello mustache!'
     *
     * // using the `sourceURL` option to specify a custom sourceURL for the template
     * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
     *
     * // using the `variable` option to ensure a with-statement isn't used in the compiled template
     * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     *   var __t, __p = '', __e = _.escape;
     *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
     *   return __p;
     * }
     *
     * // using the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and a stack trace
     * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */
    function template(text, data, options) {
      // based on John Resig's `tmpl` implementation
      // http://ejohn.org/blog/javascript-micro-templating/
      // and Laura Doktorova's doT.js
      // https://github.com/olado/doT
      var settings = lodash.templateSettings;
      text || (text = '');

      // avoid missing dependencies when `iteratorTemplate` is not defined
      options = defaults({}, options, settings);

      var imports = defaults({}, options.imports, settings.imports),
          importsKeys = keys(imports),
          importsValues = values(imports);

      var isEvaluating,
          index = 0,
          interpolate = options.interpolate || reNoMatch,
          source = "__p += '";

      // compile the regexp to match each delimiter
      var reDelimiters = RegExp(
        (options.escape || reNoMatch).source + '|' +
        interpolate.source + '|' +
        (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
        (options.evaluate || reNoMatch).source + '|$'
      , 'g');

      text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);

        // escape characters that cannot be included in string literals
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

        // replace delimiters with snippets
        if (escapeValue) {
          source += "' +\n__e(" + escapeValue + ") +\n'";
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += "';\n" + evaluateValue + ";\n__p += '";
        }
        if (interpolateValue) {
          source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
        }
        index = offset + match.length;

        // the JS engine embedded in Adobe products requires returning the `match`
        // string in order to produce the correct `offset` value
        return match;
      });

      source += "';\n";

      // if `variable` is not specified, wrap a with-statement around the generated
      // code to add the data object to the top of the scope chain
      var variable = options.variable,
          hasVariable = variable;

      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      // cleanup code by stripping empty strings
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
        .replace(reEmptyStringMiddle, '$1')
        .replace(reEmptyStringTrailing, '$1;');

      // frame code as the function body
      source = 'function(' + variable + ') {\n' +
        (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
        "var __t, __p = '', __e = _.escape" +
        (isEvaluating
          ? ', __j = Array.prototype.join;\n' +
            "function print() { __p += __j.call(arguments, '') }\n"
          : ';\n'
        ) +
        source +
        'return __p\n}';

      // Use a sourceURL for easier debugging and wrap in a multi-line comment to
      // avoid issues with Narwhal, IE conditional compilation, and the JS engine
      // embedded in Adobe products.
      // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
      var sourceURL = '\n/*\n//@ sourceURL=' + (options.sourceURL || '/lodash/template/source[' + (templateCounter++) + ']') + '\n*/';

      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch(e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      // provide the compiled function's source via its `toString` method, in
      // supported environments, or the `source` property as a convenience for
      // inlining compiled templates during the build process
      result.source = source;
      return result;
    }

    /**
     * Executes the `callback` function `n` times, returning an array of the results
     * of each `callback` execution. The `callback` is bound to `thisArg` and invoked
     * with one argument; (index).
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {Number} n The number of times to execute the callback.
     * @param {Function} callback The function called per iteration.
     * @param {Mixed} [thisArg] The `this` binding of `callback`.
     * @returns {Array} Returns a new array of the results of each `callback` execution.
     * @example
     *
     * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
     * // => [3, 6, 4]
     *
     * _.times(3, function(n) { mage.castSpell(n); });
     * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
     *
     * _.times(3, function(n) { this.cast(n); }, mage);
     * // => also calls `mage.castSpell(n)` three times
     */
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1,
          result = Array(n);

      callback = lodash.createCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }

    /**
     * The inverse of `_.escape`, this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to their
     * corresponding characters.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} string The string to unescape.
     * @returns {String} Returns the unescaped string.
     * @example
     *
     * _.unescape('Moe, Larry &amp; Curly');
     * // => 'Moe, Larry & Curly'
     */
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }

    /**
     * Generates a unique ID. If `prefix` is passed, the ID will be appended to it.
     *
     * @static
     * @memberOf _
     * @category Utilities
     * @param {String} [prefix] The value to prefix the ID with.
     * @returns {String} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }

    /*--------------------------------------------------------------------------*/

    /**
     * Invokes `interceptor` with the `value` as the first argument, and then
     * returns `value`. The purpose of this method is to "tap into" a method chain,
     * in order to perform operations on intermediate results within the chain.
     *
     * @static
     * @memberOf _
     * @category Chaining
     * @param {Mixed} value The value to pass to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {Mixed} Returns `value`.
     * @example
     *
     * _([1, 2, 3, 4])
     *  .filter(function(num) { return num % 2 == 0; })
     *  .tap(alert)
     *  .map(function(num) { return num * num; })
     *  .value();
     * // => // [2, 4] (alerted)
     * // => [4, 16]
     */
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }

    /**
     * Produces the `toString` result of the wrapped value.
     *
     * @name toString
     * @memberOf _
     * @category Chaining
     * @returns {String} Returns the string result.
     * @example
     *
     * _([1, 2, 3]).toString();
     * // => '1,2,3'
     */
    function wrapperToString() {
      return String(this.__wrapped__);
    }

    /**
     * Extracts the wrapped value.
     *
     * @name valueOf
     * @memberOf _
     * @alias value
     * @category Chaining
     * @returns {Mixed} Returns the wrapped value.
     * @example
     *
     * _([1, 2, 3]).valueOf();
     * // => [1, 2, 3]
     */
    function wrapperValueOf() {
      return this.__wrapped__;
    }

    /*--------------------------------------------------------------------------*/

    // add functions that return wrapped values when chaining
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.countBy = countBy;
    lodash.createCallback = createCallback;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forIn = forIn;
    lodash.forOwn = forOwn;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.range = range;
    lodash.reject = reject;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.unzip = unzip;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.zip = zip;
    lodash.zipObject = zipObject;

    // add aliases
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;

    // add functions to `lodash.prototype`
    mixin(lodash);

    /*--------------------------------------------------------------------------*/

    // add functions that return unwrapped values when chaining
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;

    // add aliases
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;

    forOwn(lodash, function(func, methodName) {
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName] = function() {
          var args = [this.__wrapped__];
          push.apply(args, arguments);
          return func.apply(lodash, args);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    // add functions capable of returning wrapped and unwrapped values when chaining
    lodash.first = first;
    lodash.last = last;

    // add aliases
    lodash.take = first;
    lodash.head = first;

    forOwn(lodash, function(func, methodName) {
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName]= function(callback, thisArg) {
          var result = func(this.__wrapped__, callback, thisArg);
          return callback == null || (thisArg && typeof callback != 'function')
            ? result
            : new lodashWrapper(result);
        };
      }
    });

    /*--------------------------------------------------------------------------*/

    /**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type String
     */
    lodash.VERSION = '1.2.1';

    // add "Chaining" functions to the wrapper
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;

    // add `Array` functions that return unwrapped values
    forEach(['join', 'pop', 'shift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return func.apply(this.__wrapped__, arguments);
      };
    });

    // add `Array` functions that return the wrapped value
    forEach(['push', 'reverse', 'sort', 'unshift'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });

    // add `Array` functions that return new wrapped values
    forEach(['concat', 'slice', 'splice'], function(methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function() {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments));
      };
    });

    return lodash;
  }

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  var _ = runInContext();

  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window._ = _;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return _;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && !freeExports.nodeType) {
    // in Node.js or RingoJS v0.8.0+
    if (freeModule) {
      (freeModule.exports = _)._ = _;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports._ = _;
    }
  }
  else {
    // in a browser or Rhino
    window._ = _;
  }
}(this));

});

require.define("/src/base64.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
/**
 * @fileOverview Base64 encoding and decoding for binary data and strings.
 * @module ink/strings/base64
 * @copyright Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * @author Masanao Izumo <iz@onicos.co.jp>
 * @author Kris Kowal
 * @author Christoph Dorn
 * @author Hannes Wallnoefer
 * @author Terry Weiss
 */

var encodeChars = [
	65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47];
var decodeChars = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1];

var padding = "=".charCodeAt( 0 );

var binary = require( './binary' );
var Binary = binary.Binary;
var ByteString = binary.ByteString;
var ByteArray = binary.ByteArray;

/**
 * Encode a string or binary to a Base64 encoded string
 * @param {String|Binary} str A string or binary object to encode
 * @param {String=} encoding Encoding to use if
 *     first argument is a string. Defaults to 'utf8'. Valid values are 'utf8', 'ascii' and 'ucs2'.
 * @returns {string} The Base64 encoded string
 * @example
 *      strings = require("ink-strings");
 *      strings.encode( "\\77/[]0987432fgfsujdnfosksuwm*&^%$#@" )
 *      ->'XDc3L1tdMDk4NzQzMmZnZnN1amRuZm9za3N1d20qJl4lJCNA'
 */
exports.encode = function ( str, encoding ) {
	var c1, c2, c3;
	encoding = encoding || 'utf8';
	var input = str instanceof Binary ? str : binary.toByteString( str, encoding );
	var length = input.length;
	var output = new ByteArray( 4 * (length + (3 - length % 3) % 3) / 3 );

	var i = 0,
		j = 0;
	while ( i < length ) {
		c1 = input.buffer[i++];
		if ( i === length ) {
			//noinspection JSHint
			output.buffer[j++] = encodeChars[c1 >> 2];
			//noinspection JSHint
			output.buffer[j++] = encodeChars[(c1 & 0x3) << 4];
			output.buffer[j++] = padding;
			output.buffer[j++] = padding;
			break;
		}
		c2 = input.buffer[i++];
		if ( i === length ) {
			//noinspection JSHint
			output.buffer[j++] = encodeChars[c1 >> 2];
			//noinspection JSHint
			output.buffer[j++] = encodeChars[((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4)];
			//noinspection JSHint
			output.buffer[j++] = encodeChars[(c2 & 0xF) << 2];
			output.buffer[j++] = padding;
			break;
		}
		c3 = input.buffer[i++];
		//noinspection JSHint
		output.buffer[j++] = encodeChars[c1 >> 2];
		//noinspection JSHint
		output.buffer[j++] = encodeChars[((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4)];
		//noinspection JSHint
		output.buffer[j++] = encodeChars[((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6)];
		//noinspection JSHint
		output.buffer[j++] = encodeChars[c3 & 0x3F];
	}
	// length should be correct already, but just to be sure
	output.length = j;
	return output.decodeToString( 'ascii' );
};

/**
 * Decodes a Base64 encoded string to a string or byte array.
 * @param {String} str the Base64 encoded string
 * @param {String=} encoding the encoding to use for the return value.
 *     Defaults to 'utf8'. Use 'raw' to get a ByteArray instead of a string. Other valid values are 'utf8', 'ascii' and 'ucs2'.
 * @returns {string|ByteArray} The decoded string or ByteArray
 * @example
 *      strings = require("ink-strings");
 *      strings.decode( "XDc3L1tdMDk4NzQzMmZnZnN1amRuZm9za3N1d20qJl4lJCNA" );
 *      -> '\\77/[]0987432fgfsujdnfosksuwm*&^%$#@'
 *
 */
exports.decode = function ( str, encoding ) {
	var c1, c2, c3, c4;
	var input = str instanceof Binary ? str : binary.toByteString( str, 'ascii' );
	var length = input.length;
	var output = new ByteArray( length * 3 / 4 );
	var i = 0,
		j = 0;
	outer: while ( i < length ) { /* c1 */
		do {
			c1 = decodeChars[input.buffer[i++]];
		} while ( i < length && c1 === -1 );

		if ( c1 === -1 ) {
			break;
		}

		/* c2 */
		do {
			c2 = decodeChars[input.buffer[i++]];
		} while ( i < length && c2 === -1 );

		if ( c2 === -1 ) {
			break;
		}
		//noinspection JSHint
		output.buffer[j++] = (c1 << 2) | ((c2 & 0x30) >> 4);

		/* c3 */
		do {
			c3 = input.buffer[i++];
			if ( c3 === padding ) {
				break outer;
			}
			c3 = decodeChars[c3];
		} while ( i < length && c3 === -1 );

		if ( c3 === -1 ) {
			break;
		}
		//noinspection JSHint
		output.buffer[j++] = ((c2 & 0xF) << 4) | ((c3 & 0x3C) >> 2);

		/* c4 */
		do {
			c4 = input.buffer[i++];
			if ( c4 === padding ) {
				break outer;
			}
			c4 = decodeChars[c4];
		} while ( i < length && c4 === -1 );

		if ( c4 === -1 ) {
			break;
		}
		//noinspection JSHint
		output.buffer[j++] = ((c3 & 0x03) << 6) | c4;
	}

	output.length = j;
	encoding = encoding || 'utf8';
	return encoding === 'raw' ? output : output.decodeToString( encoding );
};

});

require.define("/src/binary.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
/**
 * @fileoverview Binary, ByteArray and ByteString classes as defined in
 * [CommonJS Binary/B](http://wiki.commonjs.org/wiki/Binary/B). This file is included in ink-strings
 * primarily to support the base64 encoding methods in {@link module:ink/strings/base64}. But they are still a valuable
 * set of tools if you need 'em.
 * @copyright Copyright 2012 Hannes Wallnoefer <hannes@helma.at>
 * @author Hannes Wallnoefer <hannes@helma.at>
 * @author Terry Weiss <me@terryweiss.net>
 * @module ink/strings/binary
 */

/**
 * The valid set of encoding supported by this library
 * @dict
 * @property {string} US-ASCII 'ascii'
 * @property {string} UTF-8 'utf8'
 * @property {string} ISO-10646-UCS-2 'ucs2'
 */
var encodings = exports.encodings = {
	'US-ASCII'        : 'ascii',
	'UTF-8'           : 'utf8',
	'ISO-10646-UCS-2' : 'ucs2'
};

/**
 * Abstract base class for {@link ByteArray} and {@link ByteString}
 *
 * @constructor
 * @abstract
 */
var Binary = exports.Binary = function () {};

/**
 * Constructs a writable and growable byte array.
 *
 * If the first argument to this constructor is a number, it specifies the
 * initial length of the ByteArray in bytes.
 *
 * Else, the argument defines the content of the ByteArray. If the argument is a
 * String, the constructor requires a second argument containing the name of the
 * String's encoding. If called without arguments, an empty ByteArray is
 * returned.
 *
 * The constructor also accepts a
 * [Node.js Buffer](http://nodejs.org/api/buffer.html).
 *
 * Also, if you pass in Number as the first argument and "false" as the second,
 * then the newly created array will not be cleared.
 *
 * @param {Binary|Array|String|Number|Buffer} contentOrLength Content or length
 * of the ByteArray.
 * @param {String=} charset The encoding name if the first argument is a
 * String.
 * @constructor
 * @augments module:ink/strings/binary~Binary
 */
var ByteArray = exports.ByteArray = function () {
	if ( !(this instanceof ByteArray) ) {
		if ( arguments.length === 0 ) {return new ByteArray();}
		if ( arguments.length === 1 ) {return new ByteArray( arguments[0] );}
		if ( arguments.length === 2 ) {return new ByteArray( arguments[0], arguments[1] );}
	}

	// ByteArray() - construct an empty byte string
	if ( arguments.length === 0 ) {
		this.buffer = new Buffer( 0 );
	}
	// ByteArray(length) - create ByteArray of specified size
	else if ( arguments.length === 1 && typeof arguments[0] === "number" ) {
		this.buffer = new Buffer( arguments[0] );
		this.buffer.fill( 0 );
	}
	// ByteArray(length) - create ByteArray of specified size, but don't clear
	else if ( arguments.length === 2 && typeof arguments[0] === "number" && typeof arguments[1] === "boolean" ) {
		this.buffer = new Buffer( arguments[0] );
		if ( arguments[1] === true ) {
			this.buffer.fill( 0 );
		}
	}
	// ByteArray(byteString or byteArray) - use the contents of byteString or
	// byteArray
	else if ( arguments.length === 1 && (arguments[0] instanceof ByteString || arguments[0] instanceof ByteArray) ) {
		var source = arguments[0];
		this.buffer = new Buffer( source.length );
		source.buffer.copy( this.buffer );
	}
	// ByteArray(arrayOfNumbers) - use the numbers in arrayOfNumbers as the bytes
	else if ( arguments.length === 1 && Array.isArray( arguments[0] ) ) {
		this.buffer = new Buffer( arguments[0] );
	}
	// ByteArray(buffer) - use contents of buffer
	else if ( arguments.length === 1 && arguments[0] instanceof Buffer ) {
		var buffer = arguments[0];
		this.buffer = new Buffer( buffer.length );
		buffer.copy( this.buffer );
	}
	// ByteArray(string, charset) - convert a string - the ByteArray will contain
	// string encoded with charset
	else if ( (arguments.length === 1 || (arguments.length === 2 && arguments[1] === undefined)) && typeof arguments[0] === "string" ) {
		this.buffer = new Buffer( arguments[0] );
	} else if ( arguments.length === 2 && typeof arguments[0] === "string" && typeof arguments[1] === "string" ) {
		this.buffer = new Buffer( arguments[0], encodings[arguments[1]] );
	} else {
		throw new Error( "Illegal arguments to ByteArray constructor" );
	}

	return this;
};

ByteArray.prototype = new Binary();


Object.defineProperty( ByteArray.prototype, 'length', {
	get : function () {
		return this.buffer.length;
	},
	set : function ( length ) {
		var buffer = new Buffer( length );
		length = Math.min( this.buffer.length, length );
		this.buffer.copy( buffer, 0, 0, length );
		buffer.fill( 0, length );
		this.buffer = buffer;
	}
} );

/**
 * Constructs an immutable byte string.
 *
 * If the first argument is a String, the constructor requires a second argument
 * containing the name of the String's encoding. If called without arguments, an
 * empty ByteString is returned.
 *
 * The constructor also accepts a
 * [Node.js Buffer](http://nodejs.org/api/buffer.html).
 *
 * @param {Binary|Array|String|Buffer} content The content of the ByteString.
 * @param {String=} charset The encoding name if the first argument is a String.
 * @constructor
 * @augments module:ink/strings/binary~Binary
 */
var ByteString = exports.ByteString = function () {
	if ( !(this instanceof ByteString) ) {
		if ( arguments.length === 0 ) {return new ByteString();}
		if ( arguments.length === 1 ) {return new ByteString( arguments[0] );}
		if ( arguments.length === 2 ) {return new ByteString( arguments[0], arguments[1] );}
	}

	// ByteString() - construct an empty byte string
	if ( arguments.length === 0 ) {
		this.buffer = new Buffer( 0 );
	}
	// ByteString(byteString) - returns byteString, which is immutable
	else if ( arguments.length === 1 && arguments[0] instanceof ByteString ) {
		return arguments[0];
	}
	// ByteString(byteArray) - use the contents of byteArray
	else if ( arguments.length === 1 && arguments[0] instanceof ByteArray ) {
		var source = arguments[0];
		this.buffer = new Buffer( source.length );
		source.buffer.copy( this.buffer );
	}
	// ByteString(buffer) - use contents of buffer
	else if ( arguments.length === 1 && arguments[0] instanceof Buffer ) {
		var buffer = arguments[0];
		this.buffer = new Buffer( buffer.length );
		buffer.copy( this.buffer );
	}
	// ByteString(arrayOfNumbers) - use the numbers in arrayOfNumbers as the bytes
	else if ( arguments.length === 1 && Array.isArray( arguments[0] ) ) {
		this.buffer = new Buffer( arguments[0] );
	}
	// ByteString(string, charset) - convert a string - the ByteString will
	// contain string encoded with charset
	else if ( (arguments.length === 1 || (arguments.length === 2 && arguments[1] === undefined)) && typeof arguments[0] === "string" ) {
		this.buffer = new Buffer( arguments[0] );
	} else if ( arguments.length === 2 && typeof arguments[0] === "string" && typeof arguments[1] === "string" ) {
		this.buffer = new Buffer( arguments[0], encodings[arguments[1]] );
	} else {
		throw new Error( "Illegal arguments to ByteString constructor" + JSON.stringify( arguments ) );
	}

	return this;
};

ByteString.prototype = new Binary();

/**
 * Returns the length of the byte string
 * @type {integer}
 * @memberof module:ink/strings~ByteString
 * @name length
 */
Object.defineProperty( ByteString.prototype, 'length', {
	get : function () {
		return this.buffer.length;
	},
	set : function () {}
} );

/**
 * Converts the String to a mutable ByteArray using the specified encoding.
 * @param {string} str The string to convert
 * @param {String} charset the name of the string encoding. Defaults to 'UTF-8'
 * @returns {ByteArray} a ByteArray representing the string
 */
exports.toByteArray = function ( str, charset ) {
	charset = charset || 'UTF-8';
	return new ByteArray( String( str ), charset );
};

/**
 * Converts the String to an immutable ByteString using the specified encoding.
 * @param {string} str The string to convert
 * @param {String} charset the name of the string encoding. Defaults to 'UTF-8'
 * @returns {ByteString} a ByteString representing the string
 */
exports.toByteString = function ( str, charset ) {
	charset = charset || 'UTF-8';
	return new ByteString( String( str ), charset );
};

/**
 * Reverses the content of the ByteArray in-place
 *
 * @returns {ByteArray} this ByteArray with its elements reversed
 */
ByteArray.prototype.reverse = function () {
	// "limit" is halfway, rounded down. "top" is the last index.
	var limit = Math.floor( this.length / 2 ),
		top = this.length - 1;

	// swap each pair of bytes, up to the halfway point
	for ( var i = 0; i < limit; i++ ) {
		var tmp = this.buffer[i];
		this.buffer[i] = this.buffer[top - i];
		this.buffer[top - i] = tmp;
	}

	return this;
};

/**
 * Sorts the content of the ByteArray in-place.
 * @private
 * @param {Function} comparator the function to compare entries
 * @returns {ByteArray} this ByteArray with its elements sorted
 */
var numericCompareFunction = function ( o1, o2 ) {
	return o1 - o2;
};

/**
 * Sorts a ByteArray.
 * @param {function(byte)=} compareFunction A function to be executed against each element in the ByteArray
 *      If not present, the bytes are compared numerically. Otherwise
 *      it works like a regular JS array sorter
 *
 */
ByteArray.prototype.sort = function ( compareFunction ) {
	// TODO: inefficient, optimize
	var array = this.toArray();

	if ( arguments.length ) {array.sort( compareFunction );}
	else {array.sort( numericCompareFunction );}

	for ( var i = 0; i < array.length; i++ ) {this.set( i, array[i] );}
};

/**
 * Apply a function for each element in the ByteArray.
 *
 * @param {function(byte)} fn the function to call for each element
 * @param {Object=} thisObj optional this-object for callback
 */
ByteArray.prototype.forEach = function ( callback, thisObject ) {
	for ( var i = 0, length = this.length; i < length; i++ ) {callback.apply( thisObject, [this.get( i ), i, this] );}
};

/**
 * Return a ByteArray containing the elements of this ByteArray for which the
 * callback function returns true.
 *
 * @param {function(byte)} callback the filter function
 * @param {Object=} thisObj optional this-object for callback
 * @returns {ByteArray} a new ByteArray
 */
ByteArray.prototype.filter = function ( callback, thisObject ) {
	var result = new ByteArray( this.length );
	for ( var i = 0, length = this.length; i < length; i++ ) {
		var value = this.get( i );
		if ( callback.apply( thisObject, [value, i, this] ) ) {result.push( value );}
	}
	return result;
};

/**
 * Tests whether some element in the array passes the test implemented by the
 * provided function.
 *
 * @param {function(byte)} callback the callback function
 * @param {Object=} thisObj optional this-object for callback
 * @returns {Boolean} true if at least one invocation of callback returns true
 */
ByteArray.prototype.some = function ( callback, thisObject ) {
	for ( var i = 0, length = this.length; i < length; i++ ) {if ( callback.apply( thisObject, [this.get( i ), i, this] ) ) {return true;}}
	return false;
};

/**
 * Tests whether all elements in the array pass the test implemented by the
 * provided function.
 *
 * @param {function(byte)} callback the callback function
 * @param {Object=} thisObj optional this-object for callback
 * @returns {Boolean} true if every invocation of callback returns true
 */
ByteArray.prototype.every = function ( callback, thisObject ) {
	for ( var i = 0, length = this._length; i < length; i++ ) {if ( !callback.apply( thisObject, [this.get( i ), i, this] ) ) { return false;}}
	return true;
};

/**
 * Returns a new ByteArray whose content is the result of calling the provided
 * function with every element of the original ByteArray
 *
 * @param {function(byte)} callback the callback
 * @param {Object=} thisObj optional this-object for callback
 * @returns {ByteArray} a new ByteArray
 */
ByteArray.prototype.map = function ( callback, thisObject ) {
	var result = new ByteArray( this.length );
	for ( var i = 0, length = this.length; i < length; i++ ) {result.set( i, callback.apply( thisObject, [this.get( i ), i, this] ) );}
	return result;
};

/**
 * Apply a function to each element in this ByteArray as to reduce its content
 * to a single value.
 *
 * @param {function(byte)} callback the function to call with each element of the
 * ByteArray
 * @param {*=} initialValue optional argument to be used as the first argument to the
 * first call to the callback
 * @returns {*} the return value of the last callback invocation
 * @see https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Array/reduce
 */
ByteArray.prototype.reduce = function ( callback, initialValue ) {
	var value = initialValue;
	for ( var i = 0, length = this.length; i < length; i++ ) {value = callback( value, this.get( i ), i, this );}
	return value;
};

/**
 * Apply a function to each element in this ByteArray starting at the last
 * element as to reduce its content to a single value.
 *
 * @param {function(byte)} callback the function to call with each element of the
 * ByteArray
 * @param {*=} initialValue optional argument to be used as the first argument to the
 * first call to the callback
 * @returns {*} the return value of the last callback invocation
 * @see ByteArray.prototype.reduce
 * @see https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/Array/reduceRight
 */
ByteArray.prototype.reduceRight = function ( callback, initialValue ) {
	var value = initialValue;
	for ( var i = this.length - 1; i > 0; i-- ) {value = callback( value, this.get( i ), i, this );}
	return value;
};

/**
 * Removes the last element from an array and returns that element.
 *
 * @returns {Number}
 */
ByteArray.prototype.pop = function () {
	if ( this.length === 0 ) {return undefined;}

	var last = this.buffer[this.length - 1];
	// TODO sort this out as it's very expensive, maybe somehow use
	// https://github.com/substack/node-buffers? alternatively could just
	// deprecate this
	this.length--;

	return last;
};

/**
 * Appends the given elements and returns the new length of the array.
 *
 * @param {...Number} num... one or more numbers to append
 * @returns {Number} the new length of the ByteArray
 */
ByteArray.prototype.push = function () {
	var length, newLength = this.length += length = arguments.length;
	try {
		for ( var i = 0; i < length; i++ ) {this.set( newLength - length + i, arguments[i] );}
	} catch ( e ) {
		this.length -= length;
		throw e;
	}
	return newLength;
};

/**
 * Removes the first element from the ByteArray and returns that element. This
 * method changes the length of the ByteArray
 *
 * @returns {Number} the removed first element
 */
ByteArray.prototype.shift = function () {
	if ( this.length === 0 ) { return undefined;}
	var first = this.buffer[0];
	var buffer = new Buffer( this.length - 1 );
	this.buffer.copy( buffer, 0, 1 );
	this.buffer = buffer;
	return first;
};

/**
 * Adds one or more elements to the beginning of the ByteArray and returns its
 * new length.
 *
 * @param {...Number} num... one or more numbers to append
 * @returns {Number} the new length of the ByteArray
 */
ByteArray.prototype.unshift = function () {
	var copy = this.slice();
	this.length = 0;
	try {
		this.push.apply( this, arguments );
		this.push.apply( this, copy.toArray() );
		return this.length;
	} catch ( e ) {
		this.length = copy.length;
		copy.buffer.copy( this.buffer );
		throw e;
	}
};

/**
 * Changes the content of the ByteArray, adding new elements while removing old
 * elements.
 *
 * @param {Number} index the index at which to start changing the ByteArray
 * @param {Number} howMany The number of elements to remove at the given
 * position
 * @param {...Number} elements... the new elements to add at the given position
 */
ByteArray.prototype.splice = function ( index, howMany ) {
	if ( index === undefined ) {return;}
	if ( index < 0 ) {index += this.length;}
	if ( howMany === undefined ) {howMany = this.length - index;}
	var end = index + howMany;
	var remove = this.slice( index, end );
	var keep = this.slice( end );
	var inject = Array.prototype.slice.call( arguments, 2 );
	this.length = index;
	this.push.apply( this, inject );
	this.push.apply( this, keep.toArray() );
	return remove;
};

/**
 * Copy a range of bytes between start and stop from this object to another
 * ByteArray at the given target offset.
 *
 * @param {Number} start
 * @param {Number} end
 * @param {ByteArray} target
 * @param {Number} targetOffset
 * @name ByteArray.prototype.copy
 * @function
 */
ByteArray.prototype.copy = function ( start, end, target, targetOffset ) {
	//TODO validate parameters
	target.length = targetOffset + (end - start);
	this.buffer.copy( target.buffer, targetOffset, start, end );
};

/**
 * The length in bytes. This property is writable. Setting it to a value higher
 * than the current value fills the new slots with 0, setting it to a lower
 * value truncates the byte array.
 *
 * @type Number
 * @name ByteArray.prototype.length
 */

/**
 * Returns a new ByteArray containing a portion of this ByteArray.
 *
 * @param {Number} begin Zero-based index at which to begin extraction. As a
 * negative index, begin indicates an offset from the end of the sequence.
 * @param {Number} end Zero-based index at which to end extraction. slice
 * extracts up to but not including end. As a negative index, end indicates an
 * offset from the end of the sequence. If end is omitted, slice extracts to the
 * end of the sequence.
 * @returns {ByteArray} a new ByteArray
 */
ByteArray.prototype.slice = function () {
	return new ByteArray( ByteString.prototype.slice.apply( this, arguments ) );
};

/**
 * Returns a ByteArray composed of itself concatenated with the given
 * ByteString, ByteArray, and Array values.
 *
 * @param {Binary|Array} arg... one or more elements to concatenate
 * @returns {ByteArray} a new ByteArray
 */
ByteArray.prototype.concat = function () {
	var components = [this],
		totalLength = this.length;

	for ( var i = 0; i < arguments.length; i++ ) {
		var component = Array.isArray( arguments[i] ) ? arguments[i] : [arguments[i]];

		for ( var j = 0; j < component.length; j++ ) {
			var subcomponent = component[j];
			if ( !(subcomponent instanceof ByteString) && !(subcomponent instanceof ByteArray) ) {throw "Arguments to ByteArray.concat() must be ByteStrings, ByteArrays, or Arrays of those.";}

			components.push( subcomponent );
			totalLength += subcomponent.length;
		}
	}

	var result = new ByteArray( totalLength ),
		offset = 0;

	components.forEach( function ( component ) {
		component.buffer.copy( result.buffer, offset );
		offset += component.length;
	} );

	return result;
};

/**
 * Returns a ByteArray
 * @return {ByteArray}
 */
ByteArray.prototype.toByteArray = function () {
	return new ByteArray( this.buffer );
};

/**
 *Returns a ByteString
 * @return {ByteString}
 */
ByteArray.prototype.toByteString = function () {
	return new ByteString( this.buffer );
};

/**
 * Returns an array containing the bytes as numbers.
 *
 * @name ByteArray.prototype.toArray
 * @function
 * @returns {array.<byte>}
 */

/**
 * Returns a String representation of the ByteArray.
 *
 * @param {string=} charset The charset to use to create the string
@return {string}
 */
ByteArray.prototype.toString = function ( charset ) {
	if ( charset ) {return this.decodeToString( charset );}

	return "[ByteArray " + this.length + "]";
};

/**
 * Returns the ByteArray decoded to a String using the given encoding
 *
 * @param {String} encoding the name of the encoding to use
 * @name ByteArray.prototype.decodeToString
 * @function
 * @return {String}
 */

/**
 * Returns the index of the first occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length) or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 *
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the first occurrence of sequence, or -1
 * @name ByteArray.prototype.indexOf
 * @function
 *
 */

/**
 * Returns the index of the last occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length) or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 *
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the last occurrence of sequence, or -1
 * @name ByteArray.prototype.lastIndexOf
 * @function
 */

/**
 * Split at delimiter, which can by a Number, a ByteString, a ByteArray or an
 * Array of the prior (containing multiple delimiters, i.e., "split at any of
 * these delimiters"). Delimiters can have arbitrary size.
 *
 * @param {Number|Binary} delimiter one or more delimiter items
 * @param {Object} options optional object parameter with the following optional
 * properties:
 * <ul>
 * <li>count - Maximum number of elements (ignoring delimiters) to return. The
 * last returned element may contain delimiters.</li>
 * <li>includeDelimiter - Whether the delimiter should be included in the
 * result.</li>
 * </ul>
@return {array.<ByteArray>}
 */
ByteArray.prototype.split = function () {
	var components = ByteString.prototype.split.apply( this.toByteString(), arguments );

	// convert ByteStrings to ByteArrays
	for ( var i = 0; i < components.length; i++ ) {
		components[i] = new ByteArray( components[i] );
	}

	return components;
};

/**
 * Returns a byte for byte copy of this immutable ByteString as a mutable
 * ByteArray.
 *
@return {ByteArray}
 */
ByteString.prototype.toByteArray = function () {
	return new ByteArray( this );
};

/**
 * Returns this ByteString itself.
 *
 @return {ByteString}
 */
ByteString.prototype.toByteString = function () {
	return this;
};

/**
 * Returns an array containing the bytes as numbers.

 * @param {String} charset optional the name of the string encoding
 * @return {array}
 */
Binary.prototype.toArray = function ( charset ) {
	if ( charset ) {
		return Array.prototype.map.call( this.buffer.toString( encodings[charset] ), function ( x ) {
			return x.charCodeAt( 0 );
		} );
	} else {
		return Array.prototype.slice.call( this.buffer, 0 );
	}
};

/**
 * Returns a debug representation such as `"[ByteString 10]"` where 10 is the
 * length of this ByteString.
 *
 @return {string}
 */
ByteString.prototype.toString = function () {
	return '[ByteString ' + this.buffer.length + ']';
};

/**
 * Returns this ByteString as string, decoded using the given charset.
 *
 * @name ByteString.prototype.decodeToString
 * @param {String=} charset the name of the string encoding
    @return {string}
 */
Binary.prototype.decodeToString = function ( charset ) {
	return this.buffer.toString( encodings[charset] );
};

/**
 * Returns the index of the first occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length), or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 *
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the first occurrence of sequence, or -1

 */
Binary.prototype.indexOf = function ( byteValue, start, stop ) {
	// HACK: use ByteString's slice since we know we won't be modifying result
	var array = ByteString.prototype.slice.apply( this, [start, stop] ).toArray(),
		result = array.indexOf( byteValue );
	return (result < 0) ? -1 : result + (start || 0);
};

/**
 * Returns the index of the last occurrence of sequence (a Number or a
 * ByteString or ByteArray of any length) or -1 if none was found. If start
 * and/or stop are specified, only elements between the indexes start and stop
 * are searched.
 *
 * @param {Number|Binary} sequence the number or binary to look for
 * @param {Number} start optional index position at which to start searching
 * @param {Number} stop optional index position at which to stop searching
 * @returns {Number} the index of the last occurrence of sequence, or -1

 */
Binary.prototype.lastIndexOf = function ( byteValue, start, stop ) {
	// HACK: use ByteString's slice since we know we won't be modifying result
	var array = ByteString.prototype.slice.apply( this, [start, stop] ).toArray(),
		result = array.lastIndexOf( byteValue );
	return (result < 0) ? -1 : result + (start || 0);
};

/**
 * Returns the byte at the given offset as a ByteString.
 *

 * @param {Number} offset
 * @returns {Number}
   @function
 */
ByteString.prototype.byteAt = ByteString.prototype.charAt = function ( offset ) {
	if ( offset < 0 || offset >= this.buffer.length ) {return new ByteString();}
	return new ByteString( [this.buffer[offset]] );
};

/**
 * Returns the byte at the given offset as a ByteString.
 *

 * @param {Number} offset
 * @returns {Number}
 @method
 */
ByteArray.prototype.byteAt = function ( offset ) {
	if ( offset < 0 || offset >= this.buffer.length ) {return new ByteArray();}
	return new ByteArray( [this.buffer[offset]] );
};

/**
 * Returns the byte at the given offset.
 *

 * @param {Number} offset
 * @returns {ByteString}
    @method
 */
Binary.prototype.get = ByteString.prototype.charCodeAt = function ( offset ) {
	return this.buffer[offset];
};

ByteArray.prototype.set = function ( offset, value ) {
	this.buffer[offset] = value;
};

/**
 * Copy a range of bytes between start and stop from this ByteString to a target
 * ByteArray at the given targetStart offset.
 *
 * @param {Number} start
 * @param {Number} end
 * @param {ByteArray} target
 * @param {Number} targetStart

 */
ByteString.prototype.copy = function ( start, end, target, targetOffset ) {
	//TODO validate parameters
	target.length = targetOffset + (end - start);
	this.buffer.copy( target.buffer, targetOffset, start, end );
};

/**
 * Split at delimiter, which can by a Number, a ByteString, a ByteArray or an
 * Array of the prior (containing multiple delimiters, i.e., "split at any of
 * these delimiters"). Delimiters can have arbitrary size.
 *
 * @param {Number|Binary} delimiter one or more delimiter items
 * @param {Object} options optional object parameter with the following optional
 * properties:
 * <ul>
 * <li>count - Maximum number of elements (ignoring delimiters) to return. The
 * last returned element may contain delimiters.</li>
 * <li>includeDelimiter - Whether the delimiter should be included in the
 * result.</li>
 * </ul>
@return {array}
 */
ByteString.prototype.split = function ( delimiters, options ) {
	// taken from https://github.com/kriskowal/narwhal-lib/
	options = options || {};

	var includeDelimiter = options.includeDelimiter || false;

	// standardize delimiters into an array of ByteStrings:
	if ( !Array.isArray( delimiters ) ) {delimiters = [delimiters];}

	delimiters = delimiters.map( function ( delimiter ) {
		if ( typeof delimiter === "number" ) {
			delimiter = [delimiter];
		}
		return new ByteString( delimiter );
	} );

	var components = [],
		startOffset = 0,
		currentOffset = 0;

	// loop until there's no more bytes to consume
	bytes_loop: while ( currentOffset < this.length ) {

		// try each delimiter until we find a match
		delimiters_loop: for ( var i = 0; i < delimiters.length; i++ ) {
			var d = delimiters[i];
			if ( !d.length ) {
				currentOffset = this.length;
				continue bytes_loop;
			}
			for ( var j = 0; j < d.length; j++ ) {

				// reached the end of the bytes, OR bytes not equal
				if ( currentOffset + j > this.length || this.buffer[currentOffset + j] !== d.buffer[j] ) {

					continue delimiters_loop;
				}
			}

			// push the part before the delimiter
			components.push( this.slice( startOffset, currentOffset ) );

			// optionally push the delimiter
			if ( includeDelimiter ) {components.push( this.slice( currentOffset, currentOffset + d.length ) );}

			// reset the offsets
			startOffset = currentOffset = currentOffset + d.length;

			continue bytes_loop;
		}

		// if there was no match, increment currentOffset to try the next one
		currentOffset++;
	}

	// push the remaining part, if any
	if ( currentOffset > startOffset ) {components.push( this.slice( startOffset, currentOffset ) );}

	return components;
};

/**
 * Returns a new ByteString containing a portion of this ByteString.
 *
 * @param {Number} begin Zero-based index at which to begin extraction. As a
 * negative index, begin indicates an offset from the end of the sequence.
 * @param {Number} end Zero-based index at which to end extraction. slice
 * extracts up to but not including end. As a negative index, end indicates an
 * offset from the end of the sequence. If end is omitted, slice extracts to the
 * end of the sequence.
 * @returns {ByteString} a new ByteString

 */
ByteString.prototype.slice = function ( begin, end ) {
	if ( !begin || typeof begin !== "number" ) {begin = 0;}
	var length = this.buffer.length;
	if ( begin < 0 ) {begin += length;}
	if ( !end ) {end = length;}
	if ( typeof end !== "number" ) {end = begin;}
	if ( end < 0 ) {end += length;}
	if ( begin < 0 ) {begin = 0;}
	if ( end < begin ) {end = begin;}
	if ( begin > length ) {begin = length;}
	if ( end > length ) {end = length;}
	var buffer = new Buffer( end - begin );
	this.buffer.copy( buffer, 0, begin, end );
	return new ByteString( buffer );
};

/**
 * Returns a ByteString composed of itself concatenated with the given
 * ByteString, ByteArray, and Array values.
 *
 * @param {Binary|Array} arg... one or more elements to concatenate
 * @returns {ByteString} a new ByteString

 */
ByteString.prototype.concat = function ( arg ) {
	var components = [this],
		totalLength = this.length;

	for ( var i = 0; i < arguments.length; i++ ) {
		var component = Array.isArray( arguments[i] ) ? arguments[i] : [arguments[i]];

		for ( var j = 0; j < component.length; j++ ) {
			var subcomponent = component[j];
			if ( !(subcomponent instanceof ByteString) && !(subcomponent instanceof ByteArray) ) {throw "Arguments to ByteString.concat() must be ByteStrings, ByteArrays, or Arrays of those.";}

			components.push( subcomponent );
			totalLength += subcomponent.length;
		}
	}

	var result = new Buffer( totalLength ),
		offset = 0;

	components.forEach( function ( component ) {
		component.buffer.copy( result, offset );
		offset += component.length;
	} );

	return new ByteString( result );
};

});

require.define("/src/generators.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
/**
 * This is all about generating strings in one form or another. Yo.
 * @author Terry Weiss
 * @author zumbrunn
 * @author Esa-Matti Suurone
 * @module ink/strings/generators
 */


/**
 * function repeats a string passed as argument
 *
 * @param {String}
 *            string the string to reproduce
 * @param {Number}
 *            num amount of repetitions
 * @param {string=} sep Separate the strings with this
 * @returns {String} resulting string
 * @example
 *      var strings = require("ink-strings");
 *      strings.repeat( "there's no place line home", 3, " " )
 *      ->  "there's no place line home there's no place line home there's no place line home"
 *
 */
exports.repeat = function ( string, num, sep ) {
	sep = sep || '';
	var list = [];
	for ( var i = 0; i < num; i++ ) {
		list[ i ] = string;
	}
	return list.join( sep );
};

/**
 * factory to create functions for sorting objects in an array
 *
 * @param {String}
 *            field name of the field each object is compared with
 * @param {Number}
 *            order (ascending or descending)
 * @returns {Function} ready for use in Array.prototype.sort
 * @example
 *     var characters = [{name:"rory", age:30}, {name: "amy", age:30}, {"mr weasley": age:60}];
 *     var strings = require("ink-strings");
 *     characters.sort(string.sorter("name"));
 *     -> [{name:"amy", age:30}, {name: "mr weasley", age:60}, {"rory": age:30}];
 */
exports.sorter = function ( field, order ) {
	if ( !order ) {
		order = 1;
	}
	return function ( a, b ) {
		var str1 = String( a[ field ] || '' ).toLowerCase();
		var str2 = String( b[ field ] || '' ).toLowerCase();
		if ( str1 > str2 ) { return order; }
		if ( str1 < str2 ) { return order * -1; }
		return 0;
	};
};

/**
 * create a string from a bunch of substrings
 *
 * @param {String}
 *            one or more strings as arguments
 * @returns {String} the resulting string
 */
exports.compose = function () {
	return Array.join( arguments, '' );
};

/**
 * creates a random string (numbers and chars)
 *
 * @param {Number}
 *            len length of key
 * @param {Number}
 *            mode determines which letters to use. null or 0 = all letters; 1 = skip 0, 1, l and o which can easily be
 *            mixed with numbers; 2 = use numbers only
 * @returns random string
 */
exports.random = function ( len, mode ) {
	var x;
	if ( mode === 2 ) {
		x = Math.random() * Math.pow( 10, len );
		return Math.floor( x );
	}
	var keystr = '';
	for ( var i = 0; i < len; i++ ) {
		x = Math.floor( ( Math.random() * 36 ) );
		if ( mode === 1 ) {
			// skip 0,1
			x = ( x < 2 ) ? x + 2 : x;
			// don't use the letters l (charCode 21+87) and o (24+87)
			x = ( x === 21 ) ? 22 : x;
			x = ( x === 24 ) ? 25 : x;
		}
		if ( x < 10 ) {
			keystr += String( x );
		} else {
			keystr += String.fromCharCode( x + 87 );
		}
	}
	return keystr;
};

/**
 * Creates a random string, in this case a UUID-like thingy. I call it a Uniquely Interesting ID. It is *not* globally unique
 * or even really unique. Just random and with a known format. Also available as uiid
 *
 * @returns {string}
 * @method
 *
 */
exports.tempKey = exports.uiid = function () {

	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function ( c ) {
		//noinspection JSHint
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : ( r & 0x3 | 0x8 );
		return v.toString( 16 );
	} );

};

});

require.define("/src/html.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
/**
 * @fileOverview These methods work with and manipulate html
 * @module ink/strings/html
 * @author Terry Weiss
 * @author zumbrunn
 * @author Esa-Matti Suurone
 */

var patterns = require( "./patterns" );

/**
 * Converts entity characters to HTML equivalents.
 *
 * @param {string}
 *            str The string to work with
 * @return {string}
 */
exports.unescapeHTML = function ( str ) {
	if ( str === null ) {
		return '';
	}
	return String( str ).replace( /\&([^;]+);/g, function ( entity, entityCode ) {
		var match;

		if ( entityCode in patterns.escapeChars ) {
			return patterns.escapeChars[ entityCode ];

		} else { //noinspection JSHint
			if ( match = entityCode.match( /^#x([\da-fA-F]+)$/ ) ) {
				return String.fromCharCode( parseInt( match[ 1 ], 16 ) );
			} else { //noinspection JSHint
				if ( match = entityCode.match( /^#(\d+)$/ ) ) {
					//noinspection JSHint
					return String.fromCharCode( ~~match[ 1 ] );
				} else {
					return entity;
				}
			}
		}
	} );
};

/**
 * translates all characters of a string into HTML entities
 *
 * @param {String}
 *            string the string
 * @returns {String} translated result
 * @example
 *      var strings = require("ink-strings");
 *      strings.entitize("test me");
 *      -> "&#116;&#101;&#115;&#116;&#32;&#109;&#101;"
 */
exports.entitize = function ( string ) {
	var buffer = [];
	for ( var i = 0; i < string.length; i++ ) {
		buffer.push( "&#", string.charCodeAt( i ).toString(), ";" );
	}
	return buffer.join( "" );
};

/**
 * Remove all potential HTML/XML tags from this string
 *
 * @param {String}
 *            string the string
 * @return {String} the processed string
 */
exports.stripTags = function ( string ) {
	return string.replace( /<\/?[^>]+>/gi, '' );
};

/**
 * Escape the string to make it safe for use within an HTML document.
 *
 * @param {String}
 *            string the string to escape
 * @return {String} the escaped string
 */
exports.escapeHtml = function ( string ) {
	return string.replace( /&/g, '&amp;' ).replace( /"/g, '&quot;' ).replace( />/g, '&gt;' ).replace( /</g, '&lt;' );
};


});

require.define("/src/patterns.js",function(require,module,exports,__dirname,__filename,process,global){/**
 @fileOverview The patterns are used by the library to help identify and
 manage types of strings. You can access those here and modify them or
 borrow them

 @module ink/strings/patterns
 @author Terry Weiss
 @author zumbrunn
 @author Esa-Matti Suurone
 @author Scott Gonzalez
 */
/**
 * This pattern will test for a url
 * @type {RegExp}
 */
exports.URLPATTERN = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
/**
 * This pattern tests for a hexadecimal string
 * @type {RegExp}
 */
exports.HEXPATTERN = /[^a-fA-F0-9]/;
/**
 * This pattern looks for only alphanumerics
 * @type {RegExp}
 */
exports.ANUMPATTERN = /[^a-zA-Z0-9]/;
/**
 * This pattern looks only for alphabetic characters
 * @type {RegExp}
 */
exports.APATTERN = /[^a-zA-Z]/;
/**
 * This pattern looks for only numbers
 * @type {RegExp}
 */
exports.NUMPATTERN = /[^0-9]/;
/**
 * This pattern tests for a valid email
 * @type {RegExp}
 */
// Email and URL RegExps contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
// licensed under MIT license - http://www.opensource.org/licenses/mit-license.php
exports.EMAILPATTERN = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;
/**
 * Tests for capital letters
 * @type {RegExp}
 */
exports.CAPITALSPATTERN = /([A-Z]+)/g;
/**
 * Tests for breaking characters like -, _ etc.
 * @type {RegExp}
 */
exports.SEPARATORS = /[\-_\s](.)/g;

/**
 * Tests for line break characters
 * @type {RegExp}
 */
exports.LINEBREAKS = /[\n|\r]/g;

/**
 * Tests for <br/> tags
 * @type {RegExp}
 */
exports.BRTAGS = /<[w]?br *\/?>/g;
/**
 * HTML characters to escape
 * @type {{lt: string, gt: string, quot: string, apos: string, amp: string}}
 */
exports.escapeChars = {
	lt   : '<',
	gt   : '>',
	quot : '"',
	apos : "'",
	amp  : '&'
};

/**
 * Tests for RegEx charachters
 * @type {RegExp}
 */
exports.REGEXCHARS = /([.*+?^=!:${}()|[\]\/\\])/g;


});

require.define("/src/shape.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
/**
 * @fileOverview These methods shape a string into the form you
 * want it
 * @module ink/strings/shape
 * @author Terry Weiss
 * @author zumbrunn
 * @author Esa-Matti Suurone
 * @author Pavel Pravosud
 * @requires ink/strings/patterns
 * @requires lodash
 */

var patterns = require( "./patterns" );
var tests = require("./tests") ;
var sys = require( "lodash" );

var nativeTrim = String.prototype.trim;
var nativeTrimRight = String.prototype.trimRight;
var nativeTrimLeft = String.prototype.trimLeft;
var defaultToWhiteSpace = function ( characters ) {
	if ( sys.isNull( characters ) ) {
		return '\\s';
	} else if ( characters.source ) {
		return characters.source;
	} else {
		return '[' + exports.escapeRegExp( characters ) + ']';
	}
};

/**
 * converts a string into a hexadecimal color representation (e.g. "ffcc33") from a color string
 * like "rgb (255, 204, 51)".
 *
 * @param {String}
 *            string the string to convert
 * @returns {String} the resulting hex color (w/o "#")
 * @example
 *      var strings = require("ink-strings");
 *      strings.toHexColor("rgb(255, 0, 0)");
 *      -> "ff0000"
 */
exports.toHexColor = function ( string ) {
	// noinspection MagicNumberJS
	var HEXVALUE = 16;
	if ( tests.startsWith( string, "rgb" ) ) {
		var buffer = [];
		var col = string.replace( /[^0-9,]/g, '' );

		sys.each( col.split( "," ), function ( part ) {
			var num = parseInt( part, 10 );
			var hex = num.toString( HEXVALUE );
			buffer.push( exports.pad( hex, 2, "0", -1 ) );
		} );

		return buffer.join( "" );
	}
	var color = string.replace( new RegExp( patterns.HEXPATTERN.source ), '' );
	return exports.pad( color.toLowerCase(), 6, "0", -1 );
};

/**
 * function cleans a string by throwing away all non-alphanumeric characters
 *
 * @returns cleaned string
 */
exports.toAlphanumeric = function ( string ) {
	return string.replace( new RegExp( patterns.ANUMPATTERN.source, "g" ), '' );
};

/**
 * Transforms string from space, dash, or underscore notation to camel-case.
 *
 * @param {String}
 *            string a string
 * @returns {String} the resulting string
 * @example
 *      strings.camelize( "the_doctor" );
 *      -> "theDoctor"
 */
exports.camelize = function ( string ) {
	return string.replace( patterns.CAPITALSPATTERN,function ( m, l ) {
		// "ABC" -> "Abc"
		return l[ 0 ].toUpperCase() + l.substring( 1 ).toLowerCase();
	} ).replace( patterns.SEPARATORS, function ( m, l ) {
			// foo-bar -> fooBar
			return l.toUpperCase();
		} );
};

/**
 * function inserts a string every number of characters
 *
 * @param {String}
 *            string
 * @param {Number}
 *            interval number of characters after which insertion should take place
 * @param {String}
 *            string to be inserted

 * @returns String resulting string
 * @example
 *      strings.group( "Madame Vastra wears a veil", 3, ":)" )
 *      -> "Mad:)ame:) Va:)str:)a w:)ear:)s a:) ve:)il:)"
 */
exports.group = function ( string, interval, str ) {
	if ( !interval || interval < 1 ) {
		// noinspection MagicNumberJS
		interval = 20;
	}
	if ( !str || string.length < interval ) { return string; }
	var buffer = [];
	for ( var i = 0; i < string.length; i += interval ) {
		var strPart = string.substring( i, i + interval );
		buffer.push( strPart );
//		if ( ignoreWhiteSpace === true || ( strPart.length === interval && !/\s/g.test( strPart ) ) ) {
		buffer.push( str );
//		}
	}
	return buffer.join( "" );
};

/**
 * replace all linebreaks and optionally all br tags
 *
 * @param {String}
 *            flag indicating if html tags should be replaced
 * @param {Boolean=}
 *            removeTags When true, <br/> and \n \r are all removed
 * @param {string=} replacement for the linebreaks / html tags
 * @returns {string} the unwrapped string
 * @example
 *      strings.unwrap( "The Doctor <br/>has a cool\n bowtie" );
 *      -> "The Doctor <br/>has a cool bowtie"
 *
 *      strings.unwrap( "The Doctor <br/>has a cool\n bowtie", true );
 *      ->"The Doctor has a cool bowtie"
 *
 */
exports.unwrap = function ( string, removeTags, replacement ) {
	replacement = replacement || "";
	string = string.replace( patterns.LINEBREAKS, replacement );
	return removeTags === true ? string.replace( patterns.BRTAGS, replacement ) : string;
};

/**
 * Chops a string into chunks that are <code>steps</code> wide.
 *
 * @param {string}
 *            str The string to check
 * @param {integer}
 *            step The chunk to use when chopping the string up
 * @returns {array.<string>}
 */
exports.chop = function ( str, step ) {
	if ( sys.isNull( str ) ) {
		return [];
	}
	str = String( str );
	//noinspection JSHint
	step = ~~step;
	return step > 0 ? str.match( new RegExp( '.{1,' + step + '}', 'g' ) ) : [ str ];
};

/**
 * Compress consecutive whitespaces to one.
 *
 * @param {string}
 *            str The string to check
 * @returns {string}
 */
exports.clean = function ( str ) {
	return exports.trim( str ).replace( /\s+/g, ' ' );
};

/**
 * Returns an array of the characters in the string
 *
 * @param {string}
 *            str The string to split up
 * @returns {array.<string>}
 */
exports.chars = function ( str ) {
	if ( sys.isNull( str ) ) {
		return [];
	}
	return String( str ).split( '' );
};

/**
 * Returns a copy of the string in which all the case-based characters have had their case swapped.
 *
 * @param {string}
 *            str The string to work with
 * @return {string}
 */
exports.swapCase = function ( str ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	return String( str ).replace( /\S/g, function ( c ) {
		return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
	} );

};

/**
 * Splices one string into another.
 *
 * @param {string}
 *            str The string to work with
 * @param {integer}
 *            i The index to start splicing the new string into
 * @param {integer}
 *            howmany How many characters to replace
 * @param {string}
 *            substr The string to splice in
 * @returns {string}
 */
exports.splice = function ( str, i, howmany, substr ) {
	var arr = exports.chars( str );
	//noinspection JSHint
	arr.splice( ~~i, ~~howmany, substr );
	return arr.join( '' );
};

/**
 * Splits a string with <code>\n</code> new line markers into one string per line as an array.
 *
 * @param {string}
 *            str The string to split
 * @returns {array.<string>}
 */
exports.lines = function ( str ) {
	if ( sys.isNull( str ) ) {
		return [];
	}
	return String( str ).split( "\n" );
};

/**
 * Return reversed strings
 *
 * @param {string}
 *            str The string to reverse
 * @returns {string}
 */
exports.reverse = function ( str ) {
	return exports.chars( str ).reverse().join( '' );
};

/**
 * Returns the next alphabetic letter. When you get to Z, you get the next char in the table (set by the OS or the
 * browser), so be careful to limit yourself to alphas only.
 *
 * @param {char}
 *            str The character to get the next letter for
 * @returns {char}
 */
exports.succ = function ( str ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	str = String( str );
	return str.slice( 0, -1 ) + String.fromCharCode( str.charCodeAt( str.length - 1 ) + 1 );
};

/**
 * Converts a camelized or dasherized string into an underscored one
 *
 * @param {string}
 *            str The string to convert
 * @returns {string}
 */
exports.underscored = function ( str ) {
	return exports.trim( str ).replace( /([a-z\d])([A-Z]+)/g, '$1_$2' ).replace( /[-\s]+/g, '_' ).toLowerCase();
};
/**
 * Converts a underscored or camelized string into an dasherized one
 *
 * @param {string}
 *            str The string to convert
 * @returns {string}
 */
exports.dasherize = function ( str ) {
	return exports.trim( str ).replace( /([A-Z])/g, '-$1' ).replace( /[-_\s]+/g, '-' ).toLowerCase();
};
/**
 * Converts string to camelized class name
 *
 * @param {string}
 *            str The string to convert
 * @returns {string}
 */
exports.classify = function ( str ) {
	return exports.titleize( String( str ).replace( /_/g, ' ' ) ).replace( /\s/g, '' );
};
/**
 * Converts an underscored, camelized, or dasherized string into a humanized one. Also removes beginning and ending
 * whitespace, and removes the postfix '_id'.
 *
 * @param {string}
 *            str The string to convert
 * @returns {string}
 */
exports.humanize = function ( str ) {
	return exports.capitalize( exports.underscored( str ).replace( /_id$/, '' ).replace( /_/g, ' ' ) );
};

/**
 * Insert one string into another
 *
 * @param {string}
 *            str The string that receive the insert
 * @param {integer}
 *            i Where to insert the string
 * @param {string}
 *            substr The string to insert
 * @returns {string}
 */
exports.insert = function ( str, i, substr ) {
	return exports.splice( str, i, 0, substr );
};

/**
 * Trims defined characters from begining and ending of the string. Defaults to whitespace characters.
 *
 * @param {string}
 *            str The string to trim

 * @returns {string}
 */
exports.trim = function ( str ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	if ( nativeTrim ) {
		return nativeTrim.call( str );
	}

	return String( str ).replace( new RegExp( /^\s+|\s+$/, 'g' ), '' );
};
/**
 * Left trim. Similar to trim, but only for left side.
 *
 * @param {string}
 *            str The string to trim
 * @param {string=}
 *            characters The characters to replace
 * @returns {string}
 */
exports.ltrim = function ( str, characters ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	if ( !characters && nativeTrimLeft ) {
		return nativeTrimLeft.call( str );
	}
	characters = defaultToWhiteSpace( characters );
	return String( str ).replace( new RegExp( '^' + characters + '+' ), '' );
};
/**
 * Right trim. Similar to trim, but only for right side.
 *
 * @param {string}
 *            str The string to trim
 * @param {string=}
 *            characters The characters to replace
 * @returns {string}
 */
exports.rtrim = function ( str, characters ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	if ( !characters && nativeTrimRight ) {
		return nativeTrimRight.call( str );
	}
	characters = defaultToWhiteSpace( characters );
	return String( str ).replace( new RegExp( characters + '+$' ), '' );
};
/**
 * Truncates a string to a fixed length and you can optionally specify what you want the trailer to be, defaults to
 * "..."
 *
 * @param {string}
 *            str The string to truncate
 * @param {integer}
 *            length The length of the truncated string
 * @param {string=}
 *            truncateStr The trailer
 * @returns {string}
 */
exports.truncate = function ( str, length, truncateStr ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	str = String( str );
	truncateStr = truncateStr || '...';
	//noinspection JSHint
	length = ~~length;
	return str.length > length ? str.slice( 0, length ) + truncateStr : str;
};

/**
 * Prefixes RegEx special characters with a backslash (\).
 *
 * @param {string}
 *            str The string to work with
 * @return {string}
 */
exports.escapeRegExp = function ( str ) {
	if ( str === null ) {
		return '';
	}
	return String( str ).replace( patterns.REGEXCHARS, '\\$1' );
};



/**
 * A more elegant version of truncate prune extra chars, never leaving a half-chopped word.
 *
 * @param {string}
 *            str The string to truncate
 * @param {integer}
 *            length The length of the truncated string
 * @param {string=}
 *            pruneStr The trailer
 * @returns {string}
 * @author Pavel Pravosud
 * @see https://github.com/rwz
 * @see https://github.com/epeli/underscore.string
 */
exports.prune = function ( str, length, pruneStr ) {
	if ( sys.isNull( str ) ) {
		return '';
	}

	str = String( str );
	//noinspection JSHint
	length = ~~length;
	pruneStr = !sys.isEmpty( pruneStr ) ? String( pruneStr ) : '...';

	if ( str.length <= length ) {
		return str;
	}

	var tmpl = function ( c ) {
		return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' ';
	}, template = str.slice( 0, length + 1 ).replace( /.(?=\W*\w*$)/g, tmpl ); // 'Hello, world' -> 'HellAA
	// AAAAA'

	if ( template.slice( template.length - 2 ).match( /\w\w/ ) ) {
		template = template.replace( /\s*\S+$/, '' );
	} else {
		template = exports.rtrim( template.slice( 0, template.length - 1 ) );
	}

	return ( template + pruneStr ).length > str.length ? str : str.slice( 0, template.length ) + pruneStr;
};

/**
 * Split string by delimiter (String or RegExp), /\s+/ by default.
 *
 * @param {string}
 *            str The string to split
 * @param {string=}
 *            delimiter An optional delimiter to use
 * @returns {array.<string>}
 */
exports.words = function ( str, delimiter ) {
	if ( sys.isEmpty( str ) ) {
		return [];
	}
	return exports.trim( str, delimiter ).split( delimiter || /\s+/ );
};
/**
 * Join an array into a human readable sentence.
 *
 * @param {array}
 *            array The array to join
 * @param {string=}
 *            separator The separator to use, defaults to ","
 * @param {string=}
 *            lastSeparator The last seperator to use, defaults to "and"
 * @param {boolean=}
 *            serial Serial commas? defaults to <code>false</code>
 * @returns {string}
 */
exports.toSentence = function ( array, separator, lastSeparator, serial ) {
	separator = separator || ', ';
	lastSeparator = lastSeparator || ' and ';
	var a = array.slice(), lastMember = a.pop();

	if ( array.length > 2 && serial ) {
		lastSeparator = exports.rtrim( separator ) + lastSeparator;
	}

	return a.length ? a.join( separator ) + lastSeparator + lastMember : lastMember;
};

/**
 * The same as toSentence, but adjusts delimeters to use Serial comma.
 *
 * @param {array}
 *            array The array to join
 * @param {string=}
 *            separator The separator to use, defaults to ","
 * @param {string=}
 *            lastSeparator The last seperator to use, defaults to "and"
 * @returns {string}
 */
exports.toSentenceSerial = function () {
	var args = [].slice.call( arguments );
	args[ 3 ] = true;
	return exports.toSentence.apply( exports, args );
};
/**
 * Transform text into a URL slug. Replaces whitespaces, accentuated, and special characters with a dash.
 *
 * @param {string}str
 *            The string to slugify
 * @returns {string}
 */
exports.slugify = function ( str ) {
	if ( sys.isNull( str ) ) {
		return '';
	}

	var from = "ąàáäâãåæćęèéëêìíïîłńòóöôõøùúüûñçżź", to = "aaaaaaaaceeeeeiiiilnoooooouuuunczz", regex = new RegExp(
		defaultToWhiteSpace( from ), 'g' );

	str = String( str ).toLowerCase().replace( regex, function ( c ) {
		var index = from.indexOf( c );
		return to.charAt( index ) || '-';
	} );

	return exports.dasherize( str.replace( /[^\w\s-]/g, '' ) );
};

/**
 * Surround a string with another string.
 *
 * @param {string}
 *            str The string to surround
 * @param {string}
 *            wrapper The string to wrap it with
 * @returns {string}
 */
exports.surround = function ( str, wrapper ) {
	return [ wrapper, str, wrapper ].join( '' );
};
/**
 * Quotes a string.
 *
 * @param {string}
 *            str The string to quote
 * @returns {string}
 */
exports.quote = function ( str ) {
	return exports.surround( str, '"' );
};

var strRepeat = function ( str, qty ) {
	if ( qty < 1 ) {return '';}
	var result = '';
	while ( qty > 0 ) {
		//noinspection JSHint
		if ( qty & 1 ) {result += str;}
		//noinspection JSHint
		qty >>= 1, str += str;
	}
	return result;
};

/**
 * Pads the striong with characters until the total string length is equal to the passed length parameter. By
 * default, pads on the left with the space char (" "). padStr is truncated to a single character if necessary
 *
 * @param {string}
 *            str The string to pad
 * @param {integer}length
 *            The length to pad out
 * @param {string=}
 *            padStr The string to pad with
 * @param {string=}
 *            type How to pad the string, choices are "right", "left", "both"
 * @returns {string}
 */
exports.pad = function ( str, length, padStr, type ) {
	str = str === null ? '' : String( str );
	//noinspection JSHint
	length = ~~length;

	var padlen = 0;

	if ( !padStr ) {
		padStr = ' ';
	} else if ( padStr.length > 1 ) {
		padStr = padStr.charAt( 0 );
	}

	switch ( type ) {
		case 'right':
			padlen = length - str.length;
			return str + strRepeat( padStr, padlen );
		case 'both':
			padlen = length - str.length;
			return strRepeat( padStr, Math.ceil( padlen / 2 ) ) + str +
				strRepeat( padStr, Math.floor( padlen / 2 ) );
		default: // 'left'
			padlen = length - str.length;
			return strRepeat( padStr, padlen ) + str;
	}
};
/**
 * left-pad a string. Alias for pad(str, length, padStr, 'left').
 *
 * @param {string}
 *            str The string to pad
 * @param {integer}length
 *            The length to pad out
 * @param {string=}
 *            padStr The string to pad with
 * @returns {string}
 */
exports.lpad = function ( str, length, padStr ) {
	return exports.pad( str, length, padStr );
};
/**
 * right-pad a string. Alias for pad(str, length, padStr, 'right')
 *
 * @param {string}
 *            str The string to pad
 * @param {integer}length
 *            The length to pad out
 * @param {string=}
 *            padStr The string to pad with
 * @returns {string}
 */
exports.rpad = function ( str, length, padStr ) {
	return exports.pad( str, length, padStr, 'right' );
};
/**
 * left/right-pad a string. Alias for pad(str, length, padStr, 'both')
 *
 * @param {string}
 *            str The string to pad
 * @param {integer}length
 *            The length to pad out
 * @param {string=}
 *            padStr The string to pad with
 * @returns {string}
 */
exports.lrpad = function ( str, length, padStr ) {
	return exports.pad( str, length, padStr, 'both' );
};

var parseNumber = function ( source ) {
	var res = ( source * 1 ) || 0;
	return res;
};

/**
 * Parse string to number. Returns NaN if string can't be parsed to number.
 *
 * @param {string}
 *            str The string to parse
 * @param {integer=}
 *            decimals The number of decimals to return
 * @returns {number}
 */
exports.toNumber = function ( str, decimals ) {
	if ( str === null || str === '' ) {return 0;}
	str = String( str );
	//noinspection JSHint
	var num = parseNumber( parseNumber( str ).toFixed( ~~decimals ) );
	return num === 0 && !str.match( /^0+$/ ) ? Number.NaN : num;
};

/**
 * Joins strings together with given separator
 *
 * @param {...string}
 *            str The strings you want to join.
 * @returns {string}
 */
exports.join = function () {
	var args = [].slice.call( arguments ), separator = args.shift();

	if ( separator === null ) {separator = '';}

	return args.join( separator );
};

/**
 * Returns the string with each first letter capitalized
 *
 * @param {string}
 *            str The string to capitalize
 * @returns {string}
 */
exports.titleize = function ( str ) {
	if ( str === null ) {return '';}
	return String( str ).replace( /(?:^|\s)\S/g, function ( c ) {
		return c.toUpperCase();
	} );
};

/**
 * Converts first letter of the string to uppercase.
 *
 * @param {string}
 *            str The string to check
 * @returns {string}
 */
exports.capitalize = function ( str ) {
	str = str === null ? '' : String( str );
	return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
};

/**
 * Formats a string with {} placeholders like .net's format method. This is a very simple and fast replacement and not an interpolation.
 * It is only appropriate for values and not object unless they format well with `toString()`.
 *
 * @example
 *      var res = strings.format( "Well, this is {0} how do yo do!", "fine" );
 *      ->  "Well, this is fine how do yo do!"
 *
 * @param {string}
 *            format The format string
 * @param {...object}
 *            The contents to replace
 * @return {string}
 */
exports.format = function() {
	var s = arguments[ 0 ];
	for ( var i = 0; i < arguments.length - 1; i++ ) {
		var reg = new RegExp( "\\{" + i + "\\}", "gm" );
		s = s.replace( reg, arguments[ i + 1 ] );
	}

	return s;
};

});

require.define("/src/tests.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
/**
 * @fileOverview These methods test a string for various attributes
 * in a string
 * @module ink/strings/types
 * @author Terry Weiss
 * @author zumbrunn
 * @author Esa-Matti Suurone
 * @requires ink/strings/shape
 * @requires ink/strings/patterns
 * @requires lodash
 */

var shape = require( "./shape" );
var sys = require( "lodash" );
var patterns = require( "./patterns" );

/**
 * checks if a date format pattern is correct
 *
 * @param {String}
 *            string the string to check
 * @returns {Boolean} true if the pattern is correct
 * @example
 *      var strings = require("ink-strings");
 *      strings.isDateFormat("waka waka")
 *      -> false
 *
 *      strings.isDateFormat("01/01/2013")
 *      -> true
 */
exports.isDateFormat = function ( string ) {
	var test = Date.parse( string );
	var res = false;
	if ( !isNaN( test ) ) {
		res = true;
	}
	return res;
};

/**
 * function checks if the string passed contains any characters that are forbidden in URLs and tries to create a
 * java.net.URL from it
 *
 * @param {String}
 *            string the string to check
 * @returns {Boolean}
 * @example
 *      var strings = require("ink-strings");
 *      strings.isUrl("waka waka")
 *      -> false
 *
 *      strings.isUrl("http://home.com/terry")
 *      -> true
 *
 *      strings.isUrl("ftp://home.com/terry")
 *      -> true
 *
 *      strings.isUrl("file://home.com/terry")
 *      -> false // this is arguably wrong, but this is what you should expect from this method
 */
exports.isUrl = function ( string ) {
	return patterns.URLPATTERN.test( string );
};

/**
 * function checks a string for a valid color value in hexadecimal format. it may also contain # as first character
 *
 * @param {String}
 *            string the string to check
 * @returns {Boolean} false, if string length (without #) > 6 or < 6 or contains any character which is not a valid hex
 *          value
 * @example
 *      var strings = require("ink-strings");
 *      strings.isHexColor("fred is a great guy");
 *      -> false
 *
 *      strings.isHexColor("#FF0000");
 *      -> true
 *
 *      strings.isHexColor("ABCDEF");
 *      -> true
 *
 *       strings.isHexColor("ABCDEF00");
 *      -> false
 */
exports.isHexColor = function ( string ) {
	if ( string.indexOf( "#" ) === 0 ) {
		string = string.substring( 1 );
	}
	return string.length === 6 && !patterns.HEXPATTERN.test( string );
};

/**
 * function returns true if the string contains only a-z and 0-9 (case insensitive!)
 *
 * @returns Boolean true in case string is alpha, false otherwise
 */
exports.isAlphanumeric = function ( string ) {
	return string.length && !patterns.ANUMPATTERN.test( string );
};

/**
 * function returns true if the string contains only characters a-z
 *
 * @returns Boolean true in case string is alpha, false otherwise
 */
exports.isAlpha = function ( string ) {
	return string.length && !patterns.APATTERN.test( string );
};

/**
 * function returns true if the string contains only 0-9
 *
 * @returns Boolean true in case string is numeric, false otherwise
 */
exports.isNumeric = function ( string ) {
	return string.length && !patterns.NUMPATTERN.test( string );
};

/**
 * Returns true if string starts with the given substring
 *
 * @param {String}
 *            string the string to search in
 * @param {String}
 *            substring pattern to search for
 * @returns {Boolean} true in case it matches the beginning of the string, false otherwise
 */
exports.startsWith = function ( string, substring ) {
	return string.indexOf( substring ) === 0;
};

/**
 * Returns true if string ends with the given substring
 *
 * @param {String}
 *            string the string to search in
 * @param {String}
 *            substring pattern to search for
 * @returns Boolean true in case it matches the end of the string, false otherwise
 */
exports.endsWith = function ( string, substring ) {
	var diff = string.length - substring.length;
	return diff > -1 && string.lastIndexOf( substring ) === diff;
};

/**
 * Returns true if string contains substring.
 *
 * @param {String}
 *            string the string to search in
 * @param {String}
 *            substring the string to search for
 * @param {Number=}
 *            fromIndex optional index to start searching
 * @returns true if str is contained in this string
 * @type Boolean
 */
exports.contains = function ( string, substring, fromIndex ) {
	fromIndex = fromIndex || 0;
	return string.indexOf( substring, fromIndex ) > -1;
};

/**
 * returns true if the string looks like an e-mail
 *
 * @param {String}
 *            string
 */
exports.isEmail = function ( string ) {
	return patterns.EMAILPATTERN.test( string );
};

/**
 * Get the longest common segment that two strings have in common, starting at the beginning of the string
 *
 * @param {String}
 *            str1 a string
 * @param {String}
 *            str2 another string
 * @returns {String} the longest common segment
 * @example
 *      strings.getCommonPrefix("Chocolate Fudge", "Choco Mocha")
 *      -> "Choco"
 *
 *      strings.getCommonPrefix("Chocolate Fudge", "cocoa")
 *      -> ""
 */
exports.getCommonPrefix = function ( str1, str2 ) {
	if ( sys.isNull( str1 ) || sys.isNull( str2 ) ) {
		return null;
	} else if ( str1.length > str2.length && str1.indexOf( str2 ) === 0 ) {
		return str2;
	} else if ( str2.length > str1.length && str2.indexOf( str1 ) === 0 ) { return str1; }
	var length = Math.min( str1.length, str2.length );
	for ( var i = 0; i < length; i++ ) {
		if ( str1[ i ] !== str2[ i ] ) { return str1.slice( 0, i ); }
	}
	return str1.slice( 0, length );
};

/**
 * Counts the instances of one string inside another
 *
 * @param {string}
 *            str The string to look in
 * @param {string}
 *            substr The pattern to count
 * @returns {Number}
 */
exports.count = function ( str, substr ) {
	if ( sys.isNull( str ) || sys.isNull( substr ) ) {
		return 0;
	}
	return String( str ).split( substr ).length - 1;
};

/**
 * Searches a string from left to right for a pattern and returns a substring consisting of the characters in the string
 * that are to the right of the pattern or all string if no match found.
 *
 * @param {string}
 *            str
 * @param {string}sep
 *            The pattern to look for
 * @returns {string}
 */
exports.strRight = function ( str, sep ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	str = String( str );
	sep = !sys.isNull( sep ) ? String( sep ) : sep;
	var pos = !sep ? -1 : str.indexOf( sep );
	//noinspection JSHint
	return ~pos ? str.slice( pos + sep.length, str.length ) : str;
};
/**
 * Searches a string from right to left for a pattern and returns a substring consisting of the characters in the string
 * that are to the right of the pattern or all string if no match found.
 *
 * @param {string}
 *            str
 * @param {string}sep
 *            The pattern to look for
 * @returns {string}
 */
exports.strRightBack = function ( str, sep ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	str = String( str );
	sep = !sys.isNull( sep ) ? String( sep ) : sep;
	var pos = !sep ? -1 : str.lastIndexOf( sep );
	//noinspection JSHint
	return ~pos ? str.slice( pos + sep.length, str.length ) : str;
};
/**
 * Searches a string from left to right for a pattern and returns a substring consisting of the characters in the string
 * that are to the left of the pattern or all string if no match found.
 *
 * @param {string}
 *            str
 * @param {string}sep
 *            The pattern to look for
 * @returns {string}
 */
exports.strLeft = function ( str, sep ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	str = String( str );
	sep = !sys.isNull( sep ) ? String( sep ) : sep;
	var pos = !sep ? -1 : str.indexOf( sep );
	//noinspection JSHint
	return ~pos ? str.slice( 0, pos ) : str;
};
/**
 * Searches a string from right to left for a pattern and returns a substring consisting of the characters in the string
 * that are to the left of the pattern or all string if no match found.
 *
 * @param {string}
 *            str
 * @param {string}sep
 *            The pattern to look for
 * @returns {string}
 */
exports.strLeftBack = function ( str, sep ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	str += '';
	sep = !sys.isNull( sep ) ? '' + sep : sep;
	var pos = str.lastIndexOf( sep );
	//noinspection JSHint
	return ~pos ? str.slice( 0, pos ) : str;
};

/**
 * Calculates Levenshtein distance between two strings.
 *
 * @see http://en.wikipedia.org/wiki/Levenshtein_distance
 * @param {string}
 *            str1 The first string to look at
 * @param {string}
 *            str2 The second string to look at
 * @returns {number}
 */
exports.levenshtein = function ( str1, str2 ) {
	if ( str1 === null && str2 === null ) {
		return 0;
	}
	if ( str1 === null ) {
		return String( str2 ).length;
	}
	if ( str2 === null ) {
		return String( str1 ).length;
	}

	str1 = String( str1 );
	str2 = String( str2 );
	var prev = null;
	var current = [], value;

	for ( var i = 0; i <= str2.length; i++ ) {
		for ( var j = 0; j <= str1.length; j++ ) {
			if ( i && j ) {
				if ( str1.charAt( j - 1 ) === str2.charAt( i - 1 ) ) {
					value = prev;
				} else {
					value = Math.min( current[ j ], current[ j - 1 ], prev ) + 1;
				}
			} else {
				value = i + j;
			}

			prev = current[ j ];
			current[ j ] = value;
		}
	}
	return current.pop();
};

});

require.define("/src/sprintf.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
var slice = [].slice;
/**
 * @fileOverview The sprintf for js script from Alexandru Marasteanu at diveintojavascript.com
 * @module ink/strings/sprintf
 *
 * @copyright Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com> All rights reserved.
 * @see http://www.diveintojavascript.com/projects/javascript-sprintf
 * @author Alexandru Marasteanu <hello at alexei dot ro>
 *
 */
var sprintf = ( function() {
	function get_type( variable ) {
		return Object.prototype.toString.call( variable ).slice( 8, -1 ).toLowerCase();
	}

	function str_repeat( input, multiplier ) {
		for ( var output = []; multiplier > 0; output[ --multiplier ] = input ) {/* do nothing */
		}
		//noinspection JSHint
		return output.join( '' );
	}

	var str_format = function() {
		if ( !str_format.cache.hasOwnProperty( arguments[ 0 ] ) ) {
			str_format.cache[ arguments[ 0 ] ] = str_format.parse( arguments[ 0 ] );
		}
		return str_format.format.call( null, str_format.cache[ arguments[ 0 ] ], arguments );
	};

	str_format.format = function( parse_tree, argv ) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for ( i = 0; i < tree_length; i++ ) {
			node_type = get_type( parse_tree[ i ] );
			if ( node_type === 'string' ) {
				output.push( parse_tree[ i ] );
			} else if ( node_type === 'array' ) {
				match = parse_tree[ i ]; // convenience purposes only
				if ( match[ 2 ] ) { // keyword argument
					arg = argv[ cursor ];
					for ( k = 0; k < match[ 2 ].length; k++ ) {
						if ( !arg.hasOwnProperty( match[ 2 ][ k ] ) ) { throw ( sprintf(
								'[sprintf] property "%s" does not exist', match[ 2 ][ k ] ) ); }
						arg = arg[ match[ 2 ][ k ] ];
					}
				} else if ( match[ 1 ] ) { // positional argument (explicit)
					arg = argv[ match[ 1 ] ];
				} else { // positional argument (implicit)
					arg = argv[ cursor++ ];
				}

				if ( /[^s]/.test( match[ 8 ] ) && ( get_type( arg ) !== 'number' ) ) { throw ( sprintf(
						'[sprintf] expecting number but found %s', get_type( arg ) ) ); }
				switch ( match[ 8 ] ) {
					case 'b':
						arg = arg.toString( 2 );
						break;
					case 'c':
						arg = String.fromCharCode( arg );
						break;
					case 'd':
						arg = parseInt( arg, 10 );
						break;
					case 'e':
						arg = match[ 7 ] ? arg.toExponential( match[ 7 ] ) : arg.toExponential();
						break;
					case 'f':
						arg = match[ 7 ] ? parseFloat( arg ).toFixed( match[ 7 ] ) : parseFloat( arg );
						break;
					case 'o':
						arg = arg.toString( 8 );
						break;
					case 's':
						arg = ( ( arg = String( arg ) ) && match[ 7 ] ? arg.substring( 0, match[ 7 ] ) : arg );
						break;
					case 'u':
						arg = Math.abs( arg );
						break;
					case 'x':
						arg = arg.toString( 16 );
						break;
					case 'X':
						arg = arg.toString( 16 ).toUpperCase();
						break;
				}
				arg = ( /[def]/.test( match[ 8 ] ) && match[ 3 ] && arg >= 0 ? '+' + arg : arg );
				pad_character = match[ 4 ] ? match[ 4 ] === '0' ? '0' : match[ 4 ].charAt( 1 ) : ' ';
				pad_length = match[ 6 ] - String( arg ).length;
				pad = match[ 6 ] ? str_repeat( pad_character, pad_length ) : '';
				output.push( match[ 5 ] ? arg + pad : pad + arg );
			}
		}
		return output.join( '' );
	};

	str_format.cache = {};

	str_format.parse = function( fmt ) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while ( _fmt ) {
			if ( ( match = /^[^\x25]+/.exec( _fmt ) ) !== null ) {
				parse_tree.push( match[ 0 ] );
			} else if ( ( match = /^\x25{2}/.exec( _fmt ) ) !== null ) {
				parse_tree.push( '%' );
			} else if ( ( match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/
					.exec( _fmt ) ) !== null ) {
				if ( match[ 2 ] ) { // noinspection JSDeclarationsAtScopeStart
					{

						var field_list = [], replacement_field = match[ 2 ], field_match = [];
						if ( ( field_match = /^([a-z_][a-z_\d]*)/i.exec( replacement_field ) ) !== null ) {
							field_list.push( field_match[ 1 ] );
							while ( ( replacement_field = replacement_field.substring( field_match[ 0 ].length ) ) !== '' ) {
								if ( ( field_match = /^\.([a-z_][a-z_\d]*)/i.exec( replacement_field ) ) !== null ) {
									field_list.push( field_match[ 1 ] );
								} else if ( ( field_match = /^\[(\d+)\]/.exec( replacement_field ) ) !== null ) {
									field_list.push( field_match[ 1 ] );
								} else {
									throw ( '[sprintf] huh?' );
								}
							}
						} else {
							throw ( '[sprintf] huh?' );
						}
						match[ 2 ] = field_list;
					}
				} else {
					//noinspection JSHint
					arg_names |= 2;
				}
				if ( arg_names === 3 ) { throw ( '[sprintf] mixing positional and named placeholders is not (yet) supported' ); }
				parse_tree.push( match );
			} else {
				throw ( '[sprintf] huh?' );
			}
			_fmt = _fmt.substring( match[ 0 ].length );
		}
		return parse_tree;
	};

	return str_format;
} )();

var vsprintf = function( fmt, argv ) {
	argv.unshift( fmt );
	return sprintf.apply( null, argv );
};
/**
 * sprintf() for JavaScript 0.7-beta1 sprintf() for JavaScript is a complete open source JavaScript sprintf
 * implementation.
 *
 * It's prototype is simple:
 *
 *      string sprintf(string format , [mixed arg1 [, mixed arg2 [ ,...]]]);
 *
 * The placeholders in the format string are marked by "%" and are followed by one or more of these elements, in this order:
 *
 * + An optional "+" sign that forces to preceed the result with a plus or minus sign on numeric values. By default,
 * only the "-" sign is used on negative numbers.
 * + An optional padding specifier that says what character to use for padding (if specified). Possible values are 0
 * or any other character
 * precedeed by a '. The default is to pad with spaces.
 * + An optional "-" sign, that causes sprintf to left-align the result of this placeholder. The default is to
 * right-align the result.
 * + An optional number, that says how many characters the result should have. If the value to be returned is shorter
 * than this number, the result will be padded.
 * + An optional precision modifier, consisting of a "." (dot) followed by a number, that says how many digits should
 * be displayed for floating point numbers. When used on a string, it causes the result to be truncated.
 * + A type specifier that can be any of:
 *
 *      + % — print a literal "%" character
 *      + b — print an integer as a binary number
 *      + c — print an integer as the character with that ASCII value
 *      + d — print an integer as a signed decimal number
 *      + e — print a float as scientific notation
 *      + u — print an integer as an unsigned decimal number
 *      + f — print a float as is
 *      + o — print an integer as an octal number
 *      + s — print a string as is
 *      + x — print an integer as a hexadecimal number (lower-case)
 *      + X — print an integer as a hexadecimal number (upper-case)
 *

 * You can also swap the arguments. That is, the order of the placeholders doesn't have to match the order of the
 * arguments. You can do that by simply indicating in the format string which arguments the placeholders refer to:

 *      sprintf('%2$s %3$s a %1$s', 'cracker', 'Polly', 'wants');
 *
 * And, of course, you can repeat the placeholders without having to increase the number of arguments.
 *
 *
 * Format strings may contain replacement fields rather than positional placeholders. Instead of referring to a certain
 * argument, you can now refer to a certain key within an object. Replacement fields are surrounded by rounded
 * parentheses () and begin with a keyword that refers to a key:

 *      var user = {
 *          name : 'Dolly'
 *      };
 *      sprintf( 'Hello %(name)s', user ); // Hello Dolly

 * Keywords in replacement fields can be optionally followed by any number of keywords or indexes:

 *      var users = [ {
            name : 'Dolly'
 *      }, {
            name : 'Molly'
 *      }, {
 *          name : 'Polly'
*       } ];
 *
*       sprintf( 'Hello %(users[0].name)s, %(users[1].name)s and %(users[2].name)s', {
			users : users
 *      } ); // Hello Dolly, Molly and Polly

    @param {string}
 *            fmt The format string
 * @param {...*} argv The formatters
 * @returns {string}
 * @method
 * @author Alexandru Marasteanu
 * @copyright Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>. All rights reserved.
 * @note mixing positional and named placeholders is not (yet) supported
 * @see http://www.diveintojavascript.com/projects/javascript-sprintf
 * @example
 *      var strings = require("ink-strings");
 *      strings.sprintf( "Hello %1s, it is me, %2s", "Doctor", "Dalek Caan" );
 *      -> "Hello Doctor, it is me, Dalek Caan"
 *
 *      strings.sprintf( "%1b", 24 );
 *      -> "11000"
 *
 *      strings.sprintf( "%1c", 74 );
 *      -> "J"
 *
 *      strings.sprintf( "%1d", 40 );
 *      -> "40"
 *
 *      strings.sprintf( "%1d", 40 * -1 );
 *      -> "-40"
 *
 *      strings.sprintf( "%1e", 40 * 1000000 );
 *      -> "4e+7"
 *
 *      strings.sprintf( "%1u", 40 * -1 );
 *      -> "40"
 *
 *      strings.sprintf( "%1f", 40.23498765 );
 *      -> "40.23498765"
 *
 *      strings.sprintf( "%1o", 24 );
 *      -> "30"
 *
 *      strings.sprintf( "%(name)s %(occupation)s", {
			name       : "doctor",
			occupation : "timelord"
		} );
        -> "doctor timelord"

 *
 */
exports.sprintf = sprintf;
/**
 * vsprintf() is the same as sprintf() except that it accepts an array of arguments, rather than a variable number of
 * arguments
 * @method
 * @author Alexandru Marasteanu
 * @copyright Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>. All rights reserved.
 * @param {string}
 *            fmt The format string
 * @param {array.<string>} argv The formatters
 * @returns {string}
 */
exports.vsprintf = vsprintf;


});

require.define("/index.js",function(require,module,exports,__dirname,__filename,process,global){"use strict";
/**
 * @fileOverview Aggregates the various string tools into a single module.

 * @author Terry Weiss
 * @module ink/strings
 * @copyright Copyright &copy; 2011-2012 Terry Weiss. All rights reserved
 */

var sys = require( "lodash" );
var base64 = require( "./src/base64" );
var binary = require( "./src/binary" );
var generators = require( "./src/generators" );
var html = require( "./src/html" );
var patterns = require( "./src/patterns" );
var shape = require( "./src/shape" );
var sprintf = require( "./src/sprintf" );
var tests = require( "./src/tests" );

sys.extend( exports, base64, binary, generators, html, patterns, shape, sprintf, tests );

//noinspection JSHint
(function ( window ) {
	(function ( ink ) {
		ink.strings = exports;
	})( window.ink = window.ink || {} );

})( this );


});
require("/index.js");
})();

