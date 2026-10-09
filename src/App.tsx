import { useHotkeys } from '@mantine/hooks';
import { useState } from 'react';
import { useAntiguedad, useHistorialImu, useTelemetria } from './app/hooks';
import classes from './App.module.css';
import { BmsPanel } from './components/BmsPanel';
import { UMBRAL_DATO_VIEJO_MS } from './components/ConnectionBadge';
import { ErrorConexion } from './components/ErrorConexion';
import { FeetPanel } from './components/FeetPanel';
import { ImuPanel } from './components/ImuPanel';
import { MotorTable } from './components/MotorTable';
import { Panel } from './components/Panel';
import { TopBar } from './components/TopBar';

export function App() {
  const { telemetria, info, ultimoDatoEn } = useTelemetria();
  const puntos = useHistorialImu();
  const antiguedad = useAntiguedad(ultimoDatoEn);
  const [presentacion, setPresentacion] = useState(false);

  // Keyboard-triggered: switches instantly, no animation.
  useHotkeys([
    ['p', () => setPresentacion((v) => !v)],
    ['Escape', () => setPresentacion(false)],
  ]);

  const viejo = antiguedad !== null && antiguedad > UMBRAL_DATO_VIEJO_MS;
  const nombresPatas = info?.patas ?? Object.keys(telemetria?.patas ?? {});

  return (
    <div className={classes.raiz} data-presentacion={presentacion} data-testid="raiz">
      <TopBar presentacion={presentacion} onAlternarPresentacion={() => setPresentacion((v) => !v)} />
      <ErrorConexion />
      <main className={classes.grilla} data-viejo={viejo}>
        <Panel titulo="Motores">
          <MotorTable
            motores={telemetria?.motores ?? []}
            tamanoGrupo={info?.tipo === 'cuadrupedo' ? 3 : 0}
            mostrarVelocidad={!presentacion}
          />
        </Panel>
        <div className={classes.columna}>
          <ImuPanel imu={telemetria?.imu ?? null} puntos={puntos} />
          <div className={classes.dos}>
            <BmsPanel bateria={telemetria?.bateria ?? null} />
            <FeetPanel patas={telemetria?.patas ?? {}} nombres={nombresPatas} />
          </div>
        </div>
      </main>
    </div>
  );
}
