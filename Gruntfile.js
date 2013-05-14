"use strict";

var tasks = {
	shell : {
		options : {
			stdout : true,
			stderr : true
		},
		docs    : {
			command: "./node_modules/jsdoc/jsdoc strings.js src/*.js -d docs -c etc/jsdoc.conf.json -t etc/doc-template"
		}
	}
};
module.exports = function ( grunt ) {

	grunt.initConfig( tasks );
	grunt.loadNpmTasks( "grunt-shell" );

};
