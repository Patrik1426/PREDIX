/**
 * Vault Manager
 * Manages secret storage, retrieval, and lifecycle
 */

import { EncryptionService, getEncryptionService } from "./encryptionService";
import { logger } from "../../_core/logger";

export interface SecretConfig {
  integrationId: string;
  secretName: string;
  secretType: "API_KEY" | "OAUTH_TOKEN" | "BASIC_AUTH" | "CERTIFICATE" | "CUSTOM";
  secretValue: string;
  expiresAt?: Date;
  rotationInterval?: number;
}

export interface SecretInfo {
  id: number;
  integrationId: string;
  secretName: string;
  secretType: string;
  expiresAt?: Date;
  rotationInterval?: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLogEntry {
  id: number;
  secretId: number;
  integrationId: string;
  userId: number;
  action: string;
  status: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// In-memory storage for demo (will be replaced with database)
const secretsStore: Map<number, any> = new Map();
const auditLogsStore: Array<AuditLogEntry> = [];
let secretIdCounter = 1;

export class VaultManager {
  private encryptionService: EncryptionService;

  constructor(encryptionService?: EncryptionService) {
    this.encryptionService = encryptionService || getEncryptionService();
  }

  /**
   * Store a secret in the vault
   */
  async storeSecret(config: SecretConfig, userId: number, ipAddress?: string): Promise<SecretInfo> {
    try {
      const encrypted = this.encryptionService.encrypt(config.secretValue);
      const nextRotationAt = config.rotationInterval ? new Date(Date.now() + config.rotationInterval * 24 * 60 * 60 * 1000) : null;
      const now = new Date();

      const secretId = secretIdCounter++;
      const secret = {
        id: secretId,
        integrationId: config.integrationId,
        secretName: config.secretName,
        secretType: config.secretType,
        encryptedValue: encrypted.encryptedValue,
        encryptionAlgorithm: encrypted.algorithm,
        encryptionIv: encrypted.iv,
        encryptionAuthTag: encrypted.authTag,
        expiresAt: config.expiresAt || null,
        rotationInterval: config.rotationInterval || null,
        lastRotatedAt: now,
        nextRotationAt: nextRotationAt,
        isActive: true,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      secretsStore.set(secretId, secret);

      await this.logAuditEvent({
        secretId,
        integrationId: config.integrationId,
        userId,
        action: "CREATE",
        status: "SUCCESS",
        ipAddress,
      });

      return this.getSecretInfo(secretId);
    } catch (error) {
      throw new Error(`Failed to store secret: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Retrieve a secret from the vault
   */
  async retrieveSecret(secretId: number, userId: number, ipAddress?: string): Promise<string> {
    try {
      const secret = secretsStore.get(secretId);

      if (!secret) {
        await this.logAuditEvent({
          secretId,
          integrationId: "unknown",
          userId,
          action: "READ",
          status: "FAILED",
          reason: "Secret not found",
          ipAddress,
        });
        throw new Error("Secret not found");
      }

      if (!secret.isActive) {
        await this.logAuditEvent({
          secretId,
          integrationId: secret.integrationId,
          userId,
          action: "READ",
          status: "DENIED",
          reason: "Secret is inactive",
          ipAddress,
        });
        throw new Error("Secret is inactive");
      }

      if (secret.expiresAt && new Date() > secret.expiresAt) {
        await this.logAuditEvent({
          secretId,
          integrationId: secret.integrationId,
          userId,
          action: "READ",
          status: "DENIED",
          reason: "Secret has expired",
          ipAddress,
        });
        throw new Error("Secret has expired");
      }

      const decrypted = this.encryptionService.decrypt({
        encryptedValue: secret.encryptedValue,
        iv: secret.encryptionIv,
        authTag: secret.encryptionAuthTag,
        algorithm: secret.encryptionAlgorithm,
      });

      await this.logAuditEvent({
        secretId,
        integrationId: secret.integrationId,
        userId,
        action: "READ",
        status: "SUCCESS",
        ipAddress,
      });

      return decrypted.value;
    } catch (error) {
      throw new Error(`Failed to retrieve secret: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update a secret
   */
  async updateSecret(secretId: number, newValue: string, userId: number, ipAddress?: string): Promise<void> {
    try {
      const secret = secretsStore.get(secretId);

      if (!secret) {
        throw new Error("Secret not found");
      }

      const encrypted = this.encryptionService.encrypt(newValue);

      secret.encryptedValue = encrypted.encryptedValue;
      secret.encryptionIv = encrypted.iv;
      secret.encryptionAuthTag = encrypted.authTag;
      secret.updatedAt = new Date();

      secretsStore.set(secretId, secret);

      await this.logAuditEvent({
        secretId,
        integrationId: secret.integrationId,
        userId,
        action: "UPDATE",
        status: "SUCCESS",
        ipAddress,
      });
    } catch (error) {
      throw new Error(`Failed to update secret: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId: number, userId: number, ipAddress?: string): Promise<void> {
    try {
      const secret = secretsStore.get(secretId);

      if (!secret) {
        throw new Error("Secret not found");
      }

      secret.isActive = false;
      secret.updatedAt = new Date();

      secretsStore.set(secretId, secret);

      await this.logAuditEvent({
        secretId,
        integrationId: secret.integrationId,
        userId,
        action: "DELETE",
        status: "SUCCESS",
        ipAddress,
      });
    } catch (error) {
      throw new Error(`Failed to delete secret: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get secret metadata
   */
  async getSecretInfo(secretId: number): Promise<SecretInfo> {
    const secret = secretsStore.get(secretId);

    if (!secret) {
      throw new Error("Secret not found");
    }

    return {
      id: secret.id,
      integrationId: secret.integrationId,
      secretName: secret.secretName,
      secretType: secret.secretType,
      expiresAt: secret.expiresAt || undefined,
      rotationInterval: secret.rotationInterval || undefined,
      lastRotatedAt: secret.lastRotatedAt || undefined,
      nextRotationAt: secret.nextRotationAt || undefined,
      isActive: secret.isActive,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
    };
  }

  /**
   * List all secrets for an integration
   */
  async listSecrets(integrationId: string): Promise<SecretInfo[]> {
    const secrets: SecretInfo[] = [];

    secretsStore.forEach((secret) => {
      if (secret.integrationId === integrationId) {
        secrets.push({
          id: secret.id,
          integrationId: secret.integrationId,
          secretName: secret.secretName,
          secretType: secret.secretType,
          expiresAt: secret.expiresAt || undefined,
          rotationInterval: secret.rotationInterval || undefined,
          lastRotatedAt: secret.lastRotatedAt || undefined,
          nextRotationAt: secret.nextRotationAt || undefined,
          isActive: secret.isActive,
           createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      });
    }
    });

    return secrets;
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: {
    secretId: number;
    integrationId: string;
    userId: number;
    action: string;
    status: string;
    reason?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const logEntry: AuditLogEntry = {
        id: auditLogsStore.length + 1,
        secretId: event.secretId,
        integrationId: event.integrationId,
        userId: event.userId,
        action: event.action,
        status: event.status,
        reason: event.reason,
        ipAddress: event.ipAddress,
        userAgent: undefined,
        timestamp: new Date(),
      };

      auditLogsStore.push(logEntry);
    } catch (error) {
      logger.error("Failed to log audit event:", error);
    }
  }

  /**
   * Get audit logs for a secret
   */
  async getAuditLogs(secretId: number, limit: number = 50): Promise<AuditLogEntry[]> {
    return auditLogsStore
      .filter((log) => log.secretId === secretId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get all audit logs
   */
  async getAllAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
    return auditLogsStore
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Check if secrets need rotation
   */
  async getSecretsNeedingRotation(): Promise<SecretInfo[]> {
    const secretsNeedingRotation: SecretInfo[] = [];
    const now = new Date();

    secretsStore.forEach((secret) => {
      if (secret.isActive && secret.nextRotationAt && new Date(secret.nextRotationAt) <= now) {
        secretsNeedingRotation.push({
          id: secret.id,
          integrationId: secret.integrationId,
          secretName: secret.secretName,
          secretType: secret.secretType,
          expiresAt: secret.expiresAt || undefined,
          rotationInterval: secret.rotationInterval || undefined,
          lastRotatedAt: secret.lastRotatedAt || undefined,
          nextRotationAt: secret.nextRotationAt || undefined,
          isActive: secret.isActive,
           createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      });
    }
    });

    return secretsNeedingRotation;
  }
}

let vaultManagerInstance: VaultManager | null = null;

export function getVaultManager(): VaultManager {
  if (!vaultManagerInstance) {
    vaultManagerInstance = new VaultManager();
  }
  return vaultManagerInstance;
}
