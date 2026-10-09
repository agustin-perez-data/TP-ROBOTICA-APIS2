import { vi } from 'vitest';
import type { SocketLike } from '../transports/websocket';

export class SocketFalso implements SocketLike {
  static instancias: SocketFalso[] = [];

  static ultimo(): SocketFalso {
    const s = SocketFalso.instancias.at(-1);
    if (!s) throw new Error('No se creó ningún socket');
    return s;
  }

  static reiniciar(): void {
    SocketFalso.instancias = [];
  }

  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  cerrado = false;

  constructor(readonly url: string) {
    SocketFalso.instancias.push(this);
  }

  close(): void {
    this.cerrado = true;
  }

  abrir(): void {
    this.onopen?.({});
  }

  enviar(datos: unknown): void {
    this.onmessage?.({ data: typeof datos === 'string' ? datos : JSON.stringify(datos) });
  }

  cortar(): void {
    this.onclose?.({});
  }
}

export const crearSocketFalso = (url: string): SocketLike => new SocketFalso(url);

export const json = (datos: unknown): Response =>
  new Response(JSON.stringify(datos), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

export const respuesta = (status: number): Response => new Response('', { status });

/** fetch double: routes by pathname; unknown routes behave like a dead server. */
export function fetchFalso(rutas: Record<string, () => Response>) {
  return vi.fn(async (entrada: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const ruta = new URL(String(entrada)).pathname;
    const manejador = rutas[ruta];
    if (!manejador) throw new TypeError('Failed to fetch');
    return manejador();
  });
}
