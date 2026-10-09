// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { ImuPanel } from './ImuPanel';

// vi.mock is hoisted above the imports, so the shared array must be hoisted too.
const { lineas } = vi.hoisted(() => ({
  lineas: [] as Array<{ series: Array<{ nombre: string; valores: unknown[] }> }>,
}));
vi.mock('./LineChart', () => ({
  LineChart: (props: { series: Array<{ nombre: string; valores: unknown[] }>; etiqueta: string }) => {
    lineas.push(props);
    return <div role="img" aria-label={props.etiqueta} />;
  },
}));

const imu = { roll: 0, pitch: -2.07, yaw: 78.2, ax: 0, ay: 0, az: 9.81 };
const puntos = Array.from({ length: 5 }, (_, i) => ({ ts: 10 + i * 0.1, roll: 0, pitch: i, yaw: 78 }));

describe('ImuPanel', () => {
  it('muestra roll, pitch y yaw con un decimal', () => {
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(screen.getByLabelText('Roll')).toHaveTextContent('0,0°');
    expect(screen.getByLabelText('Pitch')).toHaveTextContent('−2,1°');
    expect(screen.getByLabelText('Yaw')).toHaveTextContent('78,2°');
  });

  it('separa yaw de roll y pitch en dos gráficos', () => {
    lineas.length = 0;
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(screen.getByRole('img', { name: 'Gráfico de roll y pitch' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gráfico de yaw' })).toBeInTheDocument();
    expect(lineas[0]?.series.map((s) => s.nombre)).toEqual(['Roll', 'Pitch']);
    expect(lineas[1]?.series.map((s) => s.nombre)).toEqual(['Yaw']);
  });

  it('pasa el tiempo relativo al último punto (0 = ahora)', () => {
    lineas.length = 0;
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    const xs = (lineas[0]?.series[0]?.valores as Array<{ x: number }>).map((v) => v.x);
    expect(xs.at(-1)).toBe(0);
    expect(xs[0]).toBeCloseTo(-0.4);
  });

  it('tiene leyenda visible para roll y pitch', () => {
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(screen.getByText('Roll', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByText('Pitch', { selector: 'li' })).toBeInTheDocument();
  });

  it('sin datos muestra —', () => {
    renderUi(<ImuPanel imu={null} puntos={[]} />);
    expect(screen.getByLabelText('Roll')).toHaveTextContent('—');
  });
});
