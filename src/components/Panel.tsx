import type { ReactNode } from 'react';
import classes from './Panel.module.css';

export function Panel({
  titulo,
  detalle,
  children,
  className,
}: {
  titulo: string;
  detalle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={[classes.panel, className].filter(Boolean).join(' ')} aria-label={titulo}>
      <header className={classes.encabezado}>
        <h2 className={classes.titulo}>{titulo}</h2>
        {detalle && <span className={classes.detalle}>{detalle}</span>}
      </header>
      {children}
    </section>
  );
}
