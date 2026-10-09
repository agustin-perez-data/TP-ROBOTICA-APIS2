import { describe, expect, it } from 'vitest';
import { estadoTemperatura, formatearNumero, plural } from './format';

describe('formatearNumero', () => {
  it('usa coma decimal y decimales fijos', () => {
    expect(formatearNumero(4.98, 2)).toBe('4,98');
    expect(formatearNumero(4.9, 2)).toBe('4,90');
    expect(formatearNumero(2.192, 3)).toBe('2,192');
  });

  it('usa el signo menos tipográfico y no muestra −0', () => {
    expect(formatearNumero(-27.7, 2)).toBe('−27,70');
    expect(formatearNumero(-0.001, 2)).toBe('0,00');
  });

  it('agrupa miles de números grandes', () => {
    expect(formatearNumero(12345.6, 1)).toBe('12.345,6');
  });

  it('muestra — si falta el dato', () => {
    expect(formatearNumero(null, 2)).toBe('—');
    expect(formatearNumero(undefined, 2)).toBe('—');
    expect(formatearNumero(Number.NaN, 2)).toBe('—');
  });
});

describe('estadoTemperatura', () => {
  it.each([
    [39, 'normal'],
    [39.9, 'normal'],
    [40, 'elevada'],
    [59, 'elevada'],
    [60, 'critica'],
    [75, 'critica'],
    [null, 'desconocida'],
  ] as const)('%s °C es %s', (t, esperado) => {
    expect(estadoTemperatura(t)).toBe(esperado);
  });
});

describe('plural', () => {
  it('usa singular solo para 1', () => {
    expect(plural(1, 'muestra', 'muestras')).toBe('1 muestra');
    expect(plural(0, 'muestra', 'muestras')).toBe('0 muestras');
    expect(plural(4, 'muestra', 'muestras')).toBe('4 muestras');
  });
});
