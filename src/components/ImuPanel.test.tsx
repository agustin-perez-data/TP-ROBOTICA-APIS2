// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { ImuPanel } from './ImuPanel';

// vi.mock is hoisted above the imports, so the shared array must be hoisted too.
interface PropsLinea {
  series: Array<{ nombre: string; valores: unknown[] }>;
  etiqueta: string;
  ventanaSegundos: number;
  escala?: number;
  ejeY: { dominio?: readonly [number, number]; paso?: number };
}
const { lineas } = vi.hoisted(() => ({ lineas: [] as PropsLinea[] }));
vi.mock('./LineChart', () => ({
  LineChart: (props: PropsLinea) => {
    lineas.push(props);
    return <div role="img" aria-label={props.etiqueta} />;
  },
}));

const imu = { roll: 0, pitch: -2.07, yaw: 78.2, ax: 0, ay: 0, az: 9.81 };
const puntos = Array.from({ length: 5 }, (_, i) => ({
  ts: 10 + i * 0.1,
  roll: 0,
  pitch: i,
  yaw: 78,
}));

/** The value paired with a term of the roll/pitch/yaw description list. */
const valor = (nombre: string) => screen.getByText(nombre, { selector: 'dt' }).nextElementSibling;

describe('ImuPanel', () => {
  it('muestra roll, pitch y yaw con un decimal', () => {
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(valor('Roll')).toHaveTextContent('0,0°');
    expect(valor('Pitch')).toHaveTextContent('−2,1°');
    expect(valor('Yaw')).toHaveTextContent('78,2°');
    expect(valor('Yaw')).toHaveRole('definition');
  });

  it('usa una ventana fija de 12 s aunque el historial sea más corto', () => {
    lineas.length = 0;
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(screen.getByText('últimos 12 s')).toBeInTheDocument();
    expect(lineas.map((l) => l.ventanaSegundos)).toEqual([12, 12]);
  });

  it('corta el yaw al cruzar ±180° y lo limita a −180–180°', () => {
    lineas.length = 0;
    const vuelta = [178, 179.5, -179.5].map((yaw, i) => ({
      ts: 10 + i * 0.1,
      roll: 0,
      pitch: 0,
      yaw,
    }));
    renderUi(<ImuPanel imu={imu} puntos={vuelta} />);
    const yaw = lineas[1]!;
    expect((yaw.series[0]!.valores as Array<{ y: number | null }>).map((p) => p.y)).toEqual([
      178,
      179.5,
      null,
      -179.5,
    ]);
    expect(yaw.ejeY.dominio).toEqual([-180, 180]);
  });

  it('agranda los gráficos en modo presentación', () => {
    lineas.length = 0;
    renderUi(<ImuPanel imu={imu} puntos={puntos} escala={1.45} />);
    expect(lineas.map((l) => l.escala)).toEqual([1.45, 1.45]);
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
    expect(valor('Roll')).toHaveTextContent('—');
  });
});
