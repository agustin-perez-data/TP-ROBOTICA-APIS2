# Dashboard de telemetría Unitree — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard web en React que muestra en vivo la telemetría de un robot Unitree (Go2 o G1) consumiendo la API de la cátedra, con captura y exportación CSV al estilo electroSim.

**Architecture:** Una capa de datos en TypeScript puro (`src/telemetry`, `src/capture`) con un `TelemetryClient` que es Facade (WebSocket con caída a polling y reconexión) y Observer (`subscribe`), un `adapter.ts` que traduce el contrato del server al modelo de la app, y componentes React que se enganchan con `useSyncExternalStore`. La UI usa Mantine para controles y CSS Modules con tokens propios para los paneles; los gráficos son Chart.js sin animaciones.

**Tech Stack:** Node 22 · Vite · React 19 · TypeScript 5.9 (estricto) · Mantine 8 · Chart.js + react-chartjs-2 · @fontsource/barlow · Vitest + Testing Library + jsdom · ESLint + Prettier · GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-08-dashboard-telemetria-design.md` (leerlo antes de empezar; este plan argumenta desde ahí).

## Global Constraints

- No se modifica el backend de la cátedra. La API es de solo lectura.
- Repo: `D:\GitHub\robotica-dashboard`. Todo el trabajo va en la rama `etapa-1`; `main` queda con el spec y el plan.
- Commits en castellano, en imperativo, **sin trailer `Co-Authored-By`** (pedido explícito del usuario).
- Mantine fijado en `@8` (no 9). TypeScript fijado en `5.9`.
- Identificadores del dominio y textos de UI en castellano rioplatense (voseo: "Capturá", "Revisá"). Textos en oración, nunca en mayúsculas sostenidas.
- Semáforo de temperatura: `< 40` normal (●), `>= 40` elevada (▲), `>= 60` crítica (■). Siempre forma + número + color.
- Ningún dato que se actualiza a 10 Hz se anima. Chart.js con `animation: false`.
- Números con `font-variant-numeric: tabular-nums`, decimales fijos por columna, signo menos `−` (U+2212), `—` para faltantes. Nunca `NaN` ni `undefined` en pantalla.
- Tokens de color exactos de la sección 6.1 del spec (`#1F5FBF`, `#B4540A`, etc.).
- Puerto por defecto del backend: `8001`. Dirección por defecto: `http://localhost:8001`.
- Tiempos: WebSocket debe abrir en 3000 ms; reintento de WebSocket desde polling cada 15000 ms; reconexión tras corte 1000/2000/4000/8000/10000 ms; polling cada 250 ms; datos viejos a los 2000 ms; historial de 120 muestras.
- CSV: BOM UTF-8, coma, punto decimal, `\r\n`, una fila por motor por captura, nombre `motores_AAAAMMDD_HHMMSS.csv`.
- Fuera de alcance: entrega del día del laboratorio (build de un solo archivo, etc.) y los extras de la etapa 2.

## Review Focus

1. **El backend se reinicia en medio de la sesión** (`ts` vuelve a ~0): el gráfico no debe mostrar líneas cruzadas; se espera que el historial se vacíe. → test en Task 4 (`vacía el historial cuando ts retrocede`) y en Task 8 (`vacía el historial al cambiar de dirección`).
2. **Instalación de fábrica del profe, sin paquete `websockets`** (`/ws` responde 404 → el socket se cierra sin abrir): se espera pasar a polling y mostrar "En vivo · Polling" sin intervención. → test en Task 6 (`si el socket se cierra sin abrir, pasa a polling`).
3. **El usuario escribe la dirección como la ve en pantalla** (`10.0.0.5`, con espacios, con `/` al final, con `/docs`): se espera que las tres formas válidas funcionen y que una URL con ruta se rechace con un mensaje, no que conecte a cualquier cosa. → tests en Task 3.
4. **Motor con temperatura justo en el umbral (40 o 60 °C) o sin dato**: se espera el estado exacto de electroSim y `—` para el faltante. → tests en Task 10.
5. **Modo simulador, donde la batería llega vacía, y G1 con 29 motores y pies `R_foot`/`L_foot`**: se espera el mensaje explicativo en Batería, scroll de la tabla y pies dibujados. → tests en Task 2 y Task 12.

---

## File Structure

```
robotica-dashboard/
  .github/workflows/ci.yml          CI: lint, tipos, tests y build
  .claude/skills/                   skills de diseño copiadas de CafeClub (Task 1)
  .prettierrc.json
  eslint.config.js
  index.html
  package.json
  postcss.config.cjs
  tsconfig.json
  vite.config.ts                    Vite + config de Vitest
  README.md
  src/
    main.tsx                        arranque: instancias, provider, fuente ficticia en dev
    App.tsx                         layout, modo presentación, datos viejos
    App.module.css
    app/
      instancias.ts                 crea y conecta cliente, historial y capturas
      InstanciasContext.tsx         contexto React + useInstancias
      hooks.ts                      useTelemetria, useHistorialImu, useCapturas, useAntiguedad
    telemetry/
      contract.ts                   tipos del JSON del server (API.md)
      model.ts                      tipos de la app
      observer.ts                   Emisor<T>: base del patrón Observer
      adapter.ts                    ADAPTER
      serverAddress.ts              normalizar, url del WS, guardar/leer dirección
      history.ts                    HistorialImu (buffer circular)
      transports/
        transporte.ts               interfaz común de transporte
        websocket.ts                TransporteWebSocket
        polling.ts                  TransportePolling
      TelemetryClient.ts            FACADE + OBSERVER
      __fixtures__/robots.ts        datos reales de Go2 y G1 para tests
      __tests__/testDoubles.ts      SocketFalso, fetchFalso, json()
    capture/
      captureStore.ts               CaptureStore
      csv.ts                        generarCsv, nombreArchivoCsv, descargarCsv
    ui/
      tokens.css                    tokens del estilo "Banco de laboratorio"
      theme.ts                      tema de Mantine
      format.ts                     formatearNumero, estadoTemperatura, plural
      charts.ts                     registro de Chart.js + plugin crosshair
    components/
      ConnectionBadge.tsx (+ .module.css)
      ServerAddress.tsx (+ .module.css)
      ErrorConexion.tsx (+ .module.css)
      TopBar.tsx (+ .module.css)
      Panel.tsx (+ .module.css)     contenedor común de panel
      TemperaturaBadge.tsx (+ .module.css)
      MotorTable.tsx (+ .module.css)
      LineChart.tsx                 envoltorio de react-chartjs-2
      ImuPanel.tsx (+ .module.css)
      BmsPanel.tsx (+ .module.css)
      FeetPanel.tsx (+ .module.css)
      Aviso.tsx (+ .module.css)     aviso en línea con transición
      CapturaControles.tsx
    dev/
      escenarios.ts                 generadores de datos "peor caso" y "G1"
      fuenteFicticia.ts             fetch y WebSocket falsos para desarrollo
      SelectorDatos.tsx (+ .module.css)
    test/
      setup.ts                      jest-dom, cleanup, matchMedia, ResizeObserver
      render.tsx                    renderUi(): Mantine + instancias
```

Los tests viven junto al código como `*.test.ts(x)`. Los tests de la capa de datos corren en entorno `node`; los de componentes declaran `// @vitest-environment jsdom` en la primera línea.

---

### Task 1: Proyecto base, herramientas y CI

**Files:**
- Create: `package.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `postcss.config.cjs`, `eslint.config.js`, `.prettierrc.json`, `.github/workflows/ci.yml`, `README.md`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/ui/tokens.css`, `src/ui/theme.ts`
- Copy: `D:\cafeclub-analytics\.claude\skills\` → `.claude/skills/`

**Interfaces:**
- Produces: `theme` (export de `src/ui/theme.ts`), clases globales `.presionable`; scripts npm `dev`, `build`, `test`, `lint`, `typecheck`, `format`.

- [ ] **Step 1: Crear la rama de trabajo**

```bash
cd /d/GitHub/robotica-dashboard
git checkout -b etapa-1
```

- [ ] **Step 2: Crear `package.json`**

```json
{
  "name": "robotica-dashboard",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit -p tsconfig.json && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "format": "prettier --write ."
  }
}
```

- [ ] **Step 3: Instalar dependencias**

```bash
npm install react react-dom @mantine/core@8 @mantine/hooks@8 chart.js react-chartjs-2 @fontsource/barlow
npm install -D vite @vitejs/plugin-react typescript@5.9 @types/react @types/react-dom vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event postcss postcss-preset-mantine eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals prettier
```

Expected: termina sin errores de resolución de peers. Si npm marca conflicto de peers entre React 19 y Mantine 8, correr `npm view @mantine/core@8 peerDependencies` y ajustar a lo que declare; no usar `--force`.

- [ ] **Step 4: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Telemetría Unitree</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 6: Crear `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
```

- [ ] **Step 7: Crear `postcss.config.cjs`**

```js
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
  },
};
```

- [ ] **Step 8: Crear `eslint.config.js`**

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', '.claude', '.superpowers'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
```

- [ ] **Step 9: Crear `.prettierrc.json`**

```json
{ "singleQuote": true, "printWidth": 100, "trailingComma": "all" }
```

- [ ] **Step 10: Crear `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 11: Crear `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => cleanup());

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  })) as unknown as typeof window.matchMedia;

  class ResizeObserverFalso {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver ??= ResizeObserverFalso as unknown as typeof ResizeObserver;
}
```

- [ ] **Step 12: Crear `src/ui/tokens.css`**

```css
:root {
  --c-fondo: #e9ecef;
  --c-tinta: #1e252c;
  --c-tinta-2: #52606d;
  --c-apagado: #7b8794;
  --c-panel: #ffffff;
  --c-borde: #cbd2d9;
  --c-borde-suave: #e4e7eb;
  --c-divisor: #9aa5b1;
  --c-barra: #1e252c;
  --c-barra-2: #2e3a46;
  --c-barra-texto: #e9ecef;
  --c-barra-tenue: #9fb3c8;
  --c-senal: #1f5fbf;
  --c-serie-2: #b4540a;
  --c-normal-fondo: #e3f4e8;
  --c-normal: #1b6b3a;
  --c-elevada-fondo: #fff3c4;
  --c-elevada: #7a5b00;
  --c-critica-fondo: #fde2e1;
  --c-critica: #9b1c1c;
  --c-vivo: #4cc38a;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --escala: 1;
}

[data-presentacion='true'] {
  --escala: 1.45;
}

html,
body {
  margin: 0;
  background: var(--c-fondo);
  color: var(--c-tinta);
  font-family: 'Barlow', system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}

.presionable {
  transition: transform 160ms ease-out;
}

.presionable:active:not(:disabled):not([data-disabled]) {
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .presionable:active:not(:disabled):not([data-disabled]) {
    transform: none;
  }
}
```

- [ ] **Step 13: Crear `src/ui/theme.ts`**

```ts
import { createTheme, type MantineColorsTuple } from '@mantine/core';

const senal: MantineColorsTuple = [
  '#e8f0fb',
  '#cfdff5',
  '#a3c1ea',
  '#74a1de',
  '#4c85d3',
  '#3473cc',
  '#1f5fbf',
  '#1a52a6',
  '#14468e',
  '#0d3875',
];

