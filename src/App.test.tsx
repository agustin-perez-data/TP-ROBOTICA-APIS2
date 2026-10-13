// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearInstancias } from './app/instancias';
import { App } from './App';
import { infoGo2, telemetriaGo2 } from './telemetry/__fixtures__/robots';
import { crearSocketFalso, fetchFalso, json, SocketFalso } from './telemetry/__tests__/testDoubles';
import { renderUi } from './test/render';

vi.mock('./components/LineChart', () => ({ LineChart: () => null }));

async function appConDatos() {
  const instancias = crearInstancias({
    fetch: fetchFalso({ '/info': () => json(infoGo2) }),
    crearSocket: crearSocketFalso,
  });
  renderUi(<App />, { instancias });
  await act(async () => {
    instancias.cliente.conectar('http://10.0.0.5:8001');
    await new Promise((r) => setTimeout(r, 0));
    SocketFalso.ultimo().abrir();
    SocketFalso.ultimo().enviar(telemetriaGo2);
  });
  return instancias;
}

describe('App', () => {
  beforeEach(() => SocketFalso.reiniciar());

  it('arma los cuatro paneles y la barra con el robot', async () => {
    await appConDatos();
    expect(screen.getByText('Unitree Go2 EDU')).toBeInTheDocument();
    expect(screen.getByText('cuadrúpedo · 12 motores')).toBeInTheDocument();
    for (const panel of ['Motores', 'Inclinación (IMU)', 'Batería', 'Patas']) {
      expect(screen.getByRole('region', { name: panel })).toBeInTheDocument();
    }
  });

  it('la tecla P alterna el modo presentación y Esc lo apaga', async () => {
    const usuario = userEvent.setup();
    await appConDatos();
    const raiz = screen.getByTestId('raiz');
    await usuario.keyboard('p');
    expect(raiz).toHaveAttribute('data-presentacion', 'true');
    expect(raiz.style.getPropertyValue('--escala')).toBe('1.45');
    expect(screen.queryByRole('columnheader', { name: 'Velocidad (rad/s)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cambiar dirección/ })).not.toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(raiz).toHaveAttribute('data-presentacion', 'false');
    expect(raiz.style.getPropertyValue('--escala')).toBe('1');
  });

  it('sin conexión todavía muestra que busca el robot', () => {
    renderUi(<App />);
    expect(screen.getByText('Buscando robot…')).toBeInTheDocument();
  });
});
