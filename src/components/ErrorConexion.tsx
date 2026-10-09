import { Button } from '@mantine/core';
import { useTelemetria } from '../app/hooks';
import { useInstancias } from '../app/InstanciasContext';
import classes from './ErrorConexion.module.css';

export function ErrorConexion() {
  const { cliente } = useInstancias();
  const { error } = useTelemetria();
  if (!error) return null;
  return (
    <div className={classes.error} role="alert">
      <span className={classes.texto}>{error}</span>
      <Button size="xs" color="red" variant="outline" onClick={() => cliente.reintentar()}>
        Reintentar
      </Button>
    </div>
  );
}
