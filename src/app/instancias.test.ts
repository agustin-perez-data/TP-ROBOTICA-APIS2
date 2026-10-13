import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearSocketFalso, fetchFalso, json, SocketFalso } from '../telemetry/__tests__/testDoubles';
import { infoGo2, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { crearInstancias } from './instancias';

describe('crearInstancias', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    SocketFalso.reiniciar();
  });
  afterEach(() => vi.useRealTimers());

  it('cada telemetría nueva entra al historial', async () => {
    const { cliente, historial } = crearInstancias({
      fetch: fetchFalso({ '/info': () => json(infoGo2) }),
      crearSocket: crearSocketFalso,
    });
    cliente.conectar('http://x:8001');
    await vi.advanceTimersByTimeAsync(0);
    const s = SocketFalso.ultimo();
    s.abrir();
    s.enviar(telemetriaGo2);
    s.enviar({ ...telemetriaGo2, ts: 6.02 });
    expect(historial.getPuntos().map((p) => p.ts)).toEqual([5.92, 6.02]);
  });

  it('vacía el historial al cambiar de dirección', async () => {
    const { cliente, historial } = crearInstancias({
      fetch: fetchFalso({ '/info': () => json(infoGo2) }),
      crearSocket: crearSocketFalso,
    });
    cliente.conectar('http://x:8001');
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().abrir();
    SocketFalso.ultimo().enviar(telemetriaGo2);
    cliente.conectar('http://y:8001');
    expect(historial.getPuntos()).toEqual([]);
  });
});
