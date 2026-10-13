import { Button, TextInput } from '@mantine/core';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTelemetria } from '../app/hooks';
import { useInstancias } from '../app/InstanciasContext';
import { guardarDireccion, hostDeDireccion, normalizarDireccion } from '../telemetry/serverAddress';
import classes from './ServerAddress.module.css';

function almacenamiento(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Keeps a `?server=` URL parameter in sync, so a reload does not revert to the old address. */
function sincronizarParametroUrl(direccion: string): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('server')) return;
    url.searchParams.set('server', hostDeDireccion(direccion));
    window.history.replaceState(window.history.state, '', url);
  } catch {
    // The URL is only a convenience: the saved address already applies.
  }
}

export function ServerAddress() {
  const { cliente } = useInstancias();
  const { direccion } = useTelemetria();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const devolverFoco = useRef(false);

  // The form unmounts on close; give focus back to the trigger so keyboard users keep their place.
  useEffect(() => {
    if (!editando && devolverFoco.current) {
      devolverFoco.current = false;
      boton.current?.focus();
    }
  }, [editando]);

  const cerrar = () => {
    devolverFoco.current = true;
    setEditando(false);
  };

  const empezar = () => {
    setValor(hostDeDireccion(direccion));
    setError(null);
    setEditando(true);
  };

  const confirmar = (e: FormEvent) => {
    e.preventDefault();
    const normalizada = normalizarDireccion(valor);
    if (!normalizada) {
      setError('Escribí una dirección como 10.0.0.5:8001');
      return;
    }
    guardarDireccion(normalizada, almacenamiento());
    sincronizarParametroUrl(normalizada);
    cliente.conectar(normalizada);
    cerrar();
  };

  if (!editando) {
    return (
      <button
        ref={boton}
        type="button"
        className={`${classes.direccion} presionable`}
        onClick={empezar}
        aria-label={`Cambiar dirección del backend (${hostDeDireccion(direccion)})`}
      >
        {hostDeDireccion(direccion)}
        <svg className={classes.icono} viewBox="0 0 16 16" aria-hidden>
          <path d="M10.8 2.7a1.6 1.6 0 0 1 2.3 2.3L5.5 12.6 2.5 13.5l.9-3z" />
        </svg>
      </button>
    );
  }

  return (
    <form className={classes.form} onSubmit={confirmar}>
      <div>
        <TextInput
          size="xs"
          aria-label="Dirección del backend"
          value={valor}
          onChange={(e) => setValor(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cerrar();
          }}
          autoFocus
          w={190}
        />
        {error && <div className={classes.error}>{error}</div>}
      </div>
      <Button size="xs" type="submit">
        Conectar
      </Button>
      <Button size="xs" variant="subtle" color="gray" onClick={cerrar}>
        Cancelar
      </Button>
    </form>
  );
}
