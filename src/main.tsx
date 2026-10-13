import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@mantine/core/styles.css';
import './ui/tokens.css';
import { MantineProvider } from '@mantine/core';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { crearInstancias } from './app/instancias';
import { InstanciasProvider } from './app/InstanciasContext';
import type { DependenciasCliente } from './telemetry/TelemetryClient';
import { direccionInicial } from './telemetry/serverAddress';
import { theme } from './ui/theme';

async function arrancar() {
  let deps: Partial<DependenciasCliente> | undefined;
  let selector: ReactNode = null;
  if (import.meta.env.DEV) {
    const dev = await import('./dev/fuenteFicticia');
    deps = dev.dependenciasDesdeUrl(window.location.search);
    const { SelectorDatos } = await import('./dev/SelectorDatos');
    selector = <SelectorDatos />;
  }

  const instancias = crearInstancias(deps);
  let almacenamiento: Storage | null;
  try {
    almacenamiento = window.localStorage;
  } catch {
    almacenamiento = null;
  }
  instancias.cliente.conectar(direccionInicial(window.location.search, almacenamiento));

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MantineProvider theme={theme} forceColorScheme="light">
        <InstanciasProvider instancias={instancias}>
          <App />
          {selector}
        </InstanciasProvider>
      </MantineProvider>
    </StrictMode>,
  );
}

void arrancar();
