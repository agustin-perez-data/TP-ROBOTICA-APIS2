export const PUERTO_POR_DEFECTO = 8001;
export const DIRECCION_POR_DEFECTO = `http://localhost:${PUERTO_POR_DEFECTO}`;
const CLAVE = 'robotica-dashboard.direccion';

/** Accepts "10.0.0.5", "10.0.0.5:8001" or "http://10.0.0.5:8001". Returns null if invalid. */
export function normalizarDireccion(entrada: string): string | null {
  const limpia = entrada.trim().replace(/\/+$/, '');
  if (!limpia || /^[a-z][a-z0-9+.-]*:$/i.test(limpia)) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:\/\//i.test(limpia) ? limpia : `http://${limpia}`;
  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;
  if (url.pathname !== '/' || url.search || url.hash) return null;
  // URL drops default ports (":80"), so read the explicit port from the text itself.
  const puertoExplicito = /^[a-z]+:\/\/[^/]*:(\d+)$/i.exec(conEsquema)?.[1];
  const puerto = puertoExplicito ?? (url.port || String(PUERTO_POR_DEFECTO));
  return `${url.protocol}//${url.hostname}:${puerto}`;
}

export function urlWebSocket(direccion: string): string {
  return `${direccion.replace(/^http/, 'ws')}/ws`;
}

export function hostDeDireccion(direccion: string): string {
  return direccion.replace(/^https?:\/\//, '');
}

export function direccionInicial(
  search: string,
  almacenamiento: Pick<Storage, 'getItem'> | null,
): string {
  const deUrl = new URLSearchParams(search).get('server');
  const normalizadaDeUrl = deUrl ? normalizarDireccion(deUrl) : null;
  if (normalizadaDeUrl) return normalizadaDeUrl;
  try {
    const guardada = almacenamiento?.getItem(CLAVE);
    const normalizadaGuardada = guardada ? normalizarDireccion(guardada) : null;
    if (normalizadaGuardada) return normalizadaGuardada;
  } catch {
    // Storage can be blocked (private mode, site settings): fall back to the default.
  }
  return DIRECCION_POR_DEFECTO;
}

export function guardarDireccion(
  direccion: string,
  almacenamiento: Pick<Storage, 'setItem'> | null,
): void {
  try {
    almacenamiento?.setItem(CLAVE, direccion);
  } catch {
    // Not persisting is acceptable: the address still works for this session.
  }
}
