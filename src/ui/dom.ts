/** Minimal DOM helpers — same pattern as cookiepeak/fastweb */

type Attrs = Record<string, string | boolean | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key.startsWith('on') && typeof val === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), val as EventListener);
      } else if (typeof val === 'boolean') {
        if (val) el.setAttribute(key, '');
      } else if (typeof val === 'string') {
        el.setAttribute(key, val);
      }
    }
  }

  for (const child of children) {
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return el;
}

export function $(selector: string, root: ParentNode = document): HTMLElement | null {
  return root.querySelector(selector);
}

export function $$(selector: string, root: ParentNode = document): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selector)];
}

export function clear(el: HTMLElement): void {
  el.textContent = '';
}
