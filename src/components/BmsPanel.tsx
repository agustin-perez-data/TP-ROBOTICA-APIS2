import type { Bateria } from '../telemetry/model';
import { formatearNumero } from '../ui/format';
import classes from './BmsPanel.module.css';
import { Panel } from './Panel';

export function BmsPanel({ bateria }: { bateria: Bateria | null }) {
  const soc = bateria?.soc ?? null;
  const celdas = bateria?.celdas ?? [];
  const min = celdas.length ? Math.min(...celdas) : 0;
  const max = celdas.length ? Math.max(...celdas) : 0;
  const rango = max - min;
  // Scaled to the observed range so the weakest cell stands out; 15 % floor keeps bars visible.
  const alto = (v: number) => (rango > 0 ? 15 + 85 * ((v - min) / rango) : 60);

  return (
    <Panel titulo="Batería">
      <div className={classes.carga} aria-label="Carga">
        {soc === null ? '—' : (
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
          {celdas.length > 0 && (
            <>
              <ul className={classes.celdas} aria-label="Voltaje por celda">
                {celdas.map((v, i) => (
                  <li
                    key={i}
                    className={classes.celda}
                    style={{ height: `${alto(v)}%` }}
                    aria-label={`Celda ${i + 1}: ${formatearNumero(v, 3)} V`}
                  />
                ))}
              </ul>
              <div className={classes.etiquetas} aria-hidden>
                {celdas.map((v, i) => (
                  <span key={i}>{formatearNumero(v, 3)}</span>
                ))}
              </div>
              <div className={classes.pie}>
                Celdas (V) · diferencia máx. {formatearNumero(rango, 3)} V
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
