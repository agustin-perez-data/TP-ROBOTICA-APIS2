// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { TemperaturaBadge } from './TemperaturaBadge';

describe('TemperaturaBadge', () => {
  it.each([
    [39, 'normal', '● 39,0 °C', 'Temperatura normal: 39,0 °C'],
    [40, 'elevada', '▲ 40,0 °C', 'Temperatura elevada: 40,0 °C'],
    [59, 'elevada', '▲ 59,0 °C', 'Temperatura elevada: 59,0 °C'],
    [60, 'critica', '■ 60,0 °C', 'Temperatura crítica: 60,0 °C'],
  ] as const)('%s °C → %s, siempre con un decimal', (t, estado, texto, etiqueta) => {
    renderUi(<TemperaturaBadge temperatura={t} />);
    const badge = screen.getByLabelText(etiqueta);
    expect(badge).toHaveAttribute('data-estado', estado);
    expect(badge).toHaveTextContent(texto);
  });

  it('con decimales no redondea a un número que contradiga el color', () => {
    renderUi(<TemperaturaBadge temperatura={59.9} />);
    const badge = screen.getByLabelText('Temperatura elevada: 59,9 °C');
    expect(badge).toHaveTextContent('▲ 59,9 °C');
  });

  it('trunca en vez de redondear: 59,95 no se lee como 60,0', () => {
    renderUi(<TemperaturaBadge temperatura={59.95} />);
    expect(screen.getByLabelText('Temperatura elevada: 59,9 °C')).toHaveTextContent('▲ 59,9 °C');
  });

  it('sin dato muestra —', () => {
    renderUi(<TemperaturaBadge temperatura={null} />);
    expect(screen.getByLabelText('Temperatura sin dato')).toHaveTextContent('—');
  });
});
