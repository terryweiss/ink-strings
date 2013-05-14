"use strict";
/*
 * ! sprintf() for JavaScript 0.7-beta1 http://www.diveintojavascript.com/projects/javascript-sprintf Copyright (c)
 * Alexandru Marasteanu <alexaholic [at) gmail (dot] com> All rights reserved. Redistribution and use in source and
 * binary forms, with or without modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 * disclaimer. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 * following disclaimer in the documentation and/or other materials provided with the distribution. Neither the name of
 * sprintf() for JavaScript nor the names of its contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
 * CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. Changelog:
 * 2010.09.06 - 0.7-beta1 - features: vsprintf, support for named placeholders - enhancements: format cache, reduced
 * global namespace pollution 2010.05.22 - 0.6: - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 * Note: Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/) who warned me about a bug in 0.5, I
 * discovered that the last update was a regress. I appologize for that. 2010.05.09 - 0.5: - bug fix: 0 is now preceeded
 * with a + sign - bug fix: the sign was not at the right position on padded results (Kamal Abdali) - switched from GPL
 * to BSD license 2007.10.21 - 0.4: - unit test and patch (David Baird) 2007.09.17 - 0.3: - bug fix: no longer throws
 * exception on empty paramenters (Hans Pufal) 2007.09.11 - 0.2: - feature: added argument swapping 2007.04.03 - 0.1: -
 * initial release
 */
var slice = [].slice;
/**
 * @fileOverview The sprintf for js script from Alexandru Marasteanu at diveintojavascript.com
 * @module ink/strings/sprintf
 * @license Redistribution and use in source and binary forms, with or without modification, are permitted provided that
 *          the following conditions are met: Redistributions of source code must retain the above copyright notice,
 *          this list of conditions and the following disclaimer. Redistributions in binary form must reproduce the
 *          above copyright notice, this list of conditions and the following disclaimer in the documentation and/or
 *          other materials provided with the distribution. Neither the name of sprintf() for JavaScript nor the names
 *          of its contributors may be used to endorse or promote products derived from this software without specific
 *          prior written permission. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *          ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 *          AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR
 *          ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *          TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 *          HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *          NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *          POSSIBILITY OF SUCH DAMAGE.
 * @copyright Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com> All rights reserved.
 * @see http://www.diveintojavascript.com/projects/javascript-sprintf
 */
var sprintf = ( function() {
	function get_type( variable ) {
		return Object.prototype.toString.call( variable ).slice( 8, -1 ).toLowerCase();
	}

	function str_repeat( input, multiplier ) {
		for ( var output = []; multiplier > 0; output[ --multiplier ] = input ) {/* do nothing */
		}
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
 * <p>
 * It's prototype is simple:
 * </p>
 * <code>string sprintf(string format , [mixed arg1 [, mixed arg2 [ ,...]]]);</code> The
 * <p>
 * placeholders in the format string are marked by "%" and are followed by one or more of these elements, in this order:
 * </p>
 * <ul>
 * <li> An optional "+" sign that forces to preceed the result with a plus or minus sign on numeric values. By default,
 * only the "-" sign is used on negative numbers.</li>
 * <li>An optional padding specifier that says what character to use for padding (if specified). Possible values are 0
 * or any other character</li>
 * precedeed by a '. The default is to pad with spaces.</li>
 * <li>An optional "-" sign, that causes sprintf to left-align the result of this placeholder. The default is to
 * right-align the result.</li>
 * <li>An optional number, that says how many characters the result should have. If the value to be returned is shorter
 * than this number, the result will be padded.</li>
 * <li>An optional precision modifier, consisting of a "." (dot) followed by a number, that says how many digits should
 * be displayed for floating point numbers. When used on a string, it causes the result to be truncated.</li>
 * <li>A type specifier that can be any of:
 * <ul>
 * <li>
 * <li>% — print a literal "%" character</li>
 * <li>b — print an integer as a binary number</li>
 * <li>c — print an integer as the character with that ASCII value</li>
 * <li>d — print an integer as a signed decimal number</li>
 * <li>e — print a float as scientific notation</li>
 * <li>u — print an integer as an unsigned decimal number</li>
 * <li>f — print a float as is</li>
 * <li>o — print an integer as an octal number</li>
 * <li>s — print a string as is</li>
 * <li>x — print an integer as a hexadecimal number (lower-case)</li>
 * <li>X — print an integer as a hexadecimal number (upper-case)</li>
 * </li>
 * </ul>
 * </ul>
 * <p>
 * You can also swap the arguments. That is, the order of the placeholders doesn't have to match the order of the
 * arguments. You can do that by simply indicating in the format string which arguments the placeholders refer to:
 * </p>
 * <code>sprintf('%2$s %3$s a %1$s', 'cracker', 'Polly', 'wants');</code>
 * <p>
 * And, of course, you can repeat the placeholders without having to increase the number of arguments.
 * </p>
 * <p>
 * Format strings may contain replacement fields rather than positional placeholders. Instead of referring to a certain
 * argument, you can now refer to a certain key within an object. Replacement fields are surrounded by rounded
 * parentheses () and begin with a keyword that refers to a key:
 * </p>
 * 
 * <pre class="js">
 * var user = {
 * 	name : 'Dolly'
 * };
 * sprintf( 'Hello %(name)s', user ); // Hello Dolly
 * </pre>
 * 
 * <p>
 * Keywords in replacement fields can be optionally followed by any number of keywords or indexes:
 * </p>
 * 
 * <pre class="js">
 * var users = [ {
 * 	name : 'Dolly'
 * }, {
 * 	name : 'Molly'
 * }, {
 * 	name : 'Polly'
 * } ];
 * sprintf( 'Hello %(users[0].name)s, %(users[1].name)s and %(users[2].name)s', {
 * 	users : users
 * } ); // Hello Dolly, Molly and Polly
 * </pre>
 * 
 * @author Alexandru Marasteanu
 * @copyright Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>. All rights reserved.
 * @note mixing positional and named placeholders is not (yet) supported
 * @see http://www.diveintojavascript.com/projects/javascript-sprintf
 * @license Redistribution and use in source and binary forms, with or without modification, are permitted provided that
 *          the following conditions are met: Redistributions of source code must retain the above copyright notice,
 *          this list of conditions and the following disclaimer. Redistributions in binary form must reproduce the
 *          above copyright notice, this list of conditions and the following disclaimer in the documentation and/or
 *          other materials provided with the distribution. Neither the name of sprintf() for JavaScript nor the names
 *          of its contributors may be used to endorse or promote products derived from this software without specific
 *          prior written permission. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *          ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY
 *          AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR
 *          ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *          TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 *          HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *          NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *          POSSIBILITY OF SUCH DAMAGE.
 */
exports.sprintf = sprintf;
/**
 * vsprintf() is the same as sprintf() except that it accepts an array of arguments, rather than a variable number of
 * arguments:
 * 
 * @param {string}
 *            fmt The format string
 * @param {array.
 *            <string>}argv The formatters
 * @returns {string}
 */
exports.vsprintf = vsprintf;

/*
 * jshint forin:true, noarg:true, eqeqeq:true, strict:true, undef:true, unused:true, curly:true, browser:true,
 * jquery:true, es5:true, node:true, indent:4, maxerr:50, globalstrict:true, newcap:true
 */
