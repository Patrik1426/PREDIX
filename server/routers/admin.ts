import { requirePermission, router } from "../_core/infra/trpc";
import { getDb } from "../config/db";
import { auditLog } from "../../drizzle/schema";
import { MODULES } from "../_core/infra/permissions";
import { desc } from "drizzle-orm";
import { logger } from "../_core/logger";

export const adminRouter = router({
  auditLog: requirePermission(MODULES.ADMIN, "canView").query(async () => {
    const db = await getDb();
    if (!db) return { data: [], origen: "sin_bd" as const };
    try {
      const rows = await db.select().from(auditLog).orderBy(desc(auditLog.timestamp)).limit(200);
      return { data: rows, origen: "real" as const };
    } catch (e) {
      logger.error("[Admin] Error listing audit log:", e);
      return { data: [], origen: "error" as const };
    }
  }),
});
