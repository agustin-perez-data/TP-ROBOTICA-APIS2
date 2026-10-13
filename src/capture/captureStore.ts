import type { RobotInfo, Telemetria } from '../telemetry/model';
import { Emisor } from '../telemetry/observer';

export interface Captura {
  numero: number;
  tomadaEn: number;
  telemetria: Telemetria;
  info: RobotInfo;
}

/** Samples captured during the session (kept in memory, like electroSim). */
export class CaptureStore extends Emisor<readonly Captura[]> {
  private capturas: readonly Captura[] = [];

  capturar(telemetria: Telemetria, info: RobotInfo, ahora = Date.now()): Captura {
    const captura: Captura = { numero: this.capturas.length + 1, tomadaEn: ahora, telemetria, info };
    this.capturas = [...this.capturas, captura];
    this.emitir(this.capturas);
    return captura;
  }

  vaciar(): void {
    this.capturas = [];
    this.emitir(this.capturas);
  }

  getCapturas = (): readonly Captura[] => this.capturas;
}
