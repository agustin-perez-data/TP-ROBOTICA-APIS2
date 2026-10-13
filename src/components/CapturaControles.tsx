import { Button, Tooltip, VisuallyHidden } from '@mantine/core';
import { useId, useRef, useState } from 'react';
import { useCapturas, useTelemetria } from '../app/hooks';
import { useInstancias } from '../app/InstanciasContext';
import { descargarCsv, generarCsv, nombreArchivoCsv } from '../capture/csv';
import { plural } from '../ui/format';
import { Aviso } from './Aviso';
import classes from './CapturaControles.module.css';

const PISTA_EXPORTAR = 'Capturá al menos una muestra para exportar';

export function CapturaControles() {
  const { capturas: store } = useInstancias();
  const { telemetria, info } = useTelemetria();
  const capturas = useCapturas();
  const pistaId = useId();
  const [mensaje, setMensaje] = useState<{ id: number; texto: string } | null>(null);
  const contador = useRef(0);

  const avisar = (texto: string) => {
    contador.current += 1;
    setMensaje({ id: contador.current, texto });
  };

  const capturar = () => {
    if (!telemetria || !info) return;
    const captura = store.capturar(telemetria, info);
    avisar(`Muestra ${captura.numero} capturada`);
  };

  const exportar = () => {
    if (capturas.length === 0) return;
    descargarCsv(generarCsv(capturas), nombreArchivoCsv(new Date()));
    avisar(`CSV exportado · ${plural(capturas.length, 'muestra', 'muestras')}`);
  };

  const sinMuestras = capturas.length === 0;

  return (
    <>
      <Aviso mensaje={mensaje} />
      <Button className={classes.boton} onClick={capturar} disabled={!telemetria || !info}>
        Capturar muestra
      </Button>
      {/* Looks disabled but stays focusable (data-disabled + aria-disabled), so the reason is
          reachable by keyboard and screen reader, not only by hovering. */}
      <Tooltip label={PISTA_EXPORTAR} disabled={!sinMuestras} events={{ hover: true, focus: true, touch: true }}>
        <Button
          className={classes.boton}
          color="dark"
          onClick={exportar}
          data-disabled={sinMuestras || undefined}
          aria-disabled={sinMuestras || undefined}
          aria-describedby={sinMuestras ? pistaId : undefined}
        >
          Exportar CSV ({capturas.length})
        </Button>
      </Tooltip>
      {sinMuestras && <VisuallyHidden id={pistaId}>{PISTA_EXPORTAR}</VisuallyHidden>}
    </>
  );
}
