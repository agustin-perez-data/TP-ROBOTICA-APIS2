import type { ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { crosshair } from '../ui/charts';
import { formatearNumero } from '../ui/format';
import { acotarEje, decimalesDelPaso, type PuntoSerie } from '../ui/series';
import { token } from '../ui/tokens';

export interface SerieLinea {
  nombre: string;
  color: string;
  valores: PuntoSerie[];
}

const FUENTE_TICKS_PX = 12;
const FUENTE_TOOLTIP_PX = 13;

export function LineChart({
  series,
  alto,
  escala = 1,
  ventanaSegundos,
  ejeY,
  etiqueta,
}: {
  series: SerieLinea[];
  /** Height in px at normal size; multiplied by `escala`. */
  alto: number;
  /** Presentation-mode factor for height and text (canvas text cannot read --escala). */
  escala?: number;
  ventanaSegundos: number;
  ejeY: {
    sugeridoMin?: number;
    sugeridoMax?: number;
    /** Valid range of the quantity; the axis never shows values outside it. */
    dominio?: readonly [number, number];
    /** Fixed tick step (e.g. 90° for a heading). */
    paso?: number;
    sufijo: string;
  };
  etiqueta: string;
}) {
  const { sugeridoMin, sugeridoMax, dominio, sufijo, paso: pasoFijo } = ejeY;
  const opciones = useMemo<ChartOptions<'line'>>(() => {
    const fuente = (px: number) => ({ size: Math.round(px * escala) });
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      interaction: { mode: 'index', intersect: false },
      elements: {
        point: { radius: 0, hoverRadius: 4, pointStyle: 'line' },
        line: { borderWidth: 2, tension: 0 },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: token('--c-tinta'),
          titleColor: token('--c-barra-tenue'),
          bodyColor: token('--c-barra-texto'),
          titleFont: { ...fuente(FUENTE_TOOLTIP_PX - 1), weight: 500 },
          bodyFont: { ...fuente(FUENTE_TOOLTIP_PX), weight: 600 },
          // Line keys instead of filled boxes; value first, series name after it.
          usePointStyle: true,
          // The point-style key is a line as long as min(boxWidth, boxHeight).
          boxWidth: 14,
          boxHeight: 14,
          filter: (item) => item.parsed.y !== null,
          callbacks: {
            title: (items) => `${formatearNumero(items[0]?.parsed.x ?? null, 1)} s`,
            label: (item) => `${formatearNumero(item.parsed.y, 2)}${sufijo}  ${item.dataset.label}`,
            labelPointStyle: () => ({ pointStyle: 'line', rotation: 0 }),
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: -ventanaSegundos,
          max: 0,
          grid: { display: false },
          // Fixed window and step: even ticks (−12, −9, −6, −3, 0 s) that do not shift.
          ticks: {
            color: token('--c-apagado'),
            font: fuente(FUENTE_TICKS_PX),
            stepSize: ventanaSegundos / 4,
            callback: (v) => `${formatearNumero(Number(v), 0)} s`,
          },
        },
        y: {
          suggestedMin: sugeridoMin,
          suggestedMax: sugeridoMax,
          grid: { color: token('--c-borde-suave') },
          border: { display: false },
          afterBuildTicks: dominio ? (eje) => acotarEje(eje, dominio) : undefined,
          ticks: {
            color: token('--c-apagado'),
            font: fuente(FUENTE_TICKS_PX),
            maxTicksLimit: 5,
            stepSize: pasoFijo,
            callback: (v, _i, ticks) => {
              const paso = ticks.length > 1 ? Math.abs(ticks[1]!.value - ticks[0]!.value) : 1;
              return `${formatearNumero(Number(v), decimalesDelPaso(paso))}${sufijo}`;
            },
          },
        },
      },
    };
  }, [dominio, escala, pasoFijo, sufijo, sugeridoMax, sugeridoMin, ventanaSegundos]);

  const datos = {
    datasets: series.map((s) => ({
      label: s.nombre,
      data: s.valores,
      borderColor: s.color,
      backgroundColor: s.color,
      spanGaps: false,
    })),
  };

  return (
    <div style={{ height: alto * escala, position: 'relative' }} role="img" aria-label={etiqueta}>
      <Line data={datos} options={opciones} plugins={[crosshair]} />
    </div>
  );
}
