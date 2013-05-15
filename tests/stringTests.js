"use strict";
var strings = require( "../index" );
var assert = require( "assert" );
var sys = require( "lodash" );

exports.testStringsUIID = function ( test ) {
	var res = strings.uiid();
	test.ok( !sys.isEmpty( res ) );
	test.equal( res.length, 36 );
	test.done();
};

exports.testStringsFormat = function ( test ) {
	var res = strings.format( "Well, this is {0} how do yo do!", "fine" );
	test.equal( res, "Well, this is fine how do yo do!" );
	res = strings.format( "I can count, watch: {0}, {1}, {2}", 1, 7, "yellow" );
	test.strictEqual( res, "I can count, watch: 1, 7, yellow" );
	test.done();
};

exports.testStringsStripTags = function ( test ) {
	var test1 = "<p>This is a paragraph</p><div> and this is a a div</div> and I am <pre class='javascript'> preformatted</pre>";
	test.strictEqual( strings.stripTags( test1 ), "This is a paragraph and this is a a div and I am  preformatted" );
	test.done();
};

exports.testStringsCapitalize = function ( test ) {
	var test1 = "i am a lowly string";
	test.strictEqual( strings.capitalize( test1, 1 ), "I am a lowly string" );
	test.done();
};

exports.testStringsChop = function ( test ) {
	var test1 = "my love is like a red, red rose";
	test.deepEqual( strings.chop( test1, 5 ), [ "my lo", "ve is", " like", " a re", "d, re", "d ros", "e" ] );
	test.done();
};

exports.testStringsClean = function ( test ) {
	var test1 = "exterminate          exterminate";
	test.strictEqual( strings.clean( test1 ), "exterminate exterminate" );
	test.done();
};

exports.testStringsCount = function ( test ) {
	var test1 = "exterminate exterminate";
	test.strictEqual( strings.count( test1, "ate" ), 2 );
	test.done();
};

exports.testStringsChars = function ( test ) {
	var test1 = "the doctor";
	test.deepEqual( strings.chars( test1 ), [ "t", "h", "e", " ", "d", "o", "c", "t", "o", "r" ] );
	test.done();
};

exports.testStringsSwapCase = function ( test ) {
	var test1 = "tHE dOCTOR";
	test.strictEqual( strings.swapCase( test1 ), "The Doctor" );
	test.done();
};

exports.testStringsEscapeHTML = function ( test ) {
	var test1 = "<p>This is a paragraph</p><div> and this is a a div</div> and I am <pre class='javascript'> preformatted</pre>";
	assert
		.strictEqual(
			strings.escapeHtml( test1 ),
			"&lt;p&gt;This is a paragraph&lt;/p&gt;&lt;div&gt; and this is a a div&lt;/div&gt; and I am &lt;pre class=\'javascript\'&gt; preformatted&lt;/pre&gt;" );
	test.done();
};

//exports./*test*/StringsUnescapeHTML = function ( test ) {
//	var test1 = "&lt;p&gt;This is a paragraph&lt;/p&gt;&lt;div&gt; and this is a a div&lt;/div&gt; and I am &lt;pre class=&apos;javascript&apos;&gt; preformatted&lt;/pre&gt;";
//	assert
//		.strictEqual( strings.escapeHtml( test1 ),
//		"<p>This is a paragraph</p><div> and this is a a div</div> and I am <pre class='javascript'> preformatted</pre>" );
//	test.done();
//};

exports.testStringsSplice = function ( test ) {
	var test1 = "Exterminate amy pond";
	test.strictEqual( strings.splice( test1, 12, 8, "the doctor" ), "Exterminate the doctor" );
	test.done();
};

exports.testStringsInsert = function ( test ) {
	var test1 = "Extermin the doctor";
	test.strictEqual( strings.insert( test1, 8, "ate" ), "Exterminate the doctor" );
	test.done();
};

exports.testStringsJoin = function ( test ) {
	test.strictEqual( strings.join( ", ", "doc", "rory", "amy", "river" ), "doc, rory, amy, river" );
	test.done();

};

