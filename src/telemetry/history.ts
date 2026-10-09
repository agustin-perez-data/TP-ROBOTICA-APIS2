import type { Num, Telemetria } from './model';
import { Emisor } from './observer';

export interface PuntoImu {
  ts: number;
  roll: Num;
  pitch: Num;
  yaw: Num;
}

/** Ring buffer for the IMU charts. Each change produces a new array (safe for useSyncExternalStore). */
export class HistorialImu extends Emisor<readonly PuntoImu[]> {
  private puntos: readonly PuntoImu[] = [];

  constructor(private readonly capacidad = 120) {
    super();
  }

  agregar(t: Telemetria): void {
    const ultimo = this.puntos.at(-1);
    if (ultimo && t.ts === ultimo.ts) return;
    // A smaller ts means the backend restarted: old points would draw crossed lines.
    const base = ultimo && t.ts < ultimo.ts ? [] : this.puntos;
    const punto: PuntoImu = { ts: t.ts, roll: t.imu.roll, pitch: t.imu.pitch, yaw: t.imu.yaw };
    this.puntos = [...base, punto].slice(-this.capacidad);
    this.emitir(this.puntos);
  }

  vaciar(): void {
    if (this.puntos.length === 0) return;
    this.puntos = [];
    this.emitir(this.puntos);
  }

  getPuntos = (): readonly PuntoImu[] => this.puntos;
}
