"use strict";

var lang = require( "lodash" );
/**
 * @fileOverview A couple of string tools to simplify a few, directed tasks
 * @author Terry Weiss
 * @copyright 2012 Eery Wrists Design. All rights reserved.
 * @license MIT (see LICENSE.txt)
 * @module ink/strings
 */
/**
 * Creates a random string, in this case a UUID-like thingy. I call it a Uniquely Interesting ID. It is *not* globally unique
 * or even really unique. Just random and with a known format. Also available as uiid
 *
 * @note {platform} If the platform is rhino and we have access to Java, this will make the call directly to the Java
 *       implentation. Since FireFox is a rhino platform, it means that that is behavior will appear on the browser as
 *       well. On all other platforms, you should note that the values are not globally unique and should only be used
 *       for temporary keys.
 * @returns {string}
 * @method
 *
 */
exports.tempKey = exports.uiid = function() {
	if ( lang.isObject( this.Packages ) && !lang.isNull( this.Packages ) && !lang.isUndefined( this.Packages ) ) {
		return Packages.java.util.UUID.randomUUID().toString();
	} else {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function( c ) {
			//noinspection JSHint
			var r = Math.random() * 16 | 0, v = c === 'x' ? r : ( r & 0x3 | 0x8 );
			return v.toString( 16 );
		} );
	}
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

