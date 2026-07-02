-- ============================================================
-- PREDIX — Esquema Completo de Base de Datos
-- Generado: Fri Apr 24 16:13:06 EDT 2026
-- Motor: MySQL 8.0+ / TiDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS predix_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE predix_db;

-- Migración: drizzle/0000_dry_zarda.sql
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);


-- Migración: drizzle/0001_damp_smasher.sql
CREATE TABLE `incidencia_delictiva` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estado` varchar(64) NOT NULL,
	`municipio` varchar(128) NOT NULL,
	`codigo_municipio` varchar(10),
	`anio` int NOT NULL,
	`mes` int NOT NULL,
	`homicidios` int DEFAULT 0,
	`robos` int DEFAULT 0,
	`lesiones` int DEFAULT 0,
	`violencia_sexual` int DEFAULT 0,
	`trafico_de_drogas` int DEFAULT 0,
	`otros_delitos` int DEFAULT 0,
	`victimas` int DEFAULT 0,
	`fuero` varchar(20) DEFAULT 'comun',
	`last_updated` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`source_url` text,
	CONSTRAINT `incidencia_delictiva_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sesnsp_sync_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`last_sync_time` timestamp DEFAULT (now()),
	`records_processed` int DEFAULT 0,
	`status` varchar(20) DEFAULT 'pending',
	`error_message` text,
	`next_sync_time` timestamp,
	CONSTRAINT `sesnsp_sync_log_id` PRIMARY KEY(`id`)
);


-- Migración: drizzle/0002_early_luminals.sql
CREATE TABLE `incident_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incident_id` varchar(64) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_type` varchar(50) NOT NULL,
	`file_size` int NOT NULL,
	`s3_key` varchar(512) NOT NULL,
	`s3_url` text NOT NULL,
	`uploaded_by` varchar(128),
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	`description` text,
	`mime_type` varchar(100),
	CONSTRAINT `incident_attachments_id` PRIMARY KEY(`id`)
);


-- Migración: drizzle/0003_slim_wasp.sql
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`module` varchar(64) NOT NULL,
	`resource_id` varchar(255),
	`details` text,
	`ip_address` varchar(45),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('operador','supervisor','analista','admin') NOT NULL,
	`module` varchar(64) NOT NULL,
	`can_view` int NOT NULL DEFAULT 0,
	`can_edit` int NOT NULL DEFAULT 0,
	`can_delete` int NOT NULL DEFAULT 0,
	`can_export` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_token` varchar(255) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`login_time` timestamp NOT NULL DEFAULT (now()),
	`last_activity_time` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`logout_time` timestamp,
	`is_active` int NOT NULL DEFAULT 1,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_session_token_unique` UNIQUE(`session_token`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `institutional_role` enum('operador','supervisor','analista','admin') DEFAULT 'operador' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('active','inactive','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `institution` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `employee_id` varchar(64);

-- Migración: drizzle/0004_lying_surge.sql
CREATE TABLE `secret_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`secret_id` int NOT NULL,
	`integration_id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`action` enum('CREATE','READ','UPDATE','DELETE','ROTATE','EXPORT') NOT NULL,
	`status` enum('SUCCESS','FAILED','DENIED') NOT NULL,
	`reason` varchar(255),
	`ip_address` varchar(45),
	`user_agent` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `secret_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secret_rotation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`secret_id` int NOT NULL,
	`integration_id` varchar(64) NOT NULL,
	`rotation_type` enum('AUTOMATIC','MANUAL','EMERGENCY') NOT NULL,
	`old_value_hash` varchar(255) NOT NULL,
	`new_value_hash` varchar(255) NOT NULL,
	`rotated_by` int,
	`reason` text,
	`status` enum('PENDING','IN_PROGRESS','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
	`error_message` text,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `secret_rotation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secret_vault` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integration_id` varchar(64) NOT NULL,
	`secret_name` varchar(255) NOT NULL,
	`secret_type` enum('API_KEY','OAUTH_TOKEN','BASIC_AUTH','CERTIFICATE','CUSTOM') NOT NULL,
	`encrypted_value` text NOT NULL,
	`encryption_algorithm` varchar(50) NOT NULL DEFAULT 'AES-256-GCM',
	`encryption_iv` varchar(255) NOT NULL,
	`encryption_auth_tag` varchar(255) NOT NULL,
	`expires_at` timestamp,
	`rotation_interval` int,
	`last_rotated_at` timestamp,
	`next_rotation_at` timestamp,
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `secret_vault_id` PRIMARY KEY(`id`)
);


