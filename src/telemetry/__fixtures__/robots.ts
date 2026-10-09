import type { InfoDTO, TelemetriaDTO } from '../contract';

const NOMBRES_GO2 = [
  'FR_hip', 'FR_thigh', 'FR_calf',
  'FL_hip', 'FL_thigh', 'FL_calf',
  'RR_hip', 'RR_thigh', 'RR_calf',
  'RL_hip', 'RL_thigh', 'RL_calf',
];

const NOMBRES_G1 = [
  'L_hip_yaw', 'L_hip_roll', 'L_hip_pitch', 'L_knee', 'L_ankle_pitch', 'L_ankle_roll',
  'R_hip_yaw', 'R_hip_roll', 'R_hip_pitch', 'R_knee', 'R_ankle_pitch', 'R_ankle_roll',
  'torso_yaw', 'torso_roll', 'torso_pitch',
  'L_shoulder_pitch', 'L_shoulder_roll', 'L_shoulder_yaw', 'L_elbow', 'L_wrist_roll', 'L_wrist_pitch', 'L_wrist_yaw',
  'R_shoulder_pitch', 'R_shoulder_roll', 'R_shoulder_yaw', 'R_elbow', 'R_wrist_roll', 'R_wrist_pitch', 'R_wrist_yaw',
];

export const infoGo2: InfoDTO = {
  modelo: 'go2',
  nombre: 'Unitree Go2 EDU',
  tipo: 'cuadrupedo',
  n_motores: 12,
  motores_nombres: NOMBRES_GO2,
  patas: ['FR', 'FL', 'RR', 'RL'],
  frecuencia_hz: 10,
  modo: 'demo',
};

const VALORES_GO2: Array<[number, number, number, number]> = [
  [-27.7, -0.321, 4.98, 40.0],
  [-26.72, 0.658, 6.72, 42.0],
  [-20.42, 1.505, 8.12, 42.0],
  [-10.05, 2.053, 8.9, 42.0],
  [2.32, 2.192, 8.9, 41.0],
  [14.22, 1.895, 8.12, 40.0],
  [23.3, 1.22, 6.73, 38.0],
  [27.73, 0.303, 4.99, 36.0],
  [26.65, -0.675, 3.25, 34.0],
  [20.26, -1.519, 1.86, 34.0],
  [9.83, -2.06, 1.09, 34.0],
  [-2.55, -2.191, 1.11, 35.0],
];

export const telemetriaGo2: TelemetriaDTO = {
  modelo: 'go2',
  ts: 5.92,
  motores: VALORES_GO2.map(([angulo, velocidad, torque, temperatura], id) => ({
    id,
    nombre: NOMBRES_GO2[id]!,
    angulo,
    velocidad,
    torque,
    temperatura,
  })),
  imu: { roll: 0.0, pitch: 0.65, yaw: 0.0, ax: -0.082, ay: 0.084, az: 9.81 },
  bms: {
    soc: 92,
    corriente: 1446,
    temperatura: 31.6,
    celdas: [3.718, 3.724, 3.718, 3.703, 3.695, 3.7, 3.714, 3.724],
  },
  fuerzas: { FR: 0, FL: 1, RR: 1, RL: 0 },
};

export const infoG1: InfoDTO = {
  modelo: 'g1',
  nombre: 'Unitree G1 EDU',
  tipo: 'humanoide',
  n_motores: 29,
  motores_nombres: NOMBRES_G1,
  patas: ['R_foot', 'L_foot'],
  frecuencia_hz: 10,
  modo: 'simulador',
};

/** G1 as the simulator reports it: 29 motors and an empty battery block. */
export function telemetriaG1(ts = 3.1): TelemetriaDTO {
  return {
    modelo: 'g1',
    ts,
    motores: NOMBRES_G1.map((nombre, id) => ({
      id,
      nombre,
      angulo: (id % 7) * 4.5 - 12,
      velocidad: ((id % 5) - 2) * 0.4,
      torque: 2 + (id % 4),
      temperatura: 33 + (id % 9),
    })),
    imu: { roll: 0.8, pitch: -1.2, yaw: 140.5, ax: 0.01, ay: -0.02, az: 9.8 },
    bms: { soc: 87, corriente: 0, temperatura: 0, celdas: [] },
    fuerzas: { R_foot: 1, L_foot: 0 },
  };
}
