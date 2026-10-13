import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFalso, json, respuesta } from '../__tests__/testDoubles';
import { TransportePolling } from './polling';
import type { ManejadoresTransporte } from './transporte';

function manejadores(): ManejadoresTransporte & Record<string, ReturnType<typeof vi.fn>> {
  return { alAbrir: vi.fn(), alMensaje: vi.fn(), alError: vi.fn(), alCerrar: vi.fn() };
}

describe('TransportePolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pide /telemetria cada 250 ms y avisa la apertura una sola vez', async () => {
    const fetch = fetchFalso({ '/telemetria': () => json({ ts: 1 }) });
    const m = manejadores();
    new TransportePolling('http://10.0.0.5:8001', fetch).iniciar(m);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledWith('http://10.0.0.5:8001/telemetria', expect.anything());
    expect(m.alAbrir).toHaveBeenCalledTimes(1);
    expect(m.alMensaje).toHaveBeenCalledWith({ ts: 1 });

    await vi.advanceTimersByTimeAsync(500);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(m.alAbrir).toHaveBeenCalledTimes(1);
  });

  it('un 503 avisa sin_datos y sigue intentando', async () => {
    const fetch = fetchFalso({ '/telemetria': () => respuesta(503) });
    const m = manejadores();
    new TransportePolling('http://x:1', fetch).iniciar(m);

    await vi.advanceTimersByTimeAsync(260);
    expect(m.alError).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'sin_datos' }));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(m.alAbrir).not.toHaveBeenCalled();
  });

  it('otro error HTTP avisa http', async () => {
    const fetch = fetchFalso({ '/telemetria': () => respuesta(500) });
    const m = manejadores();
    new TransportePolling('http://x:1', fetch).iniciar(m);
    await vi.advanceTimersByTimeAsync(0);
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'http', detalle: 'HTTP 500' });
  });

  it('un server caído avisa red y sigue intentando', async () => {
    const fetch = fetchFalso({});
    const m = manejadores();
    new TransportePolling('http://x:1', fetch).iniciar(m);
    await vi.advanceTimersByTimeAsync(260);
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'red', detalle: 'Failed to fetch' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('detener corta los pedidos', async () => {
    const fetch = fetchFalso({ '/telemetria': () => json({ ts: 1 }) });
    const t = new TransportePolling('http://x:1', fetch);
    t.iniciar(manejadores());
    await vi.advanceTimersByTimeAsync(0);
    t.detener();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reiniciar no deja dos ciclos en paralelo', async () => {
    const fetch = fetchFalso({ '/telemetria': () => json({ ts: 1 }) });
    const t = new TransportePolling('http://x:1', fetch);
    t.iniciar(manejadores());
    t.detener();
    t.iniciar(manejadores());
    await vi.advanceTimersByTimeAsync(250);
    // first cycle of each start was in flight at most once; afterwards a single loop remains
    const llamadasTrasArranque = fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch.mock.calls.length - llamadasTrasArranque).toBe(4);
  });
});
