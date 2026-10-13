import { Button, TextInput } from '@mantine/core';
import { useState, type FormEvent } from 'react';
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

export function ServerAddress() {
  const { cliente } = useInstancias();
  const { direccion } = useTelemetria();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    cliente.conectar(normalizada);
    setEditando(false);
  };

  if (!editando) {
    return (
      <button
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
            if (e.key === 'Escape') setEditando(false);
          }}
          autoFocus
          w={190}
        />
        {error && <div className={classes.error}>{error}</div>}
      </div>
      <Button size="xs" type="submit">
        Conectar
      </Button>
      <Button size="xs" variant="subtle" color="gray" onClick={() => setEditando(false)}>
        Cancelar
      </Button>
    </form>
  );
}
