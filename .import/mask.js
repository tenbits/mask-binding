// source ../src/umd-head.js
(function (root, factory) {
    'use strict';

    var doc = typeof document === 'undefined' ? null : document,
        construct = function(){
            return factory(doc);
        };

    if (typeof exports === 'object') {
        module.exports = construct();
    } else if (typeof define === 'function' && define.amd) {
        define(construct);
    } else {
        root.mask = construct();
    }
}(this, function (document) {
    'use strict';




// source ../src/scope-vars.js
var regexpWhitespace = /\s/g,
	regexpEscapedChar = {
		"'": /\\'/g,
		'"': /\\"/g,
		'{': /\\\{/g,
		'>': /\\>/g,
		';': /\\>/g
	},
	hasOwnProp = {}.hasOwnProperty,
	listeners = null;

// source ../src/util/util.js
function util_extend(target, source) {

	if (target == null) {
		target = {};
	}
	for (var key in source) {
		// if !SAFE
		if (hasOwnProp.call(source, key) === false) {
			continue;
		}
		// endif
		target[key] = source[key];
	}
	return target;
}

function util_getProperty(o, chain) {
	if (chain === '.') {
		return o;
	}

	var value = o,
		props = chain.split('.'),
		i = -1,
		length = props.length;

	while (value != null && ++i < length) {
		value = value[props[i]];
	}

	return value;
}

/**
 * - arr (Array) - array that was prepaired by parser -
 *  every even index holds interpolate value that was in #{some value}
 * - model: current model
 * - type (String const) (node | attr): tell custom utils what part we are
 *  interpolating
 * - cntx (Object): current render context object
 * - element (HTMLElement):
 * type node - this is a container
 * type attr - this is element itself
 * - name
 *  type attr - attribute name
 *  type node - undefined
 *
 * -returns Array | String
 *
 * If we rendere interpolation in a TextNode, then custom util can return not only string values,
 * but also any HTMLElement, then TextNode will be splitted and HTMLElements will be inserted within.
 * So in that case we return array where we hold strings and that HTMLElements.
 *
 * If custom utils returns only strings, then String will be returned by this function
 *
 */

function util_interpolate(arr, type, model, cntx, element, controller, name) {
	var length = arr.length,
		i = 0,
		array = null,
		string = '',
		even = true,
		utility, value, index, key;

	for (; i < length; i++) {
		if (even === true) {
			if (array == null){
				string += arr[i];
			} else{
				array.push(arr[i]);
			}
		} else {
			key = arr[i];
			value = null;
			index = key.indexOf(':');

			if (index === -1) {
				value = util_getProperty(model, key);
			} else {
				utility = index > 0 ? key.substring(0, index).replace(regexpWhitespace, '') : '';
				if (utility === '') {
					utility = 'expression';
				}

				key = key.substring(index + 1);
				if (typeof ModelUtils[utility] === 'function'){
					value = ModelUtils[utility](key, model, cntx, element, controller, name, type);
				}
			}

			if (value != null){

				if (typeof value === 'object' && array == null){
					array = [string];
				}

				if (array == null){
					string += value;
				} else {
					array.push(value);
				}

			}
		}

		even = !even;
	}

	return array == null ? string : array;
}

// source ../src/util/string.js
function Template(template) {
	this.template = template;
	this.index = 0;
	this.length = template.length;
}

Template.prototype = {
	skipWhitespace: function () {

		var template = this.template,
			index = this.index,
			length = this.length;

		for (; index < length; index++) {
			if (template.charCodeAt(index) > 32 /*' '*/) {
				break;
			}
		}

		this.index = index;

		return this;
	},

	skipToAttributeBreak: function () {

		var template = this.template,
			index = this.index,
			length = this.length,
			c;
		do {
			c = template.charCodeAt(++index);
			// if c == # && next() == { - continue */
			if (c === 35 && template.charCodeAt(index + 1) === 123) {
				// goto end of template declaration
				this.index = index;
				this.sliceToChar('}');
				this.index++;
				return;
			}
		}
		while (c !== 46 && c !== 35 && c !== 62 && c !== 123 && c !== 32 && c !== 59 && index < length);
		//while(!== ".#>{ ;");

		this.index = index;
	},
	sliceToChar: function (c) {
		var template = this.template,
			index = this.index,
			start = index,
			isEscaped = false,
			value, nindex;

		while ((nindex = template.indexOf(c, index)) > -1) {
			index = nindex;
			if (template.charCodeAt(index - 1) !== 92 /*'\\'*/) {
				break;
			}
			isEscaped = true;
			index++;
		}

		value = template.substring(start, index);

		this.index = index;

		return isEscaped ? value.replace(regexpEscapedChar[c], c) : value;
	}

};

// source ../src/util/condition.js
/**
 *	ConditionUtil
 *
 *	Helper to work with conditional expressions
 **/

var ConditionUtil = (function() {

	function parseDirective(T, currentChar) {
		var c = currentChar,
			start = T.index,
			token;

		if (c == null) {
			T.skipWhitespace();
			start = T.index;
			currentChar = c = T.template.charCodeAt(T.index);
		}

		if (c === 34 /*"*/ || c === 39 /*'*/ ) {

			T.index++;
			token = T.sliceToChar(c === 39 ? "'" : '"');
			T.index++;

			return token;
		}


		do {
			c = T.template.charCodeAt(++T.index);
		} while (T.index < T.length && //
		c !== 32 /* */ && //
		c !== 33 /*!*/ && //
		c !== 60 /*<*/ && //
		c !== 61 /*=*/ && //
		c !== 62 /*>*/ && //
		c !== 40 /*(*/ && //
		c !== 41 /*)*/ && //
		c !== 38 /*&*/ && //
		c !== 124 /*|*/ );

		token = T.template.substring(start, T.index);

		c = currentChar;

		if (c === 45 || (c > 47 && c < 58)) { /* [-] || [number] */
			return token - 0;
		}

		if (c === 116 /*t*/ && token === 'true') {
			return true;
		}

		if (c === 102 /*f*/ && token === 'false') {
			return false;
		}

		return {
			value: token
		};
	}



	function parseAssertion(T, output) {
		// use shadow class
		var current = {
			assertions: null,
			join: null,
			left: null,
			right: null
		},
			c;

		if (output == null) {
			output = [];
		}

		if (typeof T === 'string') {
			T = new Template(T);
		}
		outer: while(1) {
			T.skipWhitespace();

			if (T.index >= T.length) {
				break;
			}

			c = T.template.charCodeAt(T.index);

			switch (c) {
			case 61:
				// <
			case 60:
				// >
			case 62:
				// !
			case 33:
				var start = T.index;
				do {
					c = T.template.charCodeAt(++T.index);
				} while (T.index < T.length && (c === 60 || c === 61 || c === 62));

				current.sign = T.template.substring(start, T.index);
				continue;
				// &
			case 38:
				// |
			case 124:
				if (T.template.charCodeAt(++T.index) !== c) {
					console.error('Unary operation not valid');
				}

				current.join = c === 38 ? '&&' : '||';

				output.push(current);
				current = {
					assertions: null,
					join: null,
					left: null,
					right: null
				};

				++T.index;
				continue;
				// (
			case 40:
				T.index++;
				parseAssertion(T, (current.assertions = []));
				break;
				// )
			case 41:
				T.index++;
				break outer;
			default:
				current[current.left == null ? 'left' : 'right'] = parseDirective(T, c);
				continue;
			}
		};

		if (current.left || current.assertions) {
			output.push(current);
		}
		return output;
	}


	var _cache = [];

	function parseLinearCondition(line) {

		if (_cache[line] != null) {
			return _cache[line];
		}

		var length = line.length,
			ternary = {
				assertions: null,
				case1: null,
				case2: null
			},
			questionMark = line.indexOf('?'),
			T = new Template(line);


		if (questionMark !== -1) {
			T.length = questionMark;
		}

		ternary.assertions = parseAssertion(T);

		if (questionMark !== -1){
			T.length = length;
			T.index = questionMark + 1;

			ternary.case1 = parseDirective(T);
			T.skipWhitespace();

			if (T.template.charCodeAt(T.index) === 58 /*:*/ ) {
				T.index++; // skip ':'
				ternary.case2 = parseDirective(T);
			}
		}

		return (_cache[line] = ternary);
	}

	function isCondition(assertions, model) {
		if (typeof assertions === 'string') {
			assertions = parseLinearCondition(assertions).assertions;
		}

		if (assertions.assertions != null) {
			// backwards compatible, as argument was a full condition statement
			assertions = assertions.assertions;
		}

		var current = false,
			a, value1, value2, i, length;

		for (i = 0, length = assertions.length; i < length; i++) {
			a = assertions[i];

			if (a.assertions) {
				current = isCondition(a.assertions, model);
			} else {
				value1 = typeof a.left === 'object' ? util_getProperty(model, a.left.value) : a.left;

				if (a.right == null) {
					current = value1;
					if (a.sign === '!') {
						current = !current;
					}

				} else {
					value2 = typeof a.right === 'object' ? util_getProperty(model, a.right.value) : a.right;
					switch (a.sign) {
					case '<':
						current = value1 < value2;
						break;
					case '<=':
						current = value1 <= value2;
						break;
					case '>':
						current = value1 > value2;
						break;
					case '>=':
						current = value1 >= value2;
						break;
					case '!=':
						current = value1 !== value2;
						break;
					case '==':
						current = value1 === value2;
						break;
					}
				}
			}

			if (current) {
				if (a.join === '&&') {
					continue;
				}

				break; // we are in OR and current is truthy
			}
			
			if (a.join === '||') {
				continue;
			}

			if (a.join === '&&'){
				// find OR in stack (false && false && false || true -> true)
				for(++i; i<length; i++){
					if (assertions[i].join === '||'){
						break;
					}
				}
			}
		}
		return current;
	}

	return {
		/**
		 *	condition(ternary[, model]) -> result
		 *	- ternary (String)
		 *	- model (Object): Data Model
		 *
		 *	Ternary Operator is evaluated via ast parsing.
		 *	All this expressions are valid:
		 *		('name=="me"',{name: 'me'}) -> true
		 *		('name=="me"?"yes"',{name: 'me'}) -> "yes"
		 *		('name=="me"? surname',{name: 'me', surname: 'you'}) -> 'you'
		 *		('name=="me" ? surname : "none"',{}) -> 'none'
		 *
		 **/
		condition: function(line, model) {
			var con = parseLinearCondition(line),
				result = isCondition(con.assertions, model);

			if (con.case1 != null){
				result =  result ? con.case1 : con.case2;
			}

			if (result == null) {
				return '';
			}
			if (typeof result === 'object' && result.value) {
				return util_getProperty(model, result.value);
			}

			return result;
		},
		/**
		 *	isCondition(condition, model) -> Boolean
		 * - condition (String)
		 * - model (Object)
		 *
		 *	Evaluate condition via ast parsing using specified model data
		 **/
		isCondition: isCondition,

		/**
		 *	parse(condition) -> Object
		 * - condition (String)
		 *
		 *	Parse condition to an AstTree.
		 **/
		parse: parseLinearCondition,

		/* deprecated - moved to parent */
		out: {
			isCondition: isCondition,
			parse: parseLinearCondition
		}
	};
}());

// source ../src/expression/exports.js
var ExpressionUtil = (function(){

	// source 1.scope-vars.js
	
	var index = 0,
		length = 0,
		cache = {},
		template, ast;
	
	var op_Minus = '-', //1,
		op_Plus = '+', //2,
		op_Divide = '/', //3,
		op_Multip = '*', //4,
		op_LogicalOr = '||', //5,
		op_LogicalAnd = '&&', //6,
		op_LogicalNot = '!', //7,
		op_LogicalEqual = '==', //8,
		op_LogicalNotEqual = '!=', //10,
		op_LogicalGreater = '>', //11,
		op_LogicalGreaterEqual = '>=', //12,
		op_LogicalLess = '<', //13,
		op_LogicalLessEqual = '<=', //14,
		op_Member = '.', // 15
	
		punc_ParantheseOpen = 20,
		punc_ParantheseClose = 21,
		punc_Comma = 22,
		punc_Dot = 23,
		punc_Question = 24,
		punc_Colon = 25,
	
		go_ref = 30,
		go_string = 31,
		go_number = 32;
	
	var type_Body = 1,
		type_Statement = 2,
		type_SymbolRef = 3,
		type_FunctionRef = 4,
		type_Accessor = 5,
		type_Value = 6,
	
	
		type_Number = 7,
		type_String = 8,
		type_UnaryPrefix = 9,
		type_Ternary = 10;
	
	var state_body = 1,
		state_arguments = 2;
	
	
	var precedence = {};
	
	precedence[op_Member] = 1;
	
	precedence[op_Divide] = 2;
	precedence[op_Multip] = 2;
	
	precedence[op_Minus] = 3;
	precedence[op_Plus] = 3;
	
	precedence[op_LogicalGreater] = 4;
	precedence[op_LogicalGreaterEqual] = 4;
	precedence[op_LogicalLess] = 4;
	precedence[op_LogicalLessEqual] = 4;
	
	precedence[op_LogicalEqual] = 5;
	precedence[op_LogicalNotEqual] = 5;
	
	
	precedence[op_LogicalAnd] = 6;
	precedence[op_LogicalOr] = 6;
	
	// source 2.ast.js
	function Ast_Body(parent) {
		this.parent = parent;
		this.type = type_Body;
		this.body = [];
		this.join = null;
	}
	
	function Ast_Statement(parent) {
		this.parent = parent;
	}
	Ast_Statement.prototype = {
		constructor: Ast_Statement,
		type: type_Statement,
		join: null,
		body: null
	};
	
	
	function Ast_Value(value) {
		this.type = type_Value;
		this.body = value;
		this.join = null;
	}
	
	function Ast_FunctionRef(parent, ref) {
		this.parent = parent;
		this.type = type_FunctionRef;
		this.body = ref;
		this.arguments = [];
		this.next = null;
	}
	Ast_FunctionRef.prototype = {
		constructor: Ast_FunctionRef,
		newArgument: function() {
			var body = new Ast_Body(this);
			this.arguments.push(body);
	
			return body;
		}
	};
	
	function Ast_SymbolRef(parent, ref) {
		this.parent = parent;
		this.type = type_SymbolRef;
		this.body = ref;
		this.next = null;
	}
	
	function Ast_Accessor(parent, astRef){
		this.parent = parent;
		this.body = astRef;
		this.next = null;
	}
	
	
	function Ast_UnaryPrefix(parent, prefix) {
		this.parent = parent;
		this.prefix = prefix;
	}
	Ast_UnaryPrefix.prototype = {
		constructor: Ast_UnaryPrefix,
		type: type_UnaryPrefix,
		body: null
	};
	
	
	
	function Ast_TernaryStatement(assertions){
		this.body = assertions;
		this.case1 = new Ast_Body(this);
		this.case2 = new Ast_Body(this);
	}
	Ast_TernaryStatement.prototype = {
		constructor: Ast_TernaryStatement,
		type: type_Ternary,
		case1: null,
		case2: null
	};
	
	
	function ast_append(current, next) {
		if (null == current) {
			console.error('Undefined', current, next);
		}
		var type = current.type;
	
		if (type_Body === type){
			current.body.push(next);
			return next;
		}
	
		if (type_Statement === type || type_UnaryPrefix === type){
			return current.body = next;
		}
	
		if (type_SymbolRef === type || type_FunctionRef === type){
			return current.next = next;
		}
	
		console.error('Unsupported - append:', current, next);
		return next;
	}
	
	function ast_join(){
		if (arguments.length === 0){
			return null;
		}
		var body = new Ast_Body(arguments[0].parent);
	
		body.join = arguments[arguments.length - 1].join;
		body.body = Array.prototype.slice.call(arguments);
	
		return body;
	}
	
	function ast_handlePrecedence(ast){
		if (ast.type !== type_Body){
			if (ast.body != null && typeof ast.body === 'object'){
				ast_handlePrecedence(ast.body);
			}
			return;
		}
	
		var body = ast.body,
			i = 0,
			length = body.length,
			x, prev, array;
	
		for(; i < length; i++){
			ast_handlePrecedence(body[i]);
		}
	
	
		for(i = 1; i < length; i++){
			x = body[i];
			prev = body[i-1];
	
			if (precedence[prev.join] > precedence[x.join]){
				break;
			}
		}
	
		if (i === length){
			return;
		}
	
		array = [body[0]];
		for(i = 1; i < length; i++){
			x = body[i];
			prev = body[i-1];
	
			if (precedence[prev.join] > precedence[x.join] && i < length - 1){
				x = ast_join(body[i], body[++i]);
			}
	
			array.push(x);
		}
	
		ast.body = array;
	
	}
	
	// source 3.util.js
	function _throw(message, token) {
		console.error('Expression parser:', message, token, template.substring(index));
	}
	
	
	function util_resolveRef(astRef, model, cntx, controller) {
		var current = astRef,
			key = astRef.body,
			object, value;
	
		if (value == null && model != null) {
			object = model;
			value = model[key];
		}
	
		if (value == null && cntx != null) {
			object = cntx;
			value = cntx[key];
		}
	
		if (value == null && controller != null) {
			do {
				object = controller;
				value = controller[key];
			} while (value == null && (controller = controller.parent) != null);
		}
	
		if (value != null) {
			do {
				if (current.type === type_FunctionRef) {
					var args = [];
					for (var i = 0, x, length = current.arguments.length; i < length; i++) {
						x = current.arguments[i];
						args[i] = expression_evaluate(x, model, cntx, controller);
					}
					value = value.apply(object, args);
				}
	
				if (value == null || current.next == null) {
					break;
				}
	
				current = current.next;
				key = current.body;
				object = value;
				value = value[key];
	
				if (value == null) {
					break;
				}
	
			} while (true);
		}
	
		if (value == null){
			if (current == null || current.next != null){
				_throw('Mask - Accessor error - ', key);
			}
			if (current != null && current.type === type_FunctionRef){
				_throw('Mask - Accessor error - Function Call -', key);
			}
		}
	
		return value;
	
	
	}
	
	function util_getValue(object, props, length) {
		var i = -1,
			value = object;
		while (value != null && ++i < length) {
			value = value[props[i]];
		}
		return value;
	}
	
	// source 4.parser.helper.js
	function parser_skipWhitespace() {
		var c;
		while (index < length) {
			c = template.charCodeAt(index);
			if (c > 32) {
				return c;
			}
			index++;
		}
		return null;
	}
	
	
	function parser_getString(c) {
		var isEscaped = false,
			_char = c === 39 ? "'" : '"',
			start = index,
			nindex, string;
	
		while ((nindex = template.indexOf(_char, index)) > -1) {
			index = nindex;
			if (template.charCodeAt(nindex - 1) !== 92 /*'\\'*/ ) {
				break;
			}
			isEscaped = true;
			index++;
		}
	
		string = template.substring(start, index);
		if (isEscaped === true) {
			string = string.replace(regexpEscapedChar[_char], _char);
		}
		return string;
	}
	
	function parser_getNumber() {
		var start = index,
			code, isDouble;
		while (true) {
	
			code = template.charCodeAt(index);
			if (code === 46) {
				// .
				if (isDouble === true) {
					_throw('Unexpected punc');
					return null;
				}
				isDouble = true;
			}
			if ((code >= 48 && code <= 57 || code === 46) && index < length) {
				index++;
				continue;
			}
			break;
		}
	
		return +template.substring(start, index);
	}
	
	function parser_getRef() {
		var start = index,
			c = template.charCodeAt(index),
			ref;
	
		if (c === 34 || c === 39){
			index++;
			ref = parser_getString(c);
			index++;
			return ref;
		}
	
		while (true) {
	
			c = template.charCodeAt(index);
			if (
				c > 47 && // ()+-*,/
	
				c !== 58 && // :
				c !== 60 && // <
				c !== 61 && // =
				c !== 62 && // >
				c !== 63 && // ?
				
				c !== 124 && // |
	
				index < length) {
	
				index++;
				continue;
			}
	
			break;
		}
	
		return template.substring(start, index);
	}
	
	function parser_getDirective(code) {
	
		if (code == null && index === length) {
			return null;
		}
	
		if (code === 40) {
			// )
			return punc_ParantheseOpen;
		}
		if (code === 41) {
			// )
			return punc_ParantheseClose;
		}
		if (code === 44) {
			// ,
			return punc_Comma;
		}
	
		if (code === 46) {
			// .
			return punc_Dot;
		}
	
		if (code === 43) {
			// +
			return op_Plus;
		}
		if (code === 45) {
			// -
			return op_Minus;
		}
		if (code === 42) {
			// *
			return op_Multip;
		}
		if (code === 47) {
			// /
			return op_Divide;
		}
	
		if (code === 61) {
			// =
			if (template.charCodeAt(++index) !== code) {
				_throw('Not supported (Apply directive)');
				return null;
			}
			return op_LogicalEqual;
		}
	
		if (code === 33) {
			// !
			var next = template.charCodeAt(index + 1);
			if (next === 61) {
				// =
				index++;
				return op_LogicalNotEqual;
			}
			return op_LogicalNot;
		}
	
		if (code === 62){
			// >
			var next = template.charCodeAt(index + 1);
			if (next === 61){
				index++;
				return op_LogicalGreaterEqual;
			}
			return op_LogicalGreater;
		}
	
		if (code === 60){
			// <
			var next = template.charCodeAt(index + 1);
			if (next === 61){
				index++;
				return op_LogicalLessEqual;
			}
			return op_LogicalLess;
		}
	
		if (code === 38){
			// &
			if (template.charCodeAt(++index) !== code){
				_throw('Single Binary Operator AND');
				return null;
			}
			return op_LogicalAnd;
		}
	
		if (code === 124){
			// |
			if (template.charCodeAt(++index) !== code){
				_throw('Single Binary Operator OR');
				return null;
			}
			return op_LogicalOr;
		}
	
		if (code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95 || code === 36) {
			// A-Z a-z _ $
			return go_ref;
		}
	
		if (code >= 48 && code <= 57) {
			// 0-9 .
			return go_number;
		}
	
		if (code === 34 || code === 39) {
			// " '
			return go_string;
		}
	
		if (code === 63){
			// "
			return punc_Question;
		}
	
		if (code === 58){
			// :
			return punc_Colon;
		}
	
		_throw('Unexpected / Unsupported directive');
		return null;
	}
	
	// source 5.parser.js
	function expression_parse(expr) {
	
		template = expr;
		index = 0;
		length = expr.length;
	
		ast = new Ast_Body();
	
		var c, current = ast,
			next, directive, state = state_body;
	
		while (true) {
	
			if (index < length && (c = template.charCodeAt(index)) < 33) {
				index++;
				continue;
			}
	
			if (index >= length) {
				break;
			}
	
			directive = parser_getDirective(c);
	
			if (directive == null && index < length){
				break;
			}
	
			if (punc_ParantheseOpen === directive) {
				current = ast_append(current, new Ast_Statement(current));
				current = ast_append(current, new Ast_Body(current));
	
				index++;
				continue;
			}
	
			if (punc_ParantheseClose === directive) {
				var closest = type_Body;
				if (state === state_arguments) {
					state = state_body;
					closest = type_FunctionRef;
				}
	
				do {
					current = current.parent;
				} while (current != null && current.type !== closest);
	
				if (closest === type_Body){
					current = current.parent;
				}
	
				if (current == null) {
					_throw('OutOfAst Exception - body closed');
					break;
				}
	
				index++;
				continue;
			}
	
			if (punc_Comma === directive) {
				if (state !== state_arguments) {
					_throw('Unexpected punctuation, comma');
					break;
				}
				do {
					current = current.parent;
				} while (current != null && current.type !== type_FunctionRef);
	
				if (current == null) {
					_throw('OutOfAst Exception - next argument');
					break;
				}
	
				current = current.newArgument();
	
				index++;
				continue;
			}
	
			if (punc_Question === directive){
				ast = new Ast_TernaryStatement(ast);
				current = ast.case1;
	
				index++;
				continue;
			}
	
			if (punc_Colon === directive){
				current = ast.case2;
	
				index++;
				continue;
			}
	
			if (punc_Dot === directive){
				c = template.charCodeAt(index+1);
				if (c >= 48 && c <= 57){
					directive = go_number;
				}else{
					directive = go_ref;
					index++;
				}
			}
	
	
			if (current.type === type_Body) {
				current = ast_append(current, new Ast_Statement(current));
			}
	
			if ((op_Minus === directive || op_LogicalNot === directive) && current.body == null) {
				current = ast_append(current, new Ast_UnaryPrefix(current, directive));
				index++;
				continue;
			}
	
			// @TODO - replace operations with numbers and use > < compare
			if ( //
			op_Minus === directive || //
			op_Plus === directive || //
			op_Multip === directive || //
			op_Divide === directive || //
			op_LogicalAnd === directive || //
			op_LogicalOr === directive || //
			op_LogicalEqual === directive || //
			op_LogicalNotEqual === directive || //
	
			op_LogicalGreater === directive || //
			op_LogicalGreaterEqual === directive || //
			op_LogicalLess === directive || //
			op_LogicalLessEqual === directive
	
			) {
	
				while(current && current.type !== type_Statement){
					current = current.parent;
				}
	
				if (current.body == null) {
					_throw('Unexpected operator', current);
					break;
				}
	
				current.join = directive;
	
				do {
					current = current.parent;
				} while (current != null && current.type !== type_Body);
	
				if (current == null) {
					console.error('Unexpected parent', current);
				}
	
	
				index++;
				continue;
			}
	
			if ( //
			go_string === directive || //
			go_number === directive //|| //
			//go_ref === directive
			) {
				if (current.body != null && current.join == null) {
					debugger;
					_throw('Directive Expected');
					break;
				}
			}
	
			if (go_string === directive) {
				index++;
				ast_append(current, new Ast_Value(parser_getString(c)));
				index++;
				continue;
			}
	
			if (go_number === directive) {
				ast_append(current, new Ast_Value(parser_getNumber(c)));
				//index++;
				continue;
			}
	
			if (go_ref === directive) {
				var ref = parser_getRef();
	
				while (index < length) {
					c = template.charCodeAt(index);
					if (c < 33){
						index++;
						continue;
					}
					break;
				}
	
				if (c === 40) {
	
					// (
					// function ref
					state = state_arguments;
					index++;
	
					var fn = ast_append(current, new Ast_FunctionRef(current, ref));
	
					current = fn.newArgument();
					continue;
				}
	
				if (c === 110 && ref === 'null'){
					ref = null;
				}
	
				if (c === 102 && ref === 'false'){
					ref = false;
				}
	
				if (c === 116 && ref === 'true'){
					ref = true;
				}
	
				current = ast_append(current, typeof ref === 'string' ? new Ast_SymbolRef(current, ref) : new Ast_Value(ref));
			}
		}
	
		if (current.body == null && current.type === type_Statement){
			_throw('Unexpected end of expression');
		}
	
		ast_handlePrecedence(ast);
	
		return ast;
	}
	
	// source 6.eval.js
	function expression_evaluate(mix, model, cntx, controller) {
	
		var result, ast;
	
		if (mix == null){
			return null;
		}
	
		if (typeof mix === 'string'){
			if (cache.hasOwnProperty(mix) === true){
				ast = cache[mix];
			}else{
				ast = (cache[mix] = expression_parse(mix));
			}
		}else{
			ast = mix;
		}
	
		var type = ast.type,
			result = null;
		if (type_Body === type) {
			var value, prev;
	
			outer: for (var i = 0, x, length = ast.body.length; i < length; i++) {
				x = ast.body[i];
	
				value = expression_evaluate(x, model, cntx, controller);
	
				if (prev == null) {
					prev = x;
					result = value;
					continue;
				}
	
				if (prev.join === op_LogicalAnd) {
					if (!result) {
						for (; i < length; i++) {
							if (ast.body[i].join === op_LogicalOr) {
								break;
							}
						}
					}else{
						result = value;
					}
				}
	
				if (prev.join === op_LogicalOr) {
					if (result){
						break outer;
					}
					if (value) {
						result = value;
						break outer;
					}
				}
	
				switch (prev.join) {
				case op_Minus:
					result -= value;
					break;
				case op_Plus:
					result += value;
					break;
				case op_Divide:
					result /= value;
					break;
				case op_Multip:
					result *= value;
					break;
				case op_LogicalNotEqual:
					result = result != value;
					break;
				case op_LogicalEqual:
					result = result == value;
					break;
				case op_LogicalGreater:
					result = result > value;
					break;
				case op_LogicalGreaterEqual:
					result = result >= value;
					break;
				case op_LogicalLess:
					result = result < value;
					break;
				case op_LogicalLessEqual:
					result = result <= value;
					break;
				}
	
				prev = x;
			}
		}
	
		if (type_Statement === type) {
			return expression_evaluate(ast.body, model, cntx, controller);
		}
	
		if (type_Value === type) {
			return ast.body;
		}
	
		if (type_SymbolRef === type || type_FunctionRef === type) {
			return util_resolveRef(ast, model, cntx, controller);
	
			var object = util_getProperty(ast.body, model, cntx, controller);
	
			while(value != null && ast.next != null)
			if (ast.next != null){
				return expression_evaluate(ast.next, value);
			}
			return value;
		}
	
		if (type_FunctionRef === type) {
			var args = [];
			for (var i = 0, x, length = ast.arguments.length; i < length; i++) {
				x = ast.arguments[i];
				args[i] = expression_evaluate(x, model, cntx, controller);
			}
			return util_callFunction(ast.body, args, model, cntx, controller);
		}
	
		if (type_UnaryPrefix === type) {
			result = expression_evaluate(ast.body, model, cntx, controller);
			switch (ast.prefix) {
			case op_Minus:
				result = -result;
				break;
			case op_LogicalNot:
				result = !result;
				break;
			}
		}
	
		if (type_Ternary === type){
			result = expression_evaluate(ast.body, model, cntx, controller);
			result = expression_evaluate(result ? ast.case1 : ast.case2, model, cntx, controller);
	
		}
	
		return result;
	}
	
	// source 7.vars.helper.js
	var refs_extractVars = (function() {
	
		/**
		 * extract symbol references
		 * ~[:user.name + 'px'] -> 'user.name'
		 * ~[someFn(varName) + user.name] -> ['varName', 'user.name']
		 */
	
		function _append(current, x) {
			if (current == null) {
				return x;
			}
	
			if (x == null) {
				return current;
			}
	
			if (typeof current === 'string') {
				current = [current];
			}
	
			if (typeof x === 'string') {
				current.push(x);
				return current;
			}
	
			return current.concat(x);
	
		}
	
	
		return function _extractVars(expr) {
	
			if (expr == null) {
				return null;
			}
	
			if (typeof expr === 'string') {
				expr = expression_parse(expr);
			}
	
			var refs, x;
	
			if (type_Body === expr.type) {
	
				for (var i = 0, length = expr.body.length; i < length; i++) {
					x = _extractVars(expr.body[i]);
					refs = _append(refs, x);
				}
			}
	
			if (type_SymbolRef === expr.type) {
				var path = expr.body,
					next = expr.next;
	
				while (next != null) {
					if (type_FunctionRef === next.type) {
						refs = _extractVars(next);
						return null;
					}
					if (type_SymbolRef !== next.type) {
						console.error('Ast Exception: next should be a symbol/function ref');
						return null;
					}
	
					path += '.' + next.body;
	
					next = next.next;
				}
	
				return path;
			}
	
	
			if ( //
			type_Statement === expr.type || //
			type_UnaryPrefix === expr.type || //
			type_Ternary === expr.type //
			) {
				x = _extractVars(expr.body);
				refs = _append(refs, x);
			}
	
			if (type_Ternary === expr.type) {
				x = _extractVars(ast.case1);
				refs = _append(refs, x);
	
				x = _extractVars(ast.case2);
				refs = _append(refs, x);
			}
	
	
			if (type_FunctionRef === expr.type) {
				for(var i = 0, length = expr.arguments.length; i < length; i++){
					x = _extractVars(expr.arguments[i]);
					refs = _append(refs, x);
				}
			}
	
			return refs;
		}
	
	
	
	}())
	


	return {
		parse: expression_parse,
		eval: expression_evaluate,
		varRefs: refs_extractVars
	};

}());

// source ../src/extends.js
var ModelUtils = {
	condition: ConditionUtil.condition,
	expression: function(value, model, cntx, element, controller){
		return ExpressionUtil.eval(value, model, cntx, controller);
	},
},
	CustomAttributes = {
		'class': null,
		id: null,
		style: null,
		name: null,
		type: null
	},
	CustomTags = {
		// Most common html tags
		// http://jsperf.com/not-in-vs-null/3
		div: null,
		span: null,
		input: null,
		button: null,
		textarea: null,
		select: null,
		option: null,
		h1: null,
		h2: null,
		h3: null,
		h4: null,
		h5: null,
		h6: null,
		a: null,
		p: null,
		img: null,
		table: null,
		td: null,
		tr: null,
		pre: null,
		ul: null,
		li: null,
		ol: null,
		i: null,
		b: null,
		strong: null,
		form: null
	};

// source ../src/dom/dom.js

var Dom = {
	NODE: 1,
	TEXTNODE: 2,
	FRAGMENT: 3,
	COMPONENT: 4,
	CONTROLLER: 9,
	SET: 10,

	Node: Node,
	TextNode: TextNode,
	Fragment: Fragment,
	Component: Component
};

function Node(tagName, parent) {
	this.type = Dom.NODE;

	this.tagName = tagName;
	this.parent = parent;
	this.attr = {};
}

Node.prototype = {
	constructor: Node,
	type: Dom.NODE,
	tagName: null,
	parent: null,
	attr: null,
	nodes: null,
	__single: null
};

function TextNode(text, parent) {
	this.content = text;
	this.parent = parent;
	this.type = Dom.TEXTNODE;
}

TextNode.prototype = {
	type: Dom.TEXTNODE,
	content: null,
	parent: null
};

function Fragment(){
	this.nodes = [];
}

Fragment.prototype = {
	constructor: Fragment,
	type: Dom.FRAGMENT,
	nodes: null
};

function Component(compoName, parent, controller){
	this.tagName = compoName;
	this.parent = parent;
	this.controller = controller;
	this.attr = {};
}

Component.prototype = {
	constructor: Component,
	type: Dom.COMPONENT,
	parent: null,
	attr: null,
	controller: null,
	nodes: null,
	components: null
};

// source ../src/parse/parser.js
var Parser = (function(Node, TextNode, Fragment, Component) {

	var interp_START = '~',
		interp_CLOSE = ']',

		// ~
		interp_code_START = 126,
		// [
		interp_code_OPEN = 91,
		// ]
		interp_code_CLOSE = 93,

		_serialize;


	function ensureTemplateFunction(template) {
		var index = -1;

/*
		 * - single char indexOf is much faster then '~[' search
		 * - function is divided in 2 parts: interpolation start lookup/ interpolation parse
		 * for better performance
		 */
		while ((index = template.indexOf(interp_START, index)) !== -1) {
			if (template.charCodeAt(index + 1) === interp_code_OPEN) {
				break;
			}
			index++;
		}

		if (index === -1) {
			return template;
		}


		var array = [],
			lastIndex = 0,
			i = 0,
			end = 0;


		while (true) {
			var end = template.indexOf(interp_CLOSE, index + 2);
			if (end === -1) {
				break;
			}

			array[i++] = lastIndex === index ? '' : template.substring(lastIndex, index);
			array[i++] = template.substring(index + 2, end);


			lastIndex = index = end + 1;

			while ((index = template.indexOf(interp_START, index)) !== -1) {
				if (template.charCodeAt(index + 1) === interp_code_OPEN) {
					break;
				}
				index++;
			}

			if (index === -1) {
				break;
			}

		}

		if (lastIndex < template.length) {
			array[i] = template.substring(lastIndex);
		}

		template = null;
		return function(type, model, cntx, element, controller, name) {
			if (type == null) {
				// http://jsperf.com/arguments-length-vs-null-check
				// this should be used to stringify parsed MaskDOM
				var string = '';
				for (var i = 0, x, length = array.length; i < length; i++) {
					x = array[i];
					if (i % 2 === 1) {
						string += '~[' + x + ']';
					} else {
						string += x;
					}
				}
				return string;
			}

			return util_interpolate(array, type, model, cntx, element, controller, name);
		};

	}


	function _throw(template, index, state, token) {
		var i = 0,
			line = 0,
			row = 0,
			newLine = /[\r\n]+/g,
			match, parsing = {
				2: 'tag',
				3: 'tag',
				5: 'attribute key',
				6: 'attribute value',
				8: 'literal'
			}[state];
		while (true) {
			match = newLine.exec(template);
			if (match == null) {
				break;
			}
			if (match.index > index) {
				break;
			}
			line++;
			i = match.index;
		}

		row = index - i;

		var message = ['Mask - Unexpected:', token, 'at(', line, ':', row, ') [ in', parsing, ']'];

		console.error(message.join(' '), {
			template: template,
			stopped: template.substring(index)
		});
	}



	return {

		/** @out : nodes */
		parse: function(template) {

			//_serialize = T.serialize;

			var current = new Fragment(),
				fragment = current,
				state = 2,
				last = 3,
				index = 0,
				length = template.length,
				classNames, token, key, value, next, c, start;

			var go_tag = 2,
				state_tag = 3,
				state_attr = 5,
				go_attrVal = 6,
				go_attrHeadVal = 7,
				state_literal = 8,
				go_up = 9;


			outer: while (true) {

				if (index < length && (c = template.charCodeAt(index)) < 33) {
					index++;
					continue;
				}

				// inline comments
				if (c === 47 && template.charCodeAt(index + 1) === 47) {
					// /
					index++;
					while (c !== 10 && c !== 13 && index < length) {
						// goto newline
						c = template.charCodeAt(++index);
					}
					continue;
				}

				if (last === state_attr) {
					if (classNames != null) {
						current.attr['class'] = ensureTemplateFunction(classNames);
						classNames = null;
					}
					if (key != null) {
						current.attr[key] = key;
						key = null;
						token = null;
					}
				}

				if (token != null) {

					if (state === state_attr) {

						if (key == null) {
							key = token;
						} else {
							value = token;
						}

						if (key != null && value != null) {
							if (key !== 'class') {
								current.attr[key] = value;
							} else {
								classNames = classNames == null ? value : classNames + ' ' + value;
							}

							key = null;
							value = null;
						}

					} else if (last === state_tag) {

						next = CustomTags[token] != null ? new Component(token, current, CustomTags[token]) : new Node(token, current);

						if (current.nodes == null) {
							current.nodes = [next];
						} else {
							current.nodes.push(next);
						}

						current = next;


						state = state_attr;

					} else if (last === state_literal) {

						next = new TextNode(token, current);

						if (current.nodes == null) {
							current.nodes = [next];
						} else {
							current.nodes.push(next);
						}

						if (current.__single === true) {
							do {
								current = current.parent;
							} while (current != null && current.__single != null);
						}
						state = go_tag;

					}

					token = null;
				}

				if (index >= length) {
					if (state === state_attr) {
						if (classNames != null) {
							current.attr['class'] = ensureTemplateFunction(classNames)
						}
						if (key != null) {
							current.attr[key] = key;
						}
					}

					break;
				}

				if (state === go_up) {
					current = current.parent;
					while (current != null && current.__single != null) {
						current = current.parent;
					}
					state = go_tag;
				}

				// IF statements should be faster then switch due to strict comparison

				if (c === 123) {
					// {

					last = state;
					state = go_tag;
					index++;

					continue;
				}

				if (c === 62) {
					// >
					last = state;
					state = go_tag;
					index++;
					current.__single = true;
					continue;
				}

				if (c === 59) {
					// ;

					// skip ; , when node is not a single tag (else goto 125)
					if (current.nodes != null) {
						index++;
						continue;
					}
				}

				if (c === 59 || c === 125) {
					// ;}

					index++;
					last = state;
					state = go_up;
					continue;
				}

				if (c === 39 || c === 34) {
					// '"
					// Literal - could be as textnode or attribute value
					if (state === go_attrVal) {
						state = state_attr;
					} else {
						last = state = state_literal;
					}

					index++;



					var isEscaped = false,
						nindex, _char = c === 39 ? "'" : '"';

					start = index;

					while ((nindex = template.indexOf(_char, index)) > -1) {
						index = nindex;
						if (template.charCodeAt(nindex - 1) !== 92 /*'\\'*/ ) {
							break;
						}
						isEscaped = true;
						index++;
					}

					token = template.substring(start, index);
					if (isEscaped === true) {
						token = token.replace(regexpEscapedChar[_char], _char);
					}

					token = ensureTemplateFunction(token);

					index++;
					continue;
				}


				if (state === go_tag) {
					last = state_tag;
					state = state_tag;

					if (c === 46 /* . */ || c === 35 /* # */ ) {
						token = 'div';
						continue;
					}
				}

				if (state === state_attr) {
					if (c === 46) {
						// .
						index++;
						key = 'class';
						state = go_attrHeadVal;
					} else if (c === 35) {
						// #
						index++;
						key = 'id';
						state = go_attrHeadVal;
					} else if (c === 61) {
						// =;
						index++;
						state = go_attrVal;
						continue;
					} else {

						if (key != null) {
							token = key;
							continue;
						}
					}
				}

				if (state === go_attrVal || state === go_attrHeadVal) {
					last = state;
					state = state_attr;
				}



				/* TOKEN */

				var isInterpolated = null;

				start = index;
				while (index < length) {

					c = template.charCodeAt(index);

					if (c === interp_code_START && template.charCodeAt(index + 1) === interp_code_OPEN) {
						isInterpolated = true;
						++index;
						do {
							// goto end of template declaration
							c = template.charCodeAt(++index);
						}
						while (c !== interp_code_CLOSE && index < length);
					}

					// if DEBUG
					if (c === 0x0027 || c === 0x0022 || c === 0x002F || c === 0x003C) {
						// '"/<
						_throw(template, index, state, String.fromCharCode(c));
						break;
					}
					// endif


					if (last !== go_attrVal && (c === 46 || c === 35 || c === 61)) {
						// .#=
						break;
					}

					if (c === 62 || c === 123 || c < 33 || c === 59) {
						// >{ ;
						break;
					}


					index++;
				}

				token = template.substring(start, index);

				// if DEBUG
				if (!token) {
					_throw(template, index, state, '*EMPTY*');
					break;
				}
				if (isInterpolated === true && state === state_tag){
					_throw(template, index, state, 'Tag Names cannt be interpolated (in dev)');
					break;
				}
				// endif


				if (isInterpolated === true && (state === state_attr && key === 'class') === false) {
					token = ensureTemplateFunction(token);
				}

			}

			if (isNaN(c)) {
				console.log(c, _index, _length);
				throw '';
			}

			// if DEBUG
			if (current.parent != null && current.parent !== fragment && current.parent.__single !== true && current.nodes != null) {
				console.warn('Mask - ', current.parent.tagName, JSON.stringify(current.parent.attr), 'was not proper closed.');
			}
			// endif


			return fragment.nodes.length === 1 ? fragment.nodes[0] : fragment;
		},
		cleanObject: function(obj) {
			if (obj instanceof Array) {
				for (var i = 0; i < obj.length; i++) {
					this.cleanObject(obj[i]);
				}
				return obj;
			}
			delete obj.parent;
			delete obj.__single;

			if (obj.nodes != null) {
				this.cleanObject(obj.nodes);
			}

			return obj;
		},
		setInterpolationQuotes: function(start, end) {
			if (!start || start.length !== 2) {
				console.error('Interpolation Start must contain 2 Characters');
				return;
			}
			if (!end || end.length !== 1) {
				console.error('Interpolation End must be of 1 Character');
				return;
			}

			interp_code_START = start.charCodeAt(0);
			interp_code_OPEN = start.charCodeAt(1);
			interp_code_CLOSE = end.charCodeAt(0);
			interp_CLOSE = end;
			interp_START = start.charAt(0);
		}
	};
}(Node, TextNode, Fragment, Component));

// source ../src/build/builder.dom.js

var _controllerID = 0;

function builder_build(node, model, cntx, container, controller, childs) {

	if (node == null) {
		return container;
	}

	var type = node.type, elements;

	if (container == null && type !== 1) {
		container = document.createDocumentFragment();
	}

	if (controller == null) {
		controller = new Component();
	}

	if (type === 10 /*SET*/ || node instanceof Array){
		for(var j = 0, jmax = node.length; j < jmax; j++){
			builder_build(node[j], model, cntx, container, controller, childs);
		}
		return container;
	}

	if (type == null){
		// in case if node was added manually, but type was not set
		if (node.tagName != null){
			type = 1;
		}
		else if (node.content != null){
			type = 2;
		}
	}

	// Dom.NODE
	if (type === 1){

		// source type.node.js
		
		var tagName = node.tagName,
			attr = node.attr,
			tag = document.createElement(tagName),
			key, value;
		
		
		for (key in attr) {
		
				/* if !SAFE
				if (hasOwnProp.call(attr, key) === false) {
					continue;
				}
				*/
		
			if (typeof attr[key] === 'function') {
				value = attr[key]('attr', model, cntx, tag, controller, key);
				if (value instanceof Array) {
					value = value.join('');
				}
		
			} else {
				value = attr[key];
			}
		
			// null or empty string will not be handled
			if (value) {
				if (typeof CustomAttributes[key] === 'function') {
					CustomAttributes[key](node, value, model, cntx, tag, controller);
				} else {
					tag.setAttribute(key, value);
				}
			}
		
		}
		
		if (container != null) {
			container.appendChild(tag);
		}
		
		if (childs != null){
			childs.push(tag);
			childs = null;
		}
		
		container = tag;
		

	}

	// Dom.TEXTNODE
	if (type === 2){

		// source type.textNode.js
		var j, jmax, x, content, result, text;
		
		content = node.content;
		
		if (typeof content === 'function') {
		
			result = content('node', model, cntx, container, controller);
		
			if (typeof result === 'string') {
				container.appendChild(document.createTextNode(result));
		
			} else {
		
				text = '';
				// result is array with some htmlelements
				for (j = 0, jmax = result.length; j < jmax; j++) {
					x = result[j];
		
					if (typeof x === 'object') {
						// In this casee result[j] should be any HTMLElement
						if (text !== '') {
							container.appendChild(document.createTextNode(text));
							text = '';
						}
						if (x.nodeType == null) {
							text += x.toString();
							continue;
						}
						container.appendChild(x);
						continue;
					}
		
					text += x;
				}
				if (text !== '') {
					container.appendChild(document.createTextNode(text));
				}
			}
		
		} else {
			container.appendChild(document.createTextNode(content));
		}
		
		return container;
	}

	// Dom.COMPONENT
	if (type === 4) {

		// source type.component.js
			var Handler = node.controller,
				handler = typeof Handler === 'function' ? new Handler(model) : Handler;
		
			if (handler != null) {
			/* if (!DEBUG)
			try{
			*/
		
				handler.compoName = node.tagName;
				handler.attr = util_extend(handler.attr, node.attr);
				handler.ID = ++_controllerID;
		
				for (var key in handler.attr) {
					if (typeof handler.attr[key] === 'function') {
						handler.attr[key] = handler.attr[key]('attr', model, cntx, container, controller, key);
					}
				}
		
				handler.nodes = node.nodes;
				handler.parent = controller;
		
				if (listeners != null && listeners['compoCreated'] != null) {
					var fns = listeners.compoCreated,
						jmax = fns.length,
						j = 0;
		
					for (; j < jmax; j++) {
						fns[j](handler, model, cntx, container);
					}
		
				}
		
				if (typeof handler.renderStart === 'function') {
					handler.renderStart(model, cntx, container);
				}
		
				// temporal workaround for backwards compo where we used this.tagName = 'div' in .render fn
				if (handler.tagName != null && handler.tagName !== node.compoName) {
					handler.nodes = {
						tagName: handler.tagName,
						attr: handler.attr,
						nodes: handler.nodes,
						type: 1
					};
				}
		
			/* if (!DEBUG)
			} catch(error){ console.error('Custom Tag Handler:', node.tagName, error); }
			*/
		
		
				node = handler;
			}
		
			if (controller.components == null){
				controller.components = [node];
			}else{
				controller.components.push(node);
			}
		
			controller = node;
			elements = [];
		
			if (controller.model != null) {
				model = controller.model;
			}
		
		
			if (typeof controller.render === 'function') {
				// with render implementation, handler overrides render behaviour of subnodes
				controller.render(model, cntx, container);
				return container;
			}
		

	}

	var nodes = node.nodes;
	if (nodes != null) {

		if (childs != null && elements == null){
			elements = childs;
		}

		var isarray = nodes instanceof Array,
			length = isarray === true ? nodes.length : 1,
			i = 0,
			childNode = null;

		for (; i < length; i++) {
			childNode = isarray === true ? nodes[i] : nodes;

			if (type === 4 && childNode.type === 1){
				childNode.attr['x-compo-id'] = node.ID;
			}

			builder_build(childNode, model, cntx, container, controller, elements);
		}

	}

	if (type === 4 && typeof node.renderEnd === 'function') {
		/* if (!DEBUG)
		try{
		*/
		node.renderEnd(elements, model, cntx, container);
		/* if (!DEBUG)
		} catch(error){ console.error('Custom Tag Handler:', node.tagName, error); }
		*/

	}

	if (childs != null && childs !== elements){
		var il = childs.length,
			jl = elements.length,
			j = -1;
		while(++j < jl){
			childs[il + j] = elements[j];
		}
	}

	return container;
}

// source ../src/mask.js

/**
 *  mask
 *
 **/

var cache = {},
	Mask = {

		/**
		 *	mask.render(template[, model, cntx, container = DocumentFragment, controller]) -> container
		 * - template (String | MaskDOM): Mask String or Mask DOM Json template to render from.
		 * - model (Object): template values
		 * - cntx (Object): can store any additional information, that custom handler may need,
		 * this object stays untouched and is passed to all custom handlers
		 * - container (IAppendChild): container where template is rendered into
		 * - controller (Object): instance of an controller that own this template
		 *
		 *	Create new Document Fragment from template or append rendered template to container
		 **/
		render: function (template, model, cntx, container, controller) {

			// if DEBUG
			if (container != null && typeof container.appendChild !== 'function'){
				console.error('.render(template[, model, cntx, container, controller]', 'Container should implement .appendChild method');
				console.warn('Args:', arguments);
			}
			// endif

			if (typeof template === 'string') {
				if (hasOwnProp.call(cache, template)){
					/* if Object doesnt contains property that check is faster
					then "!=null" http://jsperf.com/not-in-vs-null/2 */
					template = cache[template];
				}else{
					template = cache[template] = Parser.parse(template);
				}
			}
			return builder_build(template, model, cntx, container, controller);
		},

		/* deprecated, renamed to parse */
		compile: Parser.parse,

		/**
		 *	mask.parse(template) -> MaskDOM
		 * - template (String): string to be parsed into MaskDOM
		 *
		 * Create MaskDOM from Mask markup
		 **/
		parse: Parser.parse,

		build: builder_build,
		/**
		 * mask.registerHandler(tagName, tagHandler) -> void
		 * - tagName (String): Any tag name. Good practice for custom handlers it when its name begins with ':'
		 * - tagHandler (Function|Object):
		 *
		 *	When Mask.Builder matches the tag binded to this tagHandler, it -
		 *	creates instances of the class(in case of Function) or uses specified object.
		 *	Shallow copies -
		 *		.nodes(MaskDOM) - Template Object of this node
		 *		.attr(Object) - Attributes of this node
		 *	And calls
		 *		.renderStart(model, cntx, container)
		 *		.renderEnd(elements, model, cntx, container)
		 *
		 *	Custom Handler now can handle rendering of underlined nodes.
		 *	The most simple example to continue rendering is:
		 *	mask.render(this.nodes, model, container, cntx);
		 **/
		registerHandler: function (tagName, TagHandler) {
			CustomTags[tagName] = TagHandler;
		},
		/**
		 *	mask.getHandler(tagName) -> Function | Object
		 * - tagName (String):
		 *
		 *	Get Registered Handler
		 **/
		getHandler: function (tagName) {
			return tagName != null ? CustomTags[tagName] : CustomTags;
		},


		registerAttrHandler: function(attrName, Handler){
			CustomAttributes[attrName] = Handler;
		},
		/**
		 *	mask.registerUtility(utilName, fn) -> void
		 * - utilName (String): name of the utility
		 * - fn (Function): util handler
		 *
		 *	Register Utility Function. Template Example: '~[myUtil:key]'
		 *		utility interface:
		 *		<b>function(key, model, type, cntx, element, name){}</b>
		 *
		 **/
		registerUtility: function (utilityName, fn) {
			ModelUtils[utilityName] = fn;
		},
		////// time for remove
		//////serialize: function (template) {
		//////	return Parser.cleanObject(this.compile(template, true));
		//////},
		//////deserialize: function (serialized) {
		//////	var i, key, attr;
		//////	if (serialized instanceof Array) {
		//////		for (i = 0; i < serialized.length; i++) {
		//////			this.deserialize(serialized[i]);
		//////		}
		//////		return serialized;
		//////	}
		//////	if (serialized.content != null) {
		//////		if (serialized.content.template != null) {
		//////			serialized.content = Parser.toFunction(serialized.content.template);
		//////		}
		//////		return serialized;
		//////	}
		//////	if (serialized.attr != null) {
		//////		attr = serialized.attr;
		//////		for (key in attr) {
		//////			if (hasOwnProp.call(attr, key) === true){
		//////				if (attr[key].template == null) {
		//////					continue;
		//////				}
		//////				attr[key] = Parser.toFunction(attr[key].template);
		//////			}
		//////		}
		//////	}
		//////	if (serialized.nodes != null) {
		//////		this.deserialize(serialized.nodes);
		//////	}
		//////	return serialized;
		//////},
		/**
		 * mask.clearCache([key]) -> void
		 * - key (String): template to remove from cache
		 *
		 *	Mask Caches all templates, so this function removes
		 *	one or all templates from cache
		 **/
		clearCache: function(key){
			if (typeof key === 'string'){
				delete cache[key];
			}else{
				cache = {};
			}
		},
		//- removed as needed interface can be implemented without this
		//- ICustomTag: ICustomTag,

		/** deprecated
		 *	mask.ValueUtils -> Object
		 *
		 *	see Utils.Condition Object instead
		 **/
		ValueUtils: {
			condition: ConditionUtil.condition,
			out: ConditionUtil
		},

		Utils: {
			/**
			 * mask.Utils.Condition -> ConditionUtil
			 *
			 * [[ConditionUtil]]
			 **/
			Condition: ConditionUtil,

			Expression: ExpressionUtil,

			/**
			 *	mask.Util.getProperty(model, path) -> value
			 *	- model (Object | value)
			 *	- path (String): Property or dot chainable path to retrieve the value
			 *		if path is '.' returns model itself
			 *
			 *	```javascript
			 *	mask.render('span > ~[.]', 'Some string') // -> <span>Some string</span>
			 *	```
			 **/
			getProperty: util_getProperty
		},
		Dom: Dom,
		plugin: function(source){
			eval(source);
		},
		on: function(event, fn){
			if (listeners == null){
				listeners = {};
			}

			(listeners[event] || (listeners[event] = [])).push(fn);
		},

		/*
		 *	Stub for reload.js, which will be used by includejs.autoreload
		 */
		delegateReload: function(){},

		/**
		 *	mask.setInterpolationQuotes(start,end) -> void
		 * -start (String): Must contain 2 Characters
		 * -end (String): Must contain 1 Character
		 *
		 * Starting from 0.6.9 mask uses ~[] for string interpolation.
		 * Old '#{}' was changed to '~[]', while template is already overloaded with #, { and } usage.
		 *
		 **/
		setInterpolationQuotes: Parser.setInterpolationQuotes
	};


/**	deprecated
 *	mask.renderDom(template[, model, container, cntx]) -> container
 *
 * Use [[mask.render]] instead
 * (to keep backwards compatiable)
 **/
Mask.renderDom = Mask.render;



(function(mask) {
	// source ../src/formatter/stringify.js
	
	var stringify = (function() {
	
	
		var _minimizeAttributes,
			_indent,
			Dom = mask.Dom;
	
		function doindent(count) {
			var output = '';
			while (count--) {
				output += ' ';
			}
			return output;
		}
	
	
	
		function run(node, indent, output) {
	
			var outer, i;
	
			if (indent == null) {
				indent = 0;
			}
	
			if (output == null) {
				outer = true;
				output = [];
			}
	
			var index = output.length;
	
			if (node.type === Dom.FRAGMENT){
				node = node.nodes;
			}
	
			if (node instanceof Array) {
				for (i = 0; i < node.length; i++) {
					processNode(node[i], indent, output);
				}
			} else {
				processNode(node, indent, output);
			}
	
	
			var spaces = doindent(indent);
			for (i = index; i < output.length; i++) {
				output[i] = spaces + output[i];
			}
	
			if (outer) {
				return output.join(_indent === 0 ? '' : '\n');
			}
	
		}
	
		function processNode(node, currentIndent, output) {
			if (typeof node.content === 'string') {
				output.push(wrapString(node.content));
				return;
			}
	
			if (typeof node.content === 'function'){
				output.push(wrapString(node.content()));
				return;
			}
	
			if (isEmpty(node)) {
				output.push(processNodeHead(node) + ';');
				return;
			}
	
			if (isSingle(node)) {
				output.push(processNodeHead(node) + ' > ');
				run(getSingle(node), _indent, output);
				return;
			}
	
			output.push(processNodeHead(node) + '{');
			run(node.nodes, _indent, output);
			output.push('}');
			return;
		}
	
		function processNodeHead(node) {
			var tagName = node.tagName,
				_id = node.attr.id || '',
				_class = node.attr['class'] || '';
	
	
			if (typeof _id === 'function'){
				_id = _id();
			}
			if (typeof _class === 'function'){
				_class = _class();
			}
	
			if (_id) {
				if (_id.indexOf(' ') !== -1) {
					_id = '';
				} else {
					_id = '#' + _id;
				}
			}
	
			if (_class) {
				_class = '.' + _class.split(' ').join('.');
			}
	
			var attr = '';
	
			for (var key in node.attr) {
				if (key === 'id' || key === 'class') {
					// the properties was not deleted as this template can be used later
					continue;
				}
				var value = node.attr[key];
	
				if (typeof value === 'function'){
					value = value();
				}
	
				if (_minimizeAttributes === false || /\s/.test(value)){
					value = wrapString(value);
				}
	
				attr += ' ' + key + '=' + value;
			}
	
			if (tagName === 'div' && (_id || _class)) {
				tagName = '';
			}
	
			return tagName + _id + _class + attr;
		}
	
	
		function isEmpty(node) {
			return node.nodes == null || (node.nodes instanceof Array && node.nodes.length === 0);
		}
	
		function isSingle(node) {
			return node.nodes && (node.nodes instanceof Array === false || node.nodes.length === 1);
		}
	
		function getSingle(node) {
			if (node.nodes instanceof Array) {
				return node.nodes[0];
			}
			return node.nodes;
		}
	
		function wrapString(str) {
			if (str.indexOf('"') === -1) {
				return '"' + str.trim() + '"';
			}
	
			if (str.indexOf("'") === -1) {
				return "'" + str.trim() + "'";
			}
	
			return '"' + str.replace(/"/g, '\\"').trim() + '"';
		}
	
		/**
		 *	- settings (Number | Object) - Indention Number (0 - for minification)
		 **/
		return function(input, settings) {
			if (typeof input === 'string') {
				input = mask.parse(input);
			}
	
	
			if (typeof settings === 'number'){
				_indent = settings;
				_minimizeAttributes = _indent === 0;
			}else{
				_indent = settings && settings.indent || 4;
				_minimizeAttributes = _indent === 0 || settings && settings.minimizeAttributes;
			}
	
	
			return run(input);
		};
	}());
	
	Mask.stringify = stringify;
}(Mask));

/* Handlers */

// source ../src/handlers/sys.js
(function(mask) {

	mask.registerHandler('%', Sys);

	function Sys() {}

	Sys.prototype = {
		constructor: Sys,
		renderStart: function(model, cntx, container) {
			var attr = this.attr;

			if (attr['use'] != null) {
				this.model = util_getProperty(model, attr['use']);
				return;
			}

			if (attr['debugger'] != null) {
				debugger;
				return;
			}

			if (attr['log'] != null) {
				var key = attr.log,
					value = util_getProperty(model, key);

				console.log('Key: %s, Value: %s', key, value);
				return;
			}

			this.model = model;

			if (attr['if'] != null) {
				var check = attr['if'];

				this.state = ConditionUtil.isCondition(check, model);

				if (!this.state) {
					this.nodes = null;
				}
				return;
			}

			if (attr['else'] != null) {
				var compos = this.parent.components,
					prev = compos && compos[compos.length - 1];

				if (prev != null && prev.compoName === '%' && prev.attr['if'] != null) {

					if (prev.state) {
						this.nodes = null;
					}
					return;
				}
				console.error('Previous Node should be "% if=\'condition\'"', prev, this.parent);
				return;
			}

			// foreach is deprecated
			if (attr['each'] != null || attr['foreach'] != null) {
				each(this, model, cntx, container);
			}
		},
		render: null
	};


	function each(compo, model, cntx, container){
		if (compo.nodes == null && typeof Compo !== 'undefined'){
			Compo.ensureTemplate(compo);
		}

		var array = util_getProperty(model, compo.attr.foreach || compo.attr.each),
			nodes = compo.nodes,
			item = null;

		compo.nodes = [];
		compo.template = nodes;
		compo.container = container;

		if (array instanceof Array === false){
			return;
		}

		for (var i = 0, x, length = array.length; i < length; i++) {
			x = array[i];

			item = new Component();
			item.nodes = nodes;
			item.model = x;
			item.container = container;

			compo.nodes[i] = item;
		}

		for(var method in ListProto){
			compo[method] = ListProto[method];
		}
	}

	var ListProto = {
		append: function(model){
			var item;
			item = new Component();
			item.nodes = this.template;
			item.model = model;

			mask.render(item, model, null, this.container, this);
		}
	}

}(Mask));

// source ../src/handlers/utils.js
(function(mask) {

	/**
	 *	:template
	 *
	 *	Child nodes wont be rendered. You can resolve it as custom component and get its nodes for some use
	 *
	 **/

	var TemplateCollection = {};

	mask.templates = TemplateCollection;

	mask.registerHandler(':template', TemplateHandler);

	function TemplateHandler() {}
	TemplateHandler.prototype.render = function() {
		if (this.attr.id != null) {
			console.warn('Template Should be defined with ID attribute for future lookup');
			return;
		}

		TemplateCollection[this.attr.id] = this;
	};


	/**
	 *	:html
	 *
	 *	Shoud contain literal, that will be added as innerHTML to parents node
	 *
	 **/
	mask.registerHandler(':html', HTMLHandler);

	function HTMLHandler() {}
	HTMLHandler.prototype.render = function(model, cntx, container) {
		var source = null;

		if (this.attr.template != null) {
			var c = this.attr.template[0];
			if (c === '#'){
				source = document.getElementById(this.attr.template.substring(1)).innerHTML;
			}

		}
		if (this.nodes) {
			source = this.nodes[0].content;
		}

		if (source == null) {
			console.warn('No HTML for node', this);
			return;
		}

		container.innerHTML = source;
	};

}(Mask));

// source ../src/handlers/mask.binding.js

(function(mask){
	'use strict'


	// source /src/vars.js
	var $ = window.jQuery || window.Zepto || window.$;
	
	if ($ == null){
		console.warn('Without jQuery/Zepto etc. binder is limited (mouse dom event bindings)');
	}
	

	// source /src/util/object.js
	/**
	 *	Resolve object, of if property do not exists - create
	 */
	function obj_ensure(obj, chain) {
		for (var i = 0, length = chain.length - 1; i < length; i++) {
			var key = chain.shift();
	
			if (obj[key] == null) {
				obj[key] = {};
			}
	
			obj = obj[key];
		}
		return obj;
	}
	
	
	function obj_getProperty(obj, property) {
			var chain = property.split('.'),
			length = chain.length,
			i = 0;
		for (; i < length; i++) {
			if (obj == null) {
				return null;
			}
	
			obj = obj[chain[i]];
		}
		return obj;
	}
	
	
	function obj_setProperty(obj, property, value) {
		var chain = property.split('.'),
			length = chain.length,
			i = 0,
			key = null;
	
		for (; i < length - 1; i++) {
			key = chain[i];
			if (obj[key] == null) {
				obj[key] = {};
			}
			obj = obj[key];
		}
	
		obj[chain[i]] = value;
	}
	
	function obj_addObserver(obj, property, callback) {
		if (obj.__observers == null) {
			Object.defineProperty(obj, '__observers', {
				value: {},
				enumerable: false
			});
		}
	
		if (obj.__observers[property]) {
			obj.__observers[property].push(callback);
	
			var value = obj_getProperty(obj, property);
			if (value instanceof Array) {
				arr_addObserver(value, callback);
			}
	
			return;
		}
	
		var observers = obj.__observers[property] = [callback],
			chain = property.split('.'),
			parent = chain.length > 1 ? obj_ensure(obj, chain) : obj,
			key = chain[0],
			currentValue = parent[key];
	
	
	
		Object.defineProperty(parent, key, {
			get: function() {
				return currentValue;
			},
			set: function(x) {
				currentValue = x;
	
				for (var i = 0, length = observers.length; i < length; i++) {
					observers[i](x);
				}
	
				if (currentValue instanceof Array) {
					arr_addObserver(currentValue, callback);
				}
			}
		});
	
		if (currentValue instanceof Array) {
			arr_addObserver(currentValue, callback);
		}
	}
	
	
	
	function obj_removeObserver(obj, property, callback) {
	
		if (obj.__observers == null || obj.__observers[property] == null) {
			return;
		}
	
		var currentValue = obj_getProperty(obj, property);
		if (arguments.length === 2) {
			obj_setProperty(obj, property, currentValue);
			delete obj.__observers[property];
			return;
		}
	
		arr_remove(obj.__observers[property], callback);
	
		if (currentValue instanceof Array) {
			arr_remove(currentValue.__observers, callback);
		}
	
	}
	
	function obj_extend(obj, source) {
		if (source == null) {
			return obj;
		}
		if (obj == null) {
			obj = {};
		}
		for (var key in source) {
			obj[key] = source[key];
		}
		return obj;
	}
	
	// source /src/util/array.js
	function arr_remove(array /*, .. */){
		if (array == null) {
			return;
		}
	
		var i = 0,
			length = array.length,
			x,
			j = 1,
			jmax = arguments.length;
	
		for(; i < length; i++){
			x = array[i];
	
			for (j = 1; j<jmax; j++) {
				if (arguments[j] === x) {
	
					array.splice(i, 1);
					i--;
					length--;
					break;
				}
			}
		}
	}
	
	
	function arr_toArray(args) {
		return Array.prototype.splice.call(args);
	}
	
	
	
	function arr_addObserver(arr, callback) {
	
		if (arr.__observers == null) {
			Object.defineProperty(arr, '__observers', {
				value: [],
				enumerable: false
			});
		}
	
		function wrap(method) {
			arr[method] = function() {
				var callbacks = this.__observers,
					args = arr_toArray(arguments),
					result = Array.prototype[method].apply(this, args);
	
	
				if (callbacks == null || callbacks.length === 0) {
					return result;
				}
	
				for(var i = 0, x, length = callbacks.length; i < length; i++){
					x = callbacks[i];
					if (typeof x === 'function') {
	
						x(this, method, args);
					}
				}
	
				return result;
			};
		}
	
		var i = 0,
			fns = ['push', 'unshift', 'splice', 'pop', 'shift', 'reverse', 'sort'],
			length = fns.length;
		for (; i < length; i++) {
			wrap(fns[i]);
		}
	
		arr.__observers.push(callback);
	
		arr = null;
	}
	
	
	function arr_each(array, fn) {
		for(var i = 0, length = array.length; i < length; i++){
			fn(array[i]);
		}
	}
	
	// source /src/util/dom.js
	
	function dom_removeElement(node) {
		return node.parentNode.removeChild(node);
	}
	
	function dom_removeAll(array) {
		if (array == null) {
			return;
		}
		for(var i = 0, length = array.length; i < length; i++){
			dom_removeElement(array[i]);
		}
	}
	
	function dom_insertAfter(element, anchor) {
		return anchor.parentNode.insertBefore(element, anchor.nextSibling);
	}
	
	function dom_insertBefore(element, anchor) {
		return anchor.parentNode.insertBefore(element, anchor);
	}
	
	
	
	function dom_addEventListener(element, event, listener) {
	
		if (typeof $ === 'function'){
			$(element).on(event, listener);
			return;
		}
	
		if (element.addEventListener != null) {
			element.addEventListener(event, listener, false);
			return;
		}
		if (element.attachEvent) {
			element.attachEvent("on" + event, listener);
		}
	}
	
	// source /src/util/compo.js
	
	////////function compo_lastChild(compo) {
	////////	return compo.components != null && compo.components[compo.components.length - 1];
	////////}
	////////
	////////function compo_childAt(compo, index) {
	////////	return compo.components && compo.components.length > index && compo.components[index];
	////////}
	////////
	////////function compo_lastElement(compo) {
	////////	var lastCompo = compo_lastChild(compo),
	////////		elements = lastCompo && (lastCompo.elements || lastCompo.$) || compo.elements;
	////////
	////////	return elements != null ? elements[elements.length - 1] : compo.placeholder;
	////////}
	
	function compo_fragmentInsert(compo, index, fragment) {
		if (compo.components == null) {
			return dom_insertAfter(fragment, compo.placeholder);
		}
	
		var compos = compo.components,
			anchor = null,
			insertBefore = true,
			length = compos.length,
			i = index,
			elements;
	
		for (; i< length; i++) {
			elements = compos[i].elements;
	
			if (elements && elements.length) {
				anchor = elements[0];
				break;
			}
		}
	
		if (anchor == null) {
			insertBefore = false;
			i = index < length ? index : length;
	
			while (--i > -1) {
				elements = compos[i].elements;
				if (elements && elements.length) {
					anchor = elements[elements.length - 1];
					break;
				}
			}
		}
	
		if (anchor == null) {
			anchor = compo.placeholder;
		}
	
		if (insertBefore) {
			return dom_insertBefore(fragment, anchor);
		}
	
		return dom_insertAfter(fragment, anchor);
	}
	
	function compo_render(parentController, template, model, cntx, container) {
		return mask.render(template, model, cntx, container, parentController);
	}
	
	function compo_dispose(compo) {
		if (compo == null) {
			return;
		}
	
		dom_removeAll(compo.elements);
	
		compo.elements = null;
	
		if (typeof Compo !== 'undefined') {
			Compo.dispose(compo);
		}
	
		var components = compo.parent && compo.parent.components;
		if (components != null) {
			var i = components.indexOf(compo);
			if (i !== -1){
				components.splice(i, 1);
			}
		}
	
	}
	
	function compo_inserted(compo) {
		if (typeof Compo !== 'undefined') {
			Compo.signal.emitIn(compo, 'domInsert');
		}
	}
	

	// source /src/bindingProvider.js
	var BindingProvider = (function() {
	
		mask.registerBinding = function(type, binding) {
			Providers[type] = binding;
		};
	
		var Providers = {},
			Expression = mask.Utils.Expression;
	
	
		function BindingProvider(model, element, node, bindingType) {
	
			if (bindingType == null) {
				bindingType = node.compoName === ':bind' ? 'single' : 'dual';
			}
	
			this.node = node;
			this.model = model;
			this.element = element;
			this.property = node.attr.property || (bindingType === 'single' ? 'element.innerHTML' : 'element.value');
			this.setter = node.attr.setter;
			this.getter = node.attr.getter;
			this.dismiss = 0;
			this.bindingType = bindingType;
	
		}
	
		BindingProvider.create = function(model, element, node, bindingType) {
	
			/** Initialize custom provider.
			 * That could be defined by customName or by tagName
			 */
			var type = node.attr.bindingProvider || element.tagName.toLowerCase(),
				CustomProvider = Providers[type],
				provider;
	
			if (CustomProvider instanceof Function) {
				return new CustomProvider(model, element, node, bindingType);
			}
	
			provider = new BindingProvider(model, element, node, bindingType);
	
			if (CustomProvider != null) {
				obj_extend(provider, CustomProvider);
			}
	
	
			return apply_bind(provider);
		};
	
	
		BindingProvider.prototype = {
			constructor: BindingProvider,
			objectChanged: function(x) {
				if (this.dismiss-- > 0) {
					return;
				}
	
				if (x == null) {
					x = this.objectWay.get(this.model, this.node.attr.value);
				}
	
				this.domWay.set(this, x);
			},
			domChanged: function() {
				var x = this.domWay.get(this);
	
				if (this.node.validations) {
	
					for (var i = 0, validation, length = this.node.validations.length; i < length; i++) {
						validation = this.node.validations[i];
						if (validation.validate(x, this.element, this.objectChanged.bind(this)) === false) {
							return;
						}
					}
				}
	
				this.dismiss = 1;
				this.objectWay.set(this.model, this.node.attr.value, x);
				this.dismiss = 0;
			},
			objectWay: {
				get: function(obj, property) {
	
					if (property[0] === ':') {
						return Expression.eval(property.substring(1), obj);
					}
	
					return obj_getProperty(obj, property);
				},
				set: function(obj, property, value) {
					obj_setProperty(obj, property, value);
				}
			},
			/**
			 * usually you have to override this object, while getting/setting to element,
			 * can be very element(widget)-specific thing
			 *
			 * Note: The Functions are static
			 */
			domWay: {
				get: function(provider) {
					if (provider.getter) {
						var controller = provider.node.parent;
	
						// if DEBUG
						if (controller == null || typeof controller[provider.getter] !== 'function') {
							console.error('Mask.bindings: Getter should be a function', provider.getter, provider);
							return null;
						}
						// endif
	
						return controller[provider.getter]();
					}
					return obj_getProperty(provider, provider.property);
				},
				set: function(provider, value) {
					if (provider.setter) {
						var controller = provider.node.parent;
	
						// if DEBUG
						if (controller == null || typeof controller[provider.setter] !== 'function') {
							console.error('Mask.bindings: Getter should be a function', provider.getter, provider);
							return;
						}
						// endif
	
						controller[provider.setter](value);
					} else {
						obj_setProperty(provider, provider.property, value);
					}
	
				}
			}
		};
	
	
	
		function apply_bind(provider) {
	
			var value = provider.node.attr.value,
				model = provider.model,
				onObjChange = provider.objectChanged = provider.objectChanged.bind(provider);
	
			obj_addObserver(model, value, onObjChange);
	
	
			if (provider.bindingType === 'dual') {
				var element = provider.element,
					eventType = provider.node.attr.changeEvent || 'change',
					onDomChange = provider.domChanged.bind(provider);
	
				dom_addEventListener(element, eventType, onDomChange);
			}
	
			// trigger update
			provider.objectChanged();
			return provider;
		}
	
	
		return BindingProvider;
	
	}());
	

	// source /src/mask-handler/visible.js
	/**
	 * visible handler. Used to bind directly to display:X/none
	 *
	 * attr =
	 *    check - expression to evaluate
	 *    bind - listen for a property change
	 */
	
	function VisibleHandler() {}
	
	mask.registerHandler(':visible', VisibleHandler);
	
	
	VisibleHandler.prototype = {
		constructor: VisibleHandler,
	
		refresh: function(model, container) {
			container.style.display = mask.Utils.Condition.isCondition(this.attr.check, model) ? '' : 'none';
		},
		renderStart: function(model, cntx, container) {
			this.refresh(model, container);
	
			if (this.attr.bind) {
				obj_addObserver(model, this.attr.bind, this.refresh.bind(this, model, container));
			}
		}
	};
	
	// source /src/mask-handler/bind.js
	/**
	 *  Mask Custom Tag Handler
	 *	attr =
	 *		attr: {String} - attribute name to bind
	 *		prop: {Stirng} - property name to bind
	 *		- : {default} - innerHTML
	 */
	
	
	
	(function() {
	
		function Bind() {}
	
		mask.registerHandler(':bind', Bind);
	
		Bind.prototype = {
			constructor: Bind,
			renderStart: function(model, cntx, container) {
	
				this.provider = BindingProvider.create(model, container, this, 'single');
	
			},
			dispose: function(){
				if (this.provider && typeof this.provider.dispose === 'function') {
					this.provider.dispose();
				}
			}
		};
	
	
	}());
	
	// source /src/mask-handler/dualbind.js
	/**
	 *	Mask Custom Handler
	 *
	 *	2 Way Data Model binding
	 *
	 *
	 *	attr =
	 *		value: {string} - property path in object
	 *		?property : {default} 'element.value' - value to get/set from/to HTMLElement
	 *		?changeEvent: {default} 'change' - listen to this event for HTMLELement changes
	 *
	 *		?setter: {string} - setter function of a parent controller
	 *		?getter: {string} - getter function of a parent controller
	 *
	 *
	 */
	
	function DualbindHandler() {}
	
	mask.registerHandler(':dualbind', DualbindHandler);
	
	
	
	DualbindHandler.prototype = {
		constructor: DualbindHandler,
		renderEnd: function(elements, model, cntx, container) {
			if (this.components) {
				for (var i = 0, x, length = this.components.length; i < length; i++) {
					x = this.components[i];
	
					if (x.compoName === ':validate') {
						(this.validations || (this.validations = [])).push(x);
					}
				}
			}
	
			this.provider = BindingProvider.create(model, container, this);
		},
		dispose: function(){
			if (this.provider && typeof this.provider.dispose === 'function') {
				this.provider.dispose();
			}
		}
	};
	
	// source /src/mask-handler/validate.js
	(function() {
	
		mask.registerValidator = function(type, validator) {
			Validators[type] = validator;
		};
	
		function Validate() {}
	
		mask.registerHandler(':validate', Validate);
	
	
	
	
		Validate.prototype = {
			constructor: Validate,
			renderStart: function(model, cntx, container) {
				this.element = container;
				this.model = model;
			},
			/**
			 * @param input - {control specific} - value to validate
			 * @param element - {HTMLElement} - (optional, @default this.element) -
			 *				Invalid message is schown(inserted into DOM) after this element
			 * @param oncancel - {Function} - Callback function for canceling
			 *				invalid notification
			 */
			validate: function(input, element, oncancel) {
				if (element == null){
					element = this.element;
				}
	
				if (this.attr.getter) {
					input = obj_getProperty({
						node: this,
						element: element
					}, this.attr.getter);
				}
	
				if (this.validators == null) {
					this.initValidators();
				}
	
				for (var i = 0, x, length = this.validators.length; i < length; i++) {
					x = this.validators[i];
					if (x.validate(this, input) === false) {
						notifyInvalid(element, this.message, oncancel);
						return false;
					}
				}
	
				isValid(element);
				return true;
			},
			initValidators: function() {
				this.validators = [];
				this.message = this.attr.message;
				delete this.attr.message;
	
				for (var key in this.attr) {
					if (key in Validators === false) {
						console.error('Unknown Validator:', key, this);
						continue;
					}
					var Validator = Validators[key];
					if (typeof Validator === 'function') {
						Validator = new Validator(this);
					}
					this.validators.push(Validator);
				}
			}
		};
	
	
		function notifyInvalid(element, message, oncancel) {
			console.warn('Validate Notification:', element, message);
	
	
			var next = $(element).next('.-validate-invalid');
			if (next.length === 0) {
				next = $('<div>').addClass('-validate-invalid').html('<span></span><button>cancel</button>').insertAfter(element);
			}
	
			next //
			.children('button').off().on('click', function() {
				next.hide();
				if (oncancel) {
					oncancel();
				}
	
			}) //
			.end() //
			.children('span').text(message) //
			.end() //
			.show(); //
		}
	
		function isValid(element) {
			$(element).next('.-validate-invalid').hide();
		}
	
		var Validators = {
			match: {
				validate: function(node, str) {
					return new RegExp(node.attr.match).test(str);
				}
			},
			unmatch: {
				validate: function(node, str) {
					return !(new RegExp(node.attr.unmatch)).test(str);
				}
			},
			minLength: {
				validate: function(node, str) {
					return str.length >= parseInt(node.attr.minLength, 10);
				}
			},
			maxLength: {
				validate: function(node, str) {
					return str.length <= parseInt(node.attr.maxLength, 10);
				}
			}
	
		};
	
	
	
	}());
	
	// source /src/mask-handler/validate.group.js
	function ValidateGroup() {}
	
	mask.registerHandler(':validate:group', ValidateGroup);
	
	
	ValidateGroup.prototype = {
		constructor: ValidateGroup,
		validate: function() {
			var validations = getValidations(this);
	
	
			for (var i = 0, x, length = validations.length; i < length; i++) {
				x = validations[i];
				if (!x.validate()) {
					return false;
				}
			}
			return true;
		}
	};
	
	function getValidations(component, out){
		if (out == null){
			out = [];
		}
	
		if (component.components == null){
			return out;
		}
		var compos = component.components;
		for(var i = 0, x, length = compos.length; i < length; i++){
			x = compos[i];
	
			if (x.compoName === 'validate'){
				out.push(x);
				continue;
			}
	
			getValidations(x);
		}
		return out;
	}
	

	// source /src/mask-util/bind.js
	
	/**
	 *	Mask Custom Utility - for use in textContent and attribute values
	 */
	
	
	mask.registerUtility('bind', function(property, model, cntx, element, controller, attrName, type){
		var current = obj_getProperty(model, property);
		switch(type){
			case 'node':
				var node = document.createTextNode(current);
				obj_addObserver(model, property, function(value){
					node.textContent = value;
				});
				return node;
			case 'attr':
	
				obj_addObserver(model, property, function(value){
					var attrValue = element.getAttribute(attrName);
					element.setAttribute(attrName, attrValue ? attrValue.replace(current, value) : value);
					current = value;
				});
	
				return current;
		}
		console.error('Unknown binding type', arguments);
		return 'Unknown';
	});
	

	// source /src/sys/sys.js
	(function(mask) {
	
		function Sys() {}
	
	
		mask.registerHandler('%%', Sys);
	
		// source attr.use.js
		var attr_use = (function() {
		
			var UseProto = {
				refresh: function(value) {
		
					this.model = value;
		
					if (this.elements) {
						for (var i = 0, x, length = this.elements.length; i < length; i++) {
							x = this.elements[i];
							x.parentNode.removeChild(x);
						}
					}
		
					if (typeof Compo !== 'undefined') {
						Compo.dispose(this);
					}
		
					mask //
					.render(this.nodes, this.model, this.cntx) //
					.insertBefore(this.placeholder);
		
				}
			};
		
			return function attr_use(self, model, cntx, container) {
		
				var expr = self.attr['use'];
		
				self.placeholder = document.createComment('');
				self.model = expression_bind(expr, model, cntx, self, UseProto.refresh.bind(self));
		
				container.appendChild(self.placeholder);
			};
		
		}());
		
		// source attr.log.js
		var attr_log = (function() {
		
			return function attr_log(self, model, cntx) {
		
				function log(value) {
					console.log('Logger > Key: %s, Value: %s', expr, value);
				}
		
				var expr = self.attr['log'],
					value = expression_bind(expr, model, cntx, self, log);
		
		
		
				log(value);
		
				self = null;
				model = null;
				cntx = null;
			};
		
		}());
		
		// source attr.if.js
		var attr_if = (function() {
		
			var IfProto = {
				refresh: function(value) {
		
					if (this.elements == null && !value) {
						// was not render and still falsy
						return;
					}
		
					if (this.elements == null) {
						// was not render - do it
		
						mask //
						.render(this.template, this.model, this.cntx, null, this) //
						.insertBefore(this.placeholder);
		
						this.$ = $(this.elements);
					} else {
		
						if (this.$ == null) {
							this.$ = $(this.elements);
						}
						this.$[value ? 'show' : 'hide']();
					}
		
					if (this.onchange) {
						this.onchange(value);
					}
					
				}
			};
		
			return function(self, model, cntx, container) {
		
				var expr = self.attr['if'];
		
				self.placeholder = document.createComment('');
				self.template = self.nodes;
		
				self.state = !! expression_bind(expr, model, cntx, self, IfProto.refresh.bind(self));
		
				if (!self.state) {
					self.nodes = null;
				}
		
				container.appendChild(self.placeholder);
			};
		
		}());
		
		// source attr.if.else.js
		var attr_else = (function() {
		
			var ElseProto = {
				refresh: function(value){
					if (this.elements == null && value) {
					// was not render and still truthy
					return;
				}
		
				if (this.elements == null) {
					// was not render - do it
		
					dom_insertBefore(compo_render(this, this.template, this.model, this.cntx));
					this.$ = $(this.elements);
					
					return;
				}
		
				if (this.$ == null) {
					this.$ = $(this.elements);
				}
		
				this.$[value ? 'hide' : 'show']();
		
				}
			};
		
			return function (self, model, cntx, container) {
		
		
				var compos = self.parent.components,
					prev = compos && compos[compos.length - 1];
		
				self.template = self.nodes;
				self.placeholder = document.createComment('');
		
				// if DEBUG
				if (prev == null || prev.compoName !== '%%' || prev.attr['if'] == null) {
					console.error('Mask.Binding: Binded ELSE should be after binded IF - %% if="expression" { ...');
					return;
				}
				// endif
		
		
				// stick to previous IF controller
				prev.onchange = ElseProto.refresh.bind(self);
		
				if (prev.state) {
					self.nodes = null;
				}
		
		
		
				container.appendChild(self.placeholder);
			};
		
		}());
		
		// source attr.each.js
		var attr_each = (function() {
		
			// source attr.each.helper.js
			function list_prepairNodes(template, arrayModel) {
				var nodes = [];
			
				if (arrayModel instanceof Array === false) {
					return nodes;
				}
			
				var i = 0,
					length = arrayModel.length,
					model;
			
				for (; i < length; i++) {
			
					model = arrayModel[i];
			
					//create references from values to distinguish the models
					switch (typeof model) {
					case 'string':
					case 'number':
					case 'boolean':
						model = arrayModel[i] = new model.constructor(model);
						break;
					}
			
					nodes[i] = new ListItem(template, model);
				}
				return nodes;
			}
			
			
			function list_sort(self, array) {
			
				var compos = self.components,
					i = 0,
					imax = compos.length,
					j = 0,
					jmax = null,
					element = null,
					compo = null,
					fragment = document.createDocumentFragment(),
					sorted = [];
			
				for (; i < imax; i++) {
					compo = compos[i];
					if (compo.elements == null || compo.elements.length === 0) {
						continue;
					}
			
					for (j = 0, jmax = compo.elements.length; j < jmax; j++) {
						element = compo.elements[j];
						element.parentNode.removeChild(element);
					}
				}
			
				outer: for (j = 0, jmax = array.length; j < jmax; j++) {
			
					for (i = 0; i < imax; i++) {
						if (array[j] === compos[i].model) {
							sorted[j] = compos[i];
							continue outer;
						}
					}
			
					console.warn('No Model Found for', array[j]);
				}
			
			
			
				for (i = 0, imax = sorted.length; i < imax; i++) {
					compo = sorted[i];
			
					if (compo.elements == null || compo.elements.length === 0) {
						continue;
					}
			
			
					for (j = 0, jmax = compo.elements.length; j < jmax; j++) {
						element = compo.elements[j];
			
						fragment.appendChild(element);
					}
				}
			
				self.components = sorted;
			
				dom_insertBefore(fragment, self.placeholder);
			
			}
			
			function list_update(self, deleteIndex, deleteCount, insertIndex, rangeModel) {
				if (deleteIndex != null && deleteCount != null) {
					var i = deleteIndex,
						length = deleteIndex + deleteCount;
			
					if (length > self.components.length) {
						length = self.components.length;
					}
			
					for (; i < length; i++) {
						compo_dispose(self.components[i]);
					}
				}
			
				if (insertIndex != null && rangeModel && rangeModel.length) {
			
					var component = new Component(),
						nodes = list_prepairNodes(self.template, rangeModel),
						fragment = compo_render(component, nodes),
						compos = component.components;
			
					compo_fragmentInsert(self, insertIndex, fragment);
					compo_inserted(component);
			
					if (self.components == null) {
						self.components = [];
					}
			
					self.components.splice.apply(self.components, [insertIndex, 0].concat(compos));
				}
			}
			
		
			var Component = mask.Dom.Component,
				ListItem = (function() {
					var Proto = Component.prototype;
		
					function ListItem(template, model) {
						this.nodes = template;
						this.model = model;
					}
		
					ListItem.prototype = {
						constructor: ListProto,
						renderEnd: function(elements) {
							this.elements = elements;
						}
					};
		
					for (var key in Proto) {
						ListItem.prototype[key] = Proto[key];
					}
		
					return ListItem;
		
				}());
		
		
			var ListProto = {
				append: function(model) {
					var item;
					item = new ListItem();
					item.nodes = this.template;
					item.model = model;
		
					mask.render(item, model, null, this.container, this);
				}
			};
		
		
			var EachProto = {
				refresh: function(array, method, args) {
					var i = 0,
						x, imax;
		
					//-array = mask.Utils.Expression.eval(this.expr, this.model, null, this);
					if (method == null) {
						// this was new array setter and not an immutable function call
		
						arr_each(this.components, compo_dispose);
		
						this.components = [];
						this.nodes = list_prepairNodes(this.template, array);
		
		
						dom_insertBefore(compo_render(this, this.nodes), this.placeholder);
		
						return;
					}
		
		
					for (imax = array.length; i < imax; i++) {
						//create references from values to distinguish the models
						x = array[i];
						switch (typeof x){
							case 'string':
							case 'number':
							case 'boolean':
								array[i] = new x.constructor(x);
								break;
						}
					}
		
					switch (method) {
					case 'push':
						list_update(this, null, null, array.length, array.slice(array.length - 1));
						break;
					case 'pop':
						list_update(this, array.length, 1);
						break;
					case 'unshift':
						list_update(this, null, null, 0, array.slice(0, 1));
						break;
					case 'shift':
						list_update(this, 0, 1);
						break;
					case 'splice':
						list_update(this, args[0], args[1], args[0], array.slice(args[0], args.length - 2)); //args.slice(2));
						break;
					case 'sort':
					case 'reverse':
						list_sort(this, array);
						break;
					}
		
				},
				dispose: function(){
					expression_unbind(this.expr, this.model, this.refresh);
				}
			};
		
		
		
			return function attr_each(self, model, cntx, container) {
				if (self.nodes == null && typeof Compo !== 'undefined') {
					Compo.ensureTemplate(self);
				}
		
				self.refresh = EachProto.refresh.bind(self);
				self.dispose = EachProto.dispose.bind(self);
				self.expr = self.attr.each || self.attr.foreach;
		
				var array = expression_bind(self.expr, model, cntx, self, self.refresh);
		
		
				self.template = self.nodes;
				self.container = container;
				self.placeholder = document.createComment('');
		
				container.appendChild(self.placeholder);
		
				for (var method in ListProto) {
					self[method] = ListProto[method];
				}
		
		
		
				self.nodes = list_prepairNodes(self.template, array);
			};
		
		}());
		
	
	
	
	
		Sys.prototype = {
			constructor: Sys,
			elements: null,
	
			renderStart: function(model, cntx, container) {
				var attr = this.attr;
	
				if (attr['debugger'] != null) {
					debugger;
					return;
				}
	
				if (attr['use'] != null) {
					attr_use(this, model, cntx, container);
					return;
				}
	
				if (attr['log'] != null) {
					attr_log(this, model, cntx, container);
					return;
				}
	
				this.model = model;
	
				if (attr['if'] != null) {
					attr_if(this, model, cntx, container);
					return;
				}
	
				if (attr['else'] != null) {
					attr_else(this, model, cntx, container);
					return;
				}
	
				// foreach is deprecated
				if (attr['each'] != null || attr['foreach'] != null) {
					attr_each(this, model, cntx, container);
				}
			},
			render: null,
			renderEnd: function(elements) {
				this.elements = elements;
			}
		};
	
	
		var Expression = mask.Utils.Expression;
	
		function expression_bind(expr, model, cntx, controller, callback) {
			var ast = Expression.parse(expr),
				vars = Expression.varRefs(ast),
				current = Expression.eval(ast, model);
	
			if (vars == null) {
				return current;
			}
	
	
			if (typeof vars === 'string') {
				obj_addObserver(model, vars, callback);
				return current;
			}
	
	
			for (var i = 0, x, length = vars.length; i < length; i++) {
				x = vars[i];
				obj_addObserver(model, x, callback);
			}
	
			return current;
		}
	
		function expression_unbind(expr, model, callback) {
			var ast = Expression.parse(expr),
				vars = Expression.varRefs(ast);
	
			if (vars == null) {
				return;
			}
	
	
			if (typeof vars === 'string') {
				obj_removeObserver(model, vars, callback);
				return;
			}
	
	
			for (var i = 0, length = vars.length; i < length; i++) {
				obj_removeObserver(model, vars[i], callback);
			}
		}
	
	}(mask));
	

}(Mask));



return Mask;

}));