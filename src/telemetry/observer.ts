export type Oyente<T> = (valor: T) => void;

/** Base of the Observer pattern: subscribers are notified on every emitted value. */
export class Emisor<T> {
  private readonly oyentes = new Set<Oyente<T>>();

  subscribe = (oyente: Oyente<T>): (() => void) => {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  };

  protected emitir(valor: T): void {
    for (const oyente of [...this.oyentes]) oyente(valor);
  }
}
