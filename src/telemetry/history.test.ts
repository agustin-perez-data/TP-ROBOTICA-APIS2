import { describe, expect, it, vi } from 'vitest';
import { adaptarTelemetria } from './adapter';
import { HistorialImu } from './history';
import { telemetriaGo2 } from './__fixtures__/robots';

const muestra = (ts: number, pitch = 1) =>
  adaptarTelemetria({ ...telemetriaGo2, ts, imu: { ...telemetriaGo2.imu, pitch } }, null, 0);

describe('HistorialImu', () => {
  it('guarda roll, pitch y yaw con su ts', () => {
    const h = new HistorialImu(120);
    h.agregar(muestra(1, 2.5));
    expect(h.getPuntos()).toEqual([{ ts: 1, roll: 0, pitch: 2.5, yaw: 0 }]);
  });

  it('se queda con las últimas N muestras', () => {
    const h = new HistorialImu(3);
    for (let ts = 1; ts <= 5; ts++) h.agregar(muestra(ts));
    expect(h.getPuntos().map((p) => p.ts)).toEqual([3, 4, 5]);
  });

  it('ignora una muestra repetida con el mismo ts', () => {
    const h = new HistorialImu();
    h.agregar(muestra(1));
    h.agregar(muestra(1));
    expect(h.getPuntos()).toHaveLength(1);
  });

  it('vacía el historial cuando ts retrocede (el backend se reinició)', () => {
    const h = new HistorialImu();
    h.agregar(muestra(50));
    h.agregar(muestra(51));
    h.agregar(muestra(0.3));
    expect(h.getPuntos().map((p) => p.ts)).toEqual([0.3]);
  });

  it('devuelve un arreglo nuevo en cada cambio y avisa a los suscriptores', () => {
    const h = new HistorialImu();
    const oyente = vi.fn();
    h.subscribe(oyente);
    const antes = h.getPuntos();
    h.agregar(muestra(1));
    expect(h.getPuntos()).not.toBe(antes);
    expect(oyente).toHaveBeenCalledWith(h.getPuntos());
  });

  it('vaciar avisa solo si había algo', () => {
    const h = new HistorialImu();
    const oyente = vi.fn();
    h.subscribe(oyente);
    h.vaciar();
    expect(oyente).not.toHaveBeenCalled();
    h.agregar(muestra(1));
    h.vaciar();
    expect(h.getPuntos()).toEqual([]);
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});
