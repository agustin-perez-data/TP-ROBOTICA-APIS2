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
