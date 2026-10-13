import { Button } from '@mantine/core';
import { useAntiguedad, useTelemetria } from '../app/hooks';
import { plural } from '../ui/format';
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
  const nombre = info ? info.nombre : 'Buscando robot…';
  const detalle = info
    ? [TIPO[info.tipo] ?? info.tipo, plural(info.motores.length, 'motor', 'motores')]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <header className={classes.barra}>
      {/* A long name from /info is cut with an ellipsis; the title keeps the full text. */}
      <h1 className={classes.robot} title={detalle ? `${nombre} · ${detalle}` : nombre}>
        {nombre}
        {detalle && <small>{detalle}</small>}
      </h1>
      <ConnectionBadge conexion={conexion} antiguedadMs={antiguedad} />
      {!presentacion && <ServerAddress />}
      <div className={classes.acciones}>
        <Button variant="outline" color="gray" onClick={onAlternarPresentacion}>
          {presentacion ? 'Salir de presentación' : 'Modo presentación'}
        </Button>
        <CapturaControles />
      </div>
    </header>
  );
}
