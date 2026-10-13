import { useEffect, useState } from 'react';
import classes from './Aviso.module.css';

const DURACION_MS = 2500;

/** Inline confirmation next to the button that produced it. Transitions, not keyframes: retriggers smoothly. */
export function Aviso({ mensaje }: { mensaje: { id: number; texto: string } | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!mensaje) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), DURACION_MS);
    return () => clearTimeout(id);
  }, [mensaje]);

  return (
    <span className={classes.aviso} data-visible={visible} role="status" aria-live="polite">
      {mensaje?.texto ?? ''}
    </span>
  );
}
