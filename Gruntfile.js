"use strict";
var path = require( "path" );
var sys = require( "lodash" );

var jsdocPublicApi = {
	src       : ["./src", "./README.md", "./index.js"],
	dest      : "./dox",
	tutorials : "./",
	template  : "../docstrap/template",
	config    : "./etc/jsdoc.conf.json",
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

	shell  : {
		options    : {
			stdout : true,
			stderr : true
		},
		docs       : {
			command : jsdocCommand( jsdocPublicApi )
		},
		browserify : {
			command : "browserify index.js > dist/ink.strings.js"
		}
	},
	jshint : {
		files : ["src/**/*.js", "index.js"],

		options : {
			node         : true,
			boss         : true,
			globalstrict : true,
			validthis    : true
		}
	},
	uglify : {
		options : {
			compress         : true,
			preserveComments : "some",
			banner           : '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> */\n'
		},
		strings : {
			files : {
				'dist/ink.strings.min.js' : ['src/notices.js', 'dist/ink.strings.js' ]
			}
		}
	},
	copy: {
		docs: {
			files: [
				{expand:true, cwd: "dox/", src: ['**'], dest: '../strings-dox/'},
				{src: ['etc/splat.png'], dest: '../strings-dox/etc/splat.png'} // includes files in path and its subdirs

			]
		}
	}

};

module.exports = function ( grunt ) {
	tasks.pkg = grunt.file.readJSON( 'package.json' );
	grunt.initConfig( tasks );

	grunt.loadNpmTasks( "grunt-shell" );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks('grunt-contrib-copy');

	grunt.registerTask( "dox", ["shell:docs", "copy:docs"] );
	grunt.registerTask( "lint", ["jshint"] );
	grunt.registerTask( "brow", ["shell:browserify"] );

	grunt.registerTask( "build", ["lint", "brow", "uglify"] );
	grunt.registerTask( "all", ["build", "dox"] );



};
