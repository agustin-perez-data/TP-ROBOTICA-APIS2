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
        className={classes.direccion}
        onClick={empezar}
        aria-label={`Cambiar dirección del backend (${hostDeDireccion(direccion)})`}
      >
        {hostDeDireccion(direccion)} ✎
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