export const theme = createTheme({
  fontFamily: "'Barlow', system-ui, sans-serif",
  headings: { fontFamily: "'Barlow', system-ui, sans-serif" },
  primaryColor: 'senal',
  primaryShade: 6,
  colors: { senal },
  defaultRadius: 'sm',
  activeClassName: 'presionable',
});
```

- [ ] **Step 14: Crear `src/App.tsx` provisorio y su test**

`src/App.tsx`:

```tsx
export function App() {
  return <h1>Telemetría Unitree</h1>;
}
```

`src/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('muestra el título', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Telemetría Unitree' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 15: Crear `src/main.tsx` provisorio**

```tsx
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@mantine/core/styles.css';
import './ui/tokens.css';
import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { theme } from './ui/theme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
);
```

- [ ] **Step 16: Crear `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
  push:
    branches-ignore: [main]

jobs:
  verificar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npx vite build
```

- [ ] **Step 17: Crear `README.md`**

````markdown
# Dashboard de telemetría Unitree

Dashboard web que muestra en vivo la telemetría de un robot Unitree (Go2 o G1) a partir de la API
de la cátedra (TP de Robótica, UADE). Diseño en `docs/superpowers/specs/`.

## Levantar el backend de la cátedra (modo demo)

Del repo `tsamaan/UadeRobotLab`, carpeta `05LaboratoriosTPs/TP05_Desarrollo_de_Aplicaciones_II/entorno`:

```bash
pip install fastapi uvicorn websockets
python arrancar_api.py --demo --robot go2   # o --robot g1
```

Sin el paquete `websockets`, el endpoint `/ws` no existe y el dashboard trabaja por polling.

## Levantar el dashboard

```bash
npm install
npm run dev
```

Abrí la URL que muestra Vite. La dirección del backend se cambia desde la barra superior o con
`?server=10.0.0.5:8001` en la URL.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm test` | tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | chequeo de tipos |
| `npm run build` | build de producción |

En desarrollo, el selector de abajo permite cambiar entre el backend real y datos de prueba
("Peor caso", "G1").
````

- [ ] **Step 18: Copiar las skills de diseño**

```bash
mkdir -p /d/GitHub/robotica-dashboard/.claude
cp -r /d/cafeclub-analytics/.claude/skills /d/GitHub/robotica-dashboard/.claude/skills
ls /d/GitHub/robotica-dashboard/.claude/skills
grep -ril "hooks" /d/GitHub/robotica-dashboard/.claude/skills/impeccable --include=*.json || echo "sin archivos de hooks"
```

Expected: aparecen `emil-design-eng`, `break-ui`, `review-animations`, `impeccable`, `taste-skill`, `_licencias`, `SOURCES.md` y el resto; el `grep` no encuentra configuración de hooks.

- [ ] **Step 19: Verificar todo**

```bash
npm test && npm run lint && npm run typecheck && npm run build
```

Expected: 1 test pasa; lint y tipos sin errores; build genera `dist/`.

- [ ] **Step 20: Commit**

```bash
git add -A
git commit -m "Crear proyecto base con Vite, React, Mantine y CI"
```

---

### Task 2: Contrato, modelo, Observer y Adapter

**Files:**
- Create: `src/telemetry/contract.ts`, `src/telemetry/model.ts`, `src/telemetry/observer.ts`, `src/telemetry/adapter.ts`, `src/telemetry/__fixtures__/robots.ts`
- Test: `src/telemetry/adapter.test.ts`, `src/telemetry/observer.test.ts`

**Interfaces:**
- Produces:
  - `type Num = number | null`
  - `interface Motor { id: number; nombre: string; angulo: Num; velocidad: Num; torque: Num; temperatura: Num }`
  - `interface Imu { roll: Num; pitch: Num; yaw: Num; ax: Num; ay: Num; az: Num }`
  - `interface Bateria { soc: Num; corrienteMa: Num; temperatura: Num; celdas: number[]; disponible: boolean }`
  - `type Contacto = 'apoyada' | 'en_el_aire' | 'desconocido'`
  - `interface Telemetria { modelo: string; ts: number; recibidaEn: number; motores: Motor[]; imu: Imu; bateria: Bateria; patas: Record<string, Contacto> }`
  - `interface RobotInfo { modelo: string; nombre: string; tipo: string; motores: string[]; patas: string[]; frecuenciaHz: number; modo: string }`
  - `class Emisor<T> { subscribe(oyente: (valor: T) => void): () => void; protected emitir(valor: T): void }`
  - `adaptarInfo(raw: unknown): RobotInfo`
  - `adaptarTelemetria(raw: unknown, info: RobotInfo | null, recibidaEn: number): Telemetria`
  - Fixtures: `infoGo2`, `telemetriaGo2`, `infoG1`, `telemetriaG1()`

- [ ] **Step 1: Crear `src/telemetry/contract.ts`**

```ts
// Shape of the backend JSON as documented in the course's API.md (TP05).
export interface MotorDTO {
  id: number;
  nombre: string;
  angulo: number;
  velocidad: number;
  torque: number;
  temperatura: number;
}

export interface ImuDTO {
  roll: number;
  pitch: number;
  yaw: number;
  ax: number;
  ay: number;
  az: number;
}

export interface BmsDTO {
  soc: number;
  corriente: number;
  temperatura: number;
  celdas: number[];
}

export interface TelemetriaDTO {
  modelo: string;
  ts: number;
  motores: MotorDTO[];
  imu: ImuDTO;
  bms: BmsDTO;
  fuerzas: Record<string, number>;
}

export interface InfoDTO {
  modelo: string;
  nombre: string;
  tipo: string;
  n_motores: number;
  motores_nombres: string[];
  patas: string[];
  frecuencia_hz: number;
  modo: string;
}
```

- [ ] **Step 2: Crear `src/telemetry/model.ts`**

```ts
// App-side model. Every measured value can be missing (null); the UI renders it as "—".
export type Num = number | null;

export interface Motor {
  id: number;
  nombre: string;
  angulo: Num;
  velocidad: Num;
  torque: Num;
  temperatura: Num;
}

export interface Imu {
  roll: Num;
  pitch: Num;
  yaw: Num;
  ax: Num;
  ay: Num;
  az: Num;
}

export interface Bateria {
  soc: Num;
  corrienteMa: Num;
  temperatura: Num;
  celdas: number[];
  /** False when the backend only reports the charge (simulator mode). */
  disponible: boolean;
}

export type Contacto = 'apoyada' | 'en_el_aire' | 'desconocido';

export interface Telemetria {
  modelo: string;
  /** Seconds since the backend started. Goes back to ~0 if the backend restarts. */
  ts: number;
  /** Local epoch ms when the message arrived. */
  recibidaEn: number;
  motores: Motor[];
  imu: Imu;
  bateria: Bateria;
  patas: Record<string, Contacto>;
}

export interface RobotInfo {
  modelo: string;
  nombre: string;
  tipo: string;
  motores: string[];
  patas: string[];
  frecuenciaHz: number;
  modo: string;
}
```

- [ ] **Step 3: Crear los fixtures `src/telemetry/__fixtures__/robots.ts`**

Datos reales capturados del backend en modo demo (Go2) y armados a partir de `config.py` (G1).

```ts
import type { InfoDTO, TelemetriaDTO } from '../contract';

const NOMBRES_GO2 = [
  'FR_hip', 'FR_thigh', 'FR_calf',
  'FL_hip', 'FL_thigh', 'FL_calf',
  'RR_hip', 'RR_thigh', 'RR_calf',
  'RL_hip', 'RL_thigh', 'RL_calf',
];

const NOMBRES_G1 = [
  'L_hip_yaw', 'L_hip_roll', 'L_hip_pitch', 'L_knee', 'L_ankle_pitch', 'L_ankle_roll',
  'R_hip_yaw', 'R_hip_roll', 'R_hip_pitch', 'R_knee', 'R_ankle_pitch', 'R_ankle_roll',
  'torso_yaw', 'torso_roll', 'torso_pitch',
  'L_shoulder_pitch', 'L_shoulder_roll', 'L_shoulder_yaw', 'L_elbow', 'L_wrist_roll', 'L_wrist_pitch', 'L_wrist_yaw',
  'R_shoulder_pitch', 'R_shoulder_roll', 'R_shoulder_yaw', 'R_elbow', 'R_wrist_roll', 'R_wrist_pitch', 'R_wrist_yaw',
];

export const infoGo2: InfoDTO = {
  modelo: 'go2',
  nombre: 'Unitree Go2 EDU',
  tipo: 'cuadrupedo',
  n_motores: 12,
  motores_nombres: NOMBRES_GO2,
  patas: ['FR', 'FL', 'RR', 'RL'],
  frecuencia_hz: 10,
  modo: 'demo',
};

const VALORES_GO2: Array<[number, number, number, number]> = [
  [-27.7, -0.321, 4.98, 40.0],
  [-26.72, 0.658, 6.72, 42.0],
  [-20.42, 1.505, 8.12, 42.0],
  [-10.05, 2.053, 8.9, 42.0],
  [2.32, 2.192, 8.9, 41.0],
  [14.22, 1.895, 8.12, 40.0],
  [23.3, 1.22, 6.73, 38.0],
  [27.73, 0.303, 4.99, 36.0],
  [26.65, -0.675, 3.25, 34.0],
  [20.26, -1.519, 1.86, 34.0],
  [9.83, -2.06, 1.09, 34.0],
  [-2.55, -2.191, 1.11, 35.0],
];

export const telemetriaGo2: TelemetriaDTO = {
  modelo: 'go2',
  ts: 5.92,
  motores: VALORES_GO2.map(([angulo, velocidad, torque, temperatura], id) => ({
    id,
    nombre: NOMBRES_GO2[id]!,
    angulo,
    velocidad,
    torque,
    temperatura,
  })),
  imu: { roll: 0.0, pitch: 0.65, yaw: 0.0, ax: -0.082, ay: 0.084, az: 9.81 },
  bms: {
    soc: 92,
    corriente: 1446,
    temperatura: 31.6,
    celdas: [3.718, 3.724, 3.718, 3.703, 3.695, 3.7, 3.714, 3.724],
  },
  fuerzas: { FR: 0, FL: 1, RR: 1, RL: 0 },
};

export const infoG1: InfoDTO = {
  modelo: 'g1',
  nombre: 'Unitree G1 EDU',
  tipo: 'humanoide',
  n_motores: 29,
  motores_nombres: NOMBRES_G1,
  patas: ['R_foot', 'L_foot'],
  frecuencia_hz: 10,
  modo: 'simulador',
};

/** G1 as the simulator reports it: 29 motors and an empty battery block. */
export function telemetriaG1(ts = 3.1): TelemetriaDTO {
  return {
    modelo: 'g1',
    ts,
    motores: NOMBRES_G1.map((nombre, id) => ({
      id,
      nombre,
      angulo: (id % 7) * 4.5 - 12,
      velocidad: ((id % 5) - 2) * 0.4,
      torque: 2 + (id % 4),
      temperatura: 33 + (id % 9),
    })),
    imu: { roll: 0.8, pitch: -1.2, yaw: 140.5, ax: 0.01, ay: -0.02, az: 9.8 },
    bms: { soc: 87, corriente: 0, temperatura: 0, celdas: [] },
    fuerzas: { R_foot: 1, L_foot: 0 },
  };
}
```

- [ ] **Step 4: Escribir el test del Observer `src/telemetry/observer.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { Emisor } from './observer';

class Contador extends Emisor<number> {
  avisar(n: number) {
    this.emitir(n);
  }
}

describe('Emisor', () => {
  it('avisa a cada suscriptor y deja de avisar al desuscribirse', () => {
    const contador = new Contador();
    const a = vi.fn();
    const b = vi.fn();
    const soltarA = contador.subscribe(a);
    contador.subscribe(b);

    contador.avisar(1);
    soltarA();
    contador.avisar(2);

    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenLastCalledWith(2);
  });
});
```

- [ ] **Step 5: Escribir los tests del Adapter `src/telemetry/adapter.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from './adapter';
import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from './__fixtures__/robots';

const info = adaptarInfo(infoGo2);

describe('adaptarInfo', () => {
  it('traduce /info del Go2', () => {
    expect(info).toEqual({
      modelo: 'go2',
      nombre: 'Unitree Go2 EDU',
      tipo: 'cuadrupedo',
      motores: infoGo2.motores_nombres,
      patas: ['FR', 'FL', 'RR', 'RL'],
      frecuenciaHz: 10,
      modo: 'demo',
    });
  });

  it('usa valores por defecto si llega basura', () => {
    expect(adaptarInfo('no es un objeto')).toEqual({
      modelo: 'desconocido',
      nombre: 'Robot sin nombre',
      tipo: '',
      motores: [],
      patas: [],
      frecuenciaHz: 10,
      modo: '',
    });
  });
});

describe('adaptarTelemetria', () => {
  it('traduce la telemetría del Go2', () => {
    const t = adaptarTelemetria(telemetriaGo2, info, 1234);

    expect(t.modelo).toBe('go2');
    expect(t.ts).toBe(5.92);
    expect(t.recibidaEn).toBe(1234);
    expect(t.motores).toHaveLength(12);
    expect(t.motores[0]).toEqual({
      id: 0,
      nombre: 'FR_hip',
      angulo: -27.7,
      velocidad: -0.321,
      torque: 4.98,
      temperatura: 40,
    });
    expect(t.imu.pitch).toBe(0.65);
    expect(t.bateria).toEqual({
      soc: 92,
      corrienteMa: 1446,
      temperatura: 31.6,
      celdas: [3.718, 3.724, 3.718, 3.703, 3.695, 3.7, 3.714, 3.724],
      disponible: true,
    });
    expect(t.patas).toEqual({ FR: 'en_el_aire', FL: 'apoyada', RR: 'apoyada', RL: 'en_el_aire' });
  });

  it('marca la batería como no disponible cuando el simulador la manda vacía', () => {
    const t = adaptarTelemetria(telemetriaG1(), adaptarInfo(infoG1), 0);
    expect(t.bateria).toEqual({
      soc: 87,
      corrienteMa: 0,
      temperatura: 0,
      celdas: [],
      disponible: false,
    });
  });

  it('adapta los 29 motores y los pies del G1', () => {
    const t = adaptarTelemetria(telemetriaG1(), adaptarInfo(infoG1), 0);
    expect(t.motores).toHaveLength(29);
    expect(t.motores[28]?.nombre).toBe('R_wrist_yaw');
    expect(t.patas).toEqual({ R_foot: 'apoyada', L_foot: 'en_el_aire' });
  });

  it('convierte faltantes y no numéricos en null y toma el nombre de /info', () => {
    const raw = {
      modelo: 'go2',
      ts: 1,
      motores: [{ id: 0, angulo: 'x', velocidad: Number.NaN, torque: null }],
      imu: { roll: 1 },
      bms: { soc: 50, celdas: [3.7, 'roto', 3.6] },
      fuerzas: { FR: 1 },
    };
    const t = adaptarTelemetria(raw, info, 0);

    expect(t.motores[0]).toEqual({
      id: 0,
      nombre: 'FR_hip',
      angulo: null,
      velocidad: null,
      torque: null,
      temperatura: null,
    });
    expect(t.imu).toEqual({ roll: 1, pitch: null, yaw: null, ax: null, ay: null, az: null });
    expect(t.bateria.celdas).toEqual([3.7, 3.6]);
    expect(t.patas).toEqual({ FR: 'apoyada', FL: 'desconocido', RR: 'desconocido', RL: 'desconocido' });
  });

  it('limita la carga de la batería a 0-100 % y conserva el signo de la corriente', () => {
    const raw = { ...telemetriaGo2, bms: { soc: 130, corriente: -800, temperatura: 30, celdas: [] } };
    const t = adaptarTelemetria(raw, info, 0);
    expect(t.bateria.soc).toBe(100);
    expect(t.bateria.corrienteMa).toBe(-800);
    expect(t.bateria.disponible).toBe(true);
  });

  it('sin /info toma las patas de las claves de fuerzas', () => {
    const t = adaptarTelemetria(telemetriaGo2, null, 0);
    expect(Object.keys(t.patas)).toEqual(['FR', 'FL', 'RR', 'RL']);
    expect(t.motores[0]?.nombre).toBe('FR_hip');
  });

  it('nunca falla con basura completa', () => {
    const t = adaptarTelemetria(undefined, null, 7);
    expect(t).toEqual({
      modelo: 'desconocido',
      ts: 0,
      recibidaEn: 7,
      motores: [],
      imu: { roll: null, pitch: null, yaw: null, ax: null, ay: null, az: null },
      bateria: { soc: null, corrienteMa: null, temperatura: null, celdas: [], disponible: false },
      patas: {},
    });
  });
});
```

- [ ] **Step 6: Correr los tests y verificar que fallan**

Run: `npx vitest run src/telemetry`
Expected: FAIL, no se encuentran `./observer` ni `./adapter`.

- [ ] **Step 7: Implementar `src/telemetry/observer.ts`**

```ts
export type Oyente<T> = (valor: T) => void;

/** Base of the Observer pattern: subscribers are notified on every emitted value. */
export class Emisor<T> {
  private readonly oyentes = new Set<Oyente<T>>();

  subscribe = (oyente: Oyente<T>): (() => void) => {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  };

  protected emitir(valor: T): void {
    for (const oyente of [...this.oyentes]) oyente(valor);
  }
}
```

- [ ] **Step 8: Implementar `src/telemetry/adapter.ts`**

```ts
import type { Bateria, Contacto, Imu, Motor, Num, RobotInfo, Telemetria } from './model';

// Adapter pattern: translates the backend contract (contract.ts) into the app model (model.ts).
// The input is `unknown` on purpose: nothing coming from the network is trusted.

type Objeto = Record<string, unknown>;

const esObjeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const comoObjeto = (v: unknown): Objeto => (esObjeto(v) ? v : {});

export function numero(v: unknown): Num {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function texto(v: unknown, porDefecto: string): string {
  return typeof v === 'string' && v.length > 0 ? v : porDefecto;
}

function textos(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function adaptarInfo(raw: unknown): RobotInfo {
  const o = comoObjeto(raw);
  return {
    modelo: texto(o.modelo, 'desconocido'),
    nombre: texto(o.nombre, 'Robot sin nombre'),
    tipo: texto(o.tipo, ''),
    motores: textos(o.motores_nombres),
    patas: textos(o.patas),
    frecuenciaHz: numero(o.frecuencia_hz) ?? 10,
    modo: texto(o.modo, ''),
  };
}

function adaptarMotor(raw: unknown, indice: number, nombres: string[]): Motor {
  const o = comoObjeto(raw);
  return {
    id: numero(o.id) ?? indice,
    nombre: texto(o.nombre, nombres[indice] ?? `Motor ${indice}`),
    angulo: numero(o.angulo),
    velocidad: numero(o.velocidad),
    torque: numero(o.torque),
    temperatura: numero(o.temperatura),
  };
}

function adaptarImu(raw: unknown): Imu {
  const o = comoObjeto(raw);
  return {
    roll: numero(o.roll),
    pitch: numero(o.pitch),
    yaw: numero(o.yaw),
    ax: numero(o.ax),
    ay: numero(o.ay),
    az: numero(o.az),
  };
}

function adaptarBateria(raw: unknown): Bateria {
  const o = comoObjeto(raw);
  const soc = numero(o.soc);
  const corrienteMa = numero(o.corriente);
  const temperatura = numero(o.temperatura);
  const celdas = Array.isArray(o.celdas)
    ? o.celdas.map(numero).filter((c): c is number => c !== null)
    : [];
  // The simulator sends current 0, temperature 0 and no cells: only the charge is meaningful.
  const disponible =
    celdas.length > 0 ||
    (corrienteMa !== null && corrienteMa !== 0) ||
    (temperatura !== null && temperatura !== 0);
  return {
    soc: soc === null ? null : Math.min(100, Math.max(0, soc)),
    corrienteMa,
    temperatura,
    celdas,
    disponible,
  };
}

function adaptarPatas(raw: unknown, patasDeInfo: string[]): Record<string, Contacto> {
  const o = comoObjeto(raw);
  const nombres = patasDeInfo.length > 0 ? patasDeInfo : Object.keys(o);
  const patas: Record<string, Contacto> = {};
  for (const nombre of nombres) {
    const v = numero(o[nombre]);
    patas[nombre] = v === null ? 'desconocido' : v > 0 ? 'apoyada' : 'en_el_aire';
  }
  return patas;
}

export function adaptarTelemetria(
  raw: unknown,
  info: RobotInfo | null,
  recibidaEn: number,
): Telemetria {
  const o = comoObjeto(raw);
  const nombres = info?.motores ?? [];
  const motores = Array.isArray(o.motores) ? o.motores : [];
  return {
    modelo: texto(o.modelo, info?.modelo ?? 'desconocido'),
    ts: numero(o.ts) ?? 0,
    recibidaEn,
    motores: motores.map((m, i) => adaptarMotor(m, i, nombres)),
    imu: adaptarImu(o.imu),
    bateria: adaptarBateria(o.bms),
    patas: adaptarPatas(o.fuerzas, info?.patas ?? []),
  };
}
```

Nota: en el test "sin /info", `nombre` sale del JSON (`FR_hip`), por eso pasa aun sin `info`.

- [ ] **Step 9: Correr los tests y verificar que pasan**

Run: `npx vitest run src/telemetry`
Expected: PASS (9 tests).

- [ ] **Step 10: Lint, tipos y commit**

```bash
npm run lint && npm run typecheck
git add src/telemetry
git commit -m "Agregar contrato, modelo, Observer y Adapter de telemetría"
```

---

### Task 3: Dirección del server

**Files:**
- Create: `src/telemetry/serverAddress.ts`
- Test: `src/telemetry/serverAddress.test.ts`

**Interfaces:**
- Produces:
  - `const PUERTO_POR_DEFECTO = 8001`
  - `const DIRECCION_POR_DEFECTO = 'http://localhost:8001'`
  - `normalizarDireccion(entrada: string): string | null` → `http(s)://host:puerto` o `null`
  - `urlWebSocket(direccion: string): string`
  - `direccionInicial(search: string, almacenamiento: Pick<Storage, 'getItem'> | null): string`
  - `guardarDireccion(direccion: string, almacenamiento: Pick<Storage, 'setItem'> | null): void`
  - `hostDeDireccion(direccion: string): string` → `10.0.0.5:8001`

- [ ] **Step 1: Escribir los tests**

```ts
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
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/telemetry/serverAddress.test.ts`
Expected: FAIL, no existe `./serverAddress`.

- [ ] **Step 3: Implementar `src/telemetry/serverAddress.ts`**

```ts
export const PUERTO_POR_DEFECTO = 8001;
export const DIRECCION_POR_DEFECTO = `http://localhost:${PUERTO_POR_DEFECTO}`;
const CLAVE = 'robotica-dashboard.direccion';

/** Accepts "10.0.0.5", "10.0.0.5:8001" or "http://10.0.0.5:8001". Returns null if invalid. */
export function normalizarDireccion(entrada: string): string | null {
  const limpia = entrada.trim().replace(/\/+$/, '');
  if (!limpia) return null;
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
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run src/telemetry/serverAddress.test.ts`
Expected: PASS. Si `10.0.0.5:99999` no da `null` (algunos runtimes aceptan el puerto), agregar en `normalizarDireccion` el chequeo `if (Number(puerto) > 65535) return null;` antes del `return` y volver a correr.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/telemetry/serverAddress.ts src/telemetry/serverAddress.test.ts
git commit -m "Agregar normalización y guardado de la dirección del server"
```

---

### Task 4: Historial del IMU

**Files:**
- Create: `src/telemetry/history.ts`
- Test: `src/telemetry/history.test.ts`

**Interfaces:**
- Consumes: `Emisor` (Task 2), `Telemetria`, `Num` (Task 2), `adaptarTelemetria` y fixtures en el test.
- Produces:
  - `interface PuntoImu { ts: number; roll: Num; pitch: Num; yaw: Num }`
  - `class HistorialImu extends Emisor<readonly PuntoImu[]> { constructor(capacidad?: number); agregar(t: Telemetria): void; vaciar(): void; getPuntos: () => readonly PuntoImu[] }`

- [ ] **Step 1: Escribir los tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { adaptarTelemetria } from './adapter';
import { HistorialImu } from './history';
import { telemetriaGo2 } from './__fixtures__/robots';

const muestra = (ts: number, pitch = 1) =>
  adaptarTelemetria({ ...telemetriaGo2, ts, imu: { ...telemetriaGo2.imu, pitch } }, null, 0);

describe('HistorialImu', () => {
  it('guarda roll, pitch y yaw con su ts', () => {
    const h = new HistorialImu(120);
    h.agregar(muestra(1, 2.5));
    expect(h.getPuntos()).toEqual([{ ts: 1, roll: 0, pitch: 2.5, yaw: 0 }]);
  });

  it('se queda con las últimas N muestras', () => {
    const h = new HistorialImu(3);
    for (let ts = 1; ts <= 5; ts++) h.agregar(muestra(ts));
    expect(h.getPuntos().map((p) => p.ts)).toEqual([3, 4, 5]);
  });

  it('ignora una muestra repetida con el mismo ts', () => {
    const h = new HistorialImu();
    h.agregar(muestra(1));
    h.agregar(muestra(1));
    expect(h.getPuntos()).toHaveLength(1);
  });

  it('vacía el historial cuando ts retrocede (el backend se reinició)', () => {
    const h = new HistorialImu();
    h.agregar(muestra(50));
    h.agregar(muestra(51));
    h.agregar(muestra(0.3));
    expect(h.getPuntos().map((p) => p.ts)).toEqual([0.3]);
  });

  it('devuelve un arreglo nuevo en cada cambio y avisa a los suscriptores', () => {
    const h = new HistorialImu();
    const oyente = vi.fn();
    h.subscribe(oyente);
    const antes = h.getPuntos();
    h.agregar(muestra(1));
    expect(h.getPuntos()).not.toBe(antes);
    expect(oyente).toHaveBeenCalledWith(h.getPuntos());
  });

  it('vaciar avisa solo si había algo', () => {
    const h = new HistorialImu();
    const oyente = vi.fn();
    h.subscribe(oyente);
    h.vaciar();
    expect(oyente).not.toHaveBeenCalled();
    h.agregar(muestra(1));
    h.vaciar();
    expect(h.getPuntos()).toEqual([]);
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/telemetry/history.test.ts`
Expected: FAIL, no existe `./history`.

- [ ] **Step 3: Implementar `src/telemetry/history.ts`**

```ts
import type { Num, Telemetria } from './model';
import { Emisor } from './observer';

export interface PuntoImu {
  ts: number;
  roll: Num;
  pitch: Num;
  yaw: Num;
}

/** Ring buffer for the IMU charts. Each change produces a new array (safe for useSyncExternalStore). */
export class HistorialImu extends Emisor<readonly PuntoImu[]> {
  private puntos: readonly PuntoImu[] = [];

  constructor(private readonly capacidad = 120) {
    super();
  }

  agregar(t: Telemetria): void {
    const ultimo = this.puntos.at(-1);
    if (ultimo && t.ts === ultimo.ts) return;
    // A smaller ts means the backend restarted: old points would draw crossed lines.
    const base = ultimo && t.ts < ultimo.ts ? [] : this.puntos;
    const punto: PuntoImu = { ts: t.ts, roll: t.imu.roll, pitch: t.imu.pitch, yaw: t.imu.yaw };
    this.puntos = [...base, punto].slice(-this.capacidad);
    this.emitir(this.puntos);
  }

  vaciar(): void {
    if (this.puntos.length === 0) return;
    this.puntos = [];
    this.emitir(this.puntos);
  }

  getPuntos = (): readonly PuntoImu[] => this.puntos;
}
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run src/telemetry/history.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/telemetry/history.ts src/telemetry/history.test.ts
git commit -m "Agregar historial del IMU con vaciado al reiniciar el backend"
```

---

### Task 5: Transportes (WebSocket y polling)

**Files:**
- Create: `src/telemetry/transports/transporte.ts`, `src/telemetry/transports/websocket.ts`, `src/telemetry/transports/polling.ts`, `src/telemetry/__tests__/testDoubles.ts`
- Test: `src/telemetry/transports/websocket.test.ts`, `src/telemetry/transports/polling.test.ts`

**Interfaces:**
- Produces:
  - `type TipoError = 'red' | 'sin_datos' | 'http'`
  - `interface ErrorTransporte { tipo: TipoError; detalle: string }`
  - `interface ManejadoresTransporte { alAbrir(): void; alMensaje(datos: unknown): void; alError(error: ErrorTransporte): void; alCerrar(): void }`
  - `interface Transporte { iniciar(m: ManejadoresTransporte): void; detener(): void }`
  - `interface SocketLike { onopen; onmessage; onclose; onerror; close(): void }`
  - `type CrearSocket = (url: string) => SocketLike`; `crearSocketNativo: CrearSocket`
  - `class TransporteWebSocket implements Transporte { constructor(url: string, crearSocket?: CrearSocket) }`
  - `class TransportePolling implements Transporte { constructor(direccion: string, fetchFn?: typeof fetch, intervaloMs?: number, timeoutMs?: number) }`
  - Dobles de prueba: `SocketFalso` (con `abrir()`, `enviar(d)`, `cortar()`, `cerrado`, `static instancias`, `static ultimo()`, `static reiniciar()`), `crearSocketFalso`, `fetchFalso(rutas)`, `json(d)`, `respuesta(status)`.

- [ ] **Step 1: Crear `src/telemetry/transports/transporte.ts`**

```ts
export type TipoError = 'red' | 'sin_datos' | 'http';

export interface ErrorTransporte {
  tipo: TipoError;
  detalle: string;
}

export interface ManejadoresTransporte {
  alAbrir(): void;
  alMensaje(datos: unknown): void;
  alError(error: ErrorTransporte): void;
  alCerrar(): void;
}

/** A way of receiving telemetry. The client switches between implementations. */
export interface Transporte {
  iniciar(manejadores: ManejadoresTransporte): void;
  detener(): void;
}
```

- [ ] **Step 2: Crear los dobles de prueba `src/telemetry/__tests__/testDoubles.ts`**

```ts
import { vi } from 'vitest';
import type { SocketLike } from '../transports/websocket';

export class SocketFalso implements SocketLike {
  static instancias: SocketFalso[] = [];

  static ultimo(): SocketFalso {
    const s = SocketFalso.instancias.at(-1);
    if (!s) throw new Error('No se creó ningún socket');
    return s;
  }

  static reiniciar(): void {
    SocketFalso.instancias = [];
  }

  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  cerrado = false;

  constructor(readonly url: string) {
    SocketFalso.instancias.push(this);
  }

  close(): void {
    this.cerrado = true;
  }

  abrir(): void {
    this.onopen?.({});
  }

  enviar(datos: unknown): void {
    this.onmessage?.({ data: typeof datos === 'string' ? datos : JSON.stringify(datos) });
  }

  cortar(): void {
    this.onclose?.({});
  }
}

export const crearSocketFalso = (url: string): SocketLike => new SocketFalso(url);

export const json = (datos: unknown): Response =>
  new Response(JSON.stringify(datos), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

export const respuesta = (status: number): Response => new Response('', { status });

/** fetch double: routes by pathname; unknown routes behave like a dead server. */
export function fetchFalso(rutas: Record<string, () => Response>) {
  return vi.fn(async (entrada: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const ruta = new URL(String(entrada)).pathname;
    const manejador = rutas[ruta];
    if (!manejador) throw new TypeError('Failed to fetch');
    return manejador();
  });
}
```

- [ ] **Step 3: Escribir el test del WebSocket `src/telemetry/transports/websocket.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearSocketFalso, SocketFalso } from '../__tests__/testDoubles';
import type { ManejadoresTransporte } from './transporte';
import { TransporteWebSocket } from './websocket';

function manejadores(): ManejadoresTransporte & Record<string, ReturnType<typeof vi.fn>> {
  return { alAbrir: vi.fn(), alMensaje: vi.fn(), alError: vi.fn(), alCerrar: vi.fn() };
}

describe('TransporteWebSocket', () => {
  beforeEach(() => SocketFalso.reiniciar());

  it('abre el socket en la URL y reenvía apertura y mensajes', () => {
    const m = manejadores();
    new TransporteWebSocket('ws://10.0.0.5:8001/ws', crearSocketFalso).iniciar(m);
    const s = SocketFalso.ultimo();

    expect(s.url).toBe('ws://10.0.0.5:8001/ws');
    s.abrir();
    s.enviar({ modelo: 'go2' });

    expect(m.alAbrir).toHaveBeenCalledTimes(1);
    expect(m.alMensaje).toHaveBeenCalledWith({ modelo: 'go2' });
  });

  it('avisa un error si el mensaje no es JSON', () => {
    const m = manejadores();
    new TransporteWebSocket('ws://x:1/ws', crearSocketFalso).iniciar(m);
    SocketFalso.ultimo().enviar('esto no es json');
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'http', detalle: 'Mensaje del WebSocket que no es JSON' });
    expect(m.alMensaje).not.toHaveBeenCalled();
  });

  it('avisa el cierre', () => {
    const m = manejadores();
    new TransporteWebSocket('ws://x:1/ws', crearSocketFalso).iniciar(m);
    SocketFalso.ultimo().cortar();
    expect(m.alCerrar).toHaveBeenCalledTimes(1);
  });

  it('detener cierra el socket y no avisa nada más', () => {
    const m = manejadores();
    const t = new TransporteWebSocket('ws://x:1/ws', crearSocketFalso);
    t.iniciar(m);
    const s = SocketFalso.ultimo();
    t.detener();
    s.cortar();
    s.enviar({ a: 1 });
    expect(s.cerrado).toBe(true);
    expect(m.alCerrar).not.toHaveBeenCalled();
    expect(m.alMensaje).not.toHaveBeenCalled();
  });

  it('si crear el socket falla, avisa error y cierre', () => {
    const m = manejadores();
    const roto = () => {
      throw new Error('URL inválida');
    };
    new TransporteWebSocket('ws://x:1/ws', roto).iniciar(m);
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'red', detalle: 'Error: URL inválida' });
    expect(m.alCerrar).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 4: Escribir el test del polling `src/telemetry/transports/polling.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFalso, json, respuesta } from '../__tests__/testDoubles';
import { TransportePolling } from './polling';
import type { ManejadoresTransporte } from './transporte';

function manejadores(): ManejadoresTransporte & Record<string, ReturnType<typeof vi.fn>> {
  return { alAbrir: vi.fn(), alMensaje: vi.fn(), alError: vi.fn(), alCerrar: vi.fn() };
}

describe('TransportePolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pide /telemetria cada 250 ms y avisa la apertura una sola vez', async () => {
    const fetch = fetchFalso({ '/telemetria': () => json({ ts: 1 }) });
    const m = manejadores();
    new TransportePolling('http://10.0.0.5:8001', fetch).iniciar(m);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledWith('http://10.0.0.5:8001/telemetria', expect.anything());
    expect(m.alAbrir).toHaveBeenCalledTimes(1);
    expect(m.alMensaje).toHaveBeenCalledWith({ ts: 1 });

    await vi.advanceTimersByTimeAsync(500);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(m.alAbrir).toHaveBeenCalledTimes(1);
  });

  it('un 503 avisa sin_datos y sigue intentando', async () => {
    const fetch = fetchFalso({ '/telemetria': () => respuesta(503) });
    const m = manejadores();
    new TransportePolling('http://x:1', fetch).iniciar(m);

    await vi.advanceTimersByTimeAsync(260);
    expect(m.alError).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'sin_datos' }));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(m.alAbrir).not.toHaveBeenCalled();
  });

  it('otro error HTTP avisa http', async () => {
    const fetch = fetchFalso({ '/telemetria': () => respuesta(500) });
    const m = manejadores();
    new TransportePolling('http://x:1', fetch).iniciar(m);
    await vi.advanceTimersByTimeAsync(0);
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'http', detalle: 'HTTP 500' });
  });

  it('un server caído avisa red y sigue intentando', async () => {
    const fetch = fetchFalso({});
    const m = manejadores();
    new TransportePolling('http://x:1', fetch).iniciar(m);
    await vi.advanceTimersByTimeAsync(260);
    expect(m.alError).toHaveBeenCalledWith({ tipo: 'red', detalle: 'Failed to fetch' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('detener corta los pedidos', async () => {
    const fetch = fetchFalso({ '/telemetria': () => json({ ts: 1 }) });
    const t = new TransportePolling('http://x:1', fetch);
    t.iniciar(manejadores());
    await vi.advanceTimersByTimeAsync(0);
    t.detener();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reiniciar no deja dos ciclos en paralelo', async () => {
    const fetch = fetchFalso({ '/telemetria': () => json({ ts: 1 }) });
    const t = new TransportePolling('http://x:1', fetch);
    t.iniciar(manejadores());
    t.detener();
    t.iniciar(manejadores());
    await vi.advanceTimersByTimeAsync(250);
    // first cycle of each start was in flight at most once; afterwards a single loop remains
    const llamadasTrasArranque = fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch.mock.calls.length - llamadasTrasArranque).toBe(4);
  });
});
```

- [ ] **Step 5: Correr y verificar que fallan**

Run: `npx vitest run src/telemetry/transports`
Expected: FAIL, no existen `./websocket` ni `./polling`.

- [ ] **Step 6: Implementar `src/telemetry/transports/websocket.ts`**

```ts
import type { ManejadoresTransporte, Transporte } from './transporte';

/** Minimal subset of the browser WebSocket used here (lets tests inject a fake). */
export interface SocketLike {
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  close(): void;
}

export type CrearSocket = (url: string) => SocketLike;

export const crearSocketNativo: CrearSocket = (url) => new WebSocket(url) as unknown as SocketLike;

export class TransporteWebSocket implements Transporte {
  private socket: SocketLike | null = null;

  constructor(
    private readonly url: string,
    private readonly crearSocket: CrearSocket = crearSocketNativo,
  ) {}

  iniciar(m: ManejadoresTransporte): void {
    let socket: SocketLike;
    try {
      socket = this.crearSocket(this.url);
    } catch (error) {
      m.alError({ tipo: 'red', detalle: String(error) });
      m.alCerrar();
      return;
    }
    this.socket = socket;
    socket.onopen = () => m.alAbrir();
    socket.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      let datos: unknown;
      try {
        datos = JSON.parse(ev.data);
      } catch {
        m.alError({ tipo: 'http', detalle: 'Mensaje del WebSocket que no es JSON' });
        return;
      }
      m.alMensaje(datos);
    };
    // A failed socket always fires `close` after `error`; closing is handled there.
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      m.alCerrar();
    };
  }

  detener(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.close();
  }
}
```

- [ ] **Step 7: Implementar `src/telemetry/transports/polling.ts`**

```ts
import type { ManejadoresTransporte, Transporte } from './transporte';

export class TransportePolling implements Transporte {
  private generacion = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private control: AbortController | null = null;
  private abierto = false;

  constructor(
    private readonly direccion: string,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
    private readonly intervaloMs = 250,
    private readonly timeoutMs = 2000,
  ) {}

  iniciar(m: ManejadoresTransporte): void {
    this.detener();
    this.abierto = false;
    void this.ciclo(m, this.generacion);
  }

  detener(): void {
    // Bumping the generation invalidates any request still in flight.
    this.generacion += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.control?.abort();
    this.control = null;
  }

  private async ciclo(m: ManejadoresTransporte, generacion: number): Promise<void> {
    const vigente = () => generacion === this.generacion;
    const control = new AbortController();
    this.control = control;
    const corte = setTimeout(() => control.abort(), this.timeoutMs);
    try {
      const r = await this.fetchFn(`${this.direccion}/telemetria`, {
        signal: control.signal,
        cache: 'no-store',
      });
      if (!vigente()) return;
      if (r.status === 503) {
        m.alError({ tipo: 'sin_datos', detalle: 'El backend todavía no recibió telemetría' });
      } else if (!r.ok) {
        m.alError({ tipo: 'http', detalle: `HTTP ${r.status}` });
      } else {
        const datos: unknown = await r.json();
        if (!vigente()) return;
        if (!this.abierto) {
          this.abierto = true;
          m.alAbrir();
        }
        m.alMensaje(datos);
      }
    } catch (error) {
      if (!vigente()) return;
      m.alError({ tipo: 'red', detalle: error instanceof Error ? error.message : String(error) });
    } finally {
      clearTimeout(corte);
    }
    if (vigente()) {
      this.timer = setTimeout(() => void this.ciclo(m, generacion), this.intervaloMs);
    }
  }
}
```

- [ ] **Step 8: Correr y verificar que pasan**

Run: `npx vitest run src/telemetry/transports`
Expected: PASS (11 tests). Si el último test de polling da otro número, revisar que `detener()` incremente `generacion` y que el ciclo viejo no reprograme; la cuenta esperada es 4 pedidos en 1000 ms (uno cada 250 ms).

- [ ] **Step 9: Commit**

```bash
npm run lint && npm run typecheck
git add src/telemetry/transports src/telemetry/__tests__
git commit -m "Agregar transportes por WebSocket y por polling"
```

---

### Task 6: TelemetryClient (Facade + Observer)

**Files:**
- Create: `src/telemetry/TelemetryClient.ts`
- Test: `src/telemetry/TelemetryClient.test.ts`

**Interfaces:**
- Consumes: `Emisor` (Task 2), `adaptarInfo`, `adaptarTelemetria` (Task 2), `urlWebSocket`, `hostDeDireccion` (Task 3), `TransporteWebSocket`, `TransportePolling`, `CrearSocket`, `crearSocketNativo`, `ErrorTransporte` (Task 5).
- Produces:
  - `type EstadoConexion = 'conectando' | 'en_vivo_ws' | 'en_vivo_polling' | 'reconectando' | 'sin_conexion'`
  - `interface EstadoCliente { direccion: string; conexion: EstadoConexion; info: RobotInfo | null; telemetria: Telemetria | null; ultimoDatoEn: number | null; error: string | null }`
  - `interface DependenciasCliente { fetch: typeof fetch; crearSocket: CrearSocket; ahora: () => number }`
  - `const TIEMPOS`, `const MENSAJES = { sinRespuesta(host: string): string; sinDatos: string }`
  - `class TelemetryClient extends Emisor<EstadoCliente> { constructor(deps?: Partial<DependenciasCliente>); conectar(direccion: string): void; reintentar(): void; desconectar(): void; getEstado: () => EstadoCliente }`

- [ ] **Step 1: Escribir los tests**

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { crearSocketFalso, fetchFalso, json, respuesta, SocketFalso } from './__tests__/testDoubles';
import { infoGo2, telemetriaG1, telemetriaGo2 } from './__fixtures__/robots';
import { MENSAJES, TelemetryClient } from './TelemetryClient';

const DIRECCION = 'http://10.0.0.5:8001';

function crearCliente(rutas: Record<string, () => Response>) {
  const fetch = fetchFalso(rutas);
  const cliente = new TelemetryClient({ fetch, crearSocket: crearSocketFalso, ahora: () => 1000 });
  return { cliente, fetch };
}

const llamadasA = (fetch: ReturnType<typeof fetchFalso>, ruta: string) =>
  fetch.mock.calls.filter(([url]) => new URL(String(url)).pathname === ruta).length;

describe('TelemetryClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    SocketFalso.reiniciar();
  });
  afterEach(() => vi.useRealTimers());

  it('pide /info, abre el WebSocket y entrega la telemetría adaptada', async () => {
    const { cliente, fetch } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);

    expect(llamadasA(fetch, '/info')).toBe(1);
    const s = SocketFalso.ultimo();
    expect(s.url).toBe('ws://10.0.0.5:8001/ws');

    s.abrir();
    expect(cliente.getEstado().conexion).toBe('en_vivo_ws');

    s.enviar(telemetriaGo2);
    const e = cliente.getEstado();
    expect(e.info?.nombre).toBe('Unitree Go2 EDU');
    expect(e.telemetria?.motores).toHaveLength(12);
    expect(e.ultimoDatoEn).toBe(1000);
    expect(e.error).toBeNull();
  });

  it('avisa a los suscriptores en cada cambio', async () => {
    const { cliente } = crearCliente({ '/info': () => json(infoGo2) });
    const oyente = vi.fn();
    cliente.subscribe(oyente);
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().abrir();
    expect(oyente).toHaveBeenLastCalledWith(expect.objectContaining({ conexion: 'en_vivo_ws' }));
  });

  it('si el WebSocket no abre en 3 s, pasa a polling y reintenta el WebSocket a los 15 s', async () => {
    const { cliente, fetch } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => json(telemetriaGo2),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(2999);
    expect(llamadasA(fetch, '/telemetria')).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(SocketFalso.instancias[0]?.cerrado).toBe(true);
    expect(llamadasA(fetch, '/telemetria')).toBeGreaterThan(0);
    expect(cliente.getEstado().conexion).toBe('en_vivo_polling');
    expect(cliente.getEstado().telemetria?.motores).toHaveLength(12);

    await vi.advanceTimersByTimeAsync(15000);
    expect(SocketFalso.instancias).toHaveLength(2);
  });

  it('si el socket se cierra sin abrir (backend sin websockets), pasa a polling', async () => {
    const { cliente } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => json(telemetriaGo2),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().cortar();
    await vi.advanceTimersByTimeAsync(0);
    expect(cliente.getEstado().conexion).toBe('en_vivo_polling');
  });

  it('cuando el WebSocket abre, deja el polling', async () => {
    const { cliente, fetch } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => json(telemetriaGo2),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(3000 + 15000);
    SocketFalso.ultimo().abrir();
    const antes = llamadasA(fetch, '/telemetria');
    await vi.advanceTimersByTimeAsync(2000);
    expect(llamadasA(fetch, '/telemetria')).toBe(antes);
    expect(cliente.getEstado().conexion).toBe('en_vivo_ws');
  });

  it('si un WebSocket que andaba se corta, reconecta esperando 1 s y después 2 s', async () => {
    const { cliente } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    const primero = SocketFalso.ultimo();
    primero.abrir();
    primero.enviar(telemetriaGo2);

    primero.cortar();
    await vi.advanceTimersByTimeAsync(0);
    expect(cliente.getEstado().conexion).toBe('reconectando');

    await vi.advanceTimersByTimeAsync(999);
    expect(SocketFalso.instancias).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(SocketFalso.instancias).toHaveLength(2);

    SocketFalso.ultimo().cortar();
    await vi.advanceTimersByTimeAsync(1999);
    expect(SocketFalso.instancias).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(SocketFalso.instancias).toHaveLength(3);
  });

  it('vuelve a pedir /info si cambia el modelo del robot', async () => {
    const { cliente, fetch } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    const s = SocketFalso.ultimo();
    s.abrir();
    s.enviar(telemetriaG1());
    await vi.advanceTimersByTimeAsync(0);
    expect(llamadasA(fetch, '/info')).toBe(2);
  });

  it('con el server caído muestra sin conexión y qué revisar', async () => {
    const { cliente } = crearCliente({});
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().cortar();
    await vi.advanceTimersByTimeAsync(0);

    const e = cliente.getEstado();
    expect(e.conexion).toBe('sin_conexion');
    expect(e.error).toBe(MENSAJES.sinRespuesta('10.0.0.5:8001'));
  });

  it('reintenta /info cada 2 s hasta que responde', async () => {
    let caido = true;
    const { cliente, fetch } = crearCliente({
      '/info': () => {
        if (caido) throw new TypeError('Failed to fetch');
        return json(infoGo2);
      },
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    expect(cliente.getEstado().info).toBeNull();
    caido = false;
    await vi.advanceTimersByTimeAsync(2000);
    expect(llamadasA(fetch, '/info')).toBe(2);
    expect(cliente.getEstado().info?.modelo).toBe('go2');
  });

  it('con 503 explica que el backend no recibe datos del robot', async () => {
    const { cliente } = crearCliente({
      '/info': () => json(infoGo2),
      '/telemetria': () => respuesta(503),
    });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(3000);
    const e = cliente.getEstado();
    expect(e.conexion).toBe('conectando');
    expect(e.error).toBe(MENSAJES.sinDatos);
  });

  it('conectar a otra dirección cierra lo anterior y empieza de cero', async () => {
    const { cliente } = crearCliente({ '/info': () => json(infoGo2) });
    cliente.conectar(DIRECCION);
    await vi.advanceTimersByTimeAsync(0);
    const viejo = SocketFalso.ultimo();
    viejo.abrir();
    viejo.enviar(telemetriaGo2);

    cliente.conectar('http://192.168.1.20:8001');
    const e = cliente.getEstado();
    expect(viejo.cerrado).toBe(true);
    expect(e.direccion).toBe('http://192.168.1.20:8001');
    expect(e.telemetria).toBeNull();
    expect(e.conexion).toBe('conectando');
    expect(SocketFalso.ultimo().url).toBe('ws://192.168.1.20:8001/ws');
  });

  it('reintentar reconecta a la misma dirección', async () => {
    const { cliente } = crearCliente({});
    cliente.conectar(DIRECCION);
    cliente.reintentar();
    expect(SocketFalso.instancias).toHaveLength(2);
    expect(SocketFalso.ultimo().url).toBe('ws://10.0.0.5:8001/ws');
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/telemetry/TelemetryClient.test.ts`
Expected: FAIL, no existe `./TelemetryClient`.

- [ ] **Step 3: Implementar `src/telemetry/TelemetryClient.ts`**

```ts
import { adaptarInfo, adaptarTelemetria } from './adapter';
import type { RobotInfo, Telemetria } from './model';
import { Emisor } from './observer';
import { hostDeDireccion, urlWebSocket } from './serverAddress';
import { TransportePolling } from './transports/polling';
import type { ErrorTransporte } from './transports/transporte';
import { crearSocketNativo, TransporteWebSocket, type CrearSocket } from './transports/websocket';

export type EstadoConexion =
  | 'conectando'
  | 'en_vivo_ws'
  | 'en_vivo_polling'
  | 'reconectando'
  | 'sin_conexion';

export interface EstadoCliente {
  direccion: string;
  conexion: EstadoConexion;
  info: RobotInfo | null;
  telemetria: Telemetria | null;
  ultimoDatoEn: number | null;
  error: string | null;
}

export interface DependenciasCliente {
  fetch: typeof fetch;
  crearSocket: CrearSocket;
  ahora: () => number;
}

export const TIEMPOS = {
  aperturaWs: 3000,
  reintentoWsDesdePolling: 15000,
  esperasReconexion: [1000, 2000, 4000, 8000, 10000],
  reintentoInfo: 2000,
  pollingMs: 250,
} as const;

export const MENSAJES = {
  sinRespuesta: (host: string) =>
    `No hay respuesta de ${host}. Revisá que el backend esté corriendo y que la dirección sea la que muestra INICIAR_TP05.`,
  sinDatos: 'El backend está levantado pero todavía no recibe datos del robot.',
} as const;

/**
 * Facade over the telemetry transports: callers only `conectar()` and `subscribe()`.
 * Internally prefers the WebSocket, falls back to polling, and reconnects on its own.
 */
export class TelemetryClient extends Emisor<EstadoCliente> {
  private estado: EstadoCliente = {
    direccion: '',
    conexion: 'conectando',
    info: null,
    telemetria: null,
    ultimoDatoEn: null,
    error: null,
  };
  private readonly deps: DependenciasCliente;
  private ws: TransporteWebSocket | null = null;
  private polling: TransportePolling | null = null;
  private wsEnVivo = false;
  private wsEstuvoEnVivo = false;
  private intentosReconexion = 0;
  private pidiendoInfo = false;
  private sesion = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(deps: Partial<DependenciasCliente> = {}) {
    super();
    this.deps = {
      fetch: deps.fetch ?? ((...args) => fetch(...args)),
      crearSocket: deps.crearSocket ?? crearSocketNativo,
      ahora: deps.ahora ?? (() => Date.now()),
    };
  }

  getEstado = (): EstadoCliente => this.estado;

  conectar(direccion: string): void {
    this.detenerTodo();
    this.sesion += 1;
    this.wsEstuvoEnVivo = false;
    this.intentosReconexion = 0;
    this.actualizar({
      direccion,
      conexion: 'conectando',
      info: null,
      telemetria: null,
      ultimoDatoEn: null,
      error: null,
    });
    const sesion = this.sesion;
    void this.pedirInfo(sesion);
    this.intentarWebSocket(sesion);
  }

  reintentar(): void {
    this.conectar(this.estado.direccion);
  }

  desconectar(): void {
    this.detenerTodo();
    this.sesion += 1;
  }

  private actualizar(cambios: Partial<EstadoCliente>): void {
    this.estado = { ...this.estado, ...cambios };
    this.emitir(this.estado);
  }

  private detenerTodo(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.ws?.detener();
    this.ws = null;
    this.polling?.detener();
    this.polling = null;
    this.wsEnVivo = false;
    this.pidiendoInfo = false;
  }

  private programar(fn: () => void, ms: number, sesion: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (sesion === this.sesion) fn();
    }, ms);
    this.timers.add(timer);
    return timer;
  }

  private cancelar(timer: ReturnType<typeof setTimeout>): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  private async pedirInfo(sesion: number): Promise<void> {
    if (this.pidiendoInfo) return;
    this.pidiendoInfo = true;
    let ok = false;
    try {
      const r = await this.deps.fetch(`${this.estado.direccion}/info`, { cache: 'no-store' });
      if (sesion !== this.sesion) return;
      if (r.ok) {
        const info = adaptarInfo(await r.json());
        if (sesion !== this.sesion) return;
        ok = true;
        this.actualizar({ info });
      }
    } catch {
      // Network failure: retried below.
    }
    if (sesion !== this.sesion) return;
    this.pidiendoInfo = false;
    if (!ok) this.programar(() => void this.pedirInfo(sesion), TIEMPOS.reintentoInfo, sesion);
  }

  private intentarWebSocket(sesion: number): void {
    const ws = new TransporteWebSocket(urlWebSocket(this.estado.direccion), this.deps.crearSocket);
    this.ws = ws;
    let abierto = false;
    const corte = this.programar(
      () => {
        if (!abierto) this.falloWebSocket(sesion, ws);
      },
      TIEMPOS.aperturaWs,
      sesion,
    );
    ws.iniciar({
      alAbrir: () => {
        if (this.ws !== ws) return;
        abierto = true;
        this.cancelar(corte);
        this.wsEnVivo = true;
        this.wsEstuvoEnVivo = true;
        this.intentosReconexion = 0;
        this.polling?.detener();
        this.polling = null;
        this.actualizar({ conexion: 'en_vivo_ws', error: null });
      },
      alMensaje: (datos) => {
        if (this.ws === ws) this.recibir(datos, sesion, 'en_vivo_ws');
      },
      alError: () => {},
      alCerrar: () => {
        if (this.ws !== ws) return;
        this.cancelar(corte);
        this.falloWebSocket(sesion, ws);
      },
    });
  }

  private falloWebSocket(sesion: number, ws: TransporteWebSocket): void {
    if (this.ws !== ws) return;
    ws.detener();
    this.ws = null;
    const veniaEnVivo = this.wsEnVivo;
    this.wsEnVivo = false;

    let espera: number;
    if (this.wsEstuvoEnVivo) {
      const esperas = TIEMPOS.esperasReconexion;
      espera = esperas[Math.min(this.intentosReconexion, esperas.length - 1)] ?? 10000;
      this.intentosReconexion += 1;
    } else {
      espera = TIEMPOS.reintentoWsDesdePolling;
    }

    if (veniaEnVivo) this.actualizar({ conexion: 'reconectando' });
    if (!this.polling) this.iniciarPolling(sesion);
    this.programar(() => this.intentarWebSocket(sesion), espera, sesion);
  }

  private iniciarPolling(sesion: number): void {
    const polling = new TransportePolling(this.estado.direccion, this.deps.fetch, TIEMPOS.pollingMs);
    this.polling = polling;
    polling.iniciar({
      alAbrir: () => {},
      alMensaje: (datos) => {
        if (this.polling !== polling || this.wsEnVivo) return;
        this.recibir(datos, sesion, 'en_vivo_polling');
      },
      alError: (error) => {
        if (this.polling !== polling || this.wsEnVivo) return;
        this.reportarError(error);
      },
      alCerrar: () => {},
    });
  }

  private reportarError(error: ErrorTransporte): void {
    const huboDatos = this.estado.telemetria !== null;
    if (error.tipo === 'sin_datos') {
      this.actualizar({ conexion: huboDatos ? 'reconectando' : 'conectando', error: MENSAJES.sinDatos });
      return;
    }
    this.actualizar({
      conexion: huboDatos ? 'reconectando' : 'sin_conexion',
      error: MENSAJES.sinRespuesta(hostDeDireccion(this.estado.direccion)),
    });
  }

  private recibir(datos: unknown, sesion: number, conexion: EstadoConexion): void {
    if (sesion !== this.sesion) return;
    const ahora = this.deps.ahora();
    const telemetria = adaptarTelemetria(datos, this.estado.info, ahora);
    if (this.estado.info && telemetria.modelo !== this.estado.info.modelo) {
      void this.pedirInfo(sesion);
    }
    this.actualizar({ telemetria, ultimoDatoEn: ahora, conexion, error: null });
  }
}
```

- [ ] **Step 4: Correr y verificar que pasan**

Run: `npx vitest run src/telemetry/TelemetryClient.test.ts`
Expected: PASS (12 tests). Si falla "reintentar reconecta", es porque `conectar` no limpió el socket anterior: revisar `detenerTodo()`.

- [ ] **Step 5: Correr toda la capa de datos**

Run: `npx vitest run src/telemetry`
Expected: PASS en todos.

- [ ] **Step 6: Commit**

```bash
npm run lint && npm run typecheck
git add src/telemetry/TelemetryClient.ts src/telemetry/TelemetryClient.test.ts
git commit -m "Agregar cliente de telemetría con caída a polling y reconexión"
```

---

### Task 7: Capturas y CSV

**Files:**
- Create: `src/capture/captureStore.ts`, `src/capture/csv.ts`
- Test: `src/capture/captureStore.test.ts`, `src/capture/csv.test.ts`

**Interfaces:**
- Consumes: `Emisor`, `Telemetria`, `RobotInfo`, `adaptarInfo`, `adaptarTelemetria`, fixtures (Task 2).
- Produces:
  - `interface Captura { numero: number; tomadaEn: number; telemetria: Telemetria; info: RobotInfo }`
  - `class CaptureStore extends Emisor<readonly Captura[]> { capturar(t: Telemetria, info: RobotInfo, ahora?: number): Captura; vaciar(): void; getCapturas: () => readonly Captura[] }`
  - `generarCsv(capturas: readonly Captura[]): string`
  - `nombreArchivoCsv(fecha: Date): string`
  - `descargarCsv(contenido: string, nombre: string): void`

- [ ] **Step 1: Escribir el test del store**

`src/capture/captureStore.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { infoGo2, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { CaptureStore } from './captureStore';

const info = adaptarInfo(infoGo2);
const t = adaptarTelemetria(telemetriaGo2, info, 0);

describe('CaptureStore', () => {
  it('numera las capturas y guarda la hora', () => {
    const store = new CaptureStore();
    const a = store.capturar(t, info, 1000);
    const b = store.capturar(t, info, 2000);
    expect(a.numero).toBe(1);
    expect(b).toEqual({ numero: 2, tomadaEn: 2000, telemetria: t, info });
    expect(store.getCapturas()).toEqual([a, b]);
  });

  it('avisa a los suscriptores con un arreglo nuevo', () => {
    const store = new CaptureStore();
    const oyente = vi.fn();
    store.subscribe(oyente);
    const antes = store.getCapturas();
    store.capturar(t, info, 1);
    expect(store.getCapturas()).not.toBe(antes);
    expect(oyente).toHaveBeenCalledWith(store.getCapturas());
  });

  it('vaciar reinicia la numeración', () => {
    const store = new CaptureStore();
    store.capturar(t, info, 1);
    store.vaciar();
    expect(store.getCapturas()).toEqual([]);
    expect(store.capturar(t, info, 2).numero).toBe(1);
  });
});
```

- [ ] **Step 2: Escribir el test del CSV**

`src/capture/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import type { Captura } from './captureStore';
import { generarCsv, nombreArchivoCsv } from './csv';

const infoA = adaptarInfo(infoGo2);
const FECHA = new Date(2026, 9, 8, 14, 5, 9).getTime();

function captura(numero: number, raw: unknown = telemetriaGo2, info = infoA): Captura {
  return { numero, tomadaEn: FECHA, telemetria: adaptarTelemetria(raw, info, 0), info };
}

const lineas = (csv: string) => csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n');

describe('generarCsv', () => {
  it('empieza con BOM y usa \\r\\n', () => {
    const csv = generarCsv([captura(1)]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('arma el encabezado con celdas y patas del robot', () => {
    expect(lineas(generarCsv([captura(1)]))[0]).toBe(
      [
        'Captura', 'Timestamp', 'Robot', 'Bateria_%', 'Corriente_mA', 'Bateria_Temp_C',
        'Celda_1_V', 'Celda_2_V', 'Celda_3_V', 'Celda_4_V', 'Celda_5_V', 'Celda_6_V', 'Celda_7_V', 'Celda_8_V',
        'Roll_deg', 'Pitch_deg', 'Yaw_deg', 'Acel_X', 'Acel_Y', 'Acel_Z',
        'Fuerza_FR', 'Fuerza_FL', 'Fuerza_RR', 'Fuerza_RL',
        'Motor', 'Indice', 'Angulo_deg', 'Vel_rad_s', 'Torque_Nm', 'Temp_C',
      ].join(','),
    );
  });

  it('escribe una fila por motor por captura, como electroSim', () => {
    const filas = lineas(generarCsv([captura(1), captura(2)]));
    expect(filas).toHaveLength(1 + 24);
    expect(filas[1]).toBe(
      '1,2026-10-08 14:05:09,go2,92,1446,31.6,3.718,3.724,3.718,3.703,3.695,3.7,3.714,3.724,0,0.65,0,-0.082,0.084,9.81,0,1,1,0,FR_hip,0,-27.7,-0.321,4.98,40',
    );
    expect(filas[13]?.startsWith('2,')).toBe(true);
  });

  it('deja vacías las celdas que una captura no tiene y las patas sin dato', () => {
    const infoB = adaptarInfo(infoG1);
    const filas = lineas(generarCsv([captura(1), captura(2, telemetriaG1(), infoB)]));
    const encabezado = filas[0]!.split(',');
    expect(encabezado).toContain('Fuerza_R_foot');
    const filaG1 = filas[13]!.split(',');
    expect(filaG1[encabezado.indexOf('Celda_1_V')]).toBe('');
    expect(filaG1[encabezado.indexOf('Fuerza_FR')]).toBe('');
    expect(filaG1[encabezado.indexOf('Fuerza_R_foot')]).toBe('1');
  });

  it('escribe vacío para valores faltantes y escapa textos con coma o comillas', () => {
    const raw = {
      ...telemetriaGo2,
      motores: [{ id: 0, nombre: 'motor "raro", 1', angulo: null, velocidad: 1, torque: 1, temperatura: 30 }],
    };
    const fila = lineas(generarCsv([captura(1, raw)]))[1]!;
    expect(fila).toContain(',"motor ""raro"", 1",0,,1,1,30');
  });

  it('si la captura no tiene motores igual escribe una fila', () => {
    const raw = { ...telemetriaGo2, motores: [] };
    const filas = lineas(generarCsv([captura(1, raw)]));
    expect(filas).toHaveLength(2);
    expect(filas[1]!.endsWith(',,,,,,')).toBe(true);
  });
});

describe('nombreArchivoCsv', () => {
  it('sigue el formato de electroSim', () => {
    expect(nombreArchivoCsv(new Date(2026, 9, 8, 14, 5, 9))).toBe('motores_20261008_140509.csv');
  });
});
```

- [ ] **Step 3: Correr y verificar que fallan**

Run: `npx vitest run src/capture`
Expected: FAIL, no existen los módulos.

- [ ] **Step 4: Implementar `src/capture/captureStore.ts`**

```ts
import type { RobotInfo, Telemetria } from '../telemetry/model';
import { Emisor } from '../telemetry/observer';

export interface Captura {
  numero: number;
  tomadaEn: number;
  telemetria: Telemetria;
  info: RobotInfo;
}

/** Samples captured during the session (kept in memory, like electroSim). */
export class CaptureStore extends Emisor<readonly Captura[]> {
  private capturas: readonly Captura[] = [];

  capturar(telemetria: Telemetria, info: RobotInfo, ahora = Date.now()): Captura {
    const captura: Captura = { numero: this.capturas.length + 1, tomadaEn: ahora, telemetria, info };
    this.capturas = [...this.capturas, captura];
    this.emitir(this.capturas);
    return captura;
  }

  vaciar(): void {
    this.capturas = [];
    this.emitir(this.capturas);
  }

  getCapturas = (): readonly Captura[] => this.capturas;
}
```

- [ ] **Step 5: Implementar `src/capture/csv.ts`**

```ts
import type { Contacto, Num } from '../telemetry/model';
import type { Captura } from './captureStore';

type Celda = string | number | null | undefined;

const dos = (n: number) => String(n).padStart(2, '0');

function formatoTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

function celda(valor: Celda): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const contacto = (c: Contacto | undefined): Num =>
  c === 'apoyada' ? 1 : c === 'en_el_aire' ? 0 : null;

/** CSV with electroSim's layout: one row per motor per capture, robot-level columns repeated. */
export function generarCsv(capturas: readonly Captura[]): string {
  const maxCeldas = Math.max(0, ...capturas.map((c) => c.telemetria.bateria.celdas.length));
  const patas: string[] = [];
  for (const c of capturas) {
    for (const p of Object.keys(c.telemetria.patas)) if (!patas.includes(p)) patas.push(p);
  }

  const encabezado = [
    'Captura', 'Timestamp', 'Robot', 'Bateria_%', 'Corriente_mA', 'Bateria_Temp_C',
    ...Array.from({ length: maxCeldas }, (_, i) => `Celda_${i + 1}_V`),
    'Roll_deg', 'Pitch_deg', 'Yaw_deg', 'Acel_X', 'Acel_Y', 'Acel_Z',
    ...patas.map((p) => `Fuerza_${p}`),
    'Motor', 'Indice', 'Angulo_deg', 'Vel_rad_s', 'Torque_Nm', 'Temp_C',
  ];

  const filas: Celda[][] = [encabezado];
  for (const c of capturas) {
    const { bateria, imu } = c.telemetria;
    const comunes: Celda[] = [
      c.numero,
      formatoTimestamp(c.tomadaEn),
      c.info.modelo,
      bateria.soc,
      bateria.corrienteMa,
      bateria.temperatura,
      ...Array.from({ length: maxCeldas }, (_, i) => bateria.celdas[i]),
      imu.roll, imu.pitch, imu.yaw, imu.ax, imu.ay, imu.az,
      ...patas.map((p) => contacto(c.telemetria.patas[p])),
    ];
    if (c.telemetria.motores.length === 0) {
      filas.push([...comunes, null, null, null, null, null, null]);
      continue;
    }
    c.telemetria.motores.forEach((m, indice) => {
      filas.push([...comunes, m.nombre, indice, m.angulo, m.velocidad, m.torque, m.temperatura]);
    });
  }

  return '\uFEFF' + filas.map((f) => f.map(celda).join(',')).join('\r\n') + '\r\n';
}

export function nombreArchivoCsv(fecha: Date): string {
  const d = fecha;
  return `motores_${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}_${dos(d.getHours())}${dos(d.getMinutes())}${dos(d.getSeconds())}.csv`;
}

export function descargarCsv(contenido: string, nombre: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 6: Correr y verificar que pasan**

Run: `npx vitest run src/capture`
Expected: PASS (9 tests).

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck
git add src/capture
git commit -m "Agregar capturas y exportación CSV con el formato de electroSim"
```

---

### Task 8: Formato, instancias y hooks

**Files:**
- Create: `src/ui/format.ts`, `src/app/instancias.ts`, `src/app/InstanciasContext.tsx`, `src/app/hooks.ts`, `src/test/render.tsx`
- Test: `src/ui/format.test.ts`, `src/app/instancias.test.ts`, `src/app/hooks.test.tsx`

**Interfaces:**
- Consumes: `TelemetryClient`, `DependenciasCliente`, `EstadoCliente` (Task 6), `HistorialImu`, `PuntoImu` (Task 4), `CaptureStore`, `Captura` (Task 7), `Num`, `Telemetria` (Task 2), `theme` (Task 1).
- Produces:
  - `formatearNumero(v: Num | undefined, decimales: number): string`
  - `type EstadoTemperatura = 'normal' | 'elevada' | 'critica' | 'desconocida'`
  - `UMBRAL_ELEVADA = 40`, `UMBRAL_CRITICA = 60`, `estadoTemperatura(t: Num): EstadoTemperatura`
  - `plural(n: number, singular: string, plural: string): string`
  - `crearInstancias(deps?: Partial<DependenciasCliente>): Instancias` con `Instancias = { cliente: TelemetryClient; historial: HistorialImu; capturas: CaptureStore }`
  - `InstanciasProvider({ instancias, children })`, `useInstancias(): Instancias`
  - `useTelemetria(): EstadoCliente`, `useHistorialImu(): readonly PuntoImu[]`, `useCapturas(): readonly Captura[]`, `useAntiguedad(ultimoDatoEn: number | null, ahora?: () => number): number | null`
  - `renderUi(ui: ReactElement, opciones?: { instancias?: Instancias })` → resultado de `render` más `instancias`

- [ ] **Step 1: Escribir los tests de formato `src/ui/format.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { estadoTemperatura, formatearNumero, plural } from './format';

describe('formatearNumero', () => {
  it('usa coma decimal y decimales fijos', () => {
    expect(formatearNumero(4.98, 2)).toBe('4,98');
    expect(formatearNumero(4.9, 2)).toBe('4,90');
    expect(formatearNumero(2.192, 3)).toBe('2,192');
  });

  it('usa el signo menos tipográfico y no muestra −0', () => {
    expect(formatearNumero(-27.7, 2)).toBe('−27,70');
    expect(formatearNumero(-0.001, 2)).toBe('0,00');
  });

  it('agrupa miles de números grandes', () => {
    expect(formatearNumero(12345.6, 1)).toBe('12.345,6');
  });

  it('muestra — si falta el dato', () => {
    expect(formatearNumero(null, 2)).toBe('—');
    expect(formatearNumero(undefined, 2)).toBe('—');
    expect(formatearNumero(Number.NaN, 2)).toBe('—');
  });
});

describe('estadoTemperatura', () => {
  it.each([
    [39, 'normal'],
    [39.9, 'normal'],
    [40, 'elevada'],
    [59, 'elevada'],
    [60, 'critica'],
    [75, 'critica'],
    [null, 'desconocida'],
  ] as const)('%s °C es %s', (t, esperado) => {
    expect(estadoTemperatura(t)).toBe(esperado);
  });
});

describe('plural', () => {
  it('usa singular solo para 1', () => {
    expect(plural(1, 'muestra', 'muestras')).toBe('1 muestra');
    expect(plural(0, 'muestra', 'muestras')).toBe('0 muestras');
    expect(plural(4, 'muestra', 'muestras')).toBe('4 muestras');
  });
});
```

- [ ] **Step 2: Escribir el test de instancias `src/app/instancias.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearSocketFalso, fetchFalso, json, SocketFalso } from '../telemetry/__tests__/testDoubles';
import { infoGo2, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { crearInstancias } from './instancias';

describe('crearInstancias', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    SocketFalso.reiniciar();
  });
  afterEach(() => vi.useRealTimers());

  it('cada telemetría nueva entra al historial', async () => {
    const { cliente, historial } = crearInstancias({
      fetch: fetchFalso({ '/info': () => json(infoGo2) }),
      crearSocket: crearSocketFalso,
    });
    cliente.conectar('http://x:8001');
    await vi.advanceTimersByTimeAsync(0);
    const s = SocketFalso.ultimo();
    s.abrir();
    s.enviar(telemetriaGo2);
    s.enviar({ ...telemetriaGo2, ts: 6.02 });
    expect(historial.getPuntos().map((p) => p.ts)).toEqual([5.92, 6.02]);
  });

  it('vacía el historial al cambiar de dirección', async () => {
    const { cliente, historial } = crearInstancias({
      fetch: fetchFalso({ '/info': () => json(infoGo2) }),
      crearSocket: crearSocketFalso,
    });
    cliente.conectar('http://x:8001');
    await vi.advanceTimersByTimeAsync(0);
    SocketFalso.ultimo().abrir();
    SocketFalso.ultimo().enviar(telemetriaGo2);
    cliente.conectar('http://y:8001');
    expect(historial.getPuntos()).toEqual([]);
  });
});
```

- [ ] **Step 3: Escribir el test de hooks `src/app/hooks.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAntiguedad } from './hooks';

describe('useAntiguedad', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devuelve null sin datos y se actualiza cada 500 ms', () => {
    let reloj = 10_000;
    const { result, rerender } = renderHook(
      ({ ultimo }: { ultimo: number | null }) => useAntiguedad(ultimo, () => reloj),
      { initialProps: { ultimo: null as number | null } },
    );
    expect(result.current).toBeNull();

    rerender({ ultimo: 10_000 });
    expect(result.current).toBe(0);

    reloj = 12_500;
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(2500);
  });
});
```

- [ ] **Step 4: Correr y verificar que fallan**

Run: `npx vitest run src/ui src/app`
Expected: FAIL, faltan los módulos.

- [ ] **Step 5: Implementar `src/ui/format.ts`**

```ts
import type { Num } from '../telemetry/model';

const formateadores = new Map<number, Intl.NumberFormat>();

function formateador(decimales: number): Intl.NumberFormat {
  let f = formateadores.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
    formateadores.set(decimales, f);
  }
  return f;
}

/** Fixed decimals, comma separator, typographic minus, "—" for missing values. */
export function formatearNumero(v: Num | undefined, decimales: number): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const redondeado = Number(v.toFixed(decimales));
  return formateador(decimales)
    .format(redondeado === 0 ? 0 : redondeado)
    .replace('-', '\u2212');
}

export type EstadoTemperatura = 'normal' | 'elevada' | 'critica' | 'desconocida';

// Same thresholds as electroSim (ui_main.py): >= 40 warning, >= 60 critical.
export const UMBRAL_ELEVADA = 40;
export const UMBRAL_CRITICA = 60;

export function estadoTemperatura(t: Num): EstadoTemperatura {
  if (t === null) return 'desconocida';
  if (t >= UMBRAL_CRITICA) return 'critica';
  if (t >= UMBRAL_ELEVADA) return 'elevada';
  return 'normal';
}

export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}
```

- [ ] **Step 6: Implementar `src/app/instancias.ts`**

```ts
import { CaptureStore } from '../capture/captureStore';
import { HistorialImu } from '../telemetry/history';
import type { Telemetria } from '../telemetry/model';
import { TelemetryClient, type DependenciasCliente } from '../telemetry/TelemetryClient';

export interface Instancias {
  cliente: TelemetryClient;
  historial: HistorialImu;
  capturas: CaptureStore;
}

/** Builds the app's long-lived objects and wires the history as an observer of the client. */
export function crearInstancias(deps?: Partial<DependenciasCliente>): Instancias {
  const cliente = new TelemetryClient(deps);
  const historial = new HistorialImu(120);
  const capturas = new CaptureStore();

  let ultimaTelemetria: Telemetria | null = null;
  let ultimaDireccion = '';
  cliente.subscribe((estado) => {
    if (estado.direccion !== ultimaDireccion) {
      ultimaDireccion = estado.direccion;
      historial.vaciar();
    }
    if (estado.telemetria && estado.telemetria !== ultimaTelemetria) {
      ultimaTelemetria = estado.telemetria;
      historial.agregar(estado.telemetria);
    }
  });

  return { cliente, historial, capturas };
}
```

- [ ] **Step 7: Implementar `src/app/InstanciasContext.tsx`**

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import type { Instancias } from './instancias';

const InstanciasContext = createContext<Instancias | null>(null);

export function InstanciasProvider({
  instancias,
  children,
}: {
  instancias: Instancias;
  children: ReactNode;
}) {
  return <InstanciasContext.Provider value={instancias}>{children}</InstanciasContext.Provider>;
}

export function useInstancias(): Instancias {
  const instancias = useContext(InstanciasContext);
  if (!instancias) throw new Error('useInstancias se usa dentro de InstanciasProvider');
  return instancias;
}
```

- [ ] **Step 8: Implementar `src/app/hooks.ts`**

```ts
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Captura } from '../capture/captureStore';
import type { PuntoImu } from '../telemetry/history';
import type { EstadoCliente } from '../telemetry/TelemetryClient';
import { useInstancias } from './InstanciasContext';

export function useTelemetria(): EstadoCliente {
  const { cliente } = useInstancias();
  return useSyncExternalStore(cliente.subscribe, cliente.getEstado);
}

export function useHistorialImu(): readonly PuntoImu[] {
  const { historial } = useInstancias();
  return useSyncExternalStore(historial.subscribe, historial.getPuntos);
}

export function useCapturas(): readonly Captura[] {
  const { capturas } = useInstancias();
  return useSyncExternalStore(capturas.subscribe, capturas.getCapturas);
}

/** Milliseconds since the last datum, refreshed every 500 ms. Null when nothing arrived yet. */
export function useAntiguedad(
  ultimoDatoEn: number | null,
  ahora: () => number = Date.now,
): number | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (ultimoDatoEn === null) return;
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [ultimoDatoEn]);
  return ultimoDatoEn === null ? null : Math.max(0, ahora() - ultimoDatoEn);
}
```

- [ ] **Step 9: Crear el helper de render `src/test/render.tsx`**

```tsx
import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { crearInstancias, type Instancias } from '../app/instancias';
import { InstanciasProvider } from '../app/InstanciasContext';
import { crearSocketFalso, fetchFalso } from '../telemetry/__tests__/testDoubles';
import { theme } from '../ui/theme';

export function renderUi(ui: ReactElement, opciones: { instancias?: Instancias } = {}) {
  const instancias =
    opciones.instancias ?? crearInstancias({ fetch: fetchFalso({}), crearSocket: crearSocketFalso });
  const resultado = render(
    <MantineProvider theme={theme} forceColorScheme="light">
      <InstanciasProvider instancias={instancias}>{ui}</InstanciasProvider>
    </MantineProvider>,
  );
  return { ...resultado, instancias };
}
```

- [ ] **Step 10: Correr y verificar que pasan**

Run: `npx vitest run src/ui src/app`
Expected: PASS. Si `12345.6` no formatea como `12.345,6`, revisar que Node tenga ICU completo (`node -p "Intl.NumberFormat('es-AR').format(12345.6)"`); en Node 22 oficial viene incluido.

- [ ] **Step 11: Commit**

```bash
npm run lint && npm run typecheck
git add src/ui/format.ts src/ui/format.test.ts src/app src/test/render.tsx
git commit -m "Agregar formato de números, instancias de la app y hooks"
```

---

### Task 9: Barra superior: estado de conexión, dirección y errores

**Files:**
- Create: `src/components/ConnectionBadge.tsx`, `src/components/ConnectionBadge.module.css`, `src/components/ServerAddress.tsx`, `src/components/ServerAddress.module.css`, `src/components/ErrorConexion.tsx`, `src/components/ErrorConexion.module.css`
- Test: `src/components/ConnectionBadge.test.tsx`, `src/components/ServerAddress.test.tsx`, `src/components/ErrorConexion.test.tsx`

**Interfaces:**
- Consumes: `EstadoConexion` (Task 6), `normalizarDireccion`, `guardarDireccion`, `hostDeDireccion` (Task 3), `useTelemetria`, `useInstancias` (Task 8), `renderUi` (Task 8).
- Produces:
  - `ConnectionBadge({ conexion: EstadoConexion; antiguedadMs: number | null })`
  - `const TEXTO_CONEXION: Record<EstadoConexion, string>`
  - `ServerAddress()` (lee y conecta vía hooks)
  - `ErrorConexion()` (muestra `estado.error` con botón Reintentar)

- [ ] **Step 1: Escribir los tests**

`src/components/ConnectionBadge.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { ConnectionBadge } from './ConnectionBadge';

describe('ConnectionBadge', () => {
  it.each([
    ['conectando', 'Conectando'],
    ['en_vivo_ws', 'En vivo · WebSocket'],
    ['en_vivo_polling', 'En vivo · Polling'],
    ['reconectando', 'Reconectando'],
    ['sin_conexion', 'Sin conexión'],
  ] as const)('%s se lee como "%s"', (conexion, texto) => {
    renderUi(<ConnectionBadge conexion={conexion} antiguedadMs={0} />);
    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  it('avisa hace cuánto llegó el último dato si pasaron más de 2 s', () => {
    renderUi(<ConnectionBadge conexion="en_vivo_ws" antiguedadMs={5400} />);
    expect(screen.getByText('último dato hace 5 s')).toBeInTheDocument();
  });

  it('no muestra la antigüedad con datos frescos', () => {
    renderUi(<ConnectionBadge conexion="en_vivo_ws" antiguedadMs={1500} />);
    expect(screen.queryByText(/último dato/)).not.toBeInTheDocument();
  });
});
```

`src/components/ServerAddress.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { ServerAddress } from './ServerAddress';

describe('ServerAddress', () => {
  beforeEach(() => localStorage.clear());

  it('muestra la dirección actual sin el esquema', () => {
    const { instancias } = renderUi(<ServerAddress />);
    act(() => instancias.cliente.conectar('http://10.0.0.5:8001'));
    expect(screen.getByRole('button', { name: /Cambiar dirección/ })).toHaveTextContent('10.0.0.5:8001');
  });

  it('rechaza una dirección inválida con un mensaje', async () => {
    const usuario = userEvent.setup();
    renderUi(<ServerAddress />);
    await usuario.click(screen.getByRole('button', { name: /Cambiar dirección/ }));
    const campo = screen.getByLabelText('Dirección del backend');
    await usuario.clear(campo);
    await usuario.type(campo, 'http://10.0.0.5:8001/docs');
    await usuario.click(screen.getByRole('button', { name: 'Conectar' }));
    expect(screen.getByText('Escribí una dirección como 10.0.0.5:8001')).toBeInTheDocument();
  });

  it('normaliza, guarda y reconecta', async () => {
    const usuario = userEvent.setup();
    const { instancias } = renderUi(<ServerAddress />);
    const conectar = vi.spyOn(instancias.cliente, 'conectar');
    await usuario.click(screen.getByRole('button', { name: /Cambiar dirección/ }));
    const campo = screen.getByLabelText('Dirección del backend');
    await usuario.clear(campo);
    await usuario.type(campo, '10.0.0.7{Enter}');
    expect(conectar).toHaveBeenCalledWith('http://10.0.0.7:8001');
    expect(localStorage.getItem('robotica-dashboard.direccion')).toBe('http://10.0.0.7:8001');
    expect(screen.queryByLabelText('Dirección del backend')).not.toBeInTheDocument();
  });

  it('Esc cancela la edición', async () => {
    const usuario = userEvent.setup();
    renderUi(<ServerAddress />);
    await usuario.click(screen.getByRole('button', { name: /Cambiar dirección/ }));
    await usuario.keyboard('{Escape}');
    expect(screen.queryByLabelText('Dirección del backend')).not.toBeInTheDocument();
  });
});
```

`src/components/ErrorConexion.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocketFalso } from '../telemetry/__tests__/testDoubles';
import { MENSAJES } from '../telemetry/TelemetryClient';
import { renderUi } from '../test/render';
import { ErrorConexion } from './ErrorConexion';

describe('ErrorConexion', () => {
  beforeEach(() => SocketFalso.reiniciar());
  afterEach(() => vi.useRealTimers());

  it('no muestra nada sin error', () => {
    const { container } = renderUi(<ErrorConexion />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el error y reintenta', async () => {
    const usuario = userEvent.setup();
    const { instancias } = renderUi(<ErrorConexion />);
    const reintentar = vi.spyOn(instancias.cliente, 'reintentar');
    act(() => instancias.cliente.conectar('http://10.0.0.5:8001'));
    await act(async () => {
      SocketFalso.ultimo().cortar();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(await screen.findByText(MENSAJES.sinRespuesta('10.0.0.5:8001'))).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reintentar).toHaveBeenCalled();
    instancias.cliente.desconectar();
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/components`
Expected: FAIL, faltan los componentes.

- [ ] **Step 3: Implementar `ConnectionBadge`**

`src/components/ConnectionBadge.module.css`:

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  background: var(--c-barra-2);
  color: var(--c-barra-texto);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--c-apagado);
}

.badge[data-conexion^='en_vivo'] .punto {
  background: var(--c-vivo);
}

.badge[data-conexion='reconectando'] .punto {
  background: #f4cd5c;
}

.badge[data-conexion='sin_conexion'] .punto {
  background: #ff8a80;
}

.antiguedad {
  color: var(--c-barra-tenue);
  font-weight: 500;
}
```

`src/components/ConnectionBadge.tsx`:

```tsx
import type { EstadoConexion } from '../telemetry/TelemetryClient';
import classes from './ConnectionBadge.module.css';

export const TEXTO_CONEXION: Record<EstadoConexion, string> = {
  conectando: 'Conectando',
  en_vivo_ws: 'En vivo · WebSocket',
  en_vivo_polling: 'En vivo · Polling',
  reconectando: 'Reconectando',
  sin_conexion: 'Sin conexión',
};

export const UMBRAL_DATO_VIEJO_MS = 2000;

export function ConnectionBadge({
  conexion,
  antiguedadMs,
}: {
  conexion: EstadoConexion;
  antiguedadMs: number | null;
}) {
  const viejo = antiguedadMs !== null && antiguedadMs > UMBRAL_DATO_VIEJO_MS;
  return (
    <span className={classes.badge} data-conexion={conexion} role="status">
      <span className={classes.punto} aria-hidden />
      <span>{TEXTO_CONEXION[conexion]}</span>
      {viejo && (
        <span className={classes.antiguedad}>
          último dato hace {Math.floor(antiguedadMs / 1000)} s
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Implementar `ServerAddress`**

`src/components/ServerAddress.module.css`:

```css
.direccion {
  border: 0;
  background: var(--c-barra-2);
  color: var(--c-barra-tenue);
  font: 500 13px 'Barlow', sans-serif;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

@media (hover: hover) and (pointer: fine) {
  .direccion:hover {
    color: var(--c-barra-texto);
  }
}

.direccion:focus-visible {
  outline: 2px solid var(--c-senal);
  outline-offset: 2px;
}

.form {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.error {
  color: #ffb4ab;
  font-size: 12px;
  margin-top: 2px;
}
```

`src/components/ServerAddress.tsx`:

```tsx
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
```

- [ ] **Step 5: Implementar `ErrorConexion`**

`src/components/ErrorConexion.module.css`:

```css
.error {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 14px 0;
  padding: 10px 14px;
  border: 1px solid #f5b5b1;
  border-radius: 6px;
  background: var(--c-critica-fondo);
  color: var(--c-critica);
  font-weight: 600;
}

.texto {
  flex: 1;
  min-width: 0;
}
```

`src/components/ErrorConexion.tsx`:

```tsx
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
```

- [ ] **Step 6: Correr y verificar que pasan**

Run: `npx vitest run src/components`
Expected: PASS (11 tests).

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck
git add src/components
git commit -m "Agregar estado de conexión, dirección editable y aviso de error"
```

---

### Task 10: Panel de motores

**Files:**
- Create: `src/components/Panel.tsx`, `src/components/Panel.module.css`, `src/components/TemperaturaBadge.tsx`, `src/components/TemperaturaBadge.module.css`, `src/components/MotorTable.tsx`, `src/components/MotorTable.module.css`
- Test: `src/components/TemperaturaBadge.test.tsx`, `src/components/MotorTable.test.tsx`

**Interfaces:**
- Consumes: `Motor`, `Num` (Task 2), `formatearNumero`, `estadoTemperatura`, `UMBRAL_CRITICA` (Task 8), `renderUi` (Task 8).
- Produces:
  - `Panel({ titulo: string; detalle?: ReactNode; children: ReactNode; className?: string })`
  - `TemperaturaBadge({ temperatura: Num })`
  - `MotorTable({ motores: Motor[]; tamanoGrupo: number; mostrarVelocidad: boolean })`

- [ ] **Step 1: Escribir los tests**

`src/components/TemperaturaBadge.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { TemperaturaBadge } from './TemperaturaBadge';

describe('TemperaturaBadge', () => {
  it.each([
    [39, 'normal', '●', 'Temperatura normal: 39 °C'],
    [40, 'elevada', '▲', 'Temperatura elevada: 40 °C'],
    [59, 'elevada', '▲', 'Temperatura elevada: 59 °C'],
    [60, 'critica', '■', 'Temperatura crítica: 60 °C'],
  ] as const)('%s °C → %s', (t, estado, icono, etiqueta) => {
    renderUi(<TemperaturaBadge temperatura={t} />);
    const badge = screen.getByLabelText(etiqueta);
    expect(badge).toHaveAttribute('data-estado', estado);
    expect(badge).toHaveTextContent(`${icono} ${t} °C`);
  });

  it('con decimales no redondea a un número que contradiga el color', () => {
    renderUi(<TemperaturaBadge temperatura={59.9} />);
    const badge = screen.getByLabelText('Temperatura elevada: 59,9 °C');
    expect(badge).toHaveTextContent('▲ 59,9 °C');
  });

  it('sin dato muestra —', () => {
    renderUi(<TemperaturaBadge temperatura={null} />);
    expect(screen.getByLabelText('Temperatura sin dato')).toHaveTextContent('—');
  });
});
```

`src/components/MotorTable.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from '../telemetry/__fixtures__/robots';
import { renderUi } from '../test/render';
import { MotorTable } from './MotorTable';

const go2 = adaptarTelemetria(telemetriaGo2, adaptarInfo(infoGo2), 0).motores;

describe('MotorTable', () => {
  it('muestra una fila por motor con las columnas de la consigna', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad />);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getAllByRole('row')).toHaveLength(1 + 12);
    for (const titulo of ['Motor', 'Ángulo (°)', 'Velocidad (rad/s)', 'Torque (Nm)', 'Temperatura']) {
      expect(within(tabla).getByRole('columnheader', { name: titulo })).toBeInTheDocument();
    }
    const primera = within(tabla).getAllByRole('row')[1]!;
    expect(primera).toHaveTextContent('FR_hip');
    expect(primera).toHaveTextContent('−27,70');
    expect(primera).toHaveTextContent('−0,321');
    expect(primera).toHaveTextContent('4,98');
  });

  it('marca el fin de cada grupo de 3', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad />);
    const filas = screen.getAllByRole('row').slice(1);
    expect(filas[2]).toHaveAttribute('data-fin-grupo', 'true');
    expect(filas[3]).not.toHaveAttribute('data-fin-grupo');
  });

  it('avisa los motores en estado crítico', () => {
    const calientes = go2.map((m, i) => (i === 9 || i === 2 ? { ...m, temperatura: 63 } : m));
    renderUi(<MotorTable motores={calientes} tamanoGrupo={3} mostrarVelocidad />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '■ Temperatura crítica (60 °C o más): FR_calf, RL_hip',
    );
  });

  it('no muestra alerta sin motores críticos', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('puede ocultar la velocidad (modo presentación)', () => {
    renderUi(<MotorTable motores={go2} tamanoGrupo={3} mostrarVelocidad={false} />);
    expect(screen.queryByRole('columnheader', { name: 'Velocidad (rad/s)' })).not.toBeInTheDocument();
  });

  it('muestra los 29 motores del G1', () => {
    const g1 = adaptarTelemetria(telemetriaG1(), adaptarInfo(infoG1), 0).motores;
    renderUi(<MotorTable motores={g1} tamanoGrupo={0} mostrarVelocidad />);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 29);
  });

  it('sin motores explica que espera datos', () => {
    renderUi(<MotorTable motores={[]} tamanoGrupo={3} mostrarVelocidad />);
    expect(screen.getByText('Esperando datos de los motores.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/components/TemperaturaBadge.test.tsx src/components/MotorTable.test.tsx`
Expected: FAIL, faltan los componentes.

- [ ] **Step 3: Implementar `Panel`**

`src/components/Panel.module.css`:

```css
.panel {
  background: var(--c-panel);
  border: 1px solid var(--c-borde);
  border-radius: 6px;
  padding: 12px 14px;
  min-width: 0;
}

.encabezado {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 8px;
}

.titulo {
  margin: 0;
  font-size: calc(15px * var(--escala));
  font-weight: 600;
  color: var(--c-tinta-2);
}

.detalle {
  font-size: 13px;
  color: var(--c-apagado);
}
```

`src/components/Panel.tsx`:

```tsx
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
```

- [ ] **Step 4: Implementar `TemperaturaBadge`**

`src/components/TemperaturaBadge.module.css`:

```css
.badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  min-width: calc(74px * var(--escala));
  padding: 1px 9px;
  border-radius: 99px;
  font-size: calc(13px * var(--escala));
  font-weight: 600;
  white-space: nowrap;
}

.badge[data-estado='normal'] {
  background: var(--c-normal-fondo);
  color: var(--c-normal);
}

.badge[data-estado='elevada'] {
  background: var(--c-elevada-fondo);
  color: var(--c-elevada);
}

.badge[data-estado='critica'] {
  background: var(--c-critica-fondo);
  color: var(--c-critica);
}

.badge[data-estado='desconocida'] {
  background: var(--c-borde-suave);
  color: var(--c-apagado);
}
```

`src/components/TemperaturaBadge.tsx`:

```tsx
import type { Num } from '../telemetry/model';
import { estadoTemperatura, formatearNumero, type EstadoTemperatura } from '../ui/format';
import classes from './TemperaturaBadge.module.css';

const ICONO: Record<EstadoTemperatura, string> = {
  normal: '●',
  elevada: '▲',
  critica: '■',
  desconocida: '',
};

const NOMBRE: Record<EstadoTemperatura, string> = {
  normal: 'normal',
  elevada: 'elevada',
  critica: 'crítica',
  desconocida: 'sin dato',
};

export function TemperaturaBadge({ temperatura }: { temperatura: Num }) {
  const estado = estadoTemperatura(temperatura);
  // Whole degrees like electroSim, but keep the decimal when present: rounding 59.9 to "60"
  // would show a critical-looking number in a warning color.
  const decimales = temperatura !== null && !Number.isInteger(temperatura) ? 1 : 0;
  const valor = `${formatearNumero(temperatura, decimales)} °C`;
  const etiqueta =
    estado === 'desconocida' ? 'Temperatura sin dato' : `Temperatura ${NOMBRE[estado]}: ${valor}`;
  return (
    <span className={classes.badge} data-estado={estado} aria-label={etiqueta}>
      {estado === 'desconocida' ? '—' : `${ICONO[estado]} ${valor}`}
    </span>
  );
}
```

- [ ] **Step 5: Implementar `MotorTable`**

`src/components/MotorTable.module.css`:

```css
.alerta {
  background: var(--c-critica-fondo);
  color: var(--c-critica);
  border: 1px solid #f5b5b1;
  border-radius: 5px;
  padding: 6px 10px;
  font-weight: 600;
  font-size: calc(14px * var(--escala));
  margin-bottom: 8px;
}

.contenedor {
  max-height: 640px;
  overflow-y: auto;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(14px * var(--escala));
}

.tabla th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--c-panel);
  text-align: right;
  font-weight: 500;
  font-size: 13px;
  color: var(--c-tinta-2);
  padding: 5px 8px;
  border-bottom: 1px solid var(--c-borde);
  white-space: nowrap;
}

.tabla td {
  text-align: right;
  padding: 5px 8px;
  border-bottom: 1px solid var(--c-borde-suave);
  white-space: nowrap;
}

.tabla th:first-child,
.tabla td:first-child {
  text-align: left;
}

.tabla tr[data-fin-grupo='true'] td {
  border-bottom-color: var(--c-divisor);
}

.vacio {
  color: var(--c-apagado);
  padding: 24px 0;
  text-align: center;
}
```

`src/components/MotorTable.tsx`:

```tsx
import type { Motor } from '../telemetry/model';
import { estadoTemperatura, formatearNumero, UMBRAL_CRITICA } from '../ui/format';
import classes from './MotorTable.module.css';
import { TemperaturaBadge } from './TemperaturaBadge';

export function MotorTable({
  motores,
  tamanoGrupo,
  mostrarVelocidad,
}: {
  motores: Motor[];
  /** Rows per visual group (3 = one Go2 leg). 0 disables the dividers. */
  tamanoGrupo: number;
  mostrarVelocidad: boolean;
}) {
  if (motores.length === 0) {
    return <p className={classes.vacio}>Esperando datos de los motores.</p>;
  }

  const criticos = motores.filter((m) => estadoTemperatura(m.temperatura) === 'critica');

  return (
    <>
      {criticos.length > 0 && (
        <div className={classes.alerta} role="alert">
          ■ Temperatura crítica ({UMBRAL_CRITICA} °C o más): {criticos.map((m) => m.nombre).join(', ')}
        </div>
      )}
      <div className={classes.contenedor}>
        <table className={classes.tabla}>
          <thead>
            <tr>
              <th scope="col">Motor</th>
              <th scope="col">Ángulo (°)</th>
              {mostrarVelocidad && <th scope="col">Velocidad (rad/s)</th>}
              <th scope="col">Torque (Nm)</th>
              <th scope="col">Temperatura</th>
            </tr>
          </thead>
          <tbody>
            {motores.map((m, i) => {
              const finGrupo = tamanoGrupo > 0 && (i + 1) % tamanoGrupo === 0 && i < motores.length - 1;
              return (
                <tr key={m.id} data-fin-grupo={finGrupo ? 'true' : undefined}>
                  <td>{m.nombre}</td>
                  <td>{formatearNumero(m.angulo, 2)}</td>
                  {mostrarVelocidad && <td>{formatearNumero(m.velocidad, 3)}</td>}
                  <td>{formatearNumero(m.torque, 2)}</td>
                  <td>
                    <TemperaturaBadge temperatura={m.temperatura} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Correr y verificar que pasan**

Run: `npx vitest run src/components/TemperaturaBadge.test.tsx src/components/MotorTable.test.tsx`
Expected: PASS (13 tests).

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck
git add src/components
git commit -m "Agregar panel de motores con semáforo de temperatura"
```

---

### Task 11: Panel de inclinación (IMU)

**Files:**
- Create: `src/ui/charts.ts`, `src/components/LineChart.tsx`, `src/components/ImuPanel.tsx`, `src/components/ImuPanel.module.css`
- Test: `src/components/ImuPanel.test.tsx`

**Interfaces:**
- Consumes: `PuntoImu` (Task 4), `Imu` (Task 2), `formatearNumero` (Task 8), `Panel` (Task 10).
- Produces:
  - `crosshair` (plugin de Chart.js) y registro global en `src/ui/charts.ts`
  - `interface SerieLinea { nombre: string; color: string; valores: Array<{ x: number; y: number | null }> }`
  - `LineChart({ series: SerieLinea[]; alto: number; ventanaSegundos: number; ejeY: { sugeridoMin?: number; sugeridoMax?: number; sufijo: string }; etiqueta: string })`
  - `ImuPanel({ imu: Imu | null; puntos: readonly PuntoImu[] })`

- [ ] **Step 1: Escribir el test**

`src/components/ImuPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../test/render';
import { ImuPanel } from './ImuPanel';

// vi.mock is hoisted above the imports, so the shared array must be hoisted too.
const { lineas } = vi.hoisted(() => ({
  lineas: [] as Array<{ series: Array<{ nombre: string; valores: unknown[] }> }>,
}));
vi.mock('./LineChart', () => ({
  LineChart: (props: { series: Array<{ nombre: string; valores: unknown[] }>; etiqueta: string }) => {
    lineas.push(props);
    return <div role="img" aria-label={props.etiqueta} />;
  },
}));

const imu = { roll: 0, pitch: -2.07, yaw: 78.2, ax: 0, ay: 0, az: 9.81 };
const puntos = Array.from({ length: 5 }, (_, i) => ({ ts: 10 + i * 0.1, roll: 0, pitch: i, yaw: 78 }));

describe('ImuPanel', () => {
  it('muestra roll, pitch y yaw con un decimal', () => {
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(screen.getByLabelText('Roll')).toHaveTextContent('0,0°');
    expect(screen.getByLabelText('Pitch')).toHaveTextContent('−2,1°');
    expect(screen.getByLabelText('Yaw')).toHaveTextContent('78,2°');
  });

  it('separa yaw de roll y pitch en dos gráficos', () => {
    lineas.length = 0;
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(screen.getByRole('img', { name: 'Gráfico de roll y pitch' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gráfico de yaw' })).toBeInTheDocument();
    expect(lineas[0]?.series.map((s) => s.nombre)).toEqual(['Roll', 'Pitch']);
    expect(lineas[1]?.series.map((s) => s.nombre)).toEqual(['Yaw']);
  });

  it('pasa el tiempo relativo al último punto (0 = ahora)', () => {
    lineas.length = 0;
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    const xs = (lineas[0]?.series[0]?.valores as Array<{ x: number }>).map((v) => v.x);
    expect(xs.at(-1)).toBe(0);
    expect(xs[0]).toBeCloseTo(-0.4);
  });

  it('tiene leyenda visible para roll y pitch', () => {
    renderUi(<ImuPanel imu={imu} puntos={puntos} />);
    expect(screen.getByText('Roll', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByText('Pitch', { selector: 'li' })).toBeInTheDocument();
  });

  it('sin datos muestra —', () => {
    renderUi(<ImuPanel imu={null} puntos={[]} />);
    expect(screen.getByLabelText('Roll')).toHaveTextContent('—');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/components/ImuPanel.test.tsx`
Expected: FAIL, falta `./ImuPanel`.

- [ ] **Step 3: Implementar `src/ui/charts.ts`**

```ts
import {
  Chart,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip);

// Telemetry updates 10 times per second: animating it would only add lag.
Chart.defaults.animation = false;
Chart.defaults.font.family = "'Barlow', system-ui, sans-serif";
Chart.defaults.color = '#7b8794';

/** Vertical guide at the hovered x, so the tooltip value can be read against the line. */
export const crosshair: Plugin<'line'> = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const activos = chart.tooltip?.getActiveElements();
    const primero = activos?.[0];
    if (!primero) return;
    const { x } = primero.element;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = '#9aa5b1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};
```

- [ ] **Step 4: Implementar `src/components/LineChart.tsx`**

```tsx
import type { ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { crosshair } from '../ui/charts';
import { formatearNumero } from '../ui/format';

export interface SerieLinea {
  nombre: string;
  color: string;
  valores: Array<{ x: number; y: number | null }>;
}

export function LineChart({
  series,
  alto,
  ventanaSegundos,
  ejeY,
  etiqueta,
}: {
  series: SerieLinea[];
  alto: number;
  ventanaSegundos: number;
  ejeY: { sugeridoMin?: number; sugeridoMax?: number; sufijo: string };
  etiqueta: string;
}) {
  const opciones = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      normalized: true,
      interaction: { mode: 'index', intersect: false },
      elements: { point: { radius: 0, hoverRadius: 4 }, line: { borderWidth: 2, tension: 0 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `${formatearNumero(items[0]?.parsed.x ?? null, 1)} s`,
            label: (item) =>
              `${item.dataset.label}: ${formatearNumero(item.parsed.y, 2)}${ejeY.sufijo}`,
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: -ventanaSegundos,
          max: 0,
          grid: { display: false },
          ticks: { callback: (v) => `${formatearNumero(Number(v), 0)} s`, maxTicksLimit: 5 },
        },
        y: {
          suggestedMin: ejeY.sugeridoMin,
          suggestedMax: ejeY.sugeridoMax,
          grid: { color: '#e4e7eb' },
          border: { display: false },
          ticks: { callback: (v) => `${formatearNumero(Number(v), 0)}${ejeY.sufijo}`, maxTicksLimit: 5 },
        },
      },
    }),
    [ejeY.sufijo, ejeY.sugeridoMax, ejeY.sugeridoMin, ventanaSegundos],
  );

  const datos = {
    datasets: series.map((s) => ({
      label: s.nombre,
      data: s.valores,
      borderColor: s.color,
      backgroundColor: s.color,
      spanGaps: false,
    })),
  };

  return (
    <div style={{ height: alto, position: 'relative' }} role="img" aria-label={etiqueta}>
      <Line data={datos} options={opciones} plugins={[crosshair]} />
    </div>
  );
}
```

- [ ] **Step 5: Implementar `ImuPanel`**

`src/components/ImuPanel.module.css`:

```css
.valores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.valor {
  font-size: 13px;
  color: var(--c-tinta-2);
}

.valor b {
  display: block;
  font-size: calc(26px * var(--escala));
  font-weight: 700;
  color: var(--c-tinta);
}

.leyenda {
  display: flex;
  gap: 14px;
  list-style: none;
  margin: 2px 0 4px;
  padding: 0;
  font-size: 13px;
  color: var(--c-tinta-2);
}

.leyenda li::before {
  content: '';
  display: inline-block;
  width: 14px;
  height: 2px;
  margin-right: 6px;
  vertical-align: middle;
  background: var(--color);
}

.subtitulo {
  margin: 10px 0 2px;
  font-size: 13px;
  color: var(--c-tinta-2);
}
```

`src/components/ImuPanel.tsx`:

```tsx
import type { CSSProperties } from 'react';
import type { PuntoImu } from '../telemetry/history';
import type { Imu } from '../telemetry/model';
import { formatearNumero } from '../ui/format';
import classes from './ImuPanel.module.css';
import { LineChart } from './LineChart';
import { Panel } from './Panel';

const COLOR_ROLL = '#1f5fbf';
const COLOR_PITCH = '#b4540a';
const COLOR_YAW = '#52606d';

export function ImuPanel({ imu, puntos }: { imu: Imu | null; puntos: readonly PuntoImu[] }) {
  const ultimoTs = puntos.at(-1)?.ts ?? 0;
  const primerTs = puntos[0]?.ts ?? ultimoTs;
  const ventana = Math.max(1, Math.ceil(ultimoTs - primerTs));
  const serie = (clave: 'roll' | 'pitch' | 'yaw') =>
    puntos.map((p) => ({ x: Number((p.ts - ultimoTs).toFixed(3)), y: p[clave] }));

  return (
    <Panel titulo="Inclinación (IMU)" detalle={puntos.length > 1 ? `últimos ${ventana} s` : undefined}>
      <div className={classes.valores}>
        {(['roll', 'pitch', 'yaw'] as const).map((clave) => {
          const nombre = clave[0]!.toUpperCase() + clave.slice(1);
          const valor = formatearNumero(imu?.[clave] ?? null, 1);
          return (
            <div key={clave} className={classes.valor}>
              {nombre}
              <b aria-label={nombre}>{valor === '—' ? valor : `${valor}°`}</b>
            </div>
          );
        })}
      </div>

      <ul className={classes.leyenda}>
        <li style={{ '--color': COLOR_ROLL } as CSSProperties}>Roll</li>
        <li style={{ '--color': COLOR_PITCH } as CSSProperties}>Pitch</li>
      </ul>
      <LineChart
        etiqueta="Gráfico de roll y pitch"
        alto={110}
        ventanaSegundos={ventana}
        ejeY={{ sugeridoMin: -5, sugeridoMax: 5, sufijo: '°' }}
        series={[
          { nombre: 'Roll', color: COLOR_ROLL, valores: serie('roll') },
          { nombre: 'Pitch', color: COLOR_PITCH, valores: serie('pitch') },
        ]}
      />

      <p className={classes.subtitulo}>Yaw (rumbo, con su propia escala)</p>
      <LineChart
        etiqueta="Gráfico de yaw"
        alto={70}
        ventanaSegundos={ventana}
        ejeY={{ sufijo: '°' }}
        series={[{ nombre: 'Yaw', color: COLOR_YAW, valores: serie('yaw') }]}
      />
    </Panel>
  );
}
```

- [ ] **Step 6: Correr y verificar que pasa**

Run: `npx vitest run src/components/ImuPanel.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck
git add src/ui/charts.ts src/components
git commit -m "Agregar panel de inclinación con gráficos de roll, pitch y yaw"
```

---

### Task 12: Paneles de batería y patas

**Files:**
- Create: `src/components/BmsPanel.tsx`, `src/components/BmsPanel.module.css`, `src/components/FeetPanel.tsx`, `src/components/FeetPanel.module.css`
- Test: `src/components/BmsPanel.test.tsx`, `src/components/FeetPanel.test.tsx`

**Interfaces:**
- Consumes: `Bateria`, `Contacto` (Task 2), `formatearNumero` (Task 8), `Panel` (Task 10).
- Produces:
  - `BmsPanel({ bateria: Bateria | null })`
  - `resumenPatas(patas: Record<string, Contacto>): string`
  - `FeetPanel({ patas: Record<string, Contacto>; nombres: string[] })`

- [ ] **Step 1: Escribir los tests**

`src/components/BmsPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { BmsPanel } from './BmsPanel';

const completa = {
  soc: 92,
  corrienteMa: 1446,
  temperatura: 31.6,
  celdas: [3.718, 3.724, 3.718, 3.703, 3.695, 3.7, 3.714, 3.724],
  disponible: true,
};

describe('BmsPanel', () => {
  it('muestra carga, corriente, temperatura y celdas', () => {
    renderUi(<BmsPanel bateria={completa} />);
    expect(screen.getByLabelText('Carga')).toHaveTextContent('92 %');
    expect(screen.getByRole('meter', { name: 'Carga de la batería' })).toHaveAttribute('aria-valuenow', '92');
    expect(screen.getByText('Corriente').nextSibling).toHaveTextContent('1446 mA');
    expect(screen.getByText('Temperatura').nextSibling).toHaveTextContent('31,6 °C');
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByText('Celdas (V) · diferencia máx. 0,029 V')).toBeInTheDocument();
  });

  it('muestra la corriente negativa con signo', () => {
    renderUi(<BmsPanel bateria={{ ...completa, corrienteMa: -800 }} />);
    expect(screen.getByText('Corriente').nextSibling).toHaveTextContent('−800 mA');
  });

  it('en modo simulador explica que solo hay carga', () => {
    renderUi(
      <BmsPanel bateria={{ soc: 87, corrienteMa: 0, temperatura: 0, celdas: [], disponible: false }} />,
    );
    expect(screen.getByLabelText('Carga')).toHaveTextContent('87 %');
    expect(screen.getByText('En este modo el backend solo informa la carga.')).toBeInTheDocument();
    expect(screen.queryByText('Corriente')).not.toBeInTheDocument();
  });

  it('con 16 celdas las dibuja todas', () => {
    renderUi(<BmsPanel bateria={{ ...completa, celdas: Array.from({ length: 16 }, () => 3.7) }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(16);
    expect(screen.getByText('Celdas (V) · diferencia máx. 0,000 V')).toBeInTheDocument();
  });

  it('sin datos muestra —', () => {
    renderUi(<BmsPanel bateria={null} />);
    expect(screen.getByLabelText('Carga')).toHaveTextContent('—');
  });
});
```

`src/components/FeetPanel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../test/render';
import { FeetPanel, resumenPatas } from './FeetPanel';

describe('resumenPatas', () => {
  it.each([
    [{ FR: 'en_el_aire', FL: 'apoyada', RR: 'apoyada', RL: 'apoyada' }, '3 apoyadas · FR en el aire'],
    [{ FR: 'apoyada', FL: 'apoyada', RR: 'apoyada', RL: 'apoyada' }, '4 apoyadas'],
    [{ R_foot: 'apoyada', L_foot: 'en_el_aire' }, '1 apoyada · L_foot en el aire'],
    [{ FR: 'desconocido', FL: 'apoyada' }, '1 apoyada · FR sin dato'],
    [{ FR: 'en_el_aire', FL: 'en_el_aire' }, '0 apoyadas · FR, FL en el aire'],
  ] as const)('%j → %s', (patas, esperado) => {
    expect(resumenPatas(patas)).toBe(esperado);
  });
});

describe('FeetPanel', () => {
  it('dibuja cada pata con su estado', () => {
    renderUi(
      <FeetPanel
        nombres={['FR', 'FL', 'RR', 'RL']}
        patas={{ FR: 'en_el_aire', FL: 'apoyada', RR: 'apoyada', RL: 'apoyada' }}
      />,
    );
    expect(screen.getByLabelText('FR: en el aire')).toBeInTheDocument();
    expect(screen.getByLabelText('FL: apoyada')).toBeInTheDocument();
    expect(screen.getByText('3 apoyadas · FR en el aire')).toBeInTheDocument();
  });

  it('dibuja los pies del G1', () => {
    renderUi(<FeetPanel nombres={['R_foot', 'L_foot']} patas={{ R_foot: 'apoyada', L_foot: 'en_el_aire' }} />);
    expect(screen.getByLabelText('R_foot: apoyada')).toBeInTheDocument();
    expect(screen.getByLabelText('L_foot: en el aire')).toBeInTheDocument();
  });

  it('sin patas lo aclara', () => {
    renderUi(<FeetPanel nombres={[]} patas={{}} />);
    expect(screen.getByText('Este robot no informa el contacto de las patas.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx vitest run src/components/BmsPanel.test.tsx src/components/FeetPanel.test.tsx`
Expected: FAIL, faltan los componentes.

- [ ] **Step 3: Implementar `BmsPanel`**

`src/components/BmsPanel.module.css`:

```css
.carga {
  font-size: calc(34px * var(--escala));
  font-weight: 700;
  line-height: 1.1;
}

.carga small {
  font-size: 15px;
  font-weight: 500;
  color: var(--c-tinta-2);
}

.barra {
  height: 8px;
  background: var(--c-borde-suave);
  border-radius: 4px;
  overflow: hidden;
  margin: 4px 0 8px;
}

.relleno {
  height: 100%;
  background: var(--c-senal);
  border-radius: 4px;
}

.dato {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 2px 0;
}

.dato span:first-child {
  color: var(--c-tinta-2);
}

.celdas {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 46px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.celda {
  flex: 1;
  min-width: 0;
  background: #c9d6e8;
  border-radius: 3px 3px 0 0;
}

.etiquetas {
  display: flex;
  gap: 4px;
  font-size: 10.5px;
  color: var(--c-tinta-2);
}

.etiquetas span {
  flex: 1;
  min-width: 0;
  text-align: center;
  overflow: hidden;
}

.nota {
  font-size: 13px;
  color: var(--c-tinta-2);
  margin: 6px 0 0;
}

.pie {
  font-size: 13px;
  color: var(--c-tinta-2);
  text-align: center;
  margin-top: 6px;
}
```

`src/components/BmsPanel.tsx`:

```tsx
import type { Bateria } from '../telemetry/model';
import { formatearNumero } from '../ui/format';
import classes from './BmsPanel.module.css';
import { Panel } from './Panel';

export function BmsPanel({ bateria }: { bateria: Bateria | null }) {
  const soc = bateria?.soc ?? null;
  const celdas = bateria?.celdas ?? [];
  const min = celdas.length ? Math.min(...celdas) : 0;
  const max = celdas.length ? Math.max(...celdas) : 0;
  const rango = max - min;
  // Scaled to the observed range so the weakest cell stands out; 15 % floor keeps bars visible.
  const alto = (v: number) => (rango > 0 ? 15 + 85 * ((v - min) / rango) : 60);

  return (
    <Panel titulo="Batería">
      <div className={classes.carga} aria-label="Carga">
        {soc === null ? '—' : (
          <>
            {formatearNumero(soc, 0)} <small>%</small>
          </>
        )}
      </div>
      <div
        className={classes.barra}
        role="meter"
        aria-label="Carga de la batería"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={soc ?? undefined}
      >
        <div className={classes.relleno} style={{ width: `${soc ?? 0}%` }} />
      </div>

      {bateria && !bateria.disponible ? (
        <p className={classes.nota}>En este modo el backend solo informa la carga.</p>
      ) : (
        <>
          <div className={classes.dato}>
            <span>Corriente</span>
            <span>{formatearNumero(bateria?.corrienteMa ?? null, 0)} mA</span>
          </div>
          <div className={classes.dato}>
            <span>Temperatura</span>
            <span>{formatearNumero(bateria?.temperatura ?? null, 1)} °C</span>
          </div>
          {celdas.length > 0 && (
            <>
              <ul className={classes.celdas} aria-label="Voltaje por celda">
                {celdas.map((v, i) => (
                  <li
                    key={i}
                    className={classes.celda}
                    style={{ height: `${alto(v)}%` }}
                    aria-label={`Celda ${i + 1}: ${formatearNumero(v, 3)} V`}
                  />
                ))}
              </ul>
              <div className={classes.etiquetas} aria-hidden>
                {celdas.map((v, i) => (
                  <span key={i}>{formatearNumero(v, 3)}</span>
                ))}
              </div>
              <div className={classes.pie}>
                Celdas (V) · diferencia máx. {formatearNumero(rango, 3)} V
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  );
}
```

Nota: el test busca `getAllByRole('listitem')`; si hay más listas en el panel, acotar con `within(screen.getByLabelText('Voltaje por celda'))`.

- [ ] **Step 4: Implementar `FeetPanel`**

`src/components/FeetPanel.module.css`:

```css
.vista {
  display: block;
  margin: 4px auto 0;
  width: calc(150px * var(--escala));
  max-width: 100%;
}

.pie {
  font-size: 13px;
  color: var(--c-tinta-2);
  text-align: center;
  margin-top: 6px;
}

.vacio {
  color: var(--c-apagado);
  font-size: 13px;
}
```

`src/components/FeetPanel.tsx`:

```tsx
import type { Contacto } from '../telemetry/model';
import classes from './FeetPanel.module.css';
import { Panel } from './Panel';

// Top view: front is up. Known names get their real position; anything else goes in a row.
const POSICIONES: Record<string, [number, number]> = {
  FL: [30, 45],
  FR: [130, 45],
  RL: [30, 125],
  RR: [130, 125],
  L_foot: [52, 135],
  R_foot: [108, 135],
};

const TEXTO: Record<Contacto, string> = {
  apoyada: 'apoyada',
  en_el_aire: 'en el aire',
  desconocido: 'sin dato',
};

export function resumenPatas(patas: Record<string, Contacto>): string {
  const nombres = Object.keys(patas);
  const apoyadas = nombres.filter((n) => patas[n] === 'apoyada').length;
  const enElAire = nombres.filter((n) => patas[n] === 'en_el_aire');
  const sinDato = nombres.filter((n) => patas[n] === 'desconocido');
  const partes = [`${apoyadas} ${apoyadas === 1 ? 'apoyada' : 'apoyadas'}`];
  if (enElAire.length) partes.push(`${enElAire.join(', ')} en el aire`);
  if (sinDato.length) partes.push(`${sinDato.join(', ')} sin dato`);
  return partes.join(' · ');
}

export function FeetPanel({
  patas,
  nombres,
}: {
  patas: Record<string, Contacto>;
  nombres: string[];
}) {
  if (nombres.length === 0) {
    return (
      <Panel titulo="Patas">
        <p className={classes.vacio}>Este robot no informa el contacto de las patas.</p>
      </Panel>
    );
  }

  const todasConocidas = nombres.every((n) => n in POSICIONES);
  const posicion = (nombre: string, i: number): [number, number] =>
    todasConocidas ? POSICIONES[nombre]! : [20 + (i * 120) / Math.max(1, nombres.length - 1), 85];

  return (
    <Panel titulo="Patas">
      <svg className={classes.vista} viewBox="0 0 160 170" role="group" aria-label="Robot visto desde arriba">
        <rect x="50" y="30" width="60" height="110" rx="14" fill="#e4e7eb" stroke="#9aa5b1" />
        <text x="80" y="20" textAnchor="middle" fontSize="11" fill="#7b8794">
          frente
        </text>
        {nombres.map((nombre, i) => {
          const [cx, cy] = posicion(nombre, i);
          const estado = patas[nombre] ?? 'desconocido';
          const apoyada = estado === 'apoyada';
          const etiqueta = nombre.replace('_foot', '');
          return (
            <g key={nombre} role="img" aria-label={`${nombre}: ${TEXTO[estado]}`}>
              <circle
                cx={cx}
                cy={cy}
                r="17"
                fill={apoyada ? '#1f5fbf' : '#ffffff'}
                stroke={apoyada ? '#1f5fbf' : '#9aa5b1'}
                strokeWidth="2"
                strokeDasharray={estado === 'en_el_aire' ? '4 3' : undefined}
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={apoyada ? '#ffffff' : '#7b8794'}
              >
                {estado === 'desconocido' ? '?' : etiqueta}
              </text>
            </g>
          );
        })}
      </svg>
      <div className={classes.pie}>{resumenPatas(patas)}</div>
    </Panel>
  );
}
```

- [ ] **Step 5: Correr y verificar que pasan**

Run: `npx vitest run src/components/BmsPanel.test.tsx src/components/FeetPanel.test.tsx`
Expected: PASS (13 tests).

- [ ] **Step 6: Commit**

```bash
npm run lint && npm run typecheck
git add src/components
git commit -m "Agregar paneles de batería y de patas"
```

---

### Task 13: Captura, avisos, modo presentación y armado de la app

**Files:**
- Create: `src/components/Aviso.tsx`, `src/components/Aviso.module.css`, `src/components/CapturaControles.tsx`, `src/components/TopBar.tsx`, `src/components/TopBar.module.css`, `src/App.module.css`
- Modify: `src/App.tsx` (reemplazo completo), `src/App.test.tsx` (reemplazo completo), `src/main.tsx` (reemplazo completo)
- Test: `src/components/CapturaControles.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: todo lo anterior. `useTelemetria`, `useHistorialImu`, `useCapturas`, `useAntiguedad`, `useInstancias` (Task 8); `generarCsv`, `nombreArchivoCsv`, `descargarCsv` (Task 7); componentes de Tasks 9–12; `direccionInicial` (Task 3); `crearInstancias` (Task 8); `theme` (Task 1).
- Produces:
  - `Aviso({ mensaje: { id: number; texto: string } | null })`
  - `CapturaControles()`
  - `TopBar({ presentacion: boolean; onAlternarPresentacion: () => void })`
  - `App()` (usa `useInstancias`)
  - `main.tsx` exporta nada; arranca la app con `crearInstancias(deps)` y `cliente.conectar(direccionInicial(...))`

- [ ] **Step 1: Escribir el test de captura `src/components/CapturaControles.test.tsx`**

```tsx
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

  it('sin datos no deja capturar y sin muestras no deja exportar', () => {
    renderUi(<CapturaControles />);
    expect(screen.getByRole('button', { name: 'Capturar muestra' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Exportar CSV (0)' })).toBeDisabled();
  });

  it('capturar suma una muestra y lo confirma', async () => {
    const usuario = userEvent.setup();
    await conDatos();
    await usuario.click(screen.getByRole('button', { name: 'Capturar muestra' }));
    expect(screen.getByRole('button', { name: 'Exportar CSV (1)' })).toBeEnabled();
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
    expect(contenido.startsWith('\uFEFFCaptura,')).toBe(true);
    expect(nombre).toMatch(/^motores_\d{8}_\d{6}\.csv$/);
    expect(screen.getByRole('status')).toHaveTextContent('CSV exportado · 2 muestras');
  });
});
```

- [ ] **Step 2: Reemplazar el test de la app `src/App.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearInstancias } from './app/instancias';
import { App } from './App';
import { infoGo2, telemetriaGo2 } from './telemetry/__fixtures__/robots';
import { crearSocketFalso, fetchFalso, json, SocketFalso } from './telemetry/__tests__/testDoubles';
import { renderUi } from './test/render';

vi.mock('./components/LineChart', () => ({ LineChart: () => null }));

async function appConDatos() {
  const instancias = crearInstancias({
    fetch: fetchFalso({ '/info': () => json(infoGo2) }),
    crearSocket: crearSocketFalso,
  });
  renderUi(<App />, { instancias });
  await act(async () => {
    instancias.cliente.conectar('http://10.0.0.5:8001');
    await new Promise((r) => setTimeout(r, 0));
    SocketFalso.ultimo().abrir();
    SocketFalso.ultimo().enviar(telemetriaGo2);
  });
  return instancias;
}

describe('App', () => {
  beforeEach(() => SocketFalso.reiniciar());

  it('arma los cuatro paneles y la barra con el robot', async () => {
    await appConDatos();
    expect(screen.getByText('Unitree Go2 EDU')).toBeInTheDocument();
    expect(screen.getByText('cuadrúpedo · 12 motores')).toBeInTheDocument();
    for (const panel of ['Motores', 'Inclinación (IMU)', 'Batería', 'Patas']) {
      expect(screen.getByRole('region', { name: panel })).toBeInTheDocument();
    }
  });

  it('la tecla P alterna el modo presentación y Esc lo apaga', async () => {
    const usuario = userEvent.setup();
    await appConDatos();
    const raiz = screen.getByTestId('raiz');
    await usuario.keyboard('p');
    expect(raiz).toHaveAttribute('data-presentacion', 'true');
    expect(screen.queryByRole('columnheader', { name: 'Velocidad (rad/s)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cambiar dirección/ })).not.toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(raiz).toHaveAttribute('data-presentacion', 'false');
  });

  it('sin conexión todavía muestra que busca el robot', () => {
    renderUi(<App />);
    expect(screen.getByText('Buscando robot…')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Correr y verificar que fallan**

Run: `npx vitest run src/components/CapturaControles.test.tsx src/App.test.tsx`
Expected: FAIL, faltan `CapturaControles` y la App nueva.

- [ ] **Step 4: Implementar `Aviso`**

`src/components/Aviso.module.css`:

```css
.aviso {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-barra-texto);
  background: var(--c-barra-2);
  padding: 4px 10px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  /* Exit: faster than the entrance. */
  transition:
    opacity 120ms ease-out,
    transform 120ms ease-out;
}

.aviso[data-visible='true'] {
  opacity: 1;
  transform: none;
  transition:
    opacity 200ms var(--ease-out),
    transform 200ms var(--ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .aviso,
  .aviso[data-visible='true'] {
    transform: none;
  }
}
```

`src/components/Aviso.tsx`:

```tsx
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
```

- [ ] **Step 5: Implementar `CapturaControles`**

`src/components/CapturaControles.tsx`:

```tsx
import { Button, Tooltip } from '@mantine/core';
import { useRef, useState } from 'react';
import { useCapturas, useTelemetria } from '../app/hooks';
import { useInstancias } from '../app/InstanciasContext';
import { descargarCsv, generarCsv, nombreArchivoCsv } from '../capture/csv';
import { plural } from '../ui/format';
import { Aviso } from './Aviso';

export function CapturaControles() {
  const { capturas: store } = useInstancias();
  const { telemetria, info } = useTelemetria();
  const capturas = useCapturas();
  const [mensaje, setMensaje] = useState<{ id: number; texto: string } | null>(null);
  const contador = useRef(0);

  const avisar = (texto: string) => {
    contador.current += 1;
    setMensaje({ id: contador.current, texto });
  };

  const capturar = () => {
    if (!telemetria || !info) return;
    const captura = store.capturar(telemetria, info);
    avisar(`Muestra ${captura.numero} capturada`);
  };

  const exportar = () => {
    descargarCsv(generarCsv(capturas), nombreArchivoCsv(new Date()));
    avisar(`CSV exportado · ${plural(capturas.length, 'muestra', 'muestras')}`);
  };

  const sinMuestras = capturas.length === 0;

  return (
    <>
      <Aviso mensaje={mensaje} />
      <Button onClick={capturar} disabled={!telemetria || !info}>
        Capturar muestra
      </Button>
      <Tooltip label="Capturá al menos una muestra para exportar" disabled={!sinMuestras}>
        <span>
          <Button color="dark" onClick={exportar} disabled={sinMuestras}>
            Exportar CSV ({capturas.length})
          </Button>
        </span>
      </Tooltip>
    </>
  );
}
```

- [ ] **Step 6: Implementar `TopBar`**

`src/components/TopBar.module.css`:

```css
.barra {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 18px;
  background: var(--c-barra);
  color: var(--c-barra-texto);
}

.robot {
  font-size: calc(18px * var(--escala));
  font-weight: 700;
  white-space: nowrap;
}

.robot small {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--c-barra-tenue);
}

.espacio {
  flex: 1;
}

.acciones {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

`src/components/TopBar.tsx`:

```tsx
import { Button } from '@mantine/core';
import { useAntiguedad, useTelemetria } from '../app/hooks';
import { CapturaControles } from './CapturaControles';
import { ConnectionBadge } from './ConnectionBadge';
import { ServerAddress } from './ServerAddress';
import classes from './TopBar.module.css';

const TIPO: Record<string, string> = { cuadrupedo: 'cuadrúpedo', humanoide: 'humanoide' };

export function TopBar({
  presentacion,
  onAlternarPresentacion,
}: {
  presentacion: boolean;
  onAlternarPresentacion: () => void;
}) {
  const { info, conexion, ultimoDatoEn } = useTelemetria();
  const antiguedad = useAntiguedad(ultimoDatoEn);
  const detalle = info
    ? [TIPO[info.tipo] ?? info.tipo, `${info.motores.length} motores`].filter(Boolean).join(' · ')
    : null;

  return (
    <header className={classes.barra}>
      <div className={classes.robot}>
        {info ? info.nombre : 'Buscando robot…'}
        {detalle && <small>{detalle}</small>}
      </div>
      <ConnectionBadge conexion={conexion} antiguedadMs={antiguedad} />
      {!presentacion && <ServerAddress />}
      <span className={classes.espacio} />
      <div className={classes.acciones}>
        <Button variant="outline" color="gray" onClick={onAlternarPresentacion}>
          {presentacion ? 'Salir de presentación' : 'Modo presentación'}
        </Button>
        <CapturaControles />
      </div>
    </header>
  );
}
```

- [ ] **Step 7: Reemplazar `src/App.tsx` y crear `src/App.module.css`**

`src/App.module.css`:

```css
.raiz {
  min-height: 100vh;
}

.grilla {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  align-items: start;
  transition: opacity 200ms ease;
}

.grilla[data-viejo='true'] {
  opacity: 0.55;
}

.columna {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.dos {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

@media (max-width: 1100px) {
  .grilla {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .dos {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

`src/App.tsx`:

```tsx
import { useHotkeys } from '@mantine/hooks';
import { useState } from 'react';
import { useAntiguedad, useHistorialImu, useTelemetria } from './app/hooks';
import classes from './App.module.css';
import { BmsPanel } from './components/BmsPanel';
import { UMBRAL_DATO_VIEJO_MS } from './components/ConnectionBadge';
import { ErrorConexion } from './components/ErrorConexion';
import { FeetPanel } from './components/FeetPanel';
import { ImuPanel } from './components/ImuPanel';
import { MotorTable } from './components/MotorTable';
import { Panel } from './components/Panel';
import { TopBar } from './components/TopBar';

export function App() {
  const { telemetria, info, ultimoDatoEn } = useTelemetria();
  const puntos = useHistorialImu();
  const antiguedad = useAntiguedad(ultimoDatoEn);
  const [presentacion, setPresentacion] = useState(false);

  // Keyboard-triggered: switches instantly, no animation.
  useHotkeys([
    ['p', () => setPresentacion((v) => !v)],
    ['Escape', () => setPresentacion(false)],
  ]);

  const viejo = antiguedad !== null && antiguedad > UMBRAL_DATO_VIEJO_MS;
  const nombresPatas = info?.patas ?? Object.keys(telemetria?.patas ?? {});

  return (
    <div className={classes.raiz} data-presentacion={presentacion} data-testid="raiz">
      <TopBar presentacion={presentacion} onAlternarPresentacion={() => setPresentacion((v) => !v)} />
      <ErrorConexion />
      <main className={classes.grilla} data-viejo={viejo}>
        <Panel titulo="Motores">
          <MotorTable
            motores={telemetria?.motores ?? []}
            tamanoGrupo={info?.tipo === 'cuadrupedo' ? 3 : 0}
            mostrarVelocidad={!presentacion}
          />
        </Panel>
        <div className={classes.columna}>
          <ImuPanel imu={telemetria?.imu ?? null} puntos={puntos} />
          <div className={classes.dos}>
            <BmsPanel bateria={telemetria?.bateria ?? null} />
            <FeetPanel patas={telemetria?.patas ?? {}} nombres={nombresPatas} />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 8: Reemplazar `src/main.tsx`**

```tsx
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@mantine/core/styles.css';
import './ui/tokens.css';
import { MantineProvider } from '@mantine/core';
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { crearInstancias } from './app/instancias';
import { InstanciasProvider } from './app/InstanciasContext';
import type { DependenciasCliente } from './telemetry/TelemetryClient';
import { direccionInicial } from './telemetry/serverAddress';
import { theme } from './ui/theme';

async function arrancar() {
  let deps: Partial<DependenciasCliente> | undefined;
  let selector: ReactNode = null;
  if (import.meta.env.DEV) {
    const dev = await import('./dev/fuenteFicticia');
    deps = dev.dependenciasDesdeUrl(window.location.search);
    const { SelectorDatos } = await import('./dev/SelectorDatos');
    selector = <SelectorDatos />;
  }

  const instancias = crearInstancias(deps);
  let almacenamiento: Storage | null = null;
  try {
    almacenamiento = window.localStorage;
  } catch {
    almacenamiento = null;
  }
  instancias.cliente.conectar(direccionInicial(window.location.search, almacenamiento));

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MantineProvider theme={theme} forceColorScheme="light">
        <InstanciasProvider instancias={instancias}>
          <App />
          {selector}
        </InstanciasProvider>
      </MantineProvider>
    </StrictMode>,
  );
}

void arrancar();
```

Nota: `./dev/fuenteFicticia` y `./dev/SelectorDatos` se crean en la Task 14. Para que esta task compile sola, crear ahora `src/dev/fuenteFicticia.ts` con

```ts
import type { DependenciasCliente } from '../telemetry/TelemetryClient';

export function dependenciasDesdeUrl(_search: string): Partial<DependenciasCliente> | undefined {
  return undefined;
}
```

y `src/dev/SelectorDatos.tsx` con

```tsx
export function SelectorDatos() {
  return null;
}
```

La Task 14 los reemplaza por completo.

- [ ] **Step 9: Correr y verificar que pasan**

Run: `npx vitest run`
Expected: PASS en toda la suite.

- [ ] **Step 10: Probar a mano contra el backend en modo demo**

En una terminal, desde `D:\GitHub\UadeRobotLab\05LaboratoriosTPs\TP05_Desarrollo_de_Aplicaciones_II\entorno`:

```bash
../../../.venv/Scripts/python arrancar_api.py --demo --robot go2
```

En otra: `npm run dev` y abrir la URL. Verificar: badge "En vivo · WebSocket", tabla con 12 motores que cambian, gráfico de pitch moviéndose, batería con 8 celdas, patas cambiando, Capturar → aviso, Exportar → descarga `motores_*.csv` que abre en Excel con acentos correctos. Cortar el backend (Ctrl+C) y ver "Reconectando", paneles atenuados y "último dato hace N s"; levantarlo de nuevo y ver que vuelve solo.

- [ ] **Step 11: Commit**

```bash
npm run lint && npm run typecheck
git add -A
git commit -m "Armar el dashboard con captura, avisos y modo presentación"
```

---

### Task 14: Datos de prueba en desarrollo (Peor caso y G1)

**Files:**
- Create: `src/dev/escenarios.ts`, `src/dev/SelectorDatos.module.css`
- Modify: `src/dev/fuenteFicticia.ts` (reemplazo completo), `src/dev/SelectorDatos.tsx` (reemplazo completo)
- Test: `src/dev/escenarios.test.ts`

**Interfaces:**
- Consumes: `DependenciasCliente` (Task 6), `SocketLike` (Task 5), `infoG1`, `telemetriaG1`, `infoGo2`, `telemetriaGo2` (Task 2), `adaptarTelemetria`, `adaptarInfo` (Task 2).
- Produces:
  - `type Escenario = 'peor' | 'g1'`
  - `ESCENARIOS: Record<Escenario, { info: unknown; telemetria: (t: number) => unknown }>`
  - `dependenciasDesdeUrl(search: string): Partial<DependenciasCliente> | undefined`
  - `SelectorDatos()` (solo en desarrollo)

- [ ] **Step 1: Escribir el test**

`src/dev/escenarios.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { adaptarInfo, adaptarTelemetria } from '../telemetry/adapter';
import { ESCENARIOS } from './escenarios';

describe('escenario peor caso', () => {
  const { info, telemetria } = ESCENARIOS.peor;
  const t = adaptarTelemetria(telemetria(12), adaptarInfo(info), 0);

  it('cubre los casos extremos del spec', () => {
    const temps = t.motores.map((m) => m.temperatura);
    expect(temps).toContain(40);
    expect(temps).toContain(60);
    expect(temps).toContain(null);
    expect(t.motores.some((m) => m.angulo === null)).toBe(true);
    expect(t.bateria.corrienteMa).toBeLessThan(0);
    expect(t.bateria.celdas).toHaveLength(16);
    expect(t.bateria.soc).toBe(100);
    expect(Object.values(t.patas)).toContain('desconocido');
  });
});

describe('escenario G1', () => {
  it('trae 29 motores, dos pies y batería vacía', () => {
    const { info, telemetria } = ESCENARIOS.g1;
    const t = adaptarTelemetria(telemetria(1), adaptarInfo(info), 0);
    expect(t.motores).toHaveLength(29);
    expect(Object.keys(t.patas)).toEqual(['R_foot', 'L_foot']);
    expect(t.bateria.disponible).toBe(false);
  });

  it('varía con el tiempo', () => {
    const { telemetria } = ESCENARIOS.g1;
    expect(telemetria(1)).not.toEqual(telemetria(2));
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/dev`
Expected: FAIL, falta `./escenarios`.

- [ ] **Step 3: Implementar `src/dev/escenarios.ts`**

```ts
import { infoG1, infoGo2, telemetriaG1, telemetriaGo2 } from '../telemetry/__fixtures__/robots';

export type Escenario = 'peor' | 'g1';

/** Worst realistic data (break-ui): exact thresholds, missing values, charging, 16 cells, unknown foot. */
function peorCaso(t: number): unknown {
  const oscila = Math.sin(t);
  return {
    ...telemetriaGo2,
    ts: t,
    motores: telemetriaGo2.motores.map((m, i) => {
      if (i === 0) return { ...m, temperatura: 40 };
      if (i === 1) return { ...m, temperatura: 60 };
      if (i === 2) return { ...m, temperatura: 59.9 };
      if (i === 3) return { ...m, temperatura: null };
      if (i === 4) return { ...m, angulo: null, velocidad: 'x' };
      if (i === 5) return { ...m, torque: 123456.789, angulo: -179.99 };
      return { ...m, angulo: m.angulo + 10 * oscila };
    }),
    imu: { ...telemetriaGo2.imu, roll: 25 * oscila, pitch: -40 * oscila, yaw: 359.9 },
    bms: {
      soc: 130,
      corriente: -2500,
      temperatura: 58.2,
      celdas: Array.from({ length: 16 }, (_, i) => 3.2 + (i % 5) * 0.12),
    },
    fuerzas: { FR: 1, FL: 0, RR: 1 },
  };
}

function g1EnMovimiento(t: number): unknown {
  const base = telemetriaG1(t);
  return {
    ...base,
    motores: base.motores.map((m, i) => ({ ...m, angulo: m.angulo + 15 * Math.sin(t + i * 0.3) })),
    imu: { ...base.imu, pitch: 3 * Math.sin(t), roll: 2 * Math.cos(t * 0.7) },
    fuerzas: { R_foot: Math.sin(t * 2) > 0 ? 1 : 0, L_foot: Math.sin(t * 2) > 0 ? 0 : 1 },
  };
}

export const ESCENARIOS: Record<Escenario, { info: unknown; telemetria: (t: number) => unknown }> = {
  peor: { info: { ...infoGo2, nombre: 'Unitree Go2 EDU (peor caso)' }, telemetria: peorCaso },
  g1: { info: infoG1, telemetria: g1EnMovimiento },
};
```

- [ ] **Step 4: Reemplazar `src/dev/fuenteFicticia.ts`**

```ts
import type { DependenciasCliente } from '../telemetry/TelemetryClient';
import type { SocketLike } from '../telemetry/transports/websocket';
import { ESCENARIOS, type Escenario } from './escenarios';

const esEscenario = (v: string | null): v is Escenario => v === 'peor' || v === 'g1';

/** Development only: fake fetch and WebSocket that serve a scenario at 10 Hz. */
export function dependenciasDesdeUrl(search: string): Partial<DependenciasCliente> | undefined {
  const pedido = new URLSearchParams(search).get('datos');
  if (!esEscenario(pedido)) return undefined;
  const escenario = ESCENARIOS[pedido];
  const inicio = performance.now();
  const ahora = () => (performance.now() - inicio) / 1000;

  const fetchFicticio: typeof fetch = async (entrada) => {
    const ruta = new URL(String(entrada)).pathname;
    const cuerpo = ruta === '/info' ? escenario.info : escenario.telemetria(ahora());
    return new Response(JSON.stringify(cuerpo), { headers: { 'Content-Type': 'application/json' } });
  };

  const crearSocket = (): SocketLike => {
    const socket: SocketLike = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      close: () => clearInterval(intervalo),
    };
    setTimeout(() => socket.onopen?.({}), 50);
    const intervalo = setInterval(
      () => socket.onmessage?.({ data: JSON.stringify(escenario.telemetria(ahora())) }),
      100,
    );
    return socket;
  };

  return { fetch: fetchFicticio, crearSocket };
}
```

- [ ] **Step 5: Reemplazar `src/dev/SelectorDatos.tsx` y crear su CSS**

`src/dev/SelectorDatos.module.css`:

```css
.selector {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  font-family: system-ui, sans-serif;
}
```

`src/dev/SelectorDatos.tsx`:

```tsx
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
```

- [ ] **Step 6: Correr y verificar que pasan**

Run: `npx vitest run`
Expected: PASS en toda la suite.

- [ ] **Step 7: Verificar que el selector no entra al build**

```bash
npm run build
grep -l "Peor caso" dist/assets/*.js && echo "ERROR: el selector quedó en el build" || echo "OK: no está en el build"
```

Expected: `OK: no está en el build`.

- [ ] **Step 8: Commit**

```bash
npm run lint && npm run typecheck
git add src/dev
git commit -m "Agregar datos de prueba de peor caso y G1 para desarrollo"
```

---

### Task 15: Verificación contra el backend real (Go2 y G1)

**Files:**
- Create: `docs/capturas/` (capturas de pantalla, no se commitean si pesan más de 300 KB cada una)

- [ ] **Step 1: Levantar el backend con Go2**

Desde `D:\GitHub\UadeRobotLab\05LaboratoriosTPs\TP05_Desarrollo_de_Aplicaciones_II\entorno`:

```bash
../../../.venv/Scripts/python arrancar_api.py --demo --robot go2
```

Expected: imprime `BACKEND DE TELEMETRIA TP05 LISTO`.

- [ ] **Step 2: Levantar el dashboard y sacar capturas a 1440 y 1024 px**

`npm run dev` en el repo. Con Playwright (instalado global en `C:\Users\agust\AppData\Roaming\npm\node_modules\playwright`, importar con `import pw from 'file:///C:/Users/agust/AppData/Roaming/npm/node_modules/playwright/index.js'` y `chromium.launch({ channel: 'chrome' })`), escribir un script en el scratchpad que abra `http://localhost:5173`, espere 3 s y guarde capturas a 1440×900 y 1024×768, más una con la tecla `p` presionada.

Expected: 12 motores, gráfico de pitch con curva, 8 celdas, badge "En vivo · WebSocket", sin scroll horizontal a 1024 px.

- [ ] **Step 3: Repetir con G1**

Cortar el backend y levantarlo con `--robot g1`. Recargar el dashboard (o cambiar la dirección para forzar `/info`). Capturar a 1440×900.

Expected: "Unitree G1 EDU · humanoide · 29 motores", tabla con scroll interno y encabezado fijo, sin divisores de grupo, dos pies dibujados.

- [ ] **Step 4: Probar la instalación de fábrica (sin `websockets`)**

```bash
../../../.venv/Scripts/python -m pip uninstall -y websockets
../../../.venv/Scripts/python arrancar_api.py --demo --robot go2
```

Expected: el badge muestra "En vivo · Polling" a los ~3 s y los datos siguen fluyendo. Después reinstalar: `../../../.venv/Scripts/python -m pip install websockets`.

- [ ] **Step 5: Probar el escenario peor caso**

Abrir `http://localhost:5173/?datos=peor` y capturar.

Expected: alerta de temperatura crítica con `FR_thigh`; `FR_hip` en amarillo (`▲ 40 °C`) y `FR_calf` en amarillo (`▲ 59,9 °C`, no "60"); `—` en la temperatura y el ángulo faltantes; corriente `−2500 mA`; 16 celdas; carga 100 %; pata RL `?` y "RL sin dato" en el resumen; torque `123.456,79` sin romper la columna.

- [ ] **Step 6: Anotar lo que no se vea bien**

Si algo de lo esperado no se cumple, corregirlo en el componente correspondiente con su test, correr `npm test`, y commitear el arreglo por separado con un mensaje que describa el problema.

- [ ] **Step 7: Commit (si hubo arreglos o capturas livianas)**

```bash
git add -A
git commit -m "Verificar el dashboard contra el backend con Go2, G1 y polling"
```

---

### Task 16: Revisión final de diseño

Sigue la sección 10 del spec. Esta task **reporta y se detiene**: los arreglos se aplican solo después de que el usuario elija cuáles.

- [ ] **Step 1: dataviz**

Cargar la skill `dataviz`. Revisar los dos gráficos del IMU, el semáforo y las barras de celdas contra `references/anti-patterns.md`. Volver a correr el validador:

```bash
node "<base de la skill dataviz>/scripts/validate_palette.js" "#1F5FBF,#B4540A" --mode light
```

Anotar los hallazgos.

- [ ] **Step 2: break-ui**

Cargar la skill `break-ui` (en `.claude/skills/break-ui`). Usar el selector de desarrollo (Backend real, Peor caso, G1) como su toggle. Revisar a 1440 px, 1024 px y con zoom al 200 %. Producir su tabla "What broke / Decisions for you / What held up".

- [ ] **Step 3: review-animations**

Cargar la skill `review-animations`. Revisar `Aviso.module.css`, `tokens.css` (`.presionable`), la atenuación de `App.module.css` y que nada que cambie a 10 Hz tenga transición. Producir su tabla Before/After/Why.

- [ ] **Step 4: Impeccable**

Cargar la skill `impeccable` (sin hooks). Correr su auditoría sobre el dashboard en marcha.

- [ ] **Step 5: Presentar los hallazgos y detenerse**

Juntar los cuatro reportes en un solo mensaje, ordenados de más a menos grave, con el arreglo propuesto para cada uno. No corregir nada hasta que el usuario diga cuáles aplicar.