exports.testStringsLines = function ( test ) {
	var test1 = "line1\nline2\nline3";
	test.deepEqual( strings.lines( test1 ), [ "line1", "line2", "line3" ] );
	test.done();
};

exports.testStringsReverse = function ( test ) {
	var test1 = "abcdef";
	test.strictEqual( strings.reverse( test1 ), "fedcba" );
	test.done();
};

exports.testStringsStartsWith = function ( test ) {
	var test1 = "the doctor";
	test.strictEqual( strings.startsWith( test1, "t" ), true );
	test.strictEqual( strings.startsWith( test1, "the" ), true );
	test.strictEqual( strings.startsWith( test1, "doctor" ), false );
	test.done();
};

exports.testStringsEndsWith = function ( test ) {
	var test1 = "the doctor";
	test.strictEqual( strings.endsWith( test1, "r" ), true );
	test.strictEqual( strings.endsWith( test1, "tor" ), true );
	test.strictEqual( strings.endsWith( test1, "the" ), false );
	test.done();
};

exports.testStringsReverse = function ( test ) {
	test.strictEqual( strings.succ( "a" ), "b" );
	test.done();
};

exports.testStringsTitleize = function ( test ) {
	test.strictEqual( strings.titleize( "the doctor" ), "The Doctor" );
	test.done();
};

exports.testStringsCamelize = function ( test ) {
	test.strictEqual( strings.camelize( "the_doctor" ), "theDoctor" );
	test.strictEqual( strings.camelize( "The doctor" ), "TheDoctor" );
	test.done();
};

exports.testStringsUnderscored = function ( test ) {
	test.strictEqual( strings.underscored( "theDoctorRocks" ), "the_doctor_rocks" );
	test.done();
};

exports.testStringsClassify = function ( test ) {
	test.strictEqual( strings.classify( "the_doctor_rocks" ), "TheDoctorRocks" );
	test.done();
};

exports.testStringsHumanize = function ( test ) {
	test.strictEqual( strings.humanize( "the_doctor_rocks" ), "The doctor rocks" );
	test.done();
};

exports.testStringsTrims = function ( test ) {
	var test1 = "    the     ";
	test.strictEqual( strings.trim( test1 ), "the" );
	test.strictEqual( strings.ltrim( test1 ), "the     " );
	test.strictEqual( strings.rtrim( test1 ), "    the" );
	test.done();
};

exports.testStringsTruncate = function ( test ) {
	test.strictEqual( strings.truncate( "DoctorAmyRiverRory went walking", 10 ), "DoctorAmyR..." );
	test.done();
};

exports.testStringsPrune = function ( test ) {
	test.strictEqual( strings.prune( "Doctor Amy River Rory went walking", 10 ), "Doctor Amy..." );
	test.done();
};

exports.testStringsWords = function ( test ) {
	test.deepEqual( strings.words( "Doctor Amy River Rory went walking" ), [ "Doctor", "Amy", "River", "Rory",
		"went", "walking" ] );
	test.done();
};

exports.testStringsPads = function ( test ) {
	test.strictEqual( strings.pad( "the", 6, "1" ), "111the" );
	test.strictEqual( strings.rpad( "the", 6, "1" ), "the111" );
	test.strictEqual( strings.lrpad( "the", 6, "1" ), "11the1" );
	test.done();
};

exports.testStringsSprintf = function ( test ) {
	test.strictEqual( strings.sprintf( "Hello %1s, it is me, %2s", "Doctor", "Dalek Caan" ),
		"Hello Doctor, it is me, Dalek Caan" );
	test.strictEqual( strings.sprintf( "%1b", 24 ), "11000" );
	test.strictEqual( strings.sprintf( "%1c", 74 ), "J" );
	test.strictEqual( strings.sprintf( "%1d", 40 ), "40" );
	test.strictEqual( strings.sprintf( "%1d", 40 * -1 ), "-40" );
	test.strictEqual( strings.sprintf( "%1e", 40 * 1000000 ), "4e+7" );
	test.strictEqual( strings.sprintf( "%1u", 40 * -1 ), "40" );
	test.strictEqual( strings.sprintf( "%1f", 40.23498765 ), "40.23498765" );
	test.strictEqual( strings.sprintf( "%1o", 24 ), "30" );
	test.strictEqual( strings.sprintf( "%1x", 10 ), "a" );
	test.strictEqual( strings.sprintf( "%1X", 11 ), "B" );
	test.strictEqual( strings.sprintf( "%(name)s %(occupation)s", {
		name       : "doctor",
		occupation : "timelord"
	} ), "doctor timelord" );
	test.done();
};

