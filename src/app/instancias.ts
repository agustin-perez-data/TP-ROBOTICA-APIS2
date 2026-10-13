import { CaptureStore } from '../capture/captureStore';
import { HistorialImu } from '../telemetry/history';
import type { Telemetria } from '../telemetry/model';
import { TelemetryClient, type DependenciasCliente } from '../telemetry/TelemetryClient';

export interface Instancias {
  cliente: TelemetryClient;
  historial: HistorialImu;
  capturas: CaptureStore;
}

/** Builds the app's long-lived objects and wires the history as an observer of the client. */
export function crearInstancias(deps?: Partial<DependenciasCliente>): Instancias {
  const cliente = new TelemetryClient(deps);
  const historial = new HistorialImu(120);
  const capturas = new CaptureStore();

  let ultimaTelemetria: Telemetria | null = null;
  let ultimaDireccion = '';
  cliente.subscribe((estado) => {
    if (estado.direccion !== ultimaDireccion) {
      ultimaDireccion = estado.direccion;
      historial.vaciar();
    }
    if (estado.telemetria && estado.telemetria !== ultimaTelemetria) {
      ultimaTelemetria = estado.telemetria;
      historial.agregar(estado.telemetria);
    }
  });

  return { cliente, historial, capturas };
}
