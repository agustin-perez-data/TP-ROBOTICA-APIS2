/** A CSS custom property declared in tokens.css. */
export type Token = `--${string}`;

const valores = new Map<Token, string>();

/**
 * Resolved value of a tokens.css property, for canvas drawing (Chart.js), which cannot use var().
 * tokens.css stays the single source of truth; each value is read once and cached. Returns '' when
 * the stylesheet is not loaded (unit tests), which Chart.js treats as its default color.
 */
export function token(nombre: Token): string {
  const guardado = valores.get(nombre);
  if (guardado) return guardado;
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  if (valor) valores.set(nombre, valor);
  return valor;
}
