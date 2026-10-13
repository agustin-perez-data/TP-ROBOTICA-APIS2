import { describe, expect, it } from 'vitest';
import {
  DIRECCION_POR_DEFECTO,
  direccionInicial,
  guardarDireccion,
  hostDeDireccion,
  normalizarDireccion,
  urlWebSocket,
} from './serverAddress';

function almacenamiento(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    datos,
  };
}

describe('normalizarDireccion', () => {
  it.each([
    ['10.0.0.5', 'http://10.0.0.5:8001'],
    ['10.0.0.5:8001', 'http://10.0.0.5:8001'],
    ['http://10.0.0.5:8001', 'http://10.0.0.5:8001'],
    ['  http://10.0.0.5:8001/  ', 'http://10.0.0.5:8001'],
    ['localhost', 'http://localhost:8001'],
    ['http://localhost:80', 'http://localhost:80'],
    ['https://robot.lab:9000', 'https://robot.lab:9000'],
  ])('acepta %s', (entrada, esperado) => {
    expect(normalizarDireccion(entrada)).toBe(esperado);
  });

  it.each(['', '   ', 'http://10.0.0.5:8001/docs', 'ftp://10.0.0.5', 'http://', '10.0.0.5:99999'])(
    'rechaza %j',
    (entrada) => {
      expect(normalizarDireccion(entrada)).toBeNull();
    },
  );
});

describe('urlWebSocket', () => {
  it('cambia el esquema y agrega /ws', () => {
    expect(urlWebSocket('http://10.0.0.5:8001')).toBe('ws://10.0.0.5:8001/ws');
    expect(urlWebSocket('https://robot.lab:9000')).toBe('wss://robot.lab:9000/ws');
  });
});

describe('hostDeDireccion', () => {
  it('saca el esquema', () => {
    expect(hostDeDireccion('http://10.0.0.5:8001')).toBe('10.0.0.5:8001');
  });
});

describe('direccionInicial', () => {
  it('prioriza ?server= de la URL', () => {
    const a = almacenamiento({ 'robotica-dashboard.direccion': 'http://1.1.1.1:8001' });
    expect(direccionInicial('?server=10.0.0.5', a)).toBe('http://10.0.0.5:8001');
  });

  it('usa la guardada si no hay ?server= válido', () => {
    const a = almacenamiento({ 'robotica-dashboard.direccion': 'http://1.1.1.1:8001' });
    expect(direccionInicial('?server=http://x/docs', a)).toBe('http://1.1.1.1:8001');
  });

  it('usa la de por defecto si no hay nada o el almacenamiento falla', () => {
    expect(direccionInicial('', almacenamiento())).toBe(DIRECCION_POR_DEFECTO);
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(direccionInicial('', roto)).toBe(DIRECCION_POR_DEFECTO);
    expect(direccionInicial('', null)).toBe(DIRECCION_POR_DEFECTO);
  });
});

describe('guardarDireccion', () => {
  it('guarda y no falla si el almacenamiento está bloqueado', () => {
    const a = almacenamiento();
    guardarDireccion('http://10.0.0.5:8001', a);
    expect(a.datos.get('robotica-dashboard.direccion')).toBe('http://10.0.0.5:8001');
    const roto = {
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(() => guardarDireccion('http://10.0.0.5:8001', roto)).not.toThrow();
  });
});
