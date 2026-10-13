import type { Num } from '../telemetry/model';
import { estadoTemperatura, formatearNumero, type EstadoTemperatura } from '../ui/format';
import classes from './TemperaturaBadge.module.css';

const ICONO: Record<EstadoTemperatura, string> = {
  normal: '●',
  elevada: '▲',
  critica: '■',
  desconocida: '',
};

const NOMBRE: Record<EstadoTemperatura, string> = {
  normal: 'normal',
  elevada: 'elevada',
  critica: 'crítica',
  desconocida: 'sin dato',
};

export function TemperaturaBadge({ temperatura }: { temperatura: Num }) {
  const estado = estadoTemperatura(temperatura);
  // Always one decimal so the column aligns ("40,0", "59,9"). Truncated instead of rounded: the
  // thresholds are whole degrees, so 59.95 shows "59,9" and never a critical-looking "60,0" in a
  // warning color. The epsilon absorbs binary error (e.g. 0.7 * 10).
  const mostrada = temperatura === null ? null : Math.floor(temperatura * 10 + 1e-9) / 10;
  const valor = `${formatearNumero(mostrada, 1)} °C`;
  const etiqueta =
    estado === 'desconocida' ? 'Temperatura sin dato' : `Temperatura ${NOMBRE[estado]}: ${valor}`;
  return (
    <span className={classes.badge} data-estado={estado} aria-label={etiqueta}>
      {estado === 'desconocida' ? '—' : `${ICONO[estado]} ${valor}`}
    </span>
  );
}
