import { describe, expect, it, vi } from 'vitest';
import { Emisor } from './observer';

class Contador extends Emisor<number> {
  avisar(n: number) {
    this.emitir(n);
  }
}

describe('Emisor', () => {
  it('avisa a cada suscriptor y deja de avisar al desuscribirse', () => {
    const contador = new Contador();
    const a = vi.fn();
    const b = vi.fn();
    const soltarA = contador.subscribe(a);
    contador.subscribe(b);

    contador.avisar(1);
    soltarA();
    contador.avisar(2);

    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenLastCalledWith(2);
  });
});
