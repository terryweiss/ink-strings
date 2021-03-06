"use strict";
/**
 * @fileOverview These methods shape a string into the form you
 * want it
 * @module ink/strings/shape
 * @author Terry Weiss
 * @author zumbrunn
 * @author Esa-Matti Suurone
 * @author Pavel Pravosud
 * @requires ink/strings/patterns
 * @requires lodash
 */

var patterns = require( "./patterns" );
var tests = require("./tests") ;
var sys = require( "lodash" );

var nativeTrim = String.prototype.trim;
var nativeTrimRight = String.prototype.trimRight;
var nativeTrimLeft = String.prototype.trimLeft;
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
 * converts a string into a hexadecimal color representation (e.g. "ffcc33") from a color string
 * like "rgb (255, 204, 51)".
 *
 * @param {String}
 *            string the string to convert
 * @returns {String} the resulting hex color (w/o "#")
 * @example
 *      var strings = require("ink-strings");
 *      strings.toHexColor("rgb(255, 0, 0)");
 *      -> "ff0000"
 */
exports.toHexColor = function ( string ) {
	// noinspection MagicNumberJS
	var HEXVALUE = 16;
	if ( tests.startsWith( string, "rgb" ) ) {
		var buffer = [];
		var col = string.replace( /[^0-9,]/g, '' );

		sys.each( col.split( "," ), function ( part ) {
			var num = parseInt( part, 10 );
			var hex = num.toString( HEXVALUE );
			buffer.push( exports.pad( hex, 2, "0", -1 ) );
		} );

		return buffer.join( "" );
	}
	var color = string.replace( new RegExp( patterns.HEXPATTERN.source ), '' );
	return exports.pad( color.toLowerCase(), 6, "0", -1 );
};

/**
 * function cleans a string by throwing away all non-alphanumeric characters
 *
 * @returns cleaned string
 */
exports.toAlphanumeric = function ( string ) {
	return string.replace( new RegExp( patterns.ANUMPATTERN.source, "g" ), '' );
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
	return string.replace( patterns.CAPITALSPATTERN,function ( m, l ) {
		// "ABC" -> "Abc"
		return l[ 0 ].toUpperCase() + l.substring( 1 ).toLowerCase();
	} ).replace( patterns.SEPARATORS, function ( m, l ) {
			// foo-bar -> fooBar
			return l.toUpperCase();
		} );
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
 * replace all linebreaks and optionally all br tags
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
	string = string.replace( patterns.LINEBREAKS, replacement );
	return removeTags === true ? string.replace( patterns.BRTAGS, replacement ) : string;
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
	//noinspection JSHint
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
 * Trims defined characters from begining and ending of the string. Defaults to whitespace characters.
 *
 * @param {string}
 *            str The string to trim

 * @returns {string}
 */
exports.trim = function ( str ) {
	if ( sys.isNull( str ) ) {
		return '';
	}
	if ( nativeTrim ) {
		return nativeTrim.call( str );
	}

	return String( str ).replace( new RegExp( /^\s+|\s+$/, 'g' ), '' );
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
	//noinspection JSHint
	length = ~~length;
	return str.length > length ? str.slice( 0, length ) + truncateStr : str;
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
	return String( str ).replace( patterns.REGEXCHARS, '\\$1' );
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
	//noinspection JSHint
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
	var args = [].slice.call( arguments );
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

var strRepeat = function ( str, qty ) {
	if ( qty < 1 ) {return '';}
	var result = '';
	while ( qty > 0 ) {
		//noinspection JSHint
		if ( qty & 1 ) {result += str;}
		//noinspection JSHint
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
	str = str === null ? '' : String( str );
	//noinspection JSHint
	length = ~~length;

	var padlen = 0;

	if ( !padStr ) {
		padStr = ' ';
	} else if ( padStr.length > 1 ) {
		padStr = padStr.charAt( 0 );
	}

	switch ( type ) {
		case 'right':
			padlen = length - str.length;
			return str + strRepeat( padStr, padlen );
		case 'both':
			padlen = length - str.length;
			return strRepeat( padStr, Math.ceil( padlen / 2 ) ) + str +
				strRepeat( padStr, Math.floor( padlen / 2 ) );
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
	if ( str === null || str === '' ) {return 0;}
	str = String( str );
	//noinspection JSHint
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
	var args = [].slice.call( arguments ), separator = args.shift();

	if ( separator === null ) {separator = '';}

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
	if ( str === null ) {return '';}
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
	str = str === null ? '' : String( str );
	return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
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
