import type { Motor } from '../telemetry/model';
import { estadoTemperatura, formatearNumero, UMBRAL_CRITICA } from '../ui/format';
import classes from './MotorTable.module.css';
import { TemperaturaBadge } from './TemperaturaBadge';

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
  if (motores.length === 0) {
    return <p className={classes.vacio}>Esperando datos de los motores.</p>;
  }

  const criticos = motores.filter((m) => estadoTemperatura(m.temperatura) === 'critica');

  return (
    <>
      {criticos.length > 0 && (
        <div className={classes.alerta} role="alert">
          ■ Temperatura crítica ({UMBRAL_CRITICA} °C o más): {criticos.map((m) => m.nombre).join(', ')}
        </div>
      )}
      <div className={classes.contenedor}>
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
