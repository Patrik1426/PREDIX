/**
 * Automatic SESNSP Data Sync Scheduler
 * Runs periodic synchronization of crime statistics data
 * Executes every 24 hours to keep data fresh
 */

import { syncSesnspData } from "../data/sesnsp";
import { logger } from "../_core/logger";

let syncInterval: NodeJS.Timeout | null = null;

/**
 * Start the automatic sync scheduler
 * Syncs data immediately on startup, then every 24 hours
 */
export function startSyncScheduler() {
  logger.info("[Scheduler] Starting SESNSP data sync scheduler...");

  // Initial sync on startup
  syncSesnspData().catch((error) => {
    logger.error("[Scheduler] Initial sync failed:", error);
  });

  // Schedule recurring sync every 24 hours
  syncInterval = setInterval(() => {
    logger.info("[Scheduler] Running scheduled SESNSP sync...");
    syncSesnspData().catch((error) => {
      logger.error("[Scheduler] Scheduled sync failed:", error);
    });
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

  logger.info("[Scheduler] SESNSP sync scheduler started successfully");
}

/**
 * Stop the automatic sync scheduler
 */
export function stopSyncScheduler() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info("[Scheduler] SESNSP sync scheduler stopped");
  }
}

/**
 * Get scheduler status
 */
export function getSyncSchedulerStatus() {
  return {
    isRunning: syncInterval !== null,
    lastSync: new Date().toISOString(),
  };
}
