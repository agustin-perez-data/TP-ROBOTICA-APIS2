import { describe, expect, it } from 'vitest';
import { acotarEje, cortarVueltas, decimalesDelPaso } from './series';

describe('cortarVueltas', () => {
  it('corta la serie cuando el rumbo pasa de 359 a 0', () => {
    const serie = cortarVueltas([
      { x: -0.2, y: 358 },
      { x: -0.1, y: 359.5 },
      { x: 0, y: 0.5 },
    ]);
    expect(serie).toEqual([
      { x: -0.2, y: 358 },
      { x: -0.1, y: 359.5 },
      { x: -0.05, y: null },
      { x: 0, y: 0.5 },
    ]);
  });

  it('también corta en el sentido contrario (0 → 359)', () => {
    const serie = cortarVueltas([
      { x: -0.1, y: 1 },
      { x: 0, y: 359 },
    ]);
    expect(serie.map((p) => p.y)).toEqual([1, null, 359]);
  });

  it('no toca cambios normales ni valores faltantes', () => {
    const valores = [
      { x: -0.3, y: 10 },
      { x: -0.2, y: null },
      { x: -0.1, y: 190 },
      { x: 0, y: 20 },
    ];
    // 190 → 20 is a 170° change: real motion, not a wrap.
    expect(cortarVueltas(valores)).toEqual(valores);
  });
});

describe('decimalesDelPaso', () => {
  it.each([
    [10, 0],
    [1, 0],
    [0.5, 1],
    [0.1, 1],
    [0.05, 2],
  ])('paso %s → %s decimales', (paso, decimales) => {
    expect(decimalesDelPaso(paso)).toBe(decimales);
  });
});

describe('acotarEje', () => {
  it('saca del eje los valores fuera del dominio', () => {
    const eje = { min: 340, max: 380, ticks: [340, 350, 360, 370, 380].map((value) => ({ value })) };
    acotarEje(eje, [0, 360]);
    expect(eje.min).toBe(340);
    expect(eje.max).toBe(360);
    expect(eje.ticks.map((t) => t.value)).toEqual([340, 350, 360]);
  });
});
