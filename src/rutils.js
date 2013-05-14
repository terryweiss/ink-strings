"use strict";

/*
 * Helma License Notice
 *
 * The contents of this file are subject to the Helma License Version 2.0 (the "License"). You may not use this file
 * except in compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 *
 * Copyright 1998-2006 Helma Software. All Rights Reserved.
 *
 * $RCSfile: String.js,v $ $Author: zumbrunn $ $Revision: 8714 $ $Date: 2007-12-13 13:21:48 +0100 (Don, 13 Dez 2007) $
 */

/*
 * Modified by Terry Weiss to allow it to run on browser, node and commonjs by removing java references and rhino
 * specific syntax. Also cleaned it up to pass a JSHint inspection
 */
var ANUMPATTERN = /[^a-zA-Z0-9]/;
var APATTERN = /[^a-zA-Z]/;
var NUMPATTERN = /[^0-9]/;
var HEXPATTERN = /[^a-fA-F0-9]/;
// Email and URL RegExps contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
// licensed under MIT license - http://www.opensource.org/licenses/mit-license.php
var EMAILPATTERN = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;
var URLPATTERN = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;

var binary = require( "./binary" );
var Binary = binary.Binary;
var ByteArray = binary.ByteArray;
var ByteString = binary.ByteString;
var base64;
var sys = require( "lodash" );
var under = require( "./under" );

/**
 * @fileoverview Port of the string helper methods from helma/ringo to run both in node and ringo
 * @module ink/strings
 * @license The contents of this file are subject to the Helma License Version 2.0 (the "License"). You may not use this file
 * except in compliance with the License. A copy of the License is available at
 * http://adele.helma.org/download/helma/license.txt
 * @copyright Copyright 1998-2006 Helma Software. All Rights Reserved.
 */

/**
 * checks if a date format pattern is correct
 *
 * @param {String}
 *            string the string
 * @returns {Boolean} true if the pattern is correct
 * @example
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
 *            string the string
 * @returns {Boolean}
 * @example
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
	return URLPATTERN.test( string );
};

/**
 * function checks a string for a valid color value in hexadecimal format. it may also contain # as first character
 *
 * @param {String}
 *            string the string
 * @returns Boolean false, if string length (without #) > 6 or < 6 or contains any character which is not a valid hex
 *          value
 */
exports.isHexColor = function ( string ) {
	if ( string.indexOf( "#" ) === 0 ) {
		string = string.substring( 1 );
	}
	return string.length === 6 && !HEXPATTERN.test( string );
};

/**
 * converts a string into a hexadecimal color representation (e.g. "ffcc33") from a color string
 * like "rgb (255, 204, 51)".
 *
 * @param {String}
 *            string the string
 * @returns {String} the resulting hex color (w/o "#")
 */
exports.toHexColor = function ( string ) {
	// noinspection MagicNumberJS
	var HEXVALUE = 16;
	if ( exports.startsWith( string, "rgb" ) ) {
		var buffer = [];
		var col = string.replace( /[^0-9,]/g, '' );

		sys.each( col.split( "," ), function ( part ) {
			var num = parseInt( part, 10 );
			var hex = num.toString( HEXVALUE );
			buffer.push( under.pad( hex, 2, "0", -1 ) );
		} );

		return buffer.join( "" );
	}
	var color = string.replace( new RegExp( HEXPATTERN.source ), '' );
	return under.pad( color.toLowerCase(), 6, "0", -1 );
};

/**
 * function returns true if the string contains only a-z and 0-9 (case insensitive!)
 *
 * @returns Boolean true in case string is alpha, false otherwise
 */
exports.isAlphanumeric = function ( string ) {
	return string.length && !ANUMPATTERN.test( string );
};

/**
 * function cleans a string by throwing away all non-alphanumeric characters
 *
 * @returns cleaned string
 */
exports.toAlphanumeric = function ( string ) {
	return string.replace( new RegExp( ANUMPATTERN.source, "g" ), '' );
};

/**
 * function returns true if the string contains only characters a-z
 *
 * @returns Boolean true in case string is alpha, false otherwise
 */
exports.isAlpha = function ( string ) {
	return string.length && !APATTERN.test( string );
};

/**
 * function returns true if the string contains only 0-9
 *
 * @returns Boolean true in case string is numeric, false otherwise
 */
exports.isNumeric = function ( string ) {
	return string.length && !NUMPATTERN.test( string );
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
	return string.replace( /([A-Z]+)/g,function ( m, l ) {
		// "ABC" -> "Abc"
		return l[ 0 ].toUpperCase() + l.substring( 1 ).toLowerCase();
	} ).replace( /[\-_\s](.)/g, function ( m, l ) {
			// foo-bar -> fooBar
			return l.toUpperCase();
		} );
};

/**
 * translates all characters of a string into HTML entities
 *
 * @param {String}
 *            string the string
 * @returns {String} translated result
 */
exports.entitize = function ( string ) {
	var buffer = [];
	for ( var i = 0; i < string.length; i++ ) {
		buffer.push( "&#", string.charCodeAt( i ).toString(), ";" );
	}
	return buffer.join( "" );
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
 * replace all linebreaks and optionally all w/br tags
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
	string = string.replace( /[\n|\r]/g, replacement );
	return removeTags === true ? string.replace( /<[w]?br *\/?>/g, replacement ) : string;
};

/**
 * function repeats a string passed as argument
 *
 * @param {String}
 *            string the string
 * @param {Number}
 *            num amount of repetitions
 *            @param {string=} sep Separate the strings with this
 * @returns {String} resulting string
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
 * returns true if the string looks like an e-mail
 *
 * @param {String}
 *            string
 */
exports.isEmail = function ( string ) {
	return EMAILPATTERN.test( string );
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

/**
 * factory to create functions for sorting objects in an array
 *
 * @param {String}
 *            field name of the field each object is compared with
 * @param {Number}
 *            order (ascending or descending)
 * @returns {Function} ready for use in Array.prototype.sort
 */
exports.Sorter = function ( field, order ) {
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


