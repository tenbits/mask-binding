var Expression = mask.Utils.Expression,
	expression_eval_origin = Expression.eval,
	expression_eval = function(expr, model, cntx, controller){
		
		if (expr === '.') {
			return model;
		}
		
		var value = expression_eval_origin(expr, model, cntx, controller);

		return value == null ? '' : value;
	},
	expression_parse = Expression.parse,
	expression_varRefs = Expression.varRefs;


function expression_bind(expr, model, cntx, controller, callback) {
	
	if (expr === '.') {
		
		if (arr_isArray(model)) {
			arr_addObserver(model, callback);
		}
		
		return;
	}
	
	var ast = expression_parse(expr),
		vars = expression_varRefs(ast),
		obj, ref;

	if (vars == null) {
		return;
	}

	if (typeof vars === 'string') {
		
		if (obj_isDefined(model, vars)) {
			obj = model;
		}
		
		if (obj == null && obj_isDefined(controller, vars)) {
			obj = controller;
		}
		
		if (obj == null) {
			obj = model;
		}
		
		obj_addObserver(obj, vars, callback);
		return;
	}

	var isArray = vars.length != null && typeof vars.splice === 'function',
		imax = isArray === true ? vars.length : 1,
		i = 0,
		x;
	
	for (; i < imax; i++) {
		x = isArray ? vars[i] : vars;
		if (x == null) {
			continue;
		}
		
		
		if (typeof x === 'object') {
			
			obj = expression_eval_origin(x.accessor, model, cntx, controller);
			
			if (obj == null || typeof obj !== 'object') {
				console.error('Binding failed to an object over accessor', x);
				continue;
			}
			
			x = x.ref;
		} else if (obj_isDefined(model, x)) {
			
			obj = model;
		} else if (obj_isDefined(controller, x)) {
			
			obj = controller;
		} else {
			
			obj = model;
		}
		
		obj_addObserver(obj, x, callback);
	}

	return;
}

function expression_unbind(expr, model, controller, callback) {
	
	if (typeof controller === 'function') {
		console.warn('[mask.binding] - expression unbind(expr, model, controller, callback)');
	}
	
	if (expr === '.') {
		arr_removeObserver(model, callback);
		return;
	}
	
	var vars = expression_varRefs(expr),
		x, ref;

	if (vars == null) {
		return;
	}
	
	if (typeof vars === 'string') {
		if (obj_isDefined(model, vars)) {
			obj_removeObserver(model, vars, callback);
		}
		
		if (obj_isDefined(controller, vars)) {
			obj_removeObserver(controller, vars, callback);
		}
		
		return;
	}
	
	var isArray = vars.length != null && typeof vars.splice === 'function',
		imax = isArray === true ? vars.length : 1,
		i = 0,
		x;
	
	for (; i < imax; i++) {
		x = isArray ? vars[i] : vars;
		if (x == null) {
			continue;
		}
		
		
		if (typeof x === 'object') {
			
			var obj = expression_eval_origin(x.accessor, model, null, controller);
			
			if (obj) {
				obj_removeObserver(obj, x.ref, callback);
			}
			
			continue;
		}
		
		if (obj_isDefined(model, x)) {
			obj_removeObserver(model, x, callback);
		}
		
		if (obj_isDefined(controller, x)) {
			obj_removeObserver(controller, x, callback);
		}
	}

}

/**
 * expression_bind only fires callback, if some of refs were changed,
 * but doesnt supply new expression value
 **/
function expression_createBinder(expr, model, cntx, controller, callback) {
	var lockes = 0;
	return function binder() {
		if (lockes++ > 10) {
			console.warn('Concurent binder detected', expr);
			return;
		}
		
		var value = expression_eval(expr, model, cntx, controller);
		if (arguments.length > 1) {
			var args = __array_slice.call(arguments);
			
			args[0] = value;
			callback.apply(this, args);
			
		}else{
			
			callback(value);
		}
		
		lockes--;
	};
}


