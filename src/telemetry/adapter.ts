import type { Bateria, Contacto, Imu, Motor, Num, RobotInfo, Telemetria } from './model';

// Adapter pattern: translates the backend contract (contract.ts) into the app model (model.ts).
// The input is `unknown` on purpose: nothing coming from the network is trusted.

type Objeto = Record<string, unknown>;

const esObjeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const comoObjeto = (v: unknown): Objeto => (esObjeto(v) ? v : {});

export function numero(v: unknown): Num {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function texto(v: unknown, porDefecto: string): string {
  return typeof v === 'string' && v.length > 0 ? v : porDefecto;
}

function textos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function adaptarInfo(raw: unknown): RobotInfo {
  const o = comoObjeto(raw);
  return {
    modelo: texto(o.modelo, 'desconocido'),
    nombre: texto(o.nombre, 'Robot sin nombre'),
    tipo: texto(o.tipo, ''),
    motores: textos(o.motores_nombres),
    patas: textos(o.patas),
    frecuenciaHz: numero(o.frecuencia_hz) ?? 10,
    modo: texto(o.modo, ''),
  };
}

function adaptarMotor(raw: unknown, indice: number, nombres: string[]): Motor {
  const o = comoObjeto(raw);
  return {
    id: numero(o.id) ?? indice,
    nombre: texto(o.nombre, nombres[indice] ?? `Motor ${indice}`),
    angulo: numero(o.angulo),
    velocidad: numero(o.velocidad),
    torque: numero(o.torque),
    temperatura: numero(o.temperatura),
  };
}

function adaptarImu(raw: unknown): Imu {
  const o = comoObjeto(raw);
  return {
    roll: numero(o.roll),
    pitch: numero(o.pitch),
    yaw: numero(o.yaw),
    ax: numero(o.ax),
    ay: numero(o.ay),
    az: numero(o.az),
  };
}

function adaptarBateria(raw: unknown): Bateria {
  const o = comoObjeto(raw);
  const soc = numero(o.soc);
  const corrienteMa = numero(o.corriente);
  const temperatura = numero(o.temperatura);
  const celdas = Array.isArray(o.celdas)
    ? o.celdas.map(numero).filter((c): c is number => c !== null)
    : [];
  // The simulator sends current 0, temperature 0 and no cells: only the charge is meaningful.
  const disponible =
    celdas.length > 0 ||
    (corrienteMa !== null && corrienteMa !== 0) ||
    (temperatura !== null && temperatura !== 0);
  return {
    soc: soc === null ? null : Math.min(100, Math.max(0, soc)),
    corrienteMa,
    temperatura,
    celdas,
    disponible,
  };
}

function adaptarPatas(raw: unknown, patasDeInfo: string[]): Record<string, Contacto> {
  const o = comoObjeto(raw);
  const nombres = patasDeInfo.length > 0 ? patasDeInfo : Object.keys(o);
  const patas: Record<string, Contacto> = {};
  for (const nombre of nombres) {
    const v = numero(o[nombre]);
    patas[nombre] = v === null ? 'desconocido' : v > 0 ? 'apoyada' : 'en_el_aire';
  }
  return patas;
}

export function adaptarTelemetria(
  raw: unknown,
  info: RobotInfo | null,
  recibidaEn: number,
): Telemetria {
  const o = comoObjeto(raw);
  const nombres = info?.motores ?? [];
  const motores = Array.isArray(o.motores) ? o.motores : [];
  return {
    modelo: texto(o.modelo, info?.modelo ?? 'desconocido'),
    ts: numero(o.ts) ?? 0,
    recibidaEn,
    motores: motores.map((m, i) => adaptarMotor(m, i, nombres)),
    imu: adaptarImu(o.imu),
    bateria: adaptarBateria(o.bms),
    patas: adaptarPatas(o.fuerzas, info?.patas ?? []),
  };
}
