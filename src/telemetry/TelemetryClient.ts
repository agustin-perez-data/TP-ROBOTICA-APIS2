import { adaptarInfo, adaptarTelemetria } from './adapter';
import type { RobotInfo, Telemetria } from './model';
import { Emisor } from './observer';
import { hostDeDireccion, urlWebSocket } from './serverAddress';
import { TransportePolling } from './transports/polling';
import type { ErrorTransporte } from './transports/transporte';
import { crearSocketNativo, TransporteWebSocket, type CrearSocket } from './transports/websocket';

export type EstadoConexion =
  | 'conectando'
  | 'en_vivo_ws'
  | 'en_vivo_polling'
  | 'reconectando'
  | 'sin_conexion';

export interface EstadoCliente {
  direccion: string;
  conexion: EstadoConexion;
  info: RobotInfo | null;
  telemetria: Telemetria | null;
  ultimoDatoEn: number | null;
  error: string | null;
}

export interface DependenciasCliente {
  fetch: typeof fetch;
  crearSocket: CrearSocket;
  ahora: () => number;
}

export const TIEMPOS = {
  aperturaWs: 3000,
  reintentoWsDesdePolling: 15000,
  esperasReconexion: [1000, 2000, 4000, 8000, 10000],
  reintentoInfo: 2000,
  pollingMs: 250,
} as const;

export const MENSAJES = {
  sinRespuesta: (host: string) =>
    `No hay respuesta de ${host}. Revisá que el backend esté corriendo y que la dirección sea la que muestra INICIAR_TP05.`,
  sinDatos: 'El backend está levantado pero todavía no recibe datos del robot.',
} as const;

/**
 * Facade over the telemetry transports: callers only `conectar()` and `subscribe()`.
 * Internally prefers the WebSocket, falls back to polling, and reconnects on its own.
 */
export class TelemetryClient extends Emisor<EstadoCliente> {
  private estado: EstadoCliente = {
    direccion: '',
    conexion: 'conectando',
    info: null,
    telemetria: null,
    ultimoDatoEn: null,
    error: null,
  };
  private readonly deps: DependenciasCliente;
  private ws: TransporteWebSocket | null = null;
  private polling: TransportePolling | null = null;
  private wsEnVivo = false;
  private wsEstuvoEnVivo = false;
  private intentosReconexion = 0;
  private pidiendoInfo = false;
  private sesion = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(deps: Partial<DependenciasCliente> = {}) {
    super();
    this.deps = {
      fetch: deps.fetch ?? ((...args) => fetch(...args)),
      crearSocket: deps.crearSocket ?? crearSocketNativo,
      ahora: deps.ahora ?? (() => Date.now()),
    };
  }

  getEstado = (): EstadoCliente => this.estado;

  conectar(direccion: string): void {
    this.detenerTodo();
    this.sesion += 1;
    this.wsEstuvoEnVivo = false;
    this.intentosReconexion = 0;
    this.actualizar({
      direccion,
      conexion: 'conectando',
      info: null,
      telemetria: null,
      ultimoDatoEn: null,
      error: null,
    });
    const sesion = this.sesion;
    void this.pedirInfo(sesion);
    this.intentarWebSocket(sesion);
  }

  reintentar(): void {
    this.conectar(this.estado.direccion);
  }

  desconectar(): void {
    this.detenerTodo();
    this.sesion += 1;
  }

  private actualizar(cambios: Partial<EstadoCliente>): void {
    this.estado = { ...this.estado, ...cambios };
    this.emitir(this.estado);
  }

  private detenerTodo(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.ws?.detener();
    this.ws = null;
    this.polling?.detener();
    this.polling = null;
    this.wsEnVivo = false;
    this.pidiendoInfo = false;
  }

