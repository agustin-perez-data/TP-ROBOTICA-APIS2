import { Button } from '@mantine/core';
import { useAntiguedad, useTelemetria } from '../app/hooks';
import { CapturaControles } from './CapturaControles';
import { ConnectionBadge } from './ConnectionBadge';
import { ServerAddress } from './ServerAddress';
import classes from './TopBar.module.css';

const TIPO: Record<string, string> = { cuadrupedo: 'cuadrúpedo', humanoide: 'humanoide' };

export function TopBar({
  presentacion,
  onAlternarPresentacion,
}: {
  presentacion: boolean;
  onAlternarPresentacion: () => void;
}) {
  const { info, conexion, ultimoDatoEn } = useTelemetria();
  const antiguedad = useAntiguedad(ultimoDatoEn);
  const detalle = info
    ? [TIPO[info.tipo] ?? info.tipo, `${info.motores.length} motores`].filter(Boolean).join(' · ')
    : null;

  return (
    <header className={classes.barra}>
      <div className={classes.robot}>
        {info ? info.nombre : 'Buscando robot…'}
        {detalle && <small>{detalle}</small>}
      </div>
      <ConnectionBadge conexion={conexion} antiguedadMs={antiguedad} />
      {!presentacion && <ServerAddress />}
      <span className={classes.espacio} />
      <div className={classes.acciones}>
        <Button variant="outline" color="gray" onClick={onAlternarPresentacion}>
          {presentacion ? 'Salir de presentación' : 'Modo presentación'}
        </Button>
        <CapturaControles />
      </div>
    </header>
  );
}
