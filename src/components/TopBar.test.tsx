// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearInstancias } from '../app/instancias';
import { infoGo2, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { crearSocketFalso, fetchFalso, json, SocketFalso } from '../telemetry/__tests__/testDoubles';
import { renderUi } from '../test/render';
import { TopBar } from './TopBar';

async function conInfo(info: typeof infoGo2) {
  const instancias = crearInstancias({
    fetch: fetchFalso({ '/info': () => json(info) }),
    crearSocket: crearSocketFalso,
  });
  renderUi(<TopBar presentacion={false} onAlternarPresentacion={() => {}} />, { instancias });
  await act(async () => {
    instancias.cliente.conectar('http://x:8001');
    await new Promise((r) => setTimeout(r, 0));
    SocketFalso.ultimo().abrir();
    SocketFalso.ultimo().enviar(telemetriaGo2);
  });
}

describe('TopBar', () => {
  beforeEach(() => SocketFalso.reiniciar());

  it('el nombre del robot es el encabezado principal y conserva el texto completo', async () => {
    await conInfo(infoGo2);
    const titulo = screen.getByRole('heading', { level: 1 });
    expect(titulo).toHaveTextContent('Unitree Go2 EDU');
    expect(titulo).toHaveAttribute('title', 'Unitree Go2 EDU · cuadrúpedo · 12 motores');
  });

  it('con un solo motor usa el singular', async () => {
    await conInfo({ ...infoGo2, n_motores: 1, motores_nombres: ['FR_hip'] });
    expect(screen.getByText('cuadrúpedo · 1 motor')).toBeInTheDocument();
  });
});
