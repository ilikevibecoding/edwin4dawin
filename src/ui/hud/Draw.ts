/**
 * Canvas primitives shared by the reticle, the compass and the minimap.
 *
 * Every stroke is drawn twice: a dark, slightly wider pass first, then the light
 * one on top. A single white 1 px line disappears against sand and sky, which is
 * why real reticles are outlined; doing it here means no widget has to remember.
 */

export function outlinedLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  color: string,
  shadowAlpha = 0.55,
): void {
  ctx.lineCap = 'butt';
  ctx.strokeStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.lineWidth = width + 1.6;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function outlinedArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
  width: number,
  color: string,
  shadowAlpha = 0.5,
): void {
  ctx.lineCap = 'butt';
  ctx.strokeStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.lineWidth = width + 1.8;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, from, to);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, from, to);
  ctx.stroke();
}

export function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.arc(x, y, radius + 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Text with a hard shadow, for anything drawn over the world. */
export function shadowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/**
 * Text with a black rim on all sides. An offset shadow only protects two edges,
 * which is enough over ground but not over a blown-out sky, where the compass
 * letters otherwise disappear.
 */
export function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  rim = 2.6,
): void {
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = rim;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/**
 * Screen radius, in CSS pixels, of a cone of half-angle `radians` seen through a
 * camera with vertical field of view `fovDeg` on a viewport `heightPx` tall.
 */
export function coneToPixels(radians: number, fovDeg: number, heightPx: number): number {
  const halfFov = Math.tan((fovDeg * Math.PI) / 360);
  if (halfFov <= 1e-6) return 0;
  return (Math.tan(radians) / halfFov) * heightPx * 0.5;
}

export function rgba(hex: string, alpha: number): string {
  // Only the six-digit form is used in the theme; parsing is trivial and this
  // avoids a colour library for four call sites.
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
