import type { DependenciasCliente } from '../telemetry/TelemetryClient';
import type { SocketLike } from '../telemetry/transports/websocket';
import { ESCENARIOS, type Escenario } from './escenarios';

const esEscenario = (v: string | null): v is Escenario => v === 'peor' || v === 'g1';

/** Development only: fake fetch and WebSocket that serve a scenario at 10 Hz. */
export function dependenciasDesdeUrl(search: string): Partial<DependenciasCliente> | undefined {
  const pedido = new URLSearchParams(search).get('datos');
  if (!esEscenario(pedido)) return undefined;
  const escenario = ESCENARIOS[pedido];
  const inicio = performance.now();
  const ahora = () => (performance.now() - inicio) / 1000;

  const fetchFicticio: typeof fetch = async (entrada) => {
    const ruta = new URL(String(entrada)).pathname;
    const cuerpo = ruta === '/info' ? escenario.info : escenario.telemetria(ahora());
    return new Response(JSON.stringify(cuerpo), { headers: { 'Content-Type': 'application/json' } });
  };

  const crearSocket = (): SocketLike => {
    const socket: SocketLike = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      close: () => clearInterval(intervalo),
    };
    setTimeout(() => socket.onopen?.({}), 50);
    const intervalo = setInterval(
      () => socket.onmessage?.({ data: JSON.stringify(escenario.telemetria(ahora())) }),
      100,
    );
    return socket;
  };

  return { fetch: fetchFicticio, crearSocket };
}
