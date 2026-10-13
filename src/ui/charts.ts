import {
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
} from 'chart.js';
import { token } from './tokens';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

// Telemetry updates 10 times per second: animating it would only add lag.
Chart.defaults.animation = false;
Chart.defaults.font.family = "'Barlow', system-ui, sans-serif";

/** Vertical guide at the hovered x, so the tooltip value can be read against the line. */
export const crosshair: Plugin<'line'> = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const activos = chart.tooltip?.getActiveElements();
    const primero = activos?.[0];
    if (!primero) return;
    const { x } = primero.element;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = token('--c-divisor');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};
