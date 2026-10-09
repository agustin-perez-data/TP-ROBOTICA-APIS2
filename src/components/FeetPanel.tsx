import type { Contacto } from '../telemetry/model';
import classes from './FeetPanel.module.css';
import { Panel } from './Panel';

// Top view: front is up. Known names get their real position; anything else goes in a row.
const POSICIONES: Record<string, [number, number]> = {
  FL: [30, 45],
  FR: [130, 45],
  RL: [30, 125],
  RR: [130, 125],
  L_foot: [52, 135],
  R_foot: [108, 135],
};

const TEXTO: Record<Contacto, string> = {
  apoyada: 'apoyada',
  en_el_aire: 'en el aire',
  desconocido: 'sin dato',
};

export function resumenPatas(patas: Record<string, Contacto>): string {
  const nombres = Object.keys(patas);
  const apoyadas = nombres.filter((n) => patas[n] === 'apoyada').length;
  const enElAire = nombres.filter((n) => patas[n] === 'en_el_aire');
  const sinDato = nombres.filter((n) => patas[n] === 'desconocido');
  const partes = [`${apoyadas} ${apoyadas === 1 ? 'apoyada' : 'apoyadas'}`];
  if (enElAire.length) partes.push(`${enElAire.join(', ')} en el aire`);
  if (sinDato.length) partes.push(`${sinDato.join(', ')} sin dato`);
  return partes.join(' · ');
}

export function FeetPanel({
  patas,
  nombres,
}: {
  patas: Record<string, Contacto>;
  nombres: string[];
}) {
  if (nombres.length === 0) {
    return (
      <Panel titulo="Patas">
        <p className={classes.vacio}>Este robot no informa el contacto de las patas.</p>
      </Panel>
    );
  }

  const todasConocidas = nombres.every((n) => n in POSICIONES);
  const posicion = (nombre: string, i: number): [number, number] =>
    todasConocidas ? POSICIONES[nombre]! : [20 + (i * 120) / Math.max(1, nombres.length - 1), 85];

  return (
    <Panel titulo="Patas">
      <svg className={classes.vista} viewBox="0 0 160 170" role="group" aria-label="Robot visto desde arriba">
        <rect x="50" y="30" width="60" height="110" rx="14" fill="#e4e7eb" stroke="#9aa5b1" />
        <text x="80" y="20" textAnchor="middle" fontSize="11" fill="#7b8794">
          frente
        </text>
        {nombres.map((nombre, i) => {
          const [cx, cy] = posicion(nombre, i);
          const estado = patas[nombre] ?? 'desconocido';
          const apoyada = estado === 'apoyada';
          const etiqueta = nombre.replace('_foot', '');
          return (
            <g key={nombre} role="img" aria-label={`${nombre}: ${TEXTO[estado]}`}>
              <circle
                cx={cx}
                cy={cy}
                r="17"
                fill={apoyada ? '#1f5fbf' : '#ffffff'}
                stroke={apoyada ? '#1f5fbf' : '#9aa5b1'}
                strokeWidth="2"
                strokeDasharray={estado === 'en_el_aire' ? '4 3' : undefined}
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={apoyada ? '#ffffff' : '#7b8794'}
              >
                {estado === 'desconocido' ? '?' : etiqueta}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={classes.pie}>{resumenPatas(patas)}</div>
    </Panel>
  );
}
