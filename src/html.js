"use strict";
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

