import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { crearSocketFalso, fetchFalso, json, respuesta, SocketFalso } from './__tests__/testDoubles';
import { infoGo2, telemetriaG1, telemetriaGo2 } from './__fixtures__/robots';
import { MENSAJES, TelemetryClient } from './TelemetryClient';

const DIRECCION = 'http://10.0.0.5:8001';

function crearCliente(rutas: Record<string, () => Response>) {
  const fetch = fetchFalso(rutas);
  const cliente = new TelemetryClient({ fetch, crearSocket: crearSocketFalso, ahora: () => 1000 });
  return { cliente, fetch };
}

const llamadasA = (fetch: ReturnType<typeof fetchFalso>, ruta: string) =>
  fetch.mock.calls.filter(([url]) => new URL(String(url)).pathname === ruta).length;

describe('TelemetryClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    SocketFalso.reiniciar();
  });
  afterEach(() => vi.useRealTimers());

  it('pide /info, abre el WebSocket y entrega la telemetría adaptada', async () => {
    const { cliente, fetch } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);

    expect(llamadasA(fetch, '/info')).toBe(1);
    const s = SocketFalso.ultimo();
    expect(s.url).toBe('ws://10.0.0.5:8001/ws');

    s.abrir();
    expect(cliente.getEstado().conexion).toBe('en_vivo_ws');

    s.enviar(telemetriaGo2);
    const e = cliente.getEstado();
    expect(e.info?.nombre).toBe('Unitree Go2 EDU');
    expect(e.telemetria?.motores).toHaveLength(12);
    expect(e.ultimoDatoEn).toBe(1000);
    expect(e.error).toBeNull();
  });

  it('avisa a los suscriptores en cada cambio', async () => {
    const { cliente } = crearCliente({ '/info': () => json(infoGo2) });
    const oyente = vi.fn();
    cliente.subscribe(oyente);
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().abrir();
    expect(oyente).toHaveBeenLastCalledWith(expect.objectContaining({ conexion: 'en_vivo_ws' }));
  });

  it('si el WebSocket no abre en 3 s, pasa a polling y reintenta el WebSocket a los 15 s', async () => {
    const { cliente, fetch } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => json(telemetriaGo2),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(2999);
    expect(llamadasA(fetch, '/telemetria')).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(SocketFalso.instancias[0]?.cerrado).toBe(true);
    expect(llamadasA(fetch, '/telemetria')).toBeGreaterThan(0);
    expect(cliente.getEstado().conexion).toBe('en_vivo_polling');
    expect(cliente.getEstado().telemetria?.motores).toHaveLength(12);

    await vi.advanceTimersByTimeAsync(15000);
    expect(SocketFalso.instancias).toHaveLength(2);
  });

  it('si el socket se cierra sin abrir (backend sin websockets), pasa a polling', async () => {
    const { cliente } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => json(telemetriaGo2),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().cortar();
    await vi.advanceTimersByTimeAsync(0);
    expect(cliente.getEstado().conexion).toBe('en_vivo_polling');
  });

  it('cuando el WebSocket abre, deja el polling', async () => {
    const { cliente, fetch } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => json(telemetriaGo2),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(3000 + 15000);
    SocketFalso.ultimo().abrir();
    const antes = llamadasA(fetch, '/telemetria');
    await vi.advanceTimersByTimeAsync(2000);
    expect(llamadasA(fetch, '/telemetria')).toBe(antes);
    expect(cliente.getEstado().conexion).toBe('en_vivo_ws');
  });

  it('si un WebSocket que andaba se corta, reconecta esperando 1 s y después 2 s', async () => {
    const { cliente } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    const primero = SocketFalso.ultimo();
    primero.abrir();
    primero.enviar(telemetriaGo2);

    primero.cortar();
    await vi.advanceTimersByTimeAsync(0);
    expect(cliente.getEstado().conexion).toBe('reconectando');

    await vi.advanceTimersByTimeAsync(999);
    expect(SocketFalso.instancias).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(SocketFalso.instancias).toHaveLength(2);

    SocketFalso.ultimo().cortar();
    await vi.advanceTimersByTimeAsync(1999);
    expect(SocketFalso.instancias).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(SocketFalso.instancias).toHaveLength(3);
  });

  it('vuelve a pedir /info si cambia el modelo del robot', async () => {
    const { cliente, fetch } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    const s = SocketFalso.ultimo();
    s.abrir();
    s.enviar(telemetriaG1());
    await vi.advanceTimersByTimeAsync(0);
    expect(llamadasA(fetch, '/info')).toBe(2);
  });

  it('con el server caído muestra sin conexión y qué revisar', async () => {
    const { cliente } = crearCliente({});
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().cortar();
    await vi.advanceTimersByTimeAsync(0);

    const e = cliente.getEstado();
    expect(e.conexion).toBe('sin_conexion');
    expect(e.error).toBe(MENSAJES.sinRespuesta('10.0.0.5:8001'));
  });

  it('reintenta /info cada 2 s hasta que responde', async () => {
    let caido = true;
    const { cliente, fetch } = crearCliente({
      '/info': () => {
        if (caido) throw new TypeError('Failed to fetch');
        return json(infoGo2);
      },
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    expect(cliente.getEstado().info).toBeNull();
    caido = false;
    await vi.advanceTimersByTimeAsync(2000);
    expect(llamadasA(fetch, '/info')).toBe(2);
    expect(cliente.getEstado().info?.modelo).toBe('go2');
  });

  it('con 503 explica que el backend no recibe datos del robot', async () => {
    const { cliente } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => respuesta(503),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(3000);
    const e = cliente.getEstado();
    expect(e.conexion).toBe('conectando');
    expect(e.error).toBe(MENSAJES.sinDatos);
  });

  it('conectar a otra dirección cierra lo anterior y empieza de cero', async () => {
    const { cliente } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    const viejo = SocketFalso.ultimo();
    viejo.abrir();
    viejo.enviar(telemetriaGo2);

    cliente.conectar('http://192.168.1.20:8001');
    const e = cliente.getEstado();
    expect(viejo.cerrado).toBe(true);
    expect(e.direccion).toBe('http://192.168.1.20:8001');
    expect(e.telemetria).toBeNull();
    expect(e.conexion).toBe('conectando');
    expect(SocketFalso.ultimo().url).toBe('ws://192.168.1.20:8001/ws');
  });

  it('reintentar reconecta a la misma dirección', async () => {
    const { cliente } = crearCliente({});
    cliente.conectar(DIRECCION);
    cliente.reintentar();
    expect(SocketFalso.instancias).toHaveLength(2);
    expect(SocketFalso.ultimo().url).toBe('ws://10.0.0.5:8001/ws');
  });
});
