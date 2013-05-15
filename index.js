"use strict";
/**
 * @fileOverview Aggregates the various string tools into a single module.

 * @author Terry Weiss
 * @module ink/strings
 * @license MIT (see LICENSE.md)
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

