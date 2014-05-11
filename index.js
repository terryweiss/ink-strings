"use strict";
/**
 * @fileOverview Aggregates the various string tools into a single module.

 * @author Terry Weiss
 * @module ink/strings
 * @copyright Copyright &copy; 2011-2012 Terry Weiss. All rights reserved
 */

var sys = require( "lodash" );
var base64 = require( "./base64" );
var binary = require( "./binary" );
var generators = require( "./generators" );
var html = require( "./html" );
var patterns = require( "./patterns" );
var shape = require( "./shape" );
var sprintf = require( "./sprintf" );
var tests = require( "./tests" );

sys.extend( exports, base64, binary, generators, html, patterns, shape, sprintf, tests );

//noinspection JSHint
(function ( window ) {
	(function ( ink ) {
		ink.strings = exports;
	})( window.ink = window.ink || {} );

})( this );

