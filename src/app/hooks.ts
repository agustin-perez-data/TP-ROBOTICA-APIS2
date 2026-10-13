import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Captura } from '../capture/captureStore';
import type { PuntoImu } from '../telemetry/history';
import type { EstadoCliente } from '../telemetry/TelemetryClient';
import { useInstancias } from './InstanciasContext';

export function useTelemetria(): EstadoCliente {
  const { cliente } = useInstancias();
  return useSyncExternalStore(cliente.subscribe, cliente.getEstado);
}

export function useHistorialImu(): readonly PuntoImu[] {
  const { historial } = useInstancias();
  return useSyncExternalStore(historial.subscribe, historial.getPuntos);
}

export function useCapturas(): readonly Captura[] {
  const { capturas } = useInstancias();
  return useSyncExternalStore(capturas.subscribe, capturas.getCapturas);
}

/** Milliseconds since the last datum, refreshed every 500 ms. Null when nothing arrived yet. */
export function useAntiguedad(
  ultimoDatoEn: number | null,
  ahora: () => number = Date.now,
): number | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (ultimoDatoEn === null) return;
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [ultimoDatoEn]);
  return ultimoDatoEn === null ? null : Math.max(0, ahora() - ultimoDatoEn);
}
