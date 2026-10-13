# Dashboard web de telemetría Unitree — Diseño

Fecha: 2026-10-08 · Equipo: Agustín Pérez + compañero (2 personas) · Materia: Robótica (UADE)

## 1. Objetivo

Construir la versión web del monitor de motores **electroSim** (app de escritorio PyQt6 de la cátedra):
un dashboard en el navegador que consume la API de telemetría que provee la cátedra y muestra en vivo el
estado de un robot Unitree (Go2 o G1).

**Fuentes:**

- Consigna: `TP - Robótica - Dashboard Web de Telemetría.pdf`.
- Backend y contrato: `github.com/tsamaan/UadeRobotLab`, carpeta
  `05LaboratoriosTPs/TP05_Desarrollo_de_Aplicaciones_II` (`API.md`, `LEEME_ESTUDIANTE.md`,
  `LEEME_DOCENTE.md`).
- Referencia de comportamiento: electroSim, en `01Investigacion/recuperadorDatos/unitree_monitor/ui_main.py`
  del mismo repo.

**Criterio de éxito:** cumple la consigna completa (4 paneles, semáforo de temperatura, gráfico IMU con al
menos 60 muestras, capturar y exportar CSV, actualización ≤ 500 ms o WebSocket, funciona en modo demo), deja
visibles los patrones Adapter, Observer y Facade, funciona con Go2 y G1 sin cambios de código, y pasa la
revisión final de diseño (sección 10).

## 2. Alcance

**Etapa 1 (este spec):** todo lo que pide la consigna, más lo que el docente dice que evalúa
(reconexión del WebSocket y uso de `/info` en vez de valores fijos).

**Etapa 2 (fuera de este spec, solo si sobra tiempo):** extras que propone la cátedra o electroSim —
horizonte artificial, gráfico de ángulos de motores en el tiempo, alarma de torque, comparar capturas,
persistir capturas en el navegador.

**Pendiente para más adelante (decisión de Agustín, 2026-10-08):** cómo se entrega y se ejecuta el
dashboard el día del laboratorio (build de un solo archivo, tipografía embebida para trabajar sin
internet, etc.). Queda registrado un hecho para esa discusión: una página publicada por HTTPS no puede
conectarse a `http://` ni `ws://` del robot, así que el dashboard va a tener que correr localmente.

**Restricciones:**

- No se modifica el backend de la cátedra: es el mismo que corre contra el robot real y solo cambia la IP.
- La API es de solo lectura; el dashboard no controla el robot.

## 3. Hechos verificados del backend (2026-10-08)

Probado localmente con `arrancar_api.py --demo --robot go2`:

- Base `http://<IP>:8001`. Endpoints `GET /telemetria`, `/motores`, `/imu`, `/bms`, `/fuerzas`, `/info`,
  `/modo` y `WS /ws`. CORS `*`.
- WebSocket medido a ~9,7 mensajes/s, con el mismo JSON que `/telemetria`.
- **Sin el paquete `websockets` instalado, `/ws` responde 404**, y el script oficial `INICIAR_TP05` solo
  instala `uvicorn`. Por eso el dashboard tiene que pasar a polling cuando el WebSocket no abre.
- En modo simulador, `bms` llega vacío (`corriente: 0`, `temperatura: 0`, `celdas: []`). En `--demo` trae
  8 celdas.
- En `--demo`, roll y yaw valen siempre 0; solo pitch oscila.
- El yaw sale de `atan2` en grados, así que vive en (−180, 180]. El eje del gráfico usa ese rango y el corte
  por vuelta se da al cruzar ±180°.
- `/info` del G1 declara las patas `R_foot` y `L_foot`, aunque `API.md` dice que el G1 no reporta patas.
- `fuerzas` es binario: 1 = apoyada, 0 = en el aire.
- `ts` son segundos desde que arrancó el backend: vuelve a 0 si el backend se reinicia.
- El backend responde 503 mientras todavía no recibió datos del robot.

## 4. Stack

- Vite + React + TypeScript (estricto) + Mantine.
- Chart.js con `react-chartjs-2`, con todas las animaciones apagadas.
- Vitest + Testing Library. ESLint + Prettier.
- Tipografía Barlow.

## 5. Arquitectura

### 5.1 Estructura

