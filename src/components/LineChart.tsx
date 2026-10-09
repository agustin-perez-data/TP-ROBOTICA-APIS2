import type { ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { crosshair } from '../ui/charts';
import { formatearNumero } from '../ui/format';

export interface SerieLinea {
  nombre: string;
  color: string;
  valores: Array<{ x: number; y: number | null }>;
}

export function LineChart({
  series,
  alto,
  ventanaSegundos,
  ejeY,
  etiqueta,
}: {
  series: SerieLinea[];
  alto: number;
  ventanaSegundos: number;
  ejeY: { sugeridoMin?: number; sugeridoMax?: number; sufijo: string };
  etiqueta: string;
}) {
  const opciones = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      interaction: { mode: 'index', intersect: false },
      elements: { point: { radius: 0, hoverRadius: 4 }, line: { borderWidth: 2, tension: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `${formatearNumero(items[0]?.parsed.x ?? null, 1)} s`,
            label: (item) =>
              `${item.dataset.label}: ${formatearNumero(item.parsed.y, 2)}${ejeY.sufijo}`,
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: -ventanaSegundos,
          max: 0,
          grid: { display: false },
          ticks: { callback: (v) => `${formatearNumero(Number(v), 0)} s`, maxTicksLimit: 5 },
        },
        y: {
          suggestedMin: ejeY.sugeridoMin,
          suggestedMax: ejeY.sugeridoMax,
          grid: { color: '#e4e7eb' },
          border: { display: false },
          ticks: { callback: (v) => `${formatearNumero(Number(v), 0)}${ejeY.sufijo}`, maxTicksLimit: 5 },
        },
      },
    }),
    [ejeY.sufijo, ejeY.sugeridoMax, ejeY.sugeridoMin, ventanaSegundos],
  );

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
    <div style={{ height: alto, position: 'relative' }} role="img" aria-label={etiqueta}>
      <Line data={datos} options={opciones} plugins={[crosshair]} />
    </div>
  );
}
