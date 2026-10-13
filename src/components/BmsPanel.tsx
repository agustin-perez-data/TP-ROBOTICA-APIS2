import { Tooltip } from '@mantine/core';
import type { Bateria } from '../telemetry/model';
import { formatearNumero } from '../ui/format';
import classes from './BmsPanel.module.css';
import { Panel } from './Panel';

/** "celda 3" or "celdas 1, 6 y 11" (1-based). */
function nombrarCeldas(indices: number[]): string {
  const numeros = indices.map((i) => String(i + 1));
  if (numeros.length === 1) return `celda ${numeros[0]}`;
  return `celdas ${numeros.slice(0, -1).join(', ')} y ${numeros.at(-1)}`;
}

function indicesCon(celdas: number[], valor: number): number[] {
  return celdas.flatMap((v, i) => (v === valor ? [i] : []));
}

function Celdas({ celdas }: { celdas: number[] }) {
  const min = Math.min(...celdas);
  const max = Math.max(...celdas);
  const rango = max - min;
  const parejas = rango === 0;
  // Scaled to the observed range so the weakest cell stands out; 15 % floor keeps bars visible.
  // The caption states that range, so millivolt differences are not mistaken for a fault.
  const alto = (v: number) => (parejas ? 60 : 15 + 85 * ((v - min) / rango));
  const volts = (v: number) => `${formatearNumero(v, 3)} V`;

  return (
    <>
      <div className={classes.tituloCeldas}>
        <span>Celdas</span>
        {!parejas && (
          <span className={classes.cifra}>
            Escala {formatearNumero(min, 3)}–{volts(max)}
          </span>
        )}
      </div>
      {/* One group: after the first tooltip opens, moving to the next bar shows it with no delay. */}
      <Tooltip.Group openDelay={120} closeDelay={60}>
        <ul className={classes.celdas} aria-label="Voltaje por celda">
          {celdas.map((v, i) => (
            <Tooltip
              key={i}
              label={
                <>
                  <b>{volts(v)}</b> · celda {i + 1}
                </>
              }
              position="top"
              withArrow
            >
              <li
                className={classes.celda}
                aria-label={`Celda ${i + 1}: ${volts(v)}`}
                data-minima={!parejas && v === min ? 'true' : undefined}
              >
                <span className={classes.columna} style={{ height: `${alto(v)}%` }} />
              </li>
            </Tooltip>
          ))}
        </ul>
      </Tooltip.Group>

      {parejas ? (
        <div className={classes.pie}>Todas las celdas en {volts(min)}</div>
      ) : (
        <>
          <div className={classes.extremos}>
            <span className={classes.extremo} data-extremo="minimo">
              Mín. {volts(min)} · {nombrarCeldas(indicesCon(celdas, min))}
            </span>
            <span className={classes.extremo} data-extremo="maximo">
              Máx. {volts(max)} · {nombrarCeldas(indicesCon(celdas, max))}
            </span>
          </div>
          <div className={classes.pie}>Diferencia máx. {volts(rango)}</div>
        </>
      )}
    </>
  );
}

export function BmsPanel({ bateria }: { bateria: Bateria | null }) {
  const soc = bateria?.soc ?? null;
  const celdas = bateria?.celdas ?? [];

  return (
    <Panel titulo="Batería">
      <div className={classes.carga}>
        {soc === null ? (
          '—'
        ) : (
          <>
            {formatearNumero(soc, 0)} <small>%</small>
          </>
        )}
      </div>
      <div
        className={classes.barra}
        role="meter"
        aria-label="Carga de la batería"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={soc ?? undefined}
      >
        <div className={classes.relleno} style={{ width: `${soc ?? 0}%` }} />
      </div>

      {bateria && !bateria.disponible ? (
        <p className={classes.nota}>En este modo el backend solo informa la carga.</p>
      ) : (
        <>
          <div className={classes.dato}>
            <span>Corriente</span>
            <span>{formatearNumero(bateria?.corrienteMa ?? null, 0)} mA</span>
          </div>
          <div className={classes.dato}>
            <span>Temperatura</span>
            <span>{formatearNumero(bateria?.temperatura ?? null, 1)} °C</span>
          </div>
          {celdas.length > 0 && <Celdas celdas={celdas} />}
        </>
      )}
    </Panel>
  );
}
