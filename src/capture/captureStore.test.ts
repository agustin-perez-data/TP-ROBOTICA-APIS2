import { describe, expect, it, vi } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { infoGo2, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { CaptureStore } from './captureStore';

const info = adaptarInfo(infoGo2);
const t = adaptarTelemetria(telemetriaGo2, info, 0);

describe('CaptureStore', () => {
  it('numera las capturas y guarda la hora', () => {
    const store = new CaptureStore();
    const a = store.capturar(t, info, 1000);
    const b = store.capturar(t, info, 2000);
    expect(a.numero).toBe(1);
    expect(b).toEqual({ numero: 2, tomadaEn: 2000, telemetria: t, info });
    expect(store.getCapturas()).toEqual([a, b]);
  });

  it('avisa a los suscriptores con un arreglo nuevo', () => {
    const store = new CaptureStore();
    const oyente = vi.fn();
    store.subscribe(oyente);
    const antes = store.getCapturas();
    store.capturar(t, info, 1);
    expect(store.getCapturas()).not.toBe(antes);
    expect(oyente).toHaveBeenCalledWith(store.getCapturas());
  });

  it('vaciar reinicia la numeración', () => {
    const store = new CaptureStore();
    store.capturar(t, info, 1);
    store.vaciar();
    expect(store.getCapturas()).toEqual([]);
    expect(store.capturar(t, info, 2).numero).toBe(1);
  });
});
