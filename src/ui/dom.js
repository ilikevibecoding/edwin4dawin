/** Tiny DOM helpers: create elements from markup and update text/classes only when they change. */

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Set textContent only when the value differs (avoids layout churn from per-frame writes). */
export function setText(node, value) {
  const s = String(value);
  if (node._t !== s) {
    node._t = s;
    node.textContent = s;
  }
}

/** Toggle a class only when the state changes. */
export function setClass(node, cls, on) {
  const key = `_c_${cls}`;
  const v = !!on;
  if (node[key] !== v) {
    node[key] = v;
    node.classList.toggle(cls, v);
  }
}

/** Set a style property only when it changes. */
export function setStyle(node, prop, value) {
  const key = `_s_${prop}`;
  if (node[key] !== value) {
    node[key] = value;
    node.style[prop] = value;
  }
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}
