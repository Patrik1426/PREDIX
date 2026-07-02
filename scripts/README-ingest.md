# Ingesta de datos reales SESNSP → MySQL

Pipeline completo para reemplazar el mock (`generateMockSesnspData`) con datos reales del Estado de México.

## Flujo

```
CSV crudos (data/sesnsp/**)                         ← descargados de datos.gob.mx
  │  inspect-csv.ps1        → reporta esquema (headers, delim, encoding)
  │  extract-edomex.ps1     → filtra Clave_Ent=15, recorta a data/sesnsp/_edomex/
  │  transform-edomex.ps1   → despivota meses → formato largo, data/sesnsp/_normalized/
  ▼
delitos_long.csv (1.67M filas) + victimas_long.csv (53k)
  │  pnpm db:push           → crea tablas incidencia_delito + incidencia_victima
  │  load-sesnsp.ts         → LOAD DATA LOCAL INFILE → MySQL
  ▼
MySQL poblado
```

Los 3 `.ps1` ya se corrieron; los CSV normalizados existen. Falta MySQL + carga.

## Paso 1 — Levantar MySQL (Docker)

`--local-infile=1` es **obligatorio** para `LOAD DATA LOCAL INFILE`:

```bash
docker run -d --name predix-mysql `
  -e MYSQL_ROOT_PASSWORD=root `
  -e MYSQL_DATABASE=predix_db `
  -p 3306:3306 `
  mysql:8.0 --local-infile=1
```

## Paso 2 — Configurar `.env`

```env
DATABASE_URL=mysql://root:root@localhost:3306/predix_db
```

## Paso 3 — Crear tablas

```bash
pnpm db:push
```

Crea `incidencia_delito` e `incidencia_victima` (esquema granular en `drizzle/schema.ts`).

## Paso 4 — Cargar

```bash
pnpm tsx scripts/load-sesnsp.ts
```

Idempotente (hace TRUNCATE primero). Al terminar reporta filas, municipios y tipos cargados.

## Re-generar desde cero

Si descargas CSV nuevos (otro corte mensual):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\extract-edomex.ps1
powershell -ExecutionPolicy Bypass -File scripts\transform-edomex.ps1
pnpm tsx scripts/load-sesnsp.ts
```

## Notas

- `_edomex/` y `_normalized/` están gitignored (`data/**/*.csv`).
- Encoding origen: **Windows-1252**; salida normalizada: **UTF-8**.
- Pendiente (no incluido aquí): reescribir los servicios (`dashboardStats`, `mlPredictor`, router `incidencia`) para leer de las tablas granulares nuevas en vez de la vieja `incidencia_delictiva`.