  private programar(fn: () => void, ms: number, sesion: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (sesion === this.sesion) fn();
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  private cancelar(timer: ReturnType<typeof setTimeout>): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  private async pedirInfo(sesion: number): Promise<void> {
    if (this.pidiendoInfo) return;
    this.pidiendoInfo = true;
    let ok = false;
    try {
      const r = await this.deps.fetch(`${this.estado.direccion}/info`, { cache: 'no-store' });
      if (sesion !== this.sesion) return;
      if (r.ok) {
        const info = adaptarInfo(await r.json());
        if (sesion !== this.sesion) return;
        ok = true;
        this.actualizar({ info });
      }
    } catch {
      // Network failure: retried below.
    }
    if (sesion !== this.sesion) return;
    this.pidiendoInfo = false;
    if (!ok) this.programar(() => void this.pedirInfo(sesion), TIEMPOS.reintentoInfo, sesion);
  }

  private intentarWebSocket(sesion: number): void {
    const ws = new TransporteWebSocket(urlWebSocket(this.estado.direccion), this.deps.crearSocket);
    this.ws = ws;
    let abierto = false;
    const corte = this.programar(
      () => {
        if (!abierto) this.falloWebSocket(sesion, ws);
      },
      TIEMPOS.aperturaWs,
      sesion,
    );
    ws.iniciar({
      alAbrir: () => {
        if (this.ws !== ws) return;
        abierto = true;
        this.cancelar(corte);
        this.wsEnVivo = true;
        this.wsEstuvoEnVivo = true;
        this.intentosReconexion = 0;
        this.polling?.detener();
        this.polling = null;
        this.actualizar({ conexion: 'en_vivo_ws', error: null });
      },
      alMensaje: (datos) => {
        if (this.ws === ws) this.recibir(datos, sesion, 'en_vivo_ws');
      },
      alError: () => {},
      alCerrar: () => {
        if (this.ws !== ws) return;
        this.cancelar(corte);
        this.falloWebSocket(sesion, ws);
      },
    });
  }

  private falloWebSocket(sesion: number, ws: TransporteWebSocket): void {
    if (this.ws !== ws) return;
    ws.detener();
    this.ws = null;
    const veniaEnVivo = this.wsEnVivo;
    this.wsEnVivo = false;

    let espera: number;
    if (this.wsEstuvoEnVivo) {
      const esperas = TIEMPOS.esperasReconexion;
      espera = esperas[Math.min(this.intentosReconexion, esperas.length - 1)] ?? 10000;
      this.intentosReconexion += 1;
    } else {
      espera = TIEMPOS.reintentoWsDesdePolling;
    }

    if (veniaEnVivo) this.actualizar({ conexion: 'reconectando' });
    if (!this.polling) this.iniciarPolling(sesion);
    this.programar(() => this.intentarWebSocket(sesion), espera, sesion);
  }

  private iniciarPolling(sesion: number): void {
    const polling = new TransportePolling(this.estado.direccion, this.deps.fetch, TIEMPOS.pollingMs);
    this.polling = polling;
    polling.iniciar({
      alAbrir: () => {},
      alMensaje: (datos) => {
        if (this.polling !== polling || this.wsEnVivo) return;
        this.recibir(datos, sesion, 'en_vivo_polling');
      },
      alError: (error) => {
        if (this.polling !== polling || this.wsEnVivo) return;
        this.reportarError(error);
      },
      alCerrar: () => {},
    });
  }

  private reportarError(error: ErrorTransporte): void {
    const huboDatos = this.estado.telemetria !== null;
    if (error.tipo === 'sin_datos') {
      this.actualizar({ conexion: huboDatos ? 'reconectando' : 'conectando', error: MENSAJES.sinDatos });
      return;
    }
    this.actualizar({
      conexion: huboDatos ? 'reconectando' : 'sin_conexion',
      error: MENSAJES.sinRespuesta(hostDeDireccion(this.estado.direccion)),
    });
  }

  private recibir(datos: unknown, sesion: number, conexion: EstadoConexion): void {
    if (sesion !== this.sesion) return;
    const ahora = this.deps.ahora();
    const telemetria = adaptarTelemetria(datos, this.estado.info, ahora);
    if (this.estado.info && telemetria.modelo !== this.estado.info.modelo) {
      void this.pedirInfo(sesion);
    }
    this.actualizar({ telemetria, ultimoDatoEn: ahora, conexion, error: null });
  }
}
