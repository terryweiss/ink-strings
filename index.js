"use strict";
/**
 * @fileOverview Aggregates the various string tools into a single module.

 * @author Terry Weiss
 * @module ink/strings
 * @license MIT (see LICENSE.md)
 * @copyright Copyright &copy; 2011-2012 Terry Weiss. All rights reserved
 */

var sys = require("lodash");
var rutils = require("./src/rutils");
var sprintf = require("./src/sprintf");
var under = require("./src/under");
var tools = require("./src/tools");
var base64 = require("./src/base64");


sys.extend(exports, rutils, sprintf, under, tools, base64);

