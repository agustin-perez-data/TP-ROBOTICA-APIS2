// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { TemperaturaBadge } from './TemperaturaBadge';

describe('TemperaturaBadge', () => {
  it.each([
    [39, 'normal', '●', 'Temperatura normal: 39 °C'],
    [40, 'elevada', '▲', 'Temperatura elevada: 40 °C'],
    [59, 'elevada', '▲', 'Temperatura elevada: 59 °C'],
    [60, 'critica', '■', 'Temperatura crítica: 60 °C'],
  ] as const)('%s °C → %s', (t, estado, icono, etiqueta) => {
    renderUi(<TemperaturaBadge temperatura={t} />);
    const badge = screen.getByLabelText(etiqueta);
    expect(badge).toHaveAttribute('data-estado', estado);
    expect(badge).toHaveTextContent(`${icono} ${t} °C`);
  });

  it('con decimales no redondea a un número que contradiga el color', () => {
    renderUi(<TemperaturaBadge temperatura={59.9} />);
    const badge = screen.getByLabelText('Temperatura elevada: 59,9 °C');
    expect(badge).toHaveTextContent('▲ 59,9 °C');
  });

  it('sin dato muestra —', () => {
    renderUi(<TemperaturaBadge temperatura={null} />);
    expect(screen.getByLabelText('Temperatura sin dato')).toHaveTextContent('—');
  });
});
