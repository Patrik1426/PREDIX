import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { requirePermission, router } from "../_core/infra/trpc";
import { getDb } from "../config/db";
import { auditLog } from "../../drizzle/schema";
import { MODULES } from "../_core/infra/permissions";
import { desc } from "drizzle-orm";
import { logger } from "../_core/logger";
import { listAllRolePermissions, updateRolePermission, resetRolePermissions, getPermissionsOrigin, ROLE_NAMES, MODULE_NAMES } from "../services/permissionsCache";
import { logAudit } from "../config/auditLog";

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

  /**
   * Matriz completa de permisos por rol — fuente real (role_permissions,
   * con DEFAULT_PERMISSIONS como respaldo si la tabla está vacía o sin BD).
   * Esto es lo mismo que consulta requirePermission en cada request.
   */
  listRolePermissions: requirePermission(MODULES.ADMIN, "canView").query(async () => {
    const matrix = await listAllRolePermissions();
    const origen = await getPermissionsOrigin();
    return { roles: ROLE_NAMES, modules: MODULE_NAMES, matrix, origen };
  }),

  /**
   * Actualiza un permiso (rol x módulo x acción) — afecta la autorización
   * real del sistema de inmediato (invalida el caché que usa requirePermission).
   */
  updateRolePermission: requirePermission(MODULES.ADMIN, "canEdit")
    .input(z.object({
      role: z.enum(ROLE_NAMES as [string, ...string[]]),
      module: z.enum(MODULE_NAMES as [string, ...string[]]),
      canView: z.boolean(),
      canEdit: z.boolean(),
      canDelete: z.boolean(),
      canExport: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Evita el auto-bloqueo: sin esto, un admin podría quitarse a sí mismo
      // (y a todo el rol admin) el acceso al propio módulo de Administración
      // sin ninguna forma de revertirlo salvo editar la BD directo.
      if (input.role === "admin" && input.module === MODULES.ADMIN && (!input.canView || !input.canEdit)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se puede quitar acceso de Ver/Editar al rol admin sobre el módulo de Administración — dejaría a todos los administradores sin poder revertirlo.",
        });
      }
      await updateRolePermission(input.role, input.module, {
        canView: input.canView ? 1 : 0,
        canEdit: input.canEdit ? 1 : 0,
        canDelete: input.canDelete ? 1 : 0,
        canExport: input.canExport ? 1 : 0,
      });
      await logAudit({
        userId: ctx.user.id,
        action: "UPDATE_ROLE_PERMISSION",
        module: "administracion",
        resourceId: `${input.role}:${input.module}`,
        details: `canView=${input.canView} canEdit=${input.canEdit} canDelete=${input.canDelete} canExport=${input.canExport}`,
        ip: ctx.req.ip || "unknown",
      });
      return { success: true };
    }),

  /** Restablece los permisos de un rol a los valores por defecto del sistema. */
  resetRolePermissions: requirePermission(MODULES.ADMIN, "canEdit")
    .input(z.object({ role: z.enum(ROLE_NAMES as [string, ...string[]]) }))
    .mutation(async ({ input, ctx }) => {
      await resetRolePermissions(input.role);
      await logAudit({
        userId: ctx.user.id,
        action: "RESET_ROLE_PERMISSIONS",
        module: "administracion",
        resourceId: input.role,
        details: "Restablecido a valores por defecto",
        ip: ctx.req.ip || "unknown",
      });
      return { success: true };
    }),
});
