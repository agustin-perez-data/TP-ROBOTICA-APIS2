import { useEffect, useRef, useState } from 'react';
import type { Motor } from '../telemetry/model';
import { estadoTemperatura, formatearNumero, UMBRAL_CRITICA } from '../ui/format';
import classes from './MotorTable.module.css';
import { TemperaturaBadge } from './TemperaturaBadge';

/** True while the scroll container hides rows below its bottom edge. */
function useHayMasAbajo(cantidadFilas: number) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [hayMas, setHayMas] = useState(false);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const medir = () => setHayMas(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    // Watches the box and the table: presentation mode grows the rows without resizing the box.
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    if (el.firstElementChild) observador.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', medir);
      observador.disconnect();
    };
  }, [cantidadFilas]);

  return { contenedor, hayMas };
}

export function MotorTable({
  motores,
  tamanoGrupo,
  mostrarVelocidad,
}: {
  motores: Motor[];
  /** Rows per visual group (3 = one Go2 leg). 0 disables the dividers. */
  tamanoGrupo: number;
  mostrarVelocidad: boolean;
}) {
  const { contenedor, hayMas } = useHayMasAbajo(motores.length);

  if (motores.length === 0) {
    return <p className={classes.vacio}>Esperando datos de los motores.</p>;
  }

  const criticos = motores.filter((m) => estadoTemperatura(m.temperatura) === 'critica');

  return (
    <>
      {/* The slot keeps its height when the alert goes away, so a motor hovering around the
          threshold does not make the whole table jump. */}
      <div className={classes.huecoAlerta} data-testid="hueco-alerta">
        {criticos.length > 0 && (
          <div className={classes.alerta} role="alert">
            ■ Temperatura crítica ({UMBRAL_CRITICA} °C o más): {criticos.map((m) => m.nombre).join(', ')}
          </div>
        )}
      </div>
      <div ref={contenedor} className={classes.contenedor} data-hay-mas={hayMas}>
        <table className={classes.tabla}>
          <thead>
            <tr>
              <th scope="col">Motor</th>
              <th scope="col">Ángulo (°)</th>
              {mostrarVelocidad && <th scope="col">Velocidad (rad/s)</th>}
              <th scope="col">Torque (Nm)</th>
              <th scope="col">Temperatura</th>
            </tr>
          </thead>
          <tbody>
            {motores.map((m, i) => {
              const finGrupo = tamanoGrupo > 0 && (i + 1) % tamanoGrupo === 0 && i < motores.length - 1;
              return (
                <tr key={m.id} data-fin-grupo={finGrupo ? 'true' : undefined}>
                  <td>{m.nombre}</td>
                  <td>{formatearNumero(m.angulo, 2)}</td>
                  {mostrarVelocidad && <td>{formatearNumero(m.velocidad, 3)}</td>}
                  <td>{formatearNumero(m.torque, 2)}</td>
                  <td>
                    <TemperaturaBadge temperatura={m.temperatura} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
