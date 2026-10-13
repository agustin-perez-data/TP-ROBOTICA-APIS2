// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { BmsPanel } from './BmsPanel';

const completa = {
  soc: 92,
  corrienteMa: 1446,
  temperatura: 31.6,
  celdas: [3.718, 3.724, 3.718, 3.703, 3.695, 3.7, 3.714, 3.724],
  disponible: true,
};

describe('BmsPanel', () => {
  it('muestra carga, corriente, temperatura y celdas', () => {
    renderUi(<BmsPanel bateria={completa} />);
    expect(screen.getByLabelText('Carga')).toHaveTextContent('92 %');
    expect(screen.getByRole('meter', { name: 'Carga de la batería' })).toHaveAttribute('aria-valuenow', '92');
    expect(screen.getByText('Corriente').nextSibling).toHaveTextContent('1.446 mA');
    expect(screen.getByText('Temperatura').nextSibling).toHaveTextContent('31,6 °C');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('etiqueta solo la celda mínima y la máxima, y explicita la escala', () => {
    renderUi(<BmsPanel bateria={completa} />);
    expect(screen.getByText('Mín. 3,695 V · celda 5')).toBeInTheDocument();
    expect(screen.getByText('Máx. 3,724 V · celdas 2 y 8')).toBeInTheDocument();
    expect(screen.getByText('Escala 3,695–3,724 V')).toBeInTheDocument();
    expect(screen.getByText('Diferencia máx. 0,029 V')).toBeInTheDocument();
    // No per-bar number: 16 of them do not fit and were clipped into wrong values.
    expect(screen.queryByText('3,718')).not.toBeInTheDocument();
  });

  it('cada barra lleva su voltaje exacto y la mínima se resalta', () => {
    renderUi(<BmsPanel bateria={completa} />);
    const minima = screen.getByRole('listitem', { name: 'Celda 5: 3,695 V' });
    expect(minima).toHaveAttribute('data-minima', 'true');
    expect(screen.getByRole('listitem', { name: 'Celda 1: 3,718 V' })).not.toHaveAttribute('data-minima');
  });

  it('al pasar el mouse por una barra muestra su voltaje', async () => {
    const usuario = userEvent.setup();
    renderUi(<BmsPanel bateria={completa} />);
    await usuario.hover(screen.getByRole('listitem', { name: 'Celda 4: 3,703 V' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('3,703 V · celda 4');
  });

  it('muestra la corriente negativa con signo', () => {
    renderUi(<BmsPanel bateria={{ ...completa, corrienteMa: -800 }} />);
    expect(screen.getByText('Corriente').nextSibling).toHaveTextContent('−800 mA');
  });

  it('en modo simulador explica que solo hay carga', () => {
    renderUi(
      <BmsPanel bateria={{ soc: 87, corrienteMa: 0, temperatura: 0, celdas: [], disponible: false }} />,
    );
    expect(screen.getByLabelText('Carga')).toHaveTextContent('87 %');
    expect(screen.getByText('En este modo el backend solo informa la carga.')).toBeInTheDocument();
    expect(screen.queryByText('Corriente')).not.toBeInTheDocument();
  });

  it('con 16 celdas las dibuja todas', () => {
    renderUi(<BmsPanel bateria={{ ...completa, celdas: Array.from({ length: 16 }, () => 3.7) }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(16);
    expect(screen.getByText('Todas las celdas en 3,700 V')).toBeInTheDocument();
    expect(screen.queryByText(/^Mín\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Escala/)).not.toBeInTheDocument();
  });

  it('con 16 celdas distintas nombra todas las que empatan en la mínima', () => {
    const celdas = Array.from({ length: 16 }, (_, i) => 3.2 + (i % 5) * 0.12);
    renderUi(<BmsPanel bateria={{ ...completa, celdas }} />);
    expect(screen.getByText('Mín. 3,200 V · celdas 1, 6, 11 y 16')).toBeInTheDocument();
    expect(screen.getByText('Máx. 3,680 V · celdas 5, 10 y 15')).toBeInTheDocument();
    expect(screen.getByText('Escala 3,200–3,680 V')).toBeInTheDocument();
  });

  it('sin datos muestra —', () => {
    renderUi(<BmsPanel bateria={null} />);
    expect(screen.getByLabelText('Carga')).toHaveTextContent('—');
  });
});
