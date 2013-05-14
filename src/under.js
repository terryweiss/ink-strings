"use strict";
/**
 * @fileOverview Javascript lacks complete string manipulation operations. This an attempt to fill that gap. List of
 *               build-in methods can be found for example from Dive Into JavaScript. As name states this an extension
 *               for Underscore.js, but it can be used independently from _s-global variable. But with Underscore.js you
 *               can use Object-Oriented style and chaining.
 * @author Esa-Matti Suurone
 * @license The MIT License Copyright (c) 2011 Esa-Matti Suuronen esa-matti@suuronen.org Permission is hereby granted,
 *          free of charge, to any person obtaining a copy of this software and associated documentation files (the
 *          "Software"), to deal in the Software without restriction, including without limitation the rights to use,
 *          copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
 *          persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright
 *          notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 *          LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
 *          EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
 *          AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 *          OR OTHER DEALINGS IN THE SOFTWARE.
 * @note that this is only a subset of the original underscore string, only those items missing from rutils.js
 * @module ink/strings
 */

// Underscore.string
// (c) 2010 Esa-Matti Suuronen <esa-matti aet suuronen dot org>
// Underscore.string is freely distributable under the terms of the MIT license.
// Documentation: https://github.com/epeli/underscore.string
// Some code is borrowed from MooTools and Alexandru Marasteanu.
// Version '2.3.0'
// Defining helper functions.
var nativeTrim = String.prototype.trim;
var nativeTrimRight = String.prototype.trimRight;
var nativeTrimLeft = String.prototype.trimLeft;

var sys = require( "lodash" );
var slice = [].slice;
var escapeChars = {
	lt : '<',
	gt : '>',
	quot : '"',
	apos : "'",
	amp : '&'
};

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
 * Converts entity characters to HTML equivalents.
 *
 * @param {string}
 *            str The string to work with
 * @return {string}
 */
exports.unescapeHTML = function ( str ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	return String( str ).replace( /\&([^;]+);/g, function ( entity, entityCode ) {
		var match;

		if ( entityCode in escapeChars ) {
			return escapeChars[ entityCode ];
		} else if ( match = entityCode.match( /^#x([\da-fA-F]+)$/ ) ) {
			return String.fromCharCode( parseInt( match[ 1 ], 16 ) );
		} else if ( match = entityCode.match( /^#(\d+)$/ ) ) {
			return String.fromCharCode( ~~match[ 1 ] );
		} else {
			return entity;
		}
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
 * Trims defined characters from begining and ending of the string. Defaults to whitespace characters.
 *
 * @param {string}
 *            str The string to trim
 * @param {string=}
 *            characters The characters to replace
 * @returns {string}
 */
exports.trim = function ( str, characters ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	if ( !characters && nativeTrim ) {
		return nativeTrim.call( str );
	}
	characters = defaultToWhiteSpace( characters );
	return String( str ).replace( new RegExp( '\^' + characters + '+|' + characters + '+$', 'g' ), '' );
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
	length = ~~length;
	return str.length > length ? str.slice( 0, length ) + truncateStr : str;
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
 * Formats the numbers to a string
 *
 * @param {number}
 *            number The number to convert
 * @param {integer=}
 *            dec The number of decimal points to return
 * @param {string=}
 *            dsep decimal point
 * @param string
 *            {tsep=} Seperator
 * @returns {string}
 */
exports.numberFormat = function ( number, dec, dsep, tsep ) {
	if ( isNaN( number ) || sys.isNull( number ) ) {
		return '';
	}

	number = number.toFixed( ~~dec );
	tsep = tsep || ',';

	var parts = number.split( '.' ), fnums = parts[ 0 ], decimals = parts[ 1 ] ? ( dsep || '.' ) + parts[ 1 ] : '';

	return fnums.replace( /(\d)(?=(?:\d{3})+$)/g, '$1' + tsep ) + decimals;
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
	return ~pos ? str.slice( 0, pos ) : str;
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
	var args = slice.call( arguments );
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
	return String( str ).replace( /([.*+?^=!:${}()|[\]\/\\])/g, '\\$1' );
};

var strRepeat = function ( str, qty ) {
	if ( qty < 1 ) return '';
	var result = '';
	while ( qty > 0 ) {
		if ( qty & 1 ) result += str;
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
	str = str == null ? '' : String( str );
	length = ~~length;

	var padlen = 0;

	if ( !padStr )
		padStr = ' ';
	else if ( padStr.length > 1 ) padStr = padStr.charAt( 0 );

	switch ( type ) {
		case 'right':
			padlen = length - str.length;
			return str + strRepeat( padStr, padlen );
		case 'both':
			padlen = length - str.length;
			return strRepeat( padStr, Math.ceil( padlen / 2 ) ) + str
				+ strRepeat( padStr, Math.floor( padlen / 2 ) );
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
	if ( str == null || str == '' ) return 0;
	str = String( str );
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
	var args = slice.call( arguments ), separator = args.shift();

	if ( separator == null ) separator = '';

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
	if ( str == null ) return '';
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
	str = str == null ? '' : String( str );
	return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
};
