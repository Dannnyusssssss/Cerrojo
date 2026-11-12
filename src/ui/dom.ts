/**
 * Creación de elementos de interfaz con nodos y textContent (nunca HTML como texto).
 */

export interface ElementOptions {
  className?: string;
  text?: string;
  /** Atributos fijos definidos en el código (nunca datos externos). */
  attrs?: Readonly<Record<string, string>>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: readonly Node[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className !== undefined) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) element.setAttribute(name, value);
  }
  for (const child of children) element.appendChild(child);
  return element;
}

export function button(text: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  const b = el('button', { className, text, attrs: { type: 'button' } });
  b.addEventListener('click', onClick);
  return b;
}

export function setHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
}
