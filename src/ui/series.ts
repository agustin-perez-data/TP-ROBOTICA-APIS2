export interface PuntoSerie {
  x: number;
  y: number | null;
}

/**
 * Breaks a heading series where it wraps around (359° → 0°): a null point between the two samples
 * leaves a gap instead of a vertical line across the chart. The gap sits at the midpoint so the
 * series stays sorted by x.
 */
export function cortarVueltas(valores: readonly PuntoSerie[], salto = 180): PuntoSerie[] {
  const salida: PuntoSerie[] = [];
  let anterior: PuntoSerie | undefined;
  for (const punto of valores) {
    if (anterior && anterior.y !== null && punto.y !== null && Math.abs(punto.y - anterior.y) > salto) {
      salida.push({ x: (anterior.x + punto.x) / 2, y: null });
    }
    salida.push(punto);
    anterior = punto;
  }
  return salida;
}

/** Decimals an axis tick needs so consecutive ticks never print the same text ("12°, 12°"). */
export function decimalesDelPaso(paso: number): number {
  if (!Number.isFinite(paso) || paso >= 1) return 0;
  if (paso >= 0.1) return 1;
  return 2;
}

/** Keeps an axis inside its valid domain (a heading never goes past 0–360°). */
export function acotarEje<T extends { value: number }>(
  eje: { min: number; max: number; ticks: T[] },
  [minimo, maximo]: readonly [number, number],
): void {
  eje.min = Math.max(eje.min, minimo);
  eje.max = Math.min(eje.max, maximo);
  eje.ticks = eje.ticks.filter((t) => t.value >= minimo && t.value <= maximo);
}
