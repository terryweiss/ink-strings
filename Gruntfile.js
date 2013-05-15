"use strict";
var path = require( "path" );
var sys = require("lodash");
var jsdocPublicApi = {
	src       : ["./src", "./README.md", "./index.js"],
	dest      : "./dox",
	tutorials : "./",
	template  : "./etc/doc-template",
	config    : "./etc/doc-template/jsdoc.conf.json",
	options   : "--recurse --lenient --verbose"
};
function jsdocCommand( jsdoc ) {
	var cmd = [];
	cmd.unshift( jsdoc.options );
//	cmd.unshift( "--private" );
//	cmd.push( "-u " + path.resolve( jsdoc.tutorials ) );
	cmd.push( "-d " + path.resolve( jsdoc.dest ) );
	cmd.push( "-t " + path.resolve( jsdoc.template ) );
	cmd.push( "-c " + path.resolve( jsdoc.config ) );
	sys.each( jsdoc.src, function ( src ) {
		cmd.push( path.resolve( src ) );
	} );
	cmd.unshift( path.resolve( "./node_modules/jsdoc/jsdoc" ) );
	return cmd.join( " " );
}
var tasks = {
		shell : {
			options : {
				stdout : true,
				stderr : true
			},
			docs    : {
				command : jsdocCommand( jsdocPublicApi )
			}
		}
	};
module.exports = function ( grunt ) {

	grunt.initConfig( tasks );
	grunt.loadNpmTasks( "grunt-shell" );
	grunt.registerTask("dox", ["shell:docs"]);

};