exports.testStringsStrRightLeft = function ( test ) {
	test.strictEqual( strings.strRight( "Doctor Amy River Rory went walking", "went" ), " walking" );
	assert
		.strictEqual( strings.strRightBack( "Doctor Amy River Rory went walking", "Amy" ),
			" River Rory went walking" );
	test.strictEqual( strings.strLeft( "Doctor Amy River Rory went walking", "Amy" ), "Doctor " );
	test.strictEqual( strings.strLeftBack( "Doctor Amy River Rory went walking", "Amy" ), "Doctor " );
	test.done();
};

exports.testStringsToSentence = function ( test ) {
	test.strictEqual( strings.toSentence( [ "Doctor", "Amy", "River", "Rory went walking" ] ),
		"Doctor, Amy, River and Rory went walking" );
	test.strictEqual( strings.toSentenceSerial( [ "Doctor", "Amy", "River", "Rory went walking" ] ),
		"Doctor, Amy, River, and Rory went walking" );
	test.done();
};

exports.testStringsSlugify = function ( test ) {
	//noinspection JSHint
	test.strictEqual( strings.slugify( "Th� D�ctor" ), "th-dctor" ); // TODO: this
	// looks
	// wrong to
	// me. It
	// should be
	// the-d-ctor,
	// methinks
	test.done();
};

exports.testStringsSurround = function ( test ) {
	test.strictEqual( strings.surround( " loves chachi loves ", "joanie" ), "joanie loves chachi loves joanie" );
	test.done();
};

exports.testStringsQuote = function ( test ) {
	test.strictEqual( strings.quote( "small change got rained on" ), '"small change got rained on"' );
	test.done();
};

exports.testStringsRepeat = function ( test ) {
	test.strictEqual( strings.repeat( "there's no place line home", 3, " " ),
		"there's no place line home there's no place line home there's no place line home" );
	test.done();
};

exports.testStringsLevenshtein = function ( test ) {
	test.strictEqual( strings.levenshtein( "powder finger", "power finger" ), 1 );
	test.strictEqual( strings.levenshtein( "powder finger", "neil young" ), 11 );
	test.strictEqual( strings.levenshtein( "powder finger", "fish fingers" ), 7 );
	test.done();
};

exports.testBase64Encoding = function ( test ) {
	var str = strings.encode( "\\77/[]0987432fgfsujdnfosksuwm*&^%$#@" );
	test.strictEqual( str, 'XDc3L1tdMDk4NzQzMmZnZnN1amRuZm9za3N1d20qJl4lJCNA' );
	test.done();
};

exports.testBase64Decoding = function ( test ) {
	var str = strings.decode( "XDc3L1tdMDk4NzQzMmZnZnN1amRuZm9za3N1d20qJl4lJCNA" );
	test.strictEqual( str, '\\77/[]0987432fgfsujdnfosksuwm*&^%$#@' );
	test.done();
};

exports.isDateFormat = function ( test ) {
	var str1 = "fred is a great guy";
	var str2 = "01/01/2013";

	test.strictEqual( strings.isDateFormat( str1 ), false );
	test.strictEqual( strings.isDateFormat( str2 ), true );
	test.done();
};

