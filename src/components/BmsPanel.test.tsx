// @vitest-environment jsdom
import { screen } from '@testing-library/react';
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
    expect(screen.getByText('Celdas (V) · diferencia máx. 0,029 V')).toBeInTheDocument();
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
    expect(screen.getByText('Celdas (V) · diferencia máx. 0,000 V')).toBeInTheDocument();
  });

  it('sin datos muestra —', () => {
    renderUi(<BmsPanel bateria={null} />);
    expect(screen.getByLabelText('Carga')).toHaveTextContent('—');
  });
});
