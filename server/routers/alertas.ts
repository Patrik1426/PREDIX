import { z } from "zod";
import { publicProcedure, router } from "../_core/infra/trpc";
import { getDb } from "../config/db";
import { alertas } from "../../drizzle/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { logger } from "../_core/logger";

export const alertasRouter = router({
  listar: publicProcedure
    .input(z.object({
      desde: z.string().optional(),
      hasta: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], origen: "sin_bd" as const };
      try {
        const conditions = [];
        if (input?.desde) conditions.push(gte(alertas.createdAt, new Date(input.desde)));
        if (input?.hasta) {
          const hasta = new Date(input.hasta);
          hasta.setHours(23, 59, 59, 999);
          conditions.push(lte(alertas.createdAt, hasta));
        }
        const rows = await db.select().from(alertas)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(alertas.createdAt))
          .limit(200);
        return { data: rows, origen: "real" as const };
      } catch (e) {
        logger.error("[Alertas] Error listing:", e);
        return { data: [], origen: "error" as const };
      }
    }),

  eliminar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(alertas).where(eq(alertas.id, input.id));
      return { success: true };
    }),

  crear: publicProcedure
    .input(z.object({
      nivel: z.enum(["critical", "warning", "info"]),
      titulo: z.string().min(1),
      descripcion: z.string().optional(),
      municipio: z.string().min(1),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false, message: "BD no disponible" };
      try {
        await db.insert(alertas).values({
          nivel: input.nivel,
          titulo: input.titulo,
          descripcion: input.descripcion || "",
          municipio: input.municipio,
          lat: input.lat?.toString(),
          lng: input.lng?.toString(),
          unidades: 0,
        });
        return { success: true, message: "Alerta creada" };
      } catch (e) {
        logger.error("[Alertas] Error creating:", e);
        return { success: false, message: "Error al crear alerta" };
      }
    }),

  reconocer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(alertas).set({ reconocida: 1 }).where(eq(alertas.id, input.id));
      return { success: true };
    }),

  escalar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(alertas).set({ escalada: 1, nivel: "critical" }).where(eq(alertas.id, input.id));
      return { success: true };
    }),

  despachar: publicProcedure
    .input(z.object({ id: z.number(), cantidad: z.number().default(2) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const existing = await db.select({ unidades: alertas.unidades }).from(alertas).where(eq(alertas.id, input.id));
      if (existing.length === 0) return { success: false };
      await db.update(alertas).set({ unidades: existing[0].unidades + input.cantidad }).where(eq(alertas.id, input.id));
      return { success: true };
    }),

  resolver: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(alertas).set({ resuelta: 1, nivel: "safe" }).where(eq(alertas.id, input.id));
      return { success: true };
    }),
});