exports.isUrl = function ( test ) {
	var str1 = "fred is a great guy";
	var str2 = "http://google.com";
	var str3 = "http://google.com?val=fred";
	var str4 = "ftp://home.com/terry/bashrc";
	var str5 = "http:/google.com";

	test.strictEqual( strings.isUrl( str1 ), false );
	test.strictEqual( strings.isUrl( str2 ), true );
	test.strictEqual( strings.isUrl( str3 ), true );
	test.strictEqual( strings.isUrl( str4 ), true );
	test.strictEqual( strings.isUrl( str5 ), false );
	test.done();
};

exports.isHexColor = function ( test ) {
	var str1 = "fred is a great guy";
	var str2 = "#FF0000";
	var str3 = "ABCDEF";
	var str4 = "ABCDEF00";

	test.strictEqual( strings.isHexColor( str1 ), false );
	test.strictEqual( strings.isHexColor( str2 ), true );
	test.strictEqual( strings.isHexColor( str3 ), true );
	test.strictEqual( strings.isHexColor( str4 ), false );
	test.done();
};

exports.toHexColor = function ( test ) {
	var str1 = "rgb(255, 0, 0)";
	var str2 = "rgb(255, 254, 0)";
	test.strictEqual( strings.toHexColor( str1 ), "ff0000" );
	test.strictEqual( strings.toHexColor( str2 ), "fffe00" );
	test.done();
};

exports.isAlphanumeric = function ( test ) {
	var str1 = "####*&&89A";
	var str2 = "ABC5678";
	test.strictEqual( strings.isAlphanumeric( str1 ), false );
	test.strictEqual( strings.isAlphanumeric( str2 ), true );
	test.done();
};

exports.toAlphanumeric = function ( test ) {
	var str1 = "####*&&89A";
	var str2 = "ABC5678";
	test.strictEqual( strings.toAlphanumeric( str1 ), "89A" );
	test.strictEqual( strings.toAlphanumeric( str2 ), str2 );
	test.done();
};

exports.isAlpha = function ( test ) {
	var str1 = "####*&&89A";
	var str2 = "ABC5678";
	var str3 = "ABCDEf";
	test.strictEqual( strings.isAlpha( str1 ), false );
	test.strictEqual( strings.isAlpha( str2 ), false );
	test.strictEqual( strings.isAlpha( str3 ), true );
	test.done();
};

exports.isNumeric = function ( test ) {
	var str1 = "####*&&89A";
	var str2 = "ABC5678";
	var str3 = "12345";
	test.strictEqual( strings.isNumeric( str1 ), false );
	test.strictEqual( strings.isNumeric( str2 ), false );
	test.strictEqual( strings.isNumeric( str3 ), true );
	test.done();
};

exports.entitize = function ( test ) {
	var str1 = "test me";

	test.strictEqual( strings.entitize( str1 ), "&#116;&#101;&#115;&#116;&#32;&#109;&#101;" );
	test.done();
};

exports.group = function ( test ) {
	var str1 = "Madame Vastra wears a veil";
	test.strictEqual( strings.group( str1, 3, ":)" ), "Mad:)ame:) Va:)str:)a w:)ear:)s a:) ve:)il:)" );
	test.done();
};

exports.unwrap = function ( test ) {
	var str = "The Doctor <br/>has a cool\n bowtie";
	test.strictEqual( strings.unwrap( str ), "The Doctor <br/>has a cool bowtie" );
	test.strictEqual( strings.unwrap( str, true ), "The Doctor has a cool bowtie" );
	test.done();
};

exports.contains = function ( test ) {
	test.strictEqual( strings.contains( "Chocolate Fudge", "Fudge" ), true );
	test.done();
};

exports.getCommonPrefix = function ( test ) {
	test.strictEqual( strings.getCommonPrefix( "Chocolate Fudge", "Choco Mocha" ), "Choco" );
	test.strictEqual( strings.getCommonPrefix( "Chocolate Fudge", "cocoa" ), "" );

	test.done();
};

exports.isEmail = function ( test ) {
	test.strictEqual( strings.isEmail( "me@terryweiss.net" ), true );

	test.strictEqual( strings.isEmail( "me@terryweiss" ), false );
	test.strictEqual( strings.isEmail( "me(at)terryweiss.net" ), false );
	test.done();
};
