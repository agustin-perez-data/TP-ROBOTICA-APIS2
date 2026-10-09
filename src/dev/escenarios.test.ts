import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { ESCENARIOS } from './escenarios';

describe('escenario peor caso', () => {
  const { info, telemetria } = ESCENARIOS.peor;
  const t = adaptarTelemetria(telemetria(12), adaptarInfo(info), 0);

  it('cubre los casos extremos del spec', () => {
    const temps = t.motores.map((m) => m.temperatura);
    expect(temps).toContain(40);
    expect(temps).toContain(60);
    expect(temps).toContain(null);
    expect(t.motores.some((m) => m.angulo === null)).toBe(true);
    expect(t.bateria.corrienteMa).toBeLessThan(0);
    expect(t.bateria.celdas).toHaveLength(16);
    expect(t.bateria.soc).toBe(100);
    expect(Object.values(t.patas)).toContain('desconocido');
  });
});

describe('escenario G1', () => {
  it('trae 29 motores, dos pies y batería vacía', () => {
    const { info, telemetria } = ESCENARIOS.g1;
    const t = adaptarTelemetria(telemetria(1), adaptarInfo(info), 0);
    expect(t.motores).toHaveLength(29);
    expect(Object.keys(t.patas)).toEqual(['R_foot', 'L_foot']);
    expect(t.bateria.disponible).toBe(false);
  });

  it('varía con el tiempo', () => {
    const { telemetria } = ESCENARIOS.g1;
    expect(telemetria(1)).not.toEqual(telemetria(2));
  });
});
