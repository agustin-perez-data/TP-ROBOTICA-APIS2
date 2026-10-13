import { createContext, useContext, type ReactNode } from 'react';
import type { Instancias } from './instancias';

const InstanciasContext = createContext<Instancias | null>(null);

export function InstanciasProvider({
  instancias,
  children,
}: {
  instancias: Instancias;
  children: ReactNode;
}) {
  return <InstanciasContext.Provider value={instancias}>{children}</InstanciasContext.Provider>;
}

export function useInstancias(): Instancias {
  const instancias = useContext(InstanciasContext);
  if (!instancias) throw new Error('useInstancias se usa dentro de InstanciasProvider');
  return instancias;
}