```
src/
  telemetry/
    contract.ts          tipos del JSON del server, tal cual API.md
    model.ts             tipos de la app
    adapter.ts           ADAPTER: JSON del server → modelo de la app
    TelemetryClient.ts   FACADE + OBSERVER: conectar, reconectar, subscribe()
    transports/
      websocket.ts       transporte por /ws
      polling.ts         transporte por GET /telemetria cada 250 ms
    history.ts           buffer circular para los gráficos (120 muestras)
    serverAddress.ts     normaliza y guarda la dirección del server
  capture/
    captureStore.ts      muestras capturadas en la sesión
    csv.ts               arma el CSV con el formato de electroSim
  hooks/                 useTelemetry, useHistory, useCaptures
  components/            TopBar, ConnectionBadge, ServerAddress, MotorTable, ImuPanel,
                         BmsPanel, FeetPanel, PresentationToggle
  theme.ts               tokens del estilo visual para Mantine
```

`telemetry/` y `capture/` son TypeScript puro, sin React: se testean de forma aislada.

### 5.2 Patrones

| Patrón | Dónde | Qué resuelve |
|---|---|---|
| Facade | `TelemetryClient` | La app solo pide "conectate a esta dirección" y "avisame cuando haya datos"; no sabe si hay WebSocket o polling. |
| Adapter | `adapter.ts` | Traduce el contrato del server al modelo de la app y completa los faltantes (batería vacía, patas ausentes). |
| Observer | `TelemetryClient.subscribe()` | Paneles, historial y captura se suscriben; React se engancha con `useSyncExternalStore`. |

### 5.3 Flujo de datos

1. La dirección del server se toma, en orden, de `?server=` en la URL, de la última guardada en el
   navegador, o se usa `http://localhost:8001` por defecto.
2. `TelemetryClient` pide `/info` (modelo, nombres de motores, patas) y abre el WebSocket.
3. Si el WebSocket no abre en 3 s, pasa a polling de `/telemetria` cada 250 ms y vuelve a intentar el
   WebSocket cada 15 s.
4. Si una conexión que funcionaba se corta, reintenta con espera creciente de 1, 2, 4 y hasta 10 s.
5. Cada mensaje pasa por el adapter y se notifica a los suscriptores.
6. Si el `modelo` del mensaje no coincide con el de `/info`, se vuelve a pedir `/info` y el dashboard se
   rearma.
7. Si `ts` retrocede (el backend se reinició), se vacía el historial.

### 5.4 Estados de conexión

`Conectando`, `En vivo · WebSocket`, `En vivo · Polling`, `Reconectando`, `Sin conexión`. Siempre visibles
en la barra superior, con texto además del color.

## 6. Interfaz

### 6.1 Dirección visual: "Banco de laboratorio"

Claro, inspirado en instrumental de laboratorio. Se proyecta bien en un aula con luz.

| Token | Valor | Uso |
|---|---|---|
| Fondo | `#E9ECEF` | gris aluminio de la página |
| Tinta | `#1E252C` | texto principal y barra superior |
| Tinta secundaria | `#52606D` | encabezados y etiquetas |
| Apagado | `#616E7C` | texto terciario (oscurecido para cumplir el contraste mínimo) |
| Panel | `#FFFFFF` con borde `#CBD2D9` | superficie de cada panel |
| Señal | `#1F5FBF` | dato principal, botón primario, serie Roll, pata apoyada |
| Serie 2 | `#B4540A` | serie Pitch |
| Estado normal | fondo `#E3F4E8`, texto `#1B6B3A` | semáforo verde |
| Estado elevado | fondo `#FFF3C4`, texto `#7A5B00` | semáforo amarillo |
| Estado crítico | fondo `#FDE2E1`, texto `#9B1C1C` | semáforo rojo y alerta |

- El par de series Roll/Pitch (`#1F5FBF`, `#B4540A`) pasó el validador de la skill dataviz en modo claro:
  separación para daltonismo ΔE 25,5, visión normal ΔE 30,4, contraste ≥ 3:1.
- Barlow para todo. Números con `tabular-nums` y decimales fijos por columna.

### 6.2 Layout: "Tabla protagonista"

