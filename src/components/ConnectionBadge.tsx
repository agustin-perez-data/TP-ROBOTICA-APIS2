import type { EstadoConexion } from '../telemetry/TelemetryClient';
import classes from './ConnectionBadge.module.css';

export const TEXTO_CONEXION: Record<EstadoConexion, string> = {
  conectando: 'Conectando',
  en_vivo_ws: 'En vivo · WebSocket',
  en_vivo_polling: 'En vivo · Polling',
  reconectando: 'Reconectando',
  sin_conexion: 'Sin conexión',
};

export const UMBRAL_DATO_VIEJO_MS = 2000;

export function ConnectionBadge({
  conexion,
  antiguedadMs,
}: {
  conexion: EstadoConexion;
  antiguedadMs: number | null;
}) {
  const viejo = antiguedadMs !== null && antiguedadMs > UMBRAL_DATO_VIEJO_MS;
  return (
    <span className={classes.badge} data-conexion={conexion} role="status">
      <span className={classes.punto} aria-hidden />
      <span>{TEXTO_CONEXION[conexion]}</span>
      {viejo && (
        <span className={classes.antiguedad}>
          último dato hace {Math.floor(antiguedadMs / 1000)} s
        </span>
      )}
    </span>
  );
}
