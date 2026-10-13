import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import type { Captura } from './captureStore';
import { generarCsv, nombreArchivoCsv } from './csv';

const infoA = adaptarInfo(infoGo2);
const FECHA = new Date(2026, 9, 8, 14, 5, 9).getTime();

function captura(numero: number, raw: unknown = telemetriaGo2, info = infoA): Captura {
  return { numero, tomadaEn: FECHA, telemetria: adaptarTelemetria(raw, info, 0), info };
}

const lineas = (csv: string) => csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n');

describe('generarCsv', () => {
  it('empieza con BOM y usa \\r\\n', () => {
    const csv = generarCsv([captura(1)]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('arma el encabezado con celdas y patas del robot', () => {
    expect(lineas(generarCsv([captura(1)]))[0]).toBe(
      [
        'Captura', 'Timestamp', 'Robot', 'Bateria_%', 'Corriente_mA', 'Bateria_Temp_C',
        'Celda_1_V', 'Celda_2_V', 'Celda_3_V', 'Celda_4_V', 'Celda_5_V', 'Celda_6_V', 'Celda_7_V', 'Celda_8_V',
        'Roll_deg', 'Pitch_deg', 'Yaw_deg', 'Acel_X', 'Acel_Y', 'Acel_Z',
        'Fuerza_FR', 'Fuerza_FL', 'Fuerza_RR', 'Fuerza_RL',
        'Motor', 'Indice', 'Angulo_deg', 'Vel_rad_s', 'Torque_Nm', 'Temp_C',
      ].join(','),
    );
  });

  it('escribe una fila por motor por captura, como electroSim', () => {
    const filas = lineas(generarCsv([captura(1), captura(2)]));
    expect(filas).toHaveLength(1 + 24);
    expect(filas[1]).toBe(
      '1,2026-10-08 14:05:09,go2,92,1446,31.6,3.718,3.724,3.718,3.703,3.695,3.7,3.714,3.724,0,0.65,0,-0.082,0.084,9.81,0,1,1,0,FR_hip,0,-27.7,-0.321,4.98,40',
    );
    expect(filas[13]?.startsWith('2,')).toBe(true);
  });

  it('deja vacías las celdas que una captura no tiene y las patas sin dato', () => {
    const infoB = adaptarInfo(infoG1);
    const filas = lineas(generarCsv([captura(1), captura(2, telemetriaG1(), infoB)]));
    const encabezado = filas[0]!.split(',');
    expect(encabezado).toContain('Fuerza_R_foot');
    const filaG1 = filas[13]!.split(',');
    expect(filaG1[encabezado.indexOf('Celda_1_V')]).toBe('');
    expect(filaG1[encabezado.indexOf('Fuerza_FR')]).toBe('');
    expect(filaG1[encabezado.indexOf('Fuerza_R_foot')]).toBe('1');
  });

  it('escribe vacío para valores faltantes y escapa textos con coma o comillas', () => {
    const raw = {
      ...telemetriaGo2,
      motores: [{ id: 0, nombre: 'motor "raro", 1', angulo: null, velocidad: 1, torque: 1, temperatura: 30 }],
    };
    const fila = lineas(generarCsv([captura(1, raw)]))[1]!;
    expect(fila).toContain(',"motor ""raro"", 1",0,,1,1,30');
  });

  it('si la captura no tiene motores igual escribe una fila', () => {
    const raw = { ...telemetriaGo2, motores: [] };
    const filas = lineas(generarCsv([captura(1, raw)]));
    expect(filas).toHaveLength(2);
    expect(filas[1]!.endsWith(',,,,,,')).toBe(true);
  });
});

describe('nombreArchivoCsv', () => {
  it('sigue el formato de electroSim', () => {
    expect(nombreArchivoCsv(new Date(2026, 9, 8, 14, 5, 9))).toBe('motores_20261008_140509.csv');
  });
});
