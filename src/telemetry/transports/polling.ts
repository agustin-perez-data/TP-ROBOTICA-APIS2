import type { ManejadoresTransporte, Transporte } from './transporte';

export class TransportePolling implements Transporte {
  private generacion = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private control: AbortController | null = null;
  private abierto = false;

  constructor(
    private readonly direccion: string,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
    private readonly intervaloMs = 250,
    private readonly timeoutMs = 2000,
  ) {}

  iniciar(m: ManejadoresTransporte): void {
    this.detener();
    this.abierto = false;
    void this.ciclo(m, this.generacion);
  }

  detener(): void {
    // Bumping the generation invalidates any request still in flight.
    this.generacion += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.control?.abort();
    this.control = null;
  }

  private async ciclo(m: ManejadoresTransporte, generacion: number): Promise<void> {
    const vigente = () => generacion === this.generacion;
    const control = new AbortController();
    this.control = control;
    const corte = setTimeout(() => control.abort(), this.timeoutMs);
    try {
      const r = await this.fetchFn(`${this.direccion}/telemetria`, {
        signal: control.signal,
        cache: 'no-store',
      });
      if (!vigente()) return;
      if (r.status === 503) {
        m.alError({ tipo: 'sin_datos', detalle: 'El backend todavía no recibió telemetría' });
      } else if (!r.ok) {
        m.alError({ tipo: 'http', detalle: `HTTP ${r.status}` });
      } else {
        const datos: unknown = await r.json();
        if (!vigente()) return;
        if (!this.abierto) {
          this.abierto = true;
          m.alAbrir();
        }
        m.alMensaje(datos);
      }
    } catch (error) {
      if (!vigente()) return;
      m.alError({ tipo: 'red', detalle: error instanceof Error ? error.message : String(error) });
    } finally {
      clearTimeout(corte);
    }
    if (vigente()) {
      this.timer = setTimeout(() => void this.ciclo(m, generacion), this.intervaloMs);
    }
  }
}
