// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketFalso } from '../telemetry/__tests__/testDoubles';
import { MENSAJES } from '../telemetry/TelemetryClient';
import { renderUi } from '../test/render';
import { ErrorConexion } from './ErrorConexion';

describe('ErrorConexion', () => {
  beforeEach(() => SocketFalso.reiniciar());
  afterEach(() => vi.useRealTimers());

  it('no muestra nada sin error', () => {
    renderUi(<ErrorConexion />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('muestra el error y reintenta', async () => {
    const usuario = userEvent.setup();
    const { instancias } = renderUi(<ErrorConexion />);
    const reintentar = vi.spyOn(instancias.cliente, 'reintentar');
    act(() => instancias.cliente.conectar('http://10.0.0.5:8001'));
    await act(async () => {
      SocketFalso.ultimo().cortar();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(await screen.findByText(MENSAJES.sinRespuesta('10.0.0.5:8001'))).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reintentar).toHaveBeenCalled();
    instancias.cliente.desconectar();
  });
});
