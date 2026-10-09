import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from '../telemetry/__fixtures__/robots';

export type Escenario = 'peor' | 'g1';

/** Worst realistic data (break-ui): exact thresholds, missing values, charging, 16 cells, unknown foot. */
function peorCaso(t: number): unknown {
  const oscila = Math.sin(t);
  return {
    ...telemetriaGo2,
    ts: t,
    motores: telemetriaGo2.motores.map((m, i) => {
      if (i === 0) return { ...m, temperatura: 40 };
      if (i === 1) return { ...m, temperatura: 60 };
      if (i === 2) return { ...m, temperatura: 59.9 };
      if (i === 3) return { ...m, temperatura: null };
      if (i === 4) return { ...m, angulo: null, velocidad: 'x' };
      if (i === 5) return { ...m, torque: 123456.789, angulo: -179.99 };
      return { ...m, angulo: m.angulo + 10 * oscila };
    }),
    imu: { ...telemetriaGo2.imu, roll: 25 * oscila, pitch: -40 * oscila, yaw: 359.9 },
    bms: {
      soc: 130,
      corriente: -2500,
      temperatura: 58.2,
      celdas: Array.from({ length: 16 }, (_, i) => 3.2 + (i % 5) * 0.12),
    },
    fuerzas: { FR: 1, FL: 0, RR: 1 },
  };
}

function g1EnMovimiento(t: number): unknown {
  const base = telemetriaG1(t);
  return {
    ...base,
    motores: base.motores.map((m, i) => ({ ...m, angulo: m.angulo + 15 * Math.sin(t + i * 0.3) })),
    imu: { ...base.imu, pitch: 3 * Math.sin(t), roll: 2 * Math.cos(t * 0.7) },
    fuerzas: { R_foot: Math.sin(t * 2) > 0 ? 1 : 0, L_foot: Math.sin(t * 2) > 0 ? 0 : 1 },
  };
}

export const ESCENARIOS: Record<Escenario, { info: unknown; telemetria: (t: number) => unknown }> = {
  peor: { info: { ...infoGo2, nombre: 'Unitree Go2 EDU (peor caso)' }, telemetria: peorCaso },
  g1: { info: infoG1, telemetria: g1EnMovimiento },
};
