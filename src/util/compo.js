
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

function compo_dispose(compo, parent) {
	if (compo == null) {
		return false;
	}

	dom_removeAll(compo.elements);

	compo.elements = null;

	if (typeof Compo !== 'undefined') {
		Compo.dispose(compo);
	}

	var components = (parent && parent.components) || (compo.parent && compo.parent.components);
	if (components == null) {
		console.error('Parent Components Collection is undefined');
		return false;
	}

	return arr_remove(components, compo);

}

function compo_inserted(compo) {
	if (typeof Compo !== 'undefined') {
		Compo.signal.emitIn(compo, 'domInsert');
	}
}

function compo_attachDisposer(controller, disposer) {

	if (typeof controller.dispose === 'function') {
		var previous = controller.dispose;
		controller.dispose = function(){
			disposer(this);
			previous(this);
		};

		return;
	}

	controller.dispose = disposer;
}