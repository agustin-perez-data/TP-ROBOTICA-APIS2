// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearInstancias } from '../app/instancias';
import { infoGo2, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { crearSocketFalso, fetchFalso, json, SocketFalso } from '../telemetry/__tests__/testDoubles';
import { renderUi } from '../test/render';
import { CapturaControles } from './CapturaControles';

// vi.mock is hoisted above the imports, so the spy must be hoisted too.
const { descargarCsv } = vi.hoisted(() => ({ descargarCsv: vi.fn() }));
vi.mock('../capture/csv', async (original) => ({
  ...(await original<typeof import('../capture/csv')>()),
  descargarCsv: (...args: unknown[]) => descargarCsv(...args),
}));

async function conDatos() {
  const instancias = crearInstancias({
    fetch: fetchFalso({ '/info': () => json(infoGo2) }),
    crearSocket: crearSocketFalso,
  });
  const vista = renderUi(<CapturaControles />, { instancias });
  await act(async () => {
    instancias.cliente.conectar('http://x:8001');
    await new Promise((r) => setTimeout(r, 0));
    SocketFalso.ultimo().abrir();
    SocketFalso.ultimo().enviar(telemetriaGo2);
  });
  return vista;
}

describe('CapturaControles', () => {
  beforeEach(() => {
    SocketFalso.reiniciar();
    descargarCsv.mockClear();
  });

  it('sin datos no deja capturar y sin muestras no deja exportar', async () => {
    const usuario = userEvent.setup();
    renderUi(<CapturaControles />);
    expect(screen.getByRole('button', { name: 'Capturar muestra' })).toBeDisabled();
    const exportar = screen.getByRole('button', { name: 'Exportar CSV (0)' });
    expect(exportar).toHaveAttribute('aria-disabled', 'true');
    await usuario.click(exportar);
    expect(descargarCsv).not.toHaveBeenCalled();
  });

  it('explica por qué no se puede exportar también con el teclado', async () => {
    const usuario = userEvent.setup();
    renderUi(<CapturaControles />);
    const exportar = screen.getByRole('button', { name: 'Exportar CSV (0)' });
    expect(exportar).toHaveAccessibleDescription('Capturá al menos una muestra para exportar');
    await usuario.tab();
    expect(exportar).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Capturá al menos una muestra para exportar');
  });

  it('capturar suma una muestra y lo confirma', async () => {
    const usuario = userEvent.setup();
    await conDatos();
    await usuario.click(screen.getByRole('button', { name: 'Capturar muestra' }));
    const exportar = screen.getByRole('button', { name: 'Exportar CSV (1)' });
    expect(exportar).not.toHaveAttribute('aria-disabled');
    expect(exportar).not.toHaveAccessibleDescription();
    expect(screen.getByRole('status')).toHaveTextContent('Muestra 1 capturada');
  });

  it('exportar descarga el CSV y lo confirma', async () => {
    const usuario = userEvent.setup();
    await conDatos();
    await usuario.click(screen.getByRole('button', { name: 'Capturar muestra' }));
    await usuario.click(screen.getByRole('button', { name: 'Capturar muestra' }));
    await usuario.click(screen.getByRole('button', { name: 'Exportar CSV (2)' }));
    expect(descargarCsv).toHaveBeenCalledTimes(1);
    const [contenido, nombre] = descargarCsv.mock.calls[0] as [string, string];
    expect(contenido.startsWith('﻿Captura,')).toBe(true);
    expect(nombre).toMatch(/^motores_\d{8}_\d{6}\.csv$/);
    expect(screen.getByRole('status')).toHaveTextContent('CSV exportado · 2 muestras');
  });
});
