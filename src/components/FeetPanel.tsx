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

/** Short label shared by the diagram and the summary: "L_foot" → "L". */
export function etiquetaPata(nombre: string): string {
  return nombre.replace('_foot', '');
}

export function resumenPatas(patas: Record<string, Contacto>): string {
  const nombres = Object.keys(patas);
  const apoyadas = nombres.filter((n) => patas[n] === 'apoyada').length;
  const enElAire = nombres.filter((n) => patas[n] === 'en_el_aire').map(etiquetaPata);
  const sinDato = nombres.filter((n) => patas[n] === 'desconocido').map(etiquetaPata);
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
        <rect className={classes.cuerpo} x="50" y="30" width="60" height="110" rx="14" />
        <text className={classes.frente} x="80" y="20" textAnchor="middle" fontSize="11">
          frente
        </text>
        {nombres.map((nombre, i) => {
          const [cx, cy] = posicion(nombre, i);
          const estado = patas[nombre] ?? 'desconocido';
          const etiqueta = etiquetaPata(nombre);
          return (
            <g
              key={nombre}
              className={classes.pata}
              data-estado={estado}
              role="img"
              aria-label={`${etiqueta}: ${TEXTO[estado]}`}
            >
              <circle
                cx={cx}
                cy={cy}
                r="17"
                strokeWidth="2"
                strokeDasharray={estado === 'en_el_aire' ? '4 3' : undefined}
              />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="700">
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
