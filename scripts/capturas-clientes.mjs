// Captura 5 pantallas clave de PREDIX para material de clientes.
// Uso: node scripts/capturas-clientes.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "capturas-clientes");
mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:4500";

// Orden de captura: id de tab interno -> nombre de archivo
const SHOTS = [
  { tab: "mapa", file: "1-mapa-tactico.png" },
  { tab: "tablero", file: "2-tablero-comando.png" },
  { tab: "predicciones", file: "3-predicciones-ml.png" },
  { tab: "alertas", file: "4-alertas-tiempo-real.png" },
  { tab: "integracion", file: "5-integracion-gubernamental.png" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});

// Inyecta la sesión demo (rol admin) ANTES de que cargue la app,
// para pasar el DemoGate sin tocar el login.
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("predix:demo-session", "admin");
    sessionStorage.setItem("predix:demo-login-at", String(Date.now()));
    sessionStorage.setItem("predix:demo-session-id", "PX-DEMO01");
  } catch {}
});

const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await sleep(4000); // primer render del shell (SSE deja la red siempre activa)

for (const { tab, file } of SHOTS) {
  // Cambia de módulo disparando el evento que Home escucha.
  await page.evaluate((t) => {
    window.dispatchEvent(new CustomEvent("predix:navigate-tab", { detail: t }));
  }, tab);
  // Espera extra para mapas (Leaflet) y gráficas (Recharts).
  await sleep(tab === "mapa" ? 5000 : 3500);
  await page.screenshot({ path: join(OUT, file) });
  console.log("OK:", file);
}

await browser.close();
console.log("\nListo. Capturas en:", OUT);
