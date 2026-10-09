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
  // Whole degrees like electroSim, but keep the decimal when present: rounding 59.9 to "60"
  // would show a critical-looking number in a warning color.
  const decimales = temperatura !== null && !Number.isInteger(temperatura) ? 1 : 0;
  const valor = `${formatearNumero(temperatura, decimales)} °C`;
  const etiqueta =
    estado === 'desconocida' ? 'Temperatura sin dato' : `Temperatura ${NOMBRE[estado]}: ${valor}`;
  return (
    <span className={classes.badge} data-estado={estado} aria-label={etiqueta}>
      {estado === 'desconocida' ? '—' : `${ICONO[estado]} ${valor}`}
    </span>
  );
}
