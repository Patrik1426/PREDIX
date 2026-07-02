# Datos crudos SESNSP (CSV)

Input crudo de incidencia delictiva. **No es código, no se sirve al cliente, no se versiona** (agregar `/data/` al `.gitignore` al hacer `git init`). El ingest lee de aquí → parsea → vuelca a MySQL.

⚠️ **Dos metodologías distintas** (2015-2025 vs 2026/RNID): columnas y clasificación de delitos **no son idénticas**. No mezclar — normalizar a un esquema común usando el diccionario y la nota metodológica.

## Dónde va cada descarga

| # | Archivo a descargar | Carpeta |
|---|---|---|
| 1 | 2015-2025 (Fuero Común - Delitos). Incidencia delictiva **municipal** | `2015-2025/delitos-municipal/` |
| 2 | Ene-abr 2026 (Fuero común - Delitos). Incidencia delictiva **municipal** | `2026/delitos-municipal/` |
| 3 | Diccionario de datos, metodología 2015-2025 | `2015-2025/diccionario/` |
| 4 | (Fuero común - **Víctimas**). Incidencia delictiva municipal | `2015-2025/victimas-municipal/` |
| 5 | Nota Metodológica: Comparación histórica RNID | `metodologia/` |

**#1, #2, #3 = imprescindibles.** #4, #5 = complementarios.

## Fuente
https://www.gob.mx/sesnsp/acciones-y-programas/datos-abiertos-de-incidencia-delictiva

## Notas
- Guardar el CSV con su nombre original o uno que conserve el periodo.
- El CSV es **nacional** — al ingerir, filtrar `Entidad = "México"` (Edomex, 125 municipios).
