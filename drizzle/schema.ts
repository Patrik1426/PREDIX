import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Institutional roles for security system
  institutionalRole: mysqlEnum("institutional_role", ["operador", "supervisor", "analista", "admin", "consulta", "policia", "comandante"]).notNull().default("operador"),
  // User status (active, inactive, suspended)
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  // Institution/agency affiliation
  institution: varchar("institution", { length: 255 }),
  // Department or unit
  department: varchar("department", { length: 255 }),
  // Employee/badge ID
  employeeId: varchar("employee_id", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Module access permissions by role
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["operador", "supervisor", "analista", "admin", "consulta", "policia", "comandante"]).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  canView: int("can_view").default(0).notNull(),
  canEdit: int("can_edit").default(0).notNull(),
  canDelete: int("can_delete").default(0).notNull(),
  canExport: int("can_export").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// Audit log for tracking user actions
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// @deprecated — tabla pivoteada vieja. Reemplazada por `incidencia_delito` (granular).
// Nadie la lee tras el rewire de Fase 3. Candidata a DROP en siguiente migración.
export const incidenciaDelictiva = mysqlTable("incidencia_delictiva", {
  id: int("id").autoincrement().primaryKey(),
  estado: varchar("estado", { length: 64 }).notNull(),
  municipio: varchar("municipio", { length: 128 }).notNull(),
  codigoMunicipio: varchar("codigo_municipio", { length: 10 }),
  anio: int("anio").notNull(),
  mes: int("mes").notNull(),
  homicidios: int("homicidios").default(0),
  robos: int("robos").default(0),
  lesiones: int("lesiones").default(0),
  violenciaSexual: int("violencia_sexual").default(0),
  traficoDeDropgas: int("trafico_de_drogas").default(0),
  otrosDelitos: int("otros_delitos").default(0),
  victimas: int("victimas").default(0),
  fuero: varchar("fuero", { length: 20 }).default("comun"),
  lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow(),
  sourceUrl: text("source_url"),
});

export type IncidenciaDelictiva = typeof incidenciaDelictiva.$inferSelect;
export type InsertIncidenciaDelictiva = typeof incidenciaDelictiva.$inferInsert;

// Cache metadata for SESNSP data sync
export const sesnspSyncLog = mysqlTable("sesnsp_sync_log", {
  id: int("id").autoincrement().primaryKey(),
  lastSyncTime: timestamp("last_sync_time").defaultNow(),
  recordsProcessed: int("records_processed").default(0),
  status: varchar("status", { length: 20 }).default("pending"),
  errorMessage: text("error_message"),
  nextSyncTime: timestamp("next_sync_time"),
});

