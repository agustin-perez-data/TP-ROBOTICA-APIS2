// App-side model. Every measured value can be missing (null); the UI renders it as "—".
export type Num = number | null;

export interface Motor {
  id: number;
  nombre: string;
  angulo: Num;
  velocidad: Num;
  torque: Num;
  temperatura: Num;
}

export interface Imu {
  roll: Num;
  pitch: Num;
  yaw: Num;
  ax: Num;
  ay: Num;
  az: Num;
}

export interface Bateria {
  soc: Num;
  corrienteMa: Num;
  temperatura: Num;
  celdas: number[];
  /** False when the backend only reports the charge (simulator mode). */
  disponible: boolean;
}

export type Contacto = 'apoyada' | 'en_el_aire' | 'desconocido';

export interface Telemetria {
  modelo: string;
  /** Seconds since the backend started. Goes back to ~0 if the backend restarts. */
  ts: number;
  /** Local epoch ms when the message arrived. */
  recibidaEn: number;
  motores: Motor[];
  imu: Imu;
  bateria: Bateria;
  patas: Record<string, Contacto>;
}

export interface RobotInfo {
  modelo: string;
  nombre: string;
  tipo: string;
  motores: string[];
  patas: string[];
  frecuenciaHz: number;
  modo: string;
}