Para notebook (~1440 px): barra superior; debajo dos columnas, con la tabla de motores a la izquierda
(1,35 fr) y a la derecha, apilados, Inclinación y luego Batería y Patas lado a lado. Por debajo de
~1100 px pasa a una sola columna, sin scroll horizontal.

**Barra superior:** nombre y tipo del robot, estado de conexión, dirección del server (editable), Modo
presentación, Capturar muestra, Exportar CSV (n).

### 6.3 Paneles

**Motores**

- Columnas: Motor · Ángulo (°) · Velocidad (rad/s) · Torque (Nm) · Temperatura.
- Semáforo con el criterio de electroSim: < 40 °C normal (●), ≥ 40 °C elevada (▲), ≥ 60 °C crítica (■).
  Cada estado lleva forma, número y color.
- Una línea de alerta arriba de la tabla nombra los motores en estado crítico, como electroSim. Su lugar está
  reservado aunque no haya alerta, para que la tabla no salte cuando aparece.
- Una línea divisoria más marcada cada 3 motores, que separa las patas del Go2.
- Con el G1 (29 motores): scroll interno con el encabezado fijo.

**Inclinación (IMU)**

- Valores numéricos grandes de roll, pitch y yaw. El yaw va de −180° a 180°.
- Gráfico de línea de roll y pitch (eje en grados), más un gráfico aparte para yaw con su propia escala.
  Juntarlos aplastaría roll y pitch.
- Se ven 120 muestras (~12 s); la consigna pide al menos 60.
- Crosshair y tooltip con el valor exacto al pasar el mouse. Leyenda siempre visible.

**Batería (BMS)**

- Carga (%) en número y barra; corriente (mA) y temperatura (°C).
- Una barra por celda, en una escala ajustada al rango de voltajes para que se note la más baja. Solo se
  rotulan el mínimo y el máximo (con sus celdas), se muestra el rango de la escala en texto y la diferencia
  máxima entre celdas. Cada barra tiene su voltaje en un tooltip y en su `aria-label`.
- La temperatura se muestra siempre con un decimal.
- Si el modo no trae datos (simulador), el panel lo explica en vez de mostrar ceros.

**Patas**

- El robot visto desde arriba: pata llena = apoyada, punteada = en el aire, y un resumen en texto.
- Se arma desde `/info.patas`: con el G1 muestra los pies que declare. Si no hay patas, el panel lo
  aclara.

### 6.4 Capturar y exportar

- **Capturar muestra:** guarda en memoria una foto completa del último dato con la hora. Aviso "Muestra N
  capturada" y el contador del botón Exportar se actualiza.
- **Exportar CSV:** descarga `motores_AAAAMMDD_HHMMSS.csv`. Deshabilitado sin muestras, con un tooltip
  "Capturá al menos una muestra para exportar". Aviso "CSV exportado · N muestras" (1 muestra / N muestras).
- **Formato (el de electroSim, con las columnas que da esta API):** una fila por motor por captura.
  Columnas: `Captura`, `Timestamp`, `Robot`, `Bateria_%`, `Corriente_mA`, `Bateria_Temp_C`, `Celda_1_V` …
  `Celda_N_V`, `Roll_deg`, `Pitch_deg`, `Yaw_deg`, `Acel_X`, `Acel_Y`, `Acel_Z`, `Fuerza_<pata>` (según
  `/info`), `Motor`, `Indice`, `Angulo_deg`, `Vel_rad_s`, `Torque_Nm`, `Temp_C`.
- **Separadores:** coma y punto decimal (como electroSim), con BOM UTF-8.
- Las capturas viven mientras la pestaña esté abierta.

### 6.5 Modo presentación

Agranda la tipografía y los números clave (temperaturas, roll/pitch/yaw, carga) y oculta la dirección
del server y la columna de velocidad. Se activa con el botón o con la tecla `P` (salvo mientras se
escribe en un campo de texto), y se sale con Esc, `P` o el mismo botón.

### 6.6 Dirección del server

- Acepta `10.0.0.5`, `10.0.0.5:8001` o `http://10.0.0.5:8001`; si falta el puerto, completa 8001. Valida
  el formato.
- La guarda en el navegador y, al cambiarla, reconecta y vuelve a pedir `/info`.

### 6.7 Movimiento

