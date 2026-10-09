// Shape of the backend JSON as documented in the course's API.md (TP05).
export interface MotorDTO {
  id: number;
  nombre: string;
  angulo: number;
  velocidad: number;
  torque: number;
  temperatura: number;
}

export interface ImuDTO {
  roll: number;
  pitch: number;
  yaw: number;
  ax: number;
  ay: number;
  az: number;
}

export interface BmsDTO {
  soc: number;
  corriente: number;
  temperatura: number;
  celdas: number[];
}

export interface TelemetriaDTO {
  modelo: string;
  ts: number;
  motores: MotorDTO[];
  imu: ImuDTO;
  bms: BmsDTO;
  fuerzas: Record<string, number>;
}

export interface InfoDTO {
  modelo: string;
  nombre: string;
  tipo: string;
  n_motores: number;
  motores_nombres: string[];
  patas: string[];
  frecuencia_hz: number;
  modo: string;
}
