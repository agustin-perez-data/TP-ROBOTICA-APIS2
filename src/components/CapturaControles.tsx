import { Button, Tooltip } from '@mantine/core';
import { useRef, useState } from 'react';
import { useCapturas, useTelemetria } from '../app/hooks';
import { useInstancias } from '../app/InstanciasContext';
import { descargarCsv, generarCsv, nombreArchivoCsv } from '../capture/csv';
import { plural } from '../ui/format';
import { Aviso } from './Aviso';

export function CapturaControles() {
  const { capturas: store } = useInstancias();
  const { telemetria, info } = useTelemetria();
  const capturas = useCapturas();
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
    descargarCsv(generarCsv(capturas), nombreArchivoCsv(new Date()));
    avisar(`CSV exportado · ${plural(capturas.length, 'muestra', 'muestras')}`);
  };

  const sinMuestras = capturas.length === 0;

  return (
    <>
      <Aviso mensaje={mensaje} />
      <Button onClick={capturar} disabled={!telemetria || !info}>
        Capturar muestra
      </Button>
      <Tooltip label="Capturá al menos una muestra para exportar" disabled={!sinMuestras}>
        <span>
          <Button color="dark" onClick={exportar} disabled={sinMuestras}>
            Exportar CSV ({capturas.length})
          </Button>
        </span>
      </Tooltip>
    </>
  );
}
