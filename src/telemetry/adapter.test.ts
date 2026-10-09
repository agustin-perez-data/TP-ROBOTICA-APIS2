import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from './adapter';
import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from './__fixtures__/robots';

const info = adaptarInfo(infoGo2);

describe('adaptarInfo', () => {
  it('traduce /info del Go2', () => {
    expect(info).toEqual({
      modelo: 'go2',
      nombre: 'Unitree Go2 EDU',
      tipo: 'cuadrupedo',
      motores: infoGo2.motores_nombres,
      patas: ['FR', 'FL', 'RR', 'RL'],
      frecuenciaHz: 10,
      modo: 'demo',
    });
  });

  it('usa valores por defecto si llega basura', () => {
    expect(adaptarInfo('no es un objeto')).toEqual({
      modelo: 'desconocido',
      nombre: 'Robot sin nombre',
      tipo: '',
      motores: [],
      patas: [],
      frecuenciaHz: 10,
      modo: '',
    });
  });
});

describe('adaptarTelemetria', () => {
  it('traduce la telemetría del Go2', () => {
    const t = adaptarTelemetria(telemetriaGo2, info, 1234);

    expect(t.modelo).toBe('go2');
    expect(t.ts).toBe(5.92);
    expect(t.recibidaEn).toBe(1234);
    expect(t.motores).toHaveLength(12);
    expect(t.motores[0]).toEqual({
      id: 0,
      nombre: 'FR_hip',
      angulo: -27.7,
      velocidad: -0.321,
      torque: 4.98,
      temperatura: 40,
    });
    expect(t.imu.pitch).toBe(0.65);
    expect(t.bateria).toEqual({
      soc: 92,
      corrienteMa: 1446,
      temperatura: 31.6,
      celdas: [3.718, 3.724, 3.718, 3.703, 3.695, 3.7, 3.714, 3.724],
      disponible: true,
    });
    expect(t.patas).toEqual({ FR: 'en_el_aire', FL: 'apoyada', RR: 'apoyada', RL: 'en_el_aire' });
  });

  it('marca la batería como no disponible cuando el simulador la manda vacía', () => {
    const t = adaptarTelemetria(telemetriaG1(), adaptarInfo(infoG1), 0);
    expect(t.bateria).toEqual({
      soc: 87,
      corrienteMa: 0,
      temperatura: 0,
      celdas: [],
      disponible: false,
    });
  });

  it('adapta los 29 motores y los pies del G1', () => {
    const t = adaptarTelemetria(telemetriaG1(), adaptarInfo(infoG1), 0);
    expect(t.motores).toHaveLength(29);
    expect(t.motores[28]?.nombre).toBe('R_wrist_yaw');
    expect(t.patas).toEqual({ R_foot: 'apoyada', L_foot: 'en_el_aire' });
  });

  it('convierte faltantes y no numéricos en null y toma el nombre de /info', () => {
    const raw = {
      modelo: 'go2',
      ts: 1,
      motores: [{ id: 0, angulo: 'x', velocidad: Number.NaN, torque: null }],
      imu: { roll: 1 },
      bms: { soc: 50, celdas: [3.7, 'roto', 3.6] },
      fuerzas: { FR: 1 },
    };
    const t = adaptarTelemetria(raw, info, 0);

    expect(t.motores[0]).toEqual({
      id: 0,
      nombre: 'FR_hip',
      angulo: null,
      velocidad: null,
      torque: null,
      temperatura: null,
    });
    expect(t.imu).toEqual({ roll: 1, pitch: null, yaw: null, ax: null, ay: null, az: null });
    expect(t.bateria.celdas).toEqual([3.7, 3.6]);
    expect(t.patas).toEqual({ FR: 'apoyada', FL: 'desconocido', RR: 'desconocido', RL: 'desconocido' });
  });

  it('limita la carga de la batería a 0-100 % y conserva el signo de la corriente', () => {
    const raw = { ...telemetriaGo2, bms: { soc: 130, corriente: -800, temperatura: 30, celdas: [] } };
    const t = adaptarTelemetria(raw, info, 0);
    expect(t.bateria.soc).toBe(100);
    expect(t.bateria.corrienteMa).toBe(-800);
    expect(t.bateria.disponible).toBe(true);
  });

  it('sin /info toma las patas de las claves de fuerzas', () => {
    const t = adaptarTelemetria(telemetriaGo2, null, 0);
    expect(Object.keys(t.patas)).toEqual(['FR', 'FL', 'RR', 'RL']);
    expect(t.motores[0]?.nombre).toBe('FR_hip');
  });

  it('nunca falla con basura completa', () => {
    const t = adaptarTelemetria(undefined, null, 7);
    expect(t).toEqual({
      modelo: 'desconocido',
      ts: 0,
      recibidaEn: 7,
      motores: [],
      imu: { roll: null, pitch: null, yaw: null, ax: null, ay: null, az: null },
      bateria: { soc: null, corrienteMa: null, temperatura: null, celdas: [], disponible: false },
      patas: {},
    });
  });
});
