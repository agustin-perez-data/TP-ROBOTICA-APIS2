import type { ManejadoresTransporte, Transporte } from './transporte';

/** Minimal subset of the browser WebSocket used here (lets tests inject a fake). */
export interface SocketLike {
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  close(): void;
}

export type CrearSocket = (url: string) => SocketLike;

export const crearSocketNativo: CrearSocket = (url) => new WebSocket(url) as unknown as SocketLike;

export class TransporteWebSocket implements Transporte {
  private socket: SocketLike | null = null;

  constructor(
    private readonly url: string,
    private readonly crearSocket: CrearSocket = crearSocketNativo,
  ) {}

  iniciar(m: ManejadoresTransporte): void {
    let socket: SocketLike;
    try {
      socket = this.crearSocket(this.url);
    } catch (error) {
      m.alError({ tipo: 'red', detalle: String(error) });
      m.alCerrar();
      return;
    }
    this.socket = socket;
    socket.onopen = () => m.alAbrir();
    socket.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let datos: unknown;
      try {
        datos = JSON.parse(ev.data);
      } catch {
        m.alError({ tipo: 'http', detalle: 'Mensaje del WebSocket que no es JSON' });
        return;
      }
      m.alMensaje(datos);
    };
    // A failed socket always fires `close` after `error`; closing is handled there.
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      m.alCerrar();
    };
  }

  detener(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }
}
