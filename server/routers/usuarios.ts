import { z } from "zod";
import { publicProcedure, router } from "../_core/infra/trpc";
import { getDb } from "../config/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "../_core/logger";

const institutionalRoleSchema = z.enum(["operador", "supervisor", "analista", "admin", "consulta", "policia", "comandante"]);

export const usuariosRouter = router({
  listar: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { data: [], origen: "sin_bd" as const };
    try {
      const rows = await db.select().from(users);
      return { data: rows, origen: "real" as const };
    } catch (e) {
      logger.error("[Usuarios] Error listing:", e);
      return { data: [], origen: "error" as const };
    }
  }),

  crear: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      institutionalRole: institutionalRoleSchema,
      institution: z.string().optional(),
      department: z.string().optional(),
      employeeId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const openId = `manual:${input.email}`;
      const result = await db.insert(users).values({
        openId,
        name: input.name,
        email: input.email,
        loginMethod: "manual",
        institutionalRole: input.institutionalRole,
        status: "active",
        institution: input.institution,
        department: input.department,
        employeeId: input.employeeId,
      });
      return { success: true, id: result[0].insertId };
    }),

  actualizar: publicProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      institutionalRole: institutionalRoleSchema.optional(),
      department: z.string().optional(),
      status: z.enum(["active", "inactive", "suspended"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const { id, ...rest } = input;
      await db.update(users).set(rest).where(eq(users.id, id));
      return { success: true };
    }),

  eliminar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
