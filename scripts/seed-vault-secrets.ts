/**
 * seed-vault-secrets.ts — Registra en la Bóveda (secret_vault) las
 * credenciales de API externas que ya vive en .env, para poder
 * verlas/rotarlas/auditarlas desde IntegracionTab.
 *
 * IMPORTANTE: esto NO cambia lo que la app lee en tiempo de ejecución — el
 * servidor sigue leyendo directo de process.env (server/_core/infra/env.ts,
 * o process.env.X en los scripts de carga). La Bóveda es un espejo/registro
 * para gestión y auditoría, no la fuente de ejecución. Si cambias el valor
 * en un lado, hay que actualizar el otro a mano.
 *
 * Deliberadamente NO se siembran JWT_SECRET/VAULT_MASTER_KEY/DATABASE_URL:
 * son necesarios antes de poder llegar a la BD o descifrar cualquier cosa
 * (dependencia circular), así que nunca podrían vivir en la Bóveda.
 *
 * Uso: pnpm exec tsx scripts/seed-vault-secrets.ts
 */

import "dotenv/config";
import { getDb } from "../server/config/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getVaultManager } from "../server/services/vault/vaultManager";

const SECRETS_A_SEMBRAR = [
  { integrationId: "general", secretName: "INEGI_API_TOKEN", envVar: "INEGI_API_TOKEN", secretType: "API_KEY" as const },
  { integrationId: "denue-inegi", secretName: "DENUE_API_TOKEN", envVar: "DENUE_API_TOKEN", secretType: "API_KEY" as const },
  { integrationId: "general", secretName: "GEMINI_API_KEY", envVar: "GEMINI_API_KEY", secretType: "API_KEY" as const },
];

async function main() {
  const db = await getDb();
  if (!db) throw new Error("No hay conexión a base de datos (DATABASE_URL). Abortando.");

  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.institutionalRole, "admin"));
  if (!admin) throw new Error("No se encontró ningún usuario con rol admin — se necesita para atribuir el registro.");

  const vaultManager = getVaultManager();
  const existentes = await vaultManager.listAllSecrets();

  for (const s of SECRETS_A_SEMBRAR) {
    const valor = process.env[s.envVar]?.trim();
    if (!valor) {
      console.warn(`[seed-vault] ${s.envVar} está vacío en .env — se omite.`);
      continue;
    }

    const ya = existentes.find((e) => e.secretName === s.secretName);
    if (ya) {
      await vaultManager.updateSecret(ya.id, valor, admin.id);
      console.log(`[seed-vault] ${s.secretName} actualizado (id ${ya.id}).`);
    } else {
      const creado = await vaultManager.storeSecret(
        { integrationId: s.integrationId, secretName: s.secretName, secretType: s.secretType, secretValue: valor },
        admin.id,
      );
      console.log(`[seed-vault] ${s.secretName} registrado (id ${creado.id}).`);
    }
  }

  console.log("[seed-vault] Listo.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-vault] Error:", error);
    process.exit(1);
  });
