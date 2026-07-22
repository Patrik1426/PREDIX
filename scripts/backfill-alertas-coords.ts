/**
 * backfill-alertas-coords.ts — Corrige las coordenadas de las alertas creadas
 * antes del fix de resolveAlertaCoords (server/routers/alertas.ts): hasta esa
 * fecha, el cliente generaba lat/lng con un jitter aleatorio alrededor de
 * CDMX sin relación con el municipio real de la alerta. Único punto de
 * escritura de `alertas.lat/lng` es la mutación `crear` — no hay ninguna
 * fuente legítima de coordenada precisa, así que es seguro sobreescribir
 * TODAS las filas con la cabecera municipal real.
 *
 * Idempotente — re-correrlo deja las mismas coordenadas reales.
 * Uso: pnpm exec tsx scripts/backfill-alertas-coords.ts
 */

import "dotenv/config";
import { getDb } from "../server/config/db";
import { alertas } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { CENTROIDE_POR_NOMBRE } from "../server/data/edomexCentroids";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("BD no disponible");

  const rows = await db.select().from(alertas);
  let actualizadas = 0;
  const sinMatch: string[] = [];

  for (const row of rows) {
    const centroide = CENTROIDE_POR_NOMBRE[row.municipio];
    if (!centroide) {
      sinMatch.push(`#${row.id} (${row.municipio})`);
      continue;
    }
    await db.update(alertas)
      .set({ lat: centroide.lat.toString(), lng: centroide.lng.toString() })
      .where(eq(alertas.id, row.id));
    actualizadas++;
  }

  console.log(`[backfill-alertas-coords] ${actualizadas}/${rows.length} alertas actualizadas con coordenadas reales.`);
  if (sinMatch.length > 0) {
    console.log(`[backfill-alertas-coords] Sin match de municipio (sin tocar): ${sinMatch.join(", ")}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[backfill-alertas-coords] Error:", error);
    process.exit(1);
  });
