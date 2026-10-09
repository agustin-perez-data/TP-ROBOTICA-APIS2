// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { ServerAddress } from './ServerAddress';

describe('ServerAddress', () => {
  beforeEach(() => localStorage.clear());

  it('muestra la dirección actual sin el esquema', () => {
    const { instancias } = renderUi(<ServerAddress />);
    act(() => instancias.cliente.conectar('http://10.0.0.5:8001'));
    expect(screen.getByRole('button', { name: /Cambiar dirección/ })).toHaveTextContent('10.0.0.5:8001');
  });

  it('rechaza una dirección inválida con un mensaje', async () => {
    const usuario = userEvent.setup();
    renderUi(<ServerAddress />);
    await usuario.click(screen.getByRole('button', { name: /Cambiar dirección/ }));
    const campo = screen.getByLabelText('Dirección del backend');
    await usuario.clear(campo);
    await usuario.type(campo, 'http://10.0.0.5:8001/docs');
    await usuario.click(screen.getByRole('button', { name: 'Conectar' }));
    expect(screen.getByText('Escribí una dirección como 10.0.0.5:8001')).toBeInTheDocument();
  });

  it('normaliza, guarda y reconecta', async () => {
    const usuario = userEvent.setup();
    const { instancias } = renderUi(<ServerAddress />);
    const conectar = vi.spyOn(instancias.cliente, 'conectar');
    await usuario.click(screen.getByRole('button', { name: /Cambiar dirección/ }));
    const campo = screen.getByLabelText('Dirección del backend');
    await usuario.clear(campo);
    await usuario.type(campo, '10.0.0.7{Enter}');
    expect(conectar).toHaveBeenCalledWith('http://10.0.0.7:8001');
    expect(localStorage.getItem('robotica-dashboard.direccion')).toBe('http://10.0.0.7:8001');
    expect(screen.queryByLabelText('Dirección del backend')).not.toBeInTheDocument();
  });

  it('Esc cancela la edición', async () => {
    const usuario = userEvent.setup();
    renderUi(<ServerAddress />);
    await usuario.click(screen.getByRole('button', { name: /Cambiar dirección/ }));
    await usuario.keyboard('{Escape}');
    expect(screen.queryByLabelText('Dirección del backend')).not.toBeInTheDocument();
  });
});
