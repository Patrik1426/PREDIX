import { z } from "zod";
import { protectedProcedure, router } from "../_core/infra/trpc";
import { getDb } from "../config/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "../_core/logger";
import { toPublicUser } from "../_core/auth/sanitizeUser";
import { hashPassword } from "../_core/auth/password";

const institutionalRoleSchema = z.enum(["operador", "supervisor", "analista", "admin", "consulta", "policia", "comandante"]);

export const usuariosRouter = router({
  listar: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { data: [], origen: "sin_bd" as const };
    try {
      const rows = await db.select().from(users);
      return { data: rows.map(toPublicUser), origen: "real" as const };
    } catch (e) {
      logger.error("[Usuarios] Error listing:", e);
      return { data: [], origen: "error" as const };
    }
  }),

  crear: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      institutionalRole: institutionalRoleSchema,
      institution: z.string().optional(),
      department: z.string().optional(),
      employeeId: z.string().optional(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const openId = `manual:${input.email}`;
      const passwordHash = await hashPassword(input.password);
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
        passwordHash,
      });
      return { success: true, id: result[0].insertId };
    }),

  actualizar: protectedProcedure
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

  resetPassword: protectedProcedure
    .input(z.object({
      id: z.number(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const passwordHash = await hashPassword(input.password);
      await db.update(users).set({ passwordHash }).where(eq(users.id, input.id));
      return { success: true };
    }),

  eliminar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
