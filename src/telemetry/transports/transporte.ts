export type TipoError = 'red' | 'sin_datos' | 'http';

export interface ErrorTransporte {
  tipo: TipoError;
  detalle: string;
}

export interface ManejadoresTransporte {
  alAbrir(): void;
  alMensaje(datos: unknown): void;
  alError(error: ErrorTransporte): void;
  alCerrar(): void;
}

/** A way of receiving telemetry. The client switches between implementations. */
export interface Transporte {
  iniciar(manejadores: ManejadoresTransporte): void;
  detener(): void;
}
