/**
 * Selects a single element by CSS selector, throwing early if it's missing.
 *
 * @param selector CSS selector
 * @param root Root element to search from (defaults to `document`)
 * @returns The selected element
 */
export function select<T extends Element = HTMLElement>(
	selector: string,
	root: ParentNode = document,
): T {
	const el = root.querySelector<T>(selector);
	if (!el) {
		throw new Error(`select(): no element matches "${selector}"`);
	}
	return el;
}
