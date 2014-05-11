"use strict";
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
 * or even really unique. Just pseudo-random and with a known format. Also available as `uiid`
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
