import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { crearInstancias, type Instancias } from '../app/instancias';
import { InstanciasProvider } from '../app/InstanciasContext';
import { crearSocketFalso, fetchFalso } from '../telemetry/__tests__/testDoubles';
import { theme } from '../ui/theme';

export function renderUi(ui: ReactElement, opciones: { instancias?: Instancias } = {}) {
  const instancias =
    opciones.instancias ?? crearInstancias({ fetch: fetchFalso({}), crearSocket: crearSocketFalso });
  const resultado = render(
    <MantineProvider theme={theme} forceColorScheme="light">
      <InstanciasProvider instancias={instancias}>{ui}</InstanciasProvider>
    </MantineProvider>,
  );
  return { ...resultado, instancias };
}
