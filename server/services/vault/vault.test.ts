/**
 * Tests for Vault System
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EncryptionService } from "./encryptionService";
import { VaultManager } from "./vaultManager";

describe("Vault System", () => {
  let encryptionService: EncryptionService;
  let vaultManager: VaultManager;

  beforeEach(() => {
    const masterKey = process.env.VAULT_MASTER_KEY || "test-master-key-for-testing-purposes-only-12345";
    encryptionService = new EncryptionService(masterKey);
    vaultManager = new VaultManager(encryptionService);
  });

  describe("EncryptionService", () => {
    it("debe cifrar y descifrar correctamente", () => {
      const plaintext = "my-secret-api-key-12345";
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted.encryptedValue).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.algorithm).toBe("aes-256-gcm");

      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted.value).toBe(plaintext);
    });

    it("debe generar IVs diferentes para cada cifrado", () => {
      const plaintext = "test-secret";
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedValue).not.toBe(encrypted2.encryptedValue);
    });

    it("debe generar hashes consistentes", () => {
      const value = "test-value";
      const hash1 = encryptionService.hash(value);
      const hash2 = encryptionService.hash(value);

      expect(hash1).toBe(hash2);
    });

    it("debe verificar hashes correctamente", () => {
      const value = "test-value";
      const hash = encryptionService.hash(value);

      expect(encryptionService.verifyHash(value, hash)).toBe(true);
      expect(encryptionService.verifyHash("wrong-value", hash)).toBe(false);
    });

    it("debe generar secretos aleatorios", () => {
      const secret1 = encryptionService.generateRandomSecret(32);
      const secret2 = encryptionService.generateRandomSecret(32);

      expect(secret1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(secret2).toHaveLength(64);
      expect(secret1).not.toBe(secret2);
    });

    it("debe validar datos de cifrado correctamente", () => {
      const plaintext = "test-secret";
      const encrypted = encryptionService.encrypt(plaintext);

      const isValid = encryptionService.validateEncryptionData(encrypted);
      expect(isValid).toBe(true);

      const invalidData = {
        encryptedValue: "invalid",
        iv: "invalid",
        authTag: "invalid",
        algorithm: "aes-256-gcm",
      };

      const isInvalid = encryptionService.validateEncryptionData(invalidData);
      expect(isInvalid).toBe(false);
    });

    it("debe lanzar error al descifrar datos corruptos", () => {
      const corruptedData = {
        encryptedValue: "corrupted-data",
        iv: "0000000000000000000000000000000",
        authTag: "00000000000000000000000000000000",
        algorithm: "aes-256-gcm",
      };

      expect(() => {
        encryptionService.decrypt(corruptedData);
      }).toThrow();
    });
  });

  // VaultManager ahora persiste en MySQL (secret_vault/secret_audit_log/
  // secret_rotation_history, ver drizzle/schema.ts) — antes vivía en un
  // Map/Array en memoria, por eso estos tests antes no necesitaban BD.
  // En el entorno de vitest no hay DATABASE_URL (mismo patrón que el resto
  // de servicios con BD en este repo, ver vitest.config.ts), así que
  // getDb() siempre devuelve null aquí: se prueba el modo degradado
  // (falla claro en mutaciones, [] en listados) en vez de simular
  // persistencia falsa. El comportamiento real de guardar/leer/rotar se
  // verifica manualmente contra la BD local real (mismo patrón que el
  // resto de features de esta sesión — ver CLAUDE.md).
  describe("VaultManager (modo degradado, sin BD)", () => {
    const config = {
      integrationId: "test-integration",
      secretName: "API Key",
      secretType: "API_KEY" as const,
      secretValue: "sk_live_1234567890",
    };

    it("storeSecret lanza error claro sin BD, no falla en silencio", async () => {
      await expect(vaultManager.storeSecret(config, 1)).rejects.toThrow(/Vault no disponible/);
    });

    it("retrieveSecret lanza error claro sin BD", async () => {
      await expect(vaultManager.retrieveSecret(1, 1)).rejects.toThrow(/Vault no disponible/);
    });

    it("updateSecret lanza error claro sin BD", async () => {
      await expect(vaultManager.updateSecret(1, "nuevo-valor", 1)).rejects.toThrow(/Vault no disponible/);
    });

    it("rotateSecret lanza error claro sin BD", async () => {
      await expect(vaultManager.rotateSecret(1, "nuevo-valor", 1)).rejects.toThrow(/Vault no disponible/);
    });

    it("deleteSecret lanza error claro sin BD", async () => {
      await expect(vaultManager.deleteSecret(1, 1)).rejects.toThrow(/Vault no disponible/);
    });

    it("listSecrets devuelve [] sin BD, no lanza", async () => {
      await expect(vaultManager.listSecrets("test-integration")).resolves.toEqual([]);
    });

    it("listAllSecrets devuelve [] sin BD, no lanza", async () => {
      await expect(vaultManager.listAllSecrets()).resolves.toEqual([]);
    });

    it("getAuditLogs devuelve [] sin BD, no lanza", async () => {
      await expect(vaultManager.getAuditLogs(1)).resolves.toEqual([]);
    });

    it("getAllAuditLogs devuelve [] sin BD, no lanza", async () => {
      await expect(vaultManager.getAllAuditLogs()).resolves.toEqual([]);
    });

    it("getSecretsNeedingRotation devuelve [] sin BD, no lanza", async () => {
      await expect(vaultManager.getSecretsNeedingRotation()).resolves.toEqual([]);
    });
  });
});