| Elemento | Decisión |
|---|---|
| Datos (10 Hz) y color del semáforo | Sin animación ni transición. |
| Botones | `scale(0.97)` al presionar, 160 ms; el hover solo si hay mouse (`hover: hover`). |
| Avisos | Entrada en 200 ms con `cubic-bezier(0.23, 1, 0.32, 1)`; salida más rápida; transiciones de CSS, no keyframes; junto al botón que los generó. |
| Datos viejos (> 2 s) | Atenuación de los paneles en 200 ms. |
| Modo presentación | Cambio instantáneo. |

Con `prefers-reduced-motion` se quitan los desplazamientos y quedan solo los fundidos.

## 7. Errores y estados vacíos

Cada mensaje dice qué pasó y qué hacer, sin disculparse:

- **Sin respuesta:** "No hay respuesta de 10.0.0.5:8001. Revisá que el backend esté corriendo y que la
  dirección sea la que muestra INICIAR_TP05." Incluye un botón Reintentar.
- **503:** "El backend está levantado pero todavía no recibe datos del robot." Reintento automático.
- **WebSocket no disponible:** pasa a polling sin cortar y la barra lo muestra.
- **Datos viejos:** los paneles se atenúan y se muestra hace cuánto llegó el último dato.

## 8. Casos extremos (break-ui)

- 29 motores del G1: scroll interno con encabezado fijo.
- Valores faltantes o no numéricos: "—", nunca `NaN` ni `undefined`. Signo menos tipográfico (−).
- Corriente negativa (cargando): se muestra con signo. Celdas: 0, 8 o 16 se dibujan bien. Carga limitada
  al rango 0–100 %.
- Reinicio del backend (`ts` retrocede): se vacía el historial.
- Ancho de 1024 px (proyectores): una columna, sin scroll horizontal.
- Temperatura justo en 40 o 60 °C: se aplica el umbral exacto de electroSim, sin suavizado.
- Pluralización correcta en avisos y contadores.

## 9. Pruebas

**Vitest (capa de datos):**

- `adapter`: campos faltantes, batería vacía, G1 con 29 motores.
- `csv`: formato, columnas variables de celdas y patas, BOM, nombre del archivo.
- `history`: límite de 120 muestras y vaciado cuando `ts` retrocede.
- `TelemetryClient` (WebSocket y timers simulados): abre el WebSocket; pasa a polling a los 3 s; reintenta
  el WebSocket cada 15 s; reconecta con espera creciente; vuelve a pedir `/info` si cambia el modelo.
- `serverAddress`: las tres formas de dirección.

**Testing Library (componentes):** semáforo en 39, 40, 59 y 60 °C; estados vacíos; Exportar deshabilitado
sin muestras.

**Prueba real:** contra el backend de la cátedra con `--demo --robot go2` y `--demo --robot g1`, con
capturas de pantalla.

**Datos de prueba en desarrollo:** un selector, solo en desarrollo, para alternar entre Demo, Peor caso y
G1.

## 10. Revisión final de diseño

Antes de dar la etapa 1 por terminada, se pasan estas skills sobre el dashboard funcionando:

1. **dataviz:** se revisan los gráficos contra su catálogo de anti-patrones y se vuelve a correr el
   validador de paleta.
2. **break-ui** (Emil Kowalski): se recorren los casos extremos con el selector de datos de prueba, a
   1440 px, 1024 px y zoom 200 %.
3. **review-animations** (Emil Kowalski): se revisa todo el movimiento contra la sección 6.7.
4. **Impeccable:** auditoría visual completa.

Los hallazgos se presentan antes de corregir, y se corrige lo que se acuerde.

## 11. Repositorio y forma de trabajo

- Repo propio `robotica-dashboard`, en GitHub privado, con el compañero como colaborador. (La creación del
  repo remoto se confirma aparte.)
- `main` siempre funcionando; cada cambio en una rama con PR.
- Commits en castellano, sin trailer `Co-Authored-By`.
- GitHub Actions en cada PR: lint, chequeo de tipos, tests y build.
- `.superpowers/` en `.gitignore`.
- README con cómo levantar el backend de la cátedra y el dashboard.
- Las skills Emil Kowalski, Taste e Impeccable (sin hooks) se copian a `.claude/skills/` del repo, como en
  CafeClub, con sus licencias.
