import type { CSSProperties } from 'react';
import type { PuntoImu } from '../telemetry/history';
import type { Imu } from '../telemetry/model';
import { formatearNumero } from '../ui/format';
import { token, type Token } from '../ui/tokens';
import classes from './ImuPanel.module.css';
import { LineChart } from './LineChart';
import { Panel } from './Panel';

// Validated pair (spec §6.1): #1F5FBF / #B4540A. Values live in tokens.css.
const COLOR_ROLL: Token = '--c-senal';
const COLOR_PITCH: Token = '--c-serie-2';
const COLOR_YAW: Token = '--c-tinta-2';

export function ImuPanel({ imu, puntos }: { imu: Imu | null; puntos: readonly PuntoImu[] }) {
  const ultimoTs = puntos.at(-1)?.ts ?? 0;
  const primerTs = puntos[0]?.ts ?? ultimoTs;
  const ventana = Math.max(1, Math.ceil(ultimoTs - primerTs));
  const serie = (clave: 'roll' | 'pitch' | 'yaw') =>
    puntos.map((p) => ({ x: Number((p.ts - ultimoTs).toFixed(3)), y: p[clave] }));

  return (
    <Panel titulo="Inclinación (IMU)" detalle={puntos.length > 1 ? `últimos ${ventana} s` : undefined}>
      <div className={classes.valores}>
        {(['roll', 'pitch', 'yaw'] as const).map((clave) => {
          const nombre = clave[0]!.toUpperCase() + clave.slice(1);
          const valor = formatearNumero(imu?.[clave] ?? null, 1);
          return (
            <div key={clave} className={classes.valor}>
              {nombre}
              <b aria-label={nombre}>{valor === '—' ? valor : `${valor}°`}</b>
            </div>
          );
        })}
      </div>

      <ul className={classes.leyenda}>
        <li style={{ '--color': `var(${COLOR_ROLL})` } as CSSProperties}>Roll</li>
        <li style={{ '--color': `var(${COLOR_PITCH})` } as CSSProperties}>Pitch</li>
      </ul>
      <LineChart
        etiqueta="Gráfico de roll y pitch"
        alto={110}
        ventanaSegundos={ventana}
        ejeY={{ sugeridoMin: -5, sugeridoMax: 5, sufijo: '°' }}
        series={[
          { nombre: 'Roll', color: token(COLOR_ROLL), valores: serie('roll') },
          { nombre: 'Pitch', color: token(COLOR_PITCH), valores: serie('pitch') },
        ]}
      />

      <p className={classes.subtitulo}>Yaw (rumbo, con su propia escala)</p>
      <LineChart
        etiqueta="Gráfico de yaw"
        alto={70}
        ventanaSegundos={ventana}
        ejeY={{ sufijo: '°' }}
        series={[{ nombre: 'Yaw', color: token(COLOR_YAW), valores: serie('yaw') }]}
      />
    </Panel>
  );
}
