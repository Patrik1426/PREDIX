/**
 * Cobertura de comportamiento de usuariosRouter (más allá del auth gate,
 * ver alertas-usuarios.auth.test.ts). Entorno de test corre en modo
 * degradado (sin DATABASE_URL) — verifica que cada procedimiento
 * degrade con gracia en vez de tronar.
 */

import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const AUTH_USER: AuthenticatedUser = {
  id: 1,
  openId: "sample-user",
  email: "sample@example.com",
  name: "Sample User",
  loginMethod: "manus",
  role: "user",
  institutionalRole: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAuthCaller() {
  return appRouter.createCaller(createContext(AUTH_USER));
}

// Gestión de usuarios ahora exige requirePermission(ADMIN, ...) — antes solo
// pedía sesión (protectedProcedure), cualquier rol autenticado podía crear/
// editar/borrar otros usuarios. Ver CLAUDE.md.
describe("usuarios.* — RBAC real (solo rol admin gestiona usuarios)", () => {
  const nonAdminCaller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));

  it("listar rechaza con FORBIDDEN a un rol sin permiso de admin (ej. consulta)", async () => {
    await expect(nonAdminCaller.usuarios.listar()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("crear rechaza con FORBIDDEN a un rol sin permiso de admin", async () => {
    await expect(
      nonAdminCaller.usuarios.crear({ name: "x", email: "x@x.com", institutionalRole: "operador", password: "Password123" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("actualizar rechaza con FORBIDDEN a un rol sin permiso de admin", async () => {
    await expect(nonAdminCaller.usuarios.actualizar({ id: 1, name: "x" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<TRPCError>);
  });

  it("eliminar rechaza con FORBIDDEN a un rol sin permiso de admin", async () => {
    await expect(nonAdminCaller.usuarios.eliminar({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<TRPCError>);
  });
});

describe("usuarios.listar", () => {
  it("responde en modo degradado con origen 'sin_bd' y data vacía", async () => {
    const caller = createAuthCaller();
    const result = await caller.usuarios.listar();
    expect(result.origen).toBe("sin_bd");
    expect(result.data).toEqual([]);
  });
});

describe("usuarios mutations — modo degradado (sin BD)", () => {
  const caller = createAuthCaller();

  it("crear valida input y devuelve success:false sin BD (no truena)", async () => {
    const result = await caller.usuarios.crear({
      name: "Prueba",
      email: "prueba@edomex.gob.mx",
      institutionalRole: "operador",
      password: "Password123",
    });
    expect(result.success).toBe(false);
  });

  it("crear rechaza email inválido, rol fuera del enum, y password corto (zod)", async () => {
    await expect(
      caller.usuarios.crear({ name: "x", email: "no-es-email", institutionalRole: "operador", password: "Password123" })
    ).rejects.toThrow();
    await expect(
      // @ts-expect-error rol inválido a propósito
      caller.usuarios.crear({ name: "x", email: "x@x.com", institutionalRole: "superadmin", password: "Password123" })
    ).rejects.toThrow();
    await expect(
      caller.usuarios.crear({ name: "x", email: "x@x.com", institutionalRole: "operador", password: "corta" })
    ).rejects.toThrow();
  });

  it("acepta los 7 roles institucionales válidos sin rechazo de zod", async () => {
    const roles = ["operador", "supervisor", "analista", "admin", "consulta", "policia", "comandante"] as const;
    for (const institutionalRole of roles) {
      const result = await caller.usuarios.crear({ name: "x", email: `x-${institutionalRole}@x.com`, institutionalRole, password: "Password123" });
      // No debe rechazar por validación; en modo degradado falla por BD, no por zod.
      expect(result.success).toBe(false);
    }
  });

  it("actualizar/eliminar devuelven success:false sin BD", async () => {
    expect((await caller.usuarios.actualizar({ id: 1, status: "suspended" })).success).toBe(false);
    expect((await caller.usuarios.eliminar({ id: 1 })).success).toBe(false);
  });
});
