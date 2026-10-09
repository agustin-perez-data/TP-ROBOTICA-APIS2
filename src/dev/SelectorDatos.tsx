import { SegmentedControl } from '@mantine/core';
import classes from './SelectorDatos.module.css';

const OPCIONES = [
  { value: 'real', label: 'Backend real' },
  { value: 'peor', label: 'Peor caso' },
  { value: 'g1', label: 'G1' },
];

/** Development-only switch between the real backend and fake scenarios. Never shipped. */
export function SelectorDatos() {
  const actual = new URLSearchParams(window.location.search).get('datos') ?? 'real';
  const cambiar = (valor: string) => {
    const url = new URL(window.location.href);
    if (valor === 'real') url.searchParams.delete('datos');
    else url.searchParams.set('datos', valor);
    window.location.assign(url);
  };
  return (
    <div className={classes.selector}>
      <SegmentedControl size="xs" data={OPCIONES} value={actual} onChange={cambiar} />
    </div>
  );
}
