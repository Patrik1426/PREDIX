/**
 * auth.ts — Procedimientos de autenticación institucional
 * Maneja login, logout, permisos y control de acceso
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/infra/trpc";
import { getDb } from "../config/db";
import { users, rolePermissions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/auth/cookies";
import { ENV } from "../_core/infra/env";

// Define module names
export const MODULES = {
  MAPA_GEOESPACIAL: "mapa_geoespacial",
  ALERTAS: "alertas",
  INCIDENTES: "incidentes",
  PREDICCIONES: "predicciones",
  TABLERO: "tablero",
  ZONAS_DELICTIVAS: "zonas_delictivas",
  CHATBOT: "chatbot",
  ADMIN: "admin",
} as const;

// Define role permissions
export const DEFAULT_PERMISSIONS = {
  operador: {
    [MODULES.MAPA_GEOESPACIAL]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ALERTAS]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.INCIDENTES]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 0 },
    [MODULES.PREDICCIONES]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.TABLERO]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ZONAS_DELICTIVAS]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.CHATBOT]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ADMIN]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
  },
  supervisor: {
    [MODULES.MAPA_GEOESPACIAL]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.ALERTAS]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.INCIDENTES]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.PREDICCIONES]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.TABLERO]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.ZONAS_DELICTIVAS]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.CHATBOT]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ADMIN]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
  },
  analista: {
    [MODULES.MAPA_GEOESPACIAL]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.ALERTAS]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.INCIDENTES]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.PREDICCIONES]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.TABLERO]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.ZONAS_DELICTIVAS]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.CHATBOT]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ADMIN]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
  },
  admin: {
    [MODULES.MAPA_GEOESPACIAL]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
    [MODULES.ALERTAS]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
    [MODULES.INCIDENTES]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
    [MODULES.PREDICCIONES]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
    [MODULES.TABLERO]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
    [MODULES.ZONAS_DELICTIVAS]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
    [MODULES.CHATBOT]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
    [MODULES.ADMIN]: { canView: 1, canEdit: 1, canDelete: 1, canExport: 1 },
  },
  consulta: {
    [MODULES.MAPA_GEOESPACIAL]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ALERTAS]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.INCIDENTES]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.PREDICCIONES]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.TABLERO]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ZONAS_DELICTIVAS]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.CHATBOT]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ADMIN]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
  },
  policia: {
    [MODULES.MAPA_GEOESPACIAL]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ALERTAS]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 0 },
    [MODULES.INCIDENTES]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 0 },
    [MODULES.PREDICCIONES]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.TABLERO]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ZONAS_DELICTIVAS]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.CHATBOT]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ADMIN]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
  },
  comandante: {
    [MODULES.MAPA_GEOESPACIAL]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.ALERTAS]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.INCIDENTES]: { canView: 1, canEdit: 1, canDelete: 0, canExport: 1 },
    [MODULES.PREDICCIONES]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.TABLERO]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.ZONAS_DELICTIVAS]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 1 },
    [MODULES.CHATBOT]: { canView: 1, canEdit: 0, canDelete: 0, canExport: 0 },
    [MODULES.ADMIN]: { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 },
  },
} as const;

export const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => ctx.user ?? null),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(
      COOKIE_NAME,
      {
        ...getSessionCookieOptions(ctx.req),
        maxAge: -1,
      } as Parameters<typeof ctx.res.clearCookie>[1]
    );

    return { success: true };
  }),

  // Institutional login
  institutionalLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        employeeId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      if (ENV.enableDemoLogin) {
        if (
          input.email === "demo@edomex.gob.mx" &&
          input.password === "Demo@2026" &&
          input.employeeId === "EMP-2026-001"
        ) {
          return {
            success: true,
            message: "Sesión iniciada correctamente (demo)",
            role: "operador",
          };
        }
      }

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Credenciales inválidas",
      });
    }),

  // Get user permissions for a module
  getModulePermissions: protectedProcedure
    .input(z.object({ module: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user?.id || 0))
        .limit(1);

      if (!user.length) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuario no encontrado",
        });
      }

      const userRole = user[0].institutionalRole;
      const permissions = DEFAULT_PERMISSIONS[userRole as keyof typeof DEFAULT_PERMISSIONS];

      if (!permissions) {
        return {
          canView: 0,
          canEdit: 0,
          canDelete: 0,
          canExport: 0,
        };
      }

      const modulePerms = permissions[input.module as keyof typeof permissions];
      return modulePerms || { canView: 0, canEdit: 0, canDelete: 0, canExport: 0 };
    }),

  // Check if user can access module
  canAccessModule: protectedProcedure
    .input(z.object({ module: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user?.id || 0))
        .limit(1);

      if (!user.length || user[0].status !== "active") {
        return false;
      }

      const userRole = user[0].institutionalRole;
      const permissions = DEFAULT_PERMISSIONS[userRole as keyof typeof DEFAULT_PERMISSIONS];

      if (!permissions) {
        return false;
      }

      const modulePerms = permissions[input.module as keyof typeof permissions];
      return modulePerms?.canView === 1;
    }),

  // Get all modules accessible by user
  getAccessibleModules: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user?.id || 0))
      .limit(1);

    if (!user.length || user[0].status !== "active") {
      return [];
    }

    const userRole = user[0].institutionalRole;
    const permissions = DEFAULT_PERMISSIONS[userRole as keyof typeof DEFAULT_PERMISSIONS];

    if (!permissions) {
      return [];
    }

    return Object.entries(permissions)
      .filter(([, perms]) => perms.canView === 1)
      .map(([module]) => module);
  }),

  // Get user profile with role and permissions
  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user?.id || 0))
      .limit(1);

    if (!user.length) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Usuario no encontrado",
      });
    }

    const userData = user[0];
    const userRole = userData.institutionalRole;
    const permissions = DEFAULT_PERMISSIONS[userRole as keyof typeof DEFAULT_PERMISSIONS];

    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      institutionalRole: userData.institutionalRole,
      institution: userData.institution,
      department: userData.department,
      employeeId: userData.employeeId,
      status: userData.status,
      permissions,
    };
  }),
});
