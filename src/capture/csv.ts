import type { Contacto, Num } from '../telemetry/model';
import type { Captura } from './captureStore';

type Celda = string | number | null | undefined;

const dos = (n: number) => String(n).padStart(2, '0');

function formatoTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

function celda(valor: Celda): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const contacto = (c: Contacto | undefined): Num =>
  c === 'apoyada' ? 1 : c === 'en_el_aire' ? 0 : null;

/** CSV with electroSim's layout: one row per motor per capture, robot-level columns repeated. */
export function generarCsv(capturas: readonly Captura[]): string {
  const maxCeldas = Math.max(0, ...capturas.map((c) => c.telemetria.bateria.celdas.length));
  const patas: string[] = [];
  for (const c of capturas) {
    for (const p of Object.keys(c.telemetria.patas)) if (!patas.includes(p)) patas.push(p);
  }

  const encabezado = [
    'Captura', 'Timestamp', 'Robot', 'Bateria_%', 'Corriente_mA', 'Bateria_Temp_C',
    ...Array.from({ length: maxCeldas }, (_, i) => `Celda_${i + 1}_V`),
    'Roll_deg', 'Pitch_deg', 'Yaw_deg', 'Acel_X', 'Acel_Y', 'Acel_Z',
    ...patas.map((p) => `Fuerza_${p}`),
    'Motor', 'Indice', 'Angulo_deg', 'Vel_rad_s', 'Torque_Nm', 'Temp_C',
  ];

  const filas: Celda[][] = [encabezado];
  for (const c of capturas) {
    const { bateria, imu } = c.telemetria;
    const comunes: Celda[] = [
      c.numero,
      formatoTimestamp(c.tomadaEn),
      c.info.modelo,
      bateria.soc,
      bateria.corrienteMa,
      bateria.temperatura,
      ...Array.from({ length: maxCeldas }, (_, i) => bateria.celdas[i]),
      imu.roll, imu.pitch, imu.yaw, imu.ax, imu.ay, imu.az,
      ...patas.map((p) => contacto(c.telemetria.patas[p])),
    ];
    if (c.telemetria.motores.length === 0) {
      filas.push([...comunes, null, null, null, null, null, null]);
      continue;
    }
    c.telemetria.motores.forEach((m, indice) => {
      filas.push([...comunes, m.nombre, indice, m.angulo, m.velocidad, m.torque, m.temperatura]);
    });
  }

  return '\uFEFF' + filas.map((f) => f.map(celda).join(',')).join('\r\n') + '\r\n';
}

export function nombreArchivoCsv(fecha: Date): string {
  const d = fecha;
  return `motores_${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}_${dos(d.getHours())}${dos(d.getMinutes())}${dos(d.getSeconds())}.csv`;
}

export function descargarCsv(contenido: string, nombre: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Deferred: some browsers abort the download if the URL is revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
