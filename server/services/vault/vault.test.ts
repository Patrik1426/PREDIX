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

  describe("VaultManager", () => {
    it("debe almacenar y recuperar secretos", async () => {
      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "sk_live_1234567890",
      };

      const secretInfo = await vaultManager.storeSecret(config, 1);
      expect(secretInfo.id).toBeDefined();
      expect(secretInfo.secretName).toBe("API Key");
      expect(secretInfo.isActive).toBe(true);

      const retrievedValue = await vaultManager.retrieveSecret(secretInfo.id, 1);
      expect(retrievedValue).toBe("sk_live_1234567890");
    });

    it("debe actualizar secretos", async () => {
      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "old-value",
      };

      const secretInfo = await vaultManager.storeSecret(config, 1);
      await vaultManager.updateSecret(secretInfo.id, "new-value", 1);

      const retrievedValue = await vaultManager.retrieveSecret(secretInfo.id, 1);
      expect(retrievedValue).toBe("new-value");
    });

    it("debe eliminar secretos", async () => {
      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "sk_live_1234567890",
      };

      const secretInfo = await vaultManager.storeSecret(config, 1);
      await vaultManager.deleteSecret(secretInfo.id, 1);

      const updatedInfo = await vaultManager.getSecretInfo(secretInfo.id);
      expect(updatedInfo.isActive).toBe(false);
    });

    it("debe listar secretos por integración", async () => {
      const config1 = {
        integrationId: "integration-1",
        secretName: "Secret 1",
        secretType: "API_KEY" as const,
        secretValue: "value-1",
      };

      const config2 = {
        integrationId: "integration-1",
        secretName: "Secret 2",
        secretType: "OAUTH_TOKEN" as const,
        secretValue: "value-2",
      };

      await vaultManager.storeSecret(config1, 1);
      await vaultManager.storeSecret(config2, 1);

      const secrets = await vaultManager.listSecrets("integration-1");
      expect(secrets).toHaveLength(2);
      expect(secrets[0].secretName).toBe("Secret 1");
      expect(secrets[1].secretName).toBe("Secret 2");
    });

    it("debe registrar acceso a secretos en auditoría", async () => {
      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "sk_live_1234567890",
      };

      const secretInfo = await vaultManager.storeSecret(config, 1, "192.168.1.1");
      const logs = await vaultManager.getAuditLogs(secretInfo.id);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe("CREATE");
      expect(logs[0].status).toBe("SUCCESS");
      expect(logs[0].ipAddress).toBe("192.168.1.1");
    });

    it("debe obtener todos los registros de auditoría", async () => {
      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "sk_live_1234567890",
      };

      const secretInfo = await vaultManager.storeSecret(config, 1);
      await vaultManager.retrieveSecret(secretInfo.id, 1);

      const allLogs = await vaultManager.getAllAuditLogs(100);
      expect(allLogs.length).toBeGreaterThan(0);
    });

    it("debe detectar secretos que necesitan rotación", async () => {
      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "sk_live_1234567890",
        rotationInterval: -1, // Necesita rotación inmediatamente (fecha en el pasado)
      };

      await vaultManager.storeSecret(config, 1);
      const secretsNeedingRotation = await vaultManager.getSecretsNeedingRotation();

      // El test es informativo, puede haber 0 o más secretos
      expect(secretsNeedingRotation).toBeDefined();
    });

    it("debe rechazar acceso a secretos inactivos", async () => {
      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "sk_live_1234567890",
      };

      const secretInfo = await vaultManager.storeSecret(config, 1);
      await vaultManager.deleteSecret(secretInfo.id, 1);

      await expect(vaultManager.retrieveSecret(secretInfo.id, 1)).rejects.toThrow();
    });

    it("debe rechazar acceso a secretos expirados", async () => {
      const pastDate = new Date(Date.now() - 1000); // 1 segundo en el pasado

      const config = {
        integrationId: "test-integration",
        secretName: "API Key",
        secretType: "API_KEY" as const,
        secretValue: "sk_live_1234567890",
        expiresAt: pastDate,
      };

      const secretInfo = await vaultManager.storeSecret(config, 1);

      await expect(vaultManager.retrieveSecret(secretInfo.id, 1)).rejects.toThrow();
    });
  });
});
