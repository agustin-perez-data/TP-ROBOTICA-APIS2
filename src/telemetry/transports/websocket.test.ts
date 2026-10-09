import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearSocketFalso, SocketFalso } from '../__tests__/testDoubles';
import type { ManejadoresTransporte } from './transporte';
import { TransporteWebSocket } from './websocket';

function manejadores(): ManejadoresTransporte & Record<string, ReturnType<typeof vi.fn>> {
  return { alAbrir: vi.fn(), alMensaje: vi.fn(), alError: vi.fn(), alCerrar: vi.fn() };
}

describe('TransporteWebSocket', () => {
  beforeEach(() => SocketFalso.reiniciar());

  it('abre el socket en la URL y reenvía apertura y mensajes', () => {
    const m = manejadores();
    new TransporteWebSocket('ws://10.0.0.5:8001/ws', crearSocketFalso).iniciar(m);
    const s = SocketFalso.ultimo();

    expect(s.url).toBe('ws://10.0.0.5:8001/ws');
    s.abrir();
    s.enviar({ modelo: 'go2' });

    expect(m.alAbrir).toHaveBeenCalledTimes(1);
    expect(m.alMensaje).toHaveBeenCalledWith({ modelo: 'go2' });
  });

  it('avisa un error si el mensaje no es JSON', () => {
    const m = manejadores();
    new TransporteWebSocket('ws://x:1/ws', crearSocketFalso).iniciar(m);
    SocketFalso.ultimo().enviar('esto no es json');
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'http', detalle: 'Mensaje del WebSocket que no es JSON' });
    expect(m.alMensaje).not.toHaveBeenCalled();
  });

  it('avisa el cierre', () => {
    const m = manejadores();
    new TransporteWebSocket('ws://x:1/ws', crearSocketFalso).iniciar(m);
    SocketFalso.ultimo().cortar();
    expect(m.alCerrar).toHaveBeenCalledTimes(1);
  });

  it('detener cierra el socket y no avisa nada más', () => {
    const m = manejadores();
    const t = new TransporteWebSocket('ws://x:1/ws', crearSocketFalso);
    t.iniciar(m);
    const s = SocketFalso.ultimo();
    t.detener();
    s.cortar();
    s.enviar({ a: 1 });
    expect(s.cerrado).toBe(true);
    expect(m.alCerrar).not.toHaveBeenCalled();
    expect(m.alMensaje).not.toHaveBeenCalled();
  });

  it('si crear el socket falla, avisa error y cierre', () => {
    const m = manejadores();
    const roto = () => {
      throw new Error('URL inválida');
    };
    new TransporteWebSocket('ws://x:1/ws', roto).iniciar(m);
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'red', detalle: 'Error: URL inválida' });
    expect(m.alCerrar).toHaveBeenCalledTimes(1);
  });
});
