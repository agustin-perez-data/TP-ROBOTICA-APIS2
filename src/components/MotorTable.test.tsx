// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { renderUi } from '../test/render';
import { MotorTable } from './MotorTable';

const go2 = adaptarTelemetria(telemetriaGo2, adaptarInfo(infoGo2), 0).motores;

describe('MotorTable', () => {
  it('muestra una fila por motor con las columnas de la consigna', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad />);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getAllByRole('row')).toHaveLength(1 + 12);
    for (const titulo of ['Motor', 'Ángulo (°)', 'Velocidad (rad/s)', 'Torque (Nm)', 'Temperatura']) {
      expect(within(tabla).getByRole('columnheader', { name: titulo })).toBeInTheDocument();
    }
    const primera = within(tabla).getAllByRole('row')[1]!;
    expect(primera).toHaveTextContent('FR_hip');
    expect(primera).toHaveTextContent('−27,70');
    expect(primera).toHaveTextContent('−0,321');
    expect(primera).toHaveTextContent('4,98');
  });

  it('marca el fin de cada grupo de 3', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad />);
    const filas = screen.getAllByRole('row').slice(1);
    expect(filas[2]).toHaveAttribute('data-fin-grupo', 'true');
    expect(filas[3]).not.toHaveAttribute('data-fin-grupo');
  });

  it('avisa los motores en estado crítico', () => {
    const calientes = go2.map((m, i) => (i === 9 || i === 2 ? { ...m, temperatura: 63 } : m));
    renderUi(<MotorTable motores={calientes} tamanoGrupo={3} mostrarVelocidad />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '■ Temperatura crítica (60 °C o más): FR_calf, RL_hip',
    );
  });

  it('no muestra alerta sin motores críticos', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reserva el lugar de la alerta para que la tabla no salte', () => {
    const calientes = go2.map((m, i) => (i === 1 ? { ...m, temperatura: 60 } : m));
    // Plain render (no providers needed) so rerender updates the same tree instead of remounting.
    const { rerender } = render(<MotorTable motores={calientes} tamanoGrupo={3} mostrarVelocidad />);
    const hueco = screen.getByTestId('hueco-alerta');
    expect(hueco).toContainElement(screen.getByRole('alert'));
    expect(hueco.nextElementSibling).toContainElement(screen.getByRole('table'));

    const tibios = go2.map((m, i) => (i === 1 ? { ...m, temperatura: 59.9 } : m));
    rerender(<MotorTable motores={tibios} tamanoGrupo={3} mostrarVelocidad />);
    // Same slot, still in place before the table, now empty: nothing is announced.
    expect(screen.getByTestId('hueco-alerta')).toBe(hueco);
    expect(hueco).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('puede ocultar la velocidad (modo presentación)', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad={false} />);
    expect(screen.queryByRole('columnheader', { name: 'Velocidad (rad/s)' })).not.toBeInTheDocument();
  });

  it('muestra los 29 motores del G1', () => {
    const g1 = adaptarTelemetria(telemetriaG1(), adaptarInfo(infoG1), 0).motores;
    renderUi(<MotorTable motores={g1} tamanoGrupo={0} mostrarVelocidad />);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 29);
  });

  it('marca cuando quedan filas ocultas abajo del scroll', () => {
    const g1 = adaptarTelemetria(telemetriaG1(), adaptarInfo(infoG1), 0).motores;
    renderUi(<MotorTable motores={g1} tamanoGrupo={0} mostrarVelocidad />);
    const contenedor = screen.getByRole('table').parentElement!;
    Object.defineProperty(contenedor, 'scrollHeight', { configurable: true, value: 900 });
    Object.defineProperty(contenedor, 'clientHeight', { configurable: true, value: 400 });
    fireEvent.scroll(contenedor);
    expect(contenedor).toHaveAttribute('data-hay-mas', 'true');
    contenedor.scrollTop = 500;
    fireEvent.scroll(contenedor);
    expect(contenedor).toHaveAttribute('data-hay-mas', 'false');
  });

  it('sin motores explica que espera datos', () => {
    renderUi(<MotorTable motores={[]} tamanoGrupo={3} mostrarVelocidad />);
    expect(screen.getByText('Esperando datos de los motores.')).toBeInTheDocument();
  });
});
