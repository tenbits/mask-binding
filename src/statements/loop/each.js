(function(){
	
	var Each = custom_Statements['each'];
	
	mask.registerHandler('+each', {
		meta: {
			serializeNodes: true
		},
		serializeNodes: function(node){
			return mask.stringify(node);
		},
		//modelRef: null,
		render: function(model, ctx, container, ctr, children){
			//this.modelRef = this.expression;
			var array = expression_eval(this.expression, model, ctx, ctr);
			if (array == null) 
				return;
			
			arr_createRefs(array);
			
			build(
				this.nodes,
				array,
				ctx,
				container,
				this,
				children
			);
		},
		
		renderEnd: function(els, model, ctx, container, ctr){
			var compo = new EachStatement(this, this.attr);
			
			compo.placeholder = document.createComment('');
			container.appendChild(compo.placeholder);
			
			_compo_initAndBind(compo, this, model, ctx, container, ctr);
			
			return compo;
		}
		
	});
	mask.registerHandler('each::item', EachItem);
	
	function build(nodes, array, ctx, container, ctr, elements) {
		var imax = array.length,
			nodes_ = new Array(imax),
			i = 0, node;
		
		for(; i < imax; i++) {
			node = createEachNode(nodes, i);
			builder_build(node, array[i], ctx, container, ctr, elements);
		}
	}
	
	function createEachNode(nodes, index){
		var item = new EachItem;
		item.scope = { index: index };
		
		return {
			type: Dom.COMPONENT,
			tagName: 'each::item',
			nodes: nodes,
			controller: function() {
				return item;
			}
		};
	}
	
	function EachItem() {}
	EachItem.prototype = {
		compoName: 'each::item',
		scope: null,
		model: null,
		modelRef: null,
		parent: null,
		renderStart: IS_NODE === true
			?  function(){
				var expr = this.parent.expression;
				this.modelRef = ''
					+ (expr === '.' ? '' : ('(' + expr + ')'))
					+ '."'
					+ this.scope.index
					+ '"';
			}
			: null,
		renderEnd: function(els) {
			this.elements = els;
		},
		dispose: function(){
			if (this.elements != null) {
				this.elements.length = 0;
				this.elements = null;
			}
		}
	};
	
	function EachStatement(node, attr) {
		this.expression = node.expression;
		this.nodes = node.nodes;
		
		if (node.components == null) 
			node.components = [];
		
		this.node = node;
		this.components = node.components;
	}
	
	EachStatement.prototype = {
		compoName: '+each',
		refresh: LoopStatementProto.refresh,
		dispose: LoopStatementProto.dispose,
		
		_getModel: function(compo) {
			return compo.model;
		},
		
		_build: function(node, model, ctx, component) {
			var fragment = document.createDocumentFragment();
			
			build(node.nodes, model, ctx, fragment, component);
			
			return fragment;
		}
	};
	
}());