export type SesnspSyncLog = typeof sesnspSyncLog.$inferSelect;
export type InsertSesnspSyncLog = typeof sesnspSyncLog.$inferInsert;
// Incident attachments (photos, reports, evidence)
export const incidentAttachments = mysqlTable("incident_attachments", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: varchar("incident_id", { length: 64 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: int("file_size").notNull(),
  s3Key: varchar("s3_key", { length: 512 }).notNull(),
  s3Url: text("s3_url").notNull(),
  uploadedBy: varchar("uploaded_by", { length: 128 }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  description: text("description"),
  mimeType: varchar("mime_type", { length: 100 }),
});

export type IncidentAttachment = typeof incidentAttachments.$inferSelect;
export type InsertIncidentAttachment = typeof incidentAttachments.$inferInsert;

// User sessions for tracking active logins
export const userSessions = mysqlTable("user_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  loginTime: timestamp("login_time").defaultNow().notNull(),
  lastActivityTime: timestamp("last_activity_time").defaultNow().onUpdateNow().notNull(),
  logoutTime: timestamp("logout_time"),
  isActive: int("is_active").default(1).notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

// Vault for storing encrypted credentials
export const secretVault = mysqlTable("secret_vault", {
  id: int("id").autoincrement().primaryKey(),
  integrationId: varchar("integration_id", { length: 64 }).notNull(),
  secretName: varchar("secret_name", { length: 255 }).notNull(),
  secretType: mysqlEnum("secret_type", ["API_KEY", "OAUTH_TOKEN", "BASIC_AUTH", "CERTIFICATE", "CUSTOM"]).notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  encryptionAlgorithm: varchar("encryption_algorithm", { length: 50 }).default("AES-256-GCM").notNull(),
  encryptionIv: varchar("encryption_iv", { length: 255 }).notNull(),
  encryptionAuthTag: varchar("encryption_auth_tag", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at"),
  rotationInterval: int("rotation_interval"),
  lastRotatedAt: timestamp("last_rotated_at"),
  nextRotationAt: timestamp("next_rotation_at"),
  isActive: int("is_active").default(1).notNull(),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SecretVault = typeof secretVault.$inferSelect;
export type InsertSecretVault = typeof secretVault.$inferInsert;

// Audit log for secret access
export const secretAuditLog = mysqlTable("secret_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  secretId: int("secret_id").notNull(),
  integrationId: varchar("integration_id", { length: 64 }).notNull(),
  userId: int("user_id").notNull(),
  action: mysqlEnum("action", ["CREATE", "READ", "UPDATE", "DELETE", "ROTATE", "EXPORT"]).notNull(),
  status: mysqlEnum("status", ["SUCCESS", "FAILED", "DENIED"]).notNull(),
  reason: varchar("reason", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type SecretAuditLog = typeof secretAuditLog.$inferSelect;
export type InsertSecretAuditLog = typeof secretAuditLog.$inferInsert;

// Secret rotation history
export const secretRotationHistory = mysqlTable("secret_rotation_history", {
  id: int("id").autoincrement().primaryKey(),
  secretId: int("secret_id").notNull(),
  integrationId: varchar("integration_id", { length: 64 }).notNull(),
  rotationType: mysqlEnum("rotation_type", ["AUTOMATIC", "MANUAL", "EMERGENCY"]).notNull(),
  oldValueHash: varchar("old_value_hash", { length: 255 }).notNull(),
  newValueHash: varchar("new_value_hash", { length: 255 }).notNull(),
  rotatedBy: int("rotated_by"),
  reason: text("reason"),
  status: mysqlEnum("status", ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]).default("PENDING").notNull(),
  errorMessage: text("error_message"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SecretRotationHistory = typeof secretRotationHistory.$inferSelect;
export type InsertSecretRotationHistory = typeof secretRotationHistory.$inferInsert;

// ── Incidencia delictiva GRANULAR (SESNSP, formato largo) ──
// 1 fila por municipio-anio-mes-tipo-subtipo-modalidad. Conserva los ~40 tipos
// de delito reales (Secuestro, Extorsion, Feminicidio, Trata, etc.) sin perderlos
// en buckets. Fuente: data/sesnsp/_normalized/delitos_long.csv (filtrado a Edomex).
export const incidenciaDelito = mysqlTable("incidencia_delito", {
  id: int("id").autoincrement().primaryKey(),
  anio: int("anio").notNull(),
  mes: int("mes").notNull(),
  cveEnt: varchar("cve_ent", { length: 2 }).notNull(),
  entidad: varchar("entidad", { length: 64 }).notNull(),
  cveMuni: varchar("cve_muni", { length: 5 }).notNull(),
  municipio: varchar("municipio", { length: 128 }).notNull(),
  bienJuridico: varchar("bien_juridico", { length: 128 }).notNull(),
  tipo: varchar("tipo", { length: 128 }).notNull(),
  subtipo: varchar("subtipo", { length: 160 }).notNull(),
  modalidad: varchar("modalidad", { length: 255 }).notNull(),
  fuero: varchar("fuero", { length: 20 }).notNull().default("comun"),
  cantidad: int("cantidad").notNull().default(0),
}, (t) => [
  index("idx_del_muni_anio_mes").on(t.cveMuni, t.anio, t.mes),
  index("idx_del_tipo").on(t.tipo),
  index("idx_del_anio_mes").on(t.anio, t.mes),
]);

export type IncidenciaDelito = typeof incidenciaDelito.$inferSelect;
export type InsertIncidenciaDelito = typeof incidenciaDelito.$inferInsert;

// ── Victimas GRANULAR (RNID 2026) ──
// Igual que incidencia_delito + desglose por sexo y rango de edad.
// Fuente: data/sesnsp/_normalized/victimas_long.csv.
export const incidenciaVictima = mysqlTable("incidencia_victima", {
  id: int("id").autoincrement().primaryKey(),
  anio: int("anio").notNull(),
  mes: int("mes").notNull(),
  cveEnt: varchar("cve_ent", { length: 2 }).notNull(),
  entidad: varchar("entidad", { length: 64 }).notNull(),
  cveMuni: varchar("cve_muni", { length: 5 }).notNull(),
  municipio: varchar("municipio", { length: 128 }).notNull(),
  bienJuridico: varchar("bien_juridico", { length: 128 }).notNull(),
  tipo: varchar("tipo", { length: 128 }).notNull(),
  subtipo: varchar("subtipo", { length: 160 }).notNull(),
  modalidad: varchar("modalidad", { length: 255 }).notNull(),
  sexo: varchar("sexo", { length: 32 }).notNull(),
  rangoEdad: varchar("rango_edad", { length: 32 }).notNull(),
  fuero: varchar("fuero", { length: 20 }).notNull().default("comun"),
  cantidad: int("cantidad").notNull().default(0),
}, (t) => [
  index("idx_vic_muni_anio_mes").on(t.cveMuni, t.anio, t.mes),
  index("idx_vic_tipo").on(t.tipo),
]);

export type IncidenciaVictima = typeof incidenciaVictima.$inferSelect;
export type InsertIncidenciaVictima = typeof incidenciaVictima.$inferInsert;

// ── Alertas operativas ──
export const alertas = mysqlTable("alertas", {
  id: int("id").autoincrement().primaryKey(),
  nivel: mysqlEnum("nivel", ["critical", "warning", "info", "safe"]).notNull().default("info"),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  municipio: varchar("municipio", { length: 128 }).notNull(),
  lat: varchar("lat", { length: 20 }),
  lng: varchar("lng", { length: 20 }),
  unidades: int("unidades").notNull().default(0),
  reconocida: int("reconocida").notNull().default(0),
  escalada: int("escalada").notNull().default(0),
  resuelta: int("resuelta").notNull().default(0),
  operador: varchar("operador", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (t) => [
  index("idx_alerta_nivel").on(t.nivel),
  index("idx_alerta_muni").on(t.municipio),
  index("idx_alerta_created").on(t.createdAt),
]);

export type Alerta = typeof alertas.$inferSelect;
export type InsertAlerta = typeof alertas.$inferInsert;
