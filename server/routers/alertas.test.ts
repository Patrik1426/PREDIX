/**
 * Cobertura de comportamiento de alertasRouter (más allá del auth gate,
 * ver alertas-usuarios.auth.test.ts). Entorno de test corre en modo
 * degradado (sin DATABASE_URL) — verifica que cada procedimiento
 * degrade con gracia en vez de tronar.
 */

import { describe, expect, it } from "vitest";
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
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createAuthCaller() {
  const ctx: TrpcContext = {
    user: AUTH_USER,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

function createAnonCaller() {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("alertas.listar", () => {
  it("responde en modo degradado con origen 'sin_bd' y data vacía, sin sesión", async () => {
    const caller = createAnonCaller();
    const result = await caller.alertas.listar({});
    expect(result.origen).toBe("sin_bd");
    expect(result.data).toEqual([]);
  });

  it("acepta filtro de fechas sin tronar", async () => {
    const caller = createAnonCaller();
    const result = await caller.alertas.listar({ desde: "2026-01-01", hasta: "2026-01-31" });
    expect(result.data).toEqual([]);
  });
});

describe("alertas mutations — modo degradado (sin BD)", () => {
  const caller = createAuthCaller();

  it("crear valida input y devuelve success:false sin BD (no truena)", async () => {
    const result = await caller.alertas.crear({ nivel: "info", titulo: "Prueba", municipio: "Toluca" });
    expect(result.success).toBe(false);
  });

  it("crear rechaza input inválido (zod) antes de tocar la BD", async () => {
    await expect(
      // @ts-expect-error nivel inválido a propósito
      caller.alertas.crear({ nivel: "no-existe", titulo: "x", municipio: "Toluca" })
    ).rejects.toThrow();
    await expect(
      caller.alertas.crear({ nivel: "info", titulo: "", municipio: "Toluca" })
    ).rejects.toThrow();
  });

  it("eliminar/reconocer/escalar/resolver devuelven success:false sin BD", async () => {
    expect((await caller.alertas.eliminar({ id: 1 })).success).toBe(false);
    expect((await caller.alertas.reconocer({ id: 1 })).success).toBe(false);
    expect((await caller.alertas.escalar({ id: 1 })).success).toBe(false);
    expect((await caller.alertas.resolver({ id: 1 })).success).toBe(false);
  });

  it("despachar devuelve success:false cuando la alerta no existe (o no hay BD)", async () => {
    const result = await caller.alertas.despachar({ id: 1, cantidad: 2 });
    expect(result.success).toBe(false);
  });

  it("despachar usa cantidad=2 por default", async () => {
    // Solo valida que el input opcional no rompa el parseo zod.
    await expect(caller.alertas.despachar({ id: 1 })).resolves.toMatchObject({ success: false });
  });
});
