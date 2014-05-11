"use strict";
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
