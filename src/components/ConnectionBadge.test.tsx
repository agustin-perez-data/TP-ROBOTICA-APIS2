// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { ConnectionBadge } from './ConnectionBadge';

describe('ConnectionBadge', () => {
  it.each([
    ['conectando', 'Conectando'],
    ['en_vivo_ws', 'En vivo · WebSocket'],
    ['en_vivo_polling', 'En vivo · Polling'],
    ['reconectando', 'Reconectando'],
    ['sin_conexion', 'Sin conexión'],
  ] as const)('%s se lee como "%s"', (conexion, texto) => {
    renderUi(<ConnectionBadge conexion={conexion} antiguedadMs={0} />);
    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  it('avisa hace cuánto llegó el último dato si pasaron más de 2 s', () => {
    renderUi(<ConnectionBadge conexion="en_vivo_ws" antiguedadMs={5400} />);
    expect(screen.getByText('último dato hace 5 s')).toBeInTheDocument();
  });

  it('anuncia el estado pero no la antigüedad, que cambia cada medio segundo', () => {
    renderUi(<ConnectionBadge conexion="reconectando" antiguedadMs={5400} />);
    const vivo = screen.getByRole('status');
    expect(vivo).toHaveTextContent('Reconectando');
    expect(vivo).not.toHaveTextContent(/último dato/);
    expect(screen.getByText('último dato hace 5 s').closest('[role="status"], [aria-live]')).toBeNull();
  });

  it('no muestra la antigüedad con datos frescos', () => {
    renderUi(<ConnectionBadge conexion="en_vivo_ws" antiguedadMs={1500} />);
    expect(screen.queryByText(/último dato/)).not.toBeInTheDocument();
  });
});
