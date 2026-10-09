import type { Num } from '../telemetry/model';

const formateadores = new Map<number, Intl.NumberFormat>();

function formateador(decimales: number): Intl.NumberFormat {
  let f = formateadores.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
    formateadores.set(decimales, f);
  }
  return f;
}

/** Fixed decimals, comma separator, typographic minus, "—" for missing values. */
export function formatearNumero(v: Num | undefined, decimales: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const redondeado = Number(v.toFixed(decimales));
  return formateador(decimales)
    .format(redondeado === 0 ? 0 : redondeado)
    .replace('-', '−');
}

export type EstadoTemperatura = 'normal' | 'elevada' | 'critica' | 'desconocida';

// Same thresholds as electroSim (ui_main.py): >= 40 warning, >= 60 critical.
export const UMBRAL_ELEVADA = 40;
export const UMBRAL_CRITICA = 60;

export function estadoTemperatura(t: Num): EstadoTemperatura {
  if (t === null) return 'desconocida';
  if (t >= UMBRAL_CRITICA) return 'critica';
  if (t >= UMBRAL_ELEVADA) return 'elevada';
  return 'normal';
}

export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}
