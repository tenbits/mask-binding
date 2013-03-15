/**
 *	IncludeJSBuild
 *
 *	``` $ includejs build.js ```
 **/


global.config = {
	'settings': {
		io: {
			extensions: {
				js: ['condcomments:read', 'importer:read']
			}
		}
	},
	'import': {
		files: 'builds/**',
		output: 'lib/'
	},
	'jshint': {
		files: ['lib/mask.binding.js'],
		jshint: JSHint()
	},
	'uglify': {
		files: 'lib/mask.binding.js'
	},

	'copy': {
		files: {
			'lib/mask.binding.embed.js': '../mask/src/handlers/mask.binding.js'
		}
	},

	'watch': {
		files: 'src/**',
		config: '#[import]'
	},

	'defaults': ['import', 'jshint', 'uglify', 'copy']
};




function JSHint() {

	return {
		options: {
			curly: true,
			eqeqeq: true,
			forin: true,
			immed: true,
			latedef: true,
			newcap: true,
			noarg: true,
			noempty: true,
			nonew: true,
			regexp: true,
			undef: true,
			unused: true,
			strict: true,
			trailing: true,

			boss: true,
			eqnull: true,
			es5: true,
			lastsemic: true,
			browser: true,
			node: true,
			onevar: false,
			evil: true,
			sub: true,
		},
		globals: {
			define: true,
			require: true,
		}
	};
}
