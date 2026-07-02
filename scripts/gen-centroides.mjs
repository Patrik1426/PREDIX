/**
 * gen-centroides.mjs — Genera server/data/edomexCentroids.ts
 *
 * Fuente: municipios_mexico.md (tabla oficial INEGI con coordenadas de la
 * CABECERA municipal de los 125 municipios del Estado de México).
 *
 * ⚠️ Las coordenadas del .md vienen en formato SEXAGESIMAL EMPACADO
 * (grados.minutossegundos, p.ej. 19.3556650 = 19°35'56.65"), NO en grados
 * decimales. Este script las convierte a decimal.
 *
 * La clave "MéxicoNNN" mapea a cve_muni INEGI = "15" + NNN. Se unen los nombres
 * canónicos desde la BD (incidencia_delito) por cve_muni para que casen exacto
 * con la incidencia.
 *
 * Re-generable: node scripts/gen-centroides.mjs
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import mysql from "mysql2/promise";

const MD = "D:/VM/seguridad-edomex/municipios_mexico.md";
const OUT = "D:/VM/seguridad-edomex/server/data/edomexCentroids.ts";

// Sexagesimal empacado (DD.MMSSsss) → grados decimales.
function dmsToDec(v) {
  const neg = v < 0;
  v = Math.abs(v);
  const d = Math.floor(v);
  const rem = (v - d) * 100;        // mm.ssss
  const mm = Math.floor(rem + 1e-9);
  const ss = (rem - mm) * 100;      // segundos
  const dec = d + mm / 60 + ss / 3600;
  return neg ? -dec : dec;
}
const r5 = (n) => Math.round(n * 1e5) / 1e5;

// Parsear la tabla markdown.
const coordsPorCve = new Map();
for (const line of readFileSync(MD, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\|\s*México(\d{3})\s*\|\s*([^|]+?)\s*\|\s*(-?\d+\.\d+)\s*\|\s*(-?\d+\.\d+)\s*\|/);
  if (!m) continue;
  const cve = "15" + m[1];
  coordsPorCve.set(cve, { lat: r5(dmsToDec(parseFloat(m[4]))), lng: r5(dmsToDec(parseFloat(m[3]))) });
}
console.log(`Parseadas ${coordsPorCve.size} coordenadas del .md`);

// Nombres canónicos desde la BD.
const c = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await c.query("SELECT DISTINCT cve_muni, municipio FROM incidencia_delito ORDER BY cve_muni");
await c.end();

const out = [];
const fails = [];
for (const row of rows) {
  const co = coordsPorCve.get(row.cve_muni);
  if (!co) { fails.push(`${row.cve_muni} ${row.municipio}`); continue; }
  out.push({ cveMuni: row.cve_muni, nombre: row.municipio, lat: co.lat, lng: co.lng });
}

// Validación: 125 y dentro de Edomex.
const fuera = out.filter((o) => o.lat < 18 || o.lat > 20.4 || o.lng > -98.4 || o.lng < -100.7);
if (fails.length) { console.error("SIN COORDENADA:", fails); process.exit(1); }
if (fuera.length) { console.error("FUERA DE RANGO:", fuera.map((o) => `${o.nombre}(${o.lat},${o.lng})`)); process.exit(1); }
console.log(`OK: ${out.length} municipios, todos dentro de Edomex.`);

const body = `// ============================================================
// edomexCentroids.ts — Coordenadas (lat/lng, grados decimales) de la CABECERA
// municipal de los 125 municipios del Estado de México, indexadas por clave
// INEGI (cve_muni), para georreferenciar la incidencia real en el mapa.
//
// GENERADO por scripts/gen-centroides.mjs desde municipios_mexico.md (tabla
// oficial INEGI en formato sexagesimal empacado → convertido a decimal).
// NO editar a mano: re-generar con el script.
// ============================================================

export interface MunicipioCentroide {
  cveMuni: string;
  nombre: string;
  lat: number;
  lng: number;
}

export const EDOMEX_CENTROIDES: MunicipioCentroide[] = ${JSON.stringify(out, null, 2)};

/** Índice por clave INEGI para join O(1) con la incidencia. */
export const CENTROIDE_POR_CVE: Record<string, MunicipioCentroide> = Object.fromEntries(
  EDOMEX_CENTROIDES.map((m) => [m.cveMuni, m]),
);
`;
writeFileSync(OUT, body);
console.log("Escrito:", OUT);
