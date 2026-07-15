/**
 * Cobertura de incidentesRouter: auth gate + comportamiento en modo
 * degradado (sin DATABASE_URL en test).
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

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

async function expectUnauthorized(fn: () => Promise<unknown>) {
  try {
    await fn();
    throw new Error("esperaba que rechazara");
  } catch (e) {
    expect((e as TRPCError).code).toBe("UNAUTHORIZED");
  }
}

describe("incidentes — auth gate", () => {
  const anonCaller = appRouter.createCaller(createContext(null));

  it("listar sigue público (lectura de dashboard)", async () => {
    await expect(anonCaller.incidentes.listar({})).resolves.toBeDefined();
  });

  it("crear/actualizar/eliminar rechazan sin sesión", async () => {
    await expectUnauthorized(() =>
      anonCaller.incidentes.crear({ tipo: "Robo", municipio: "Toluca", narrativa: "x", prioridad: "media" })
    );
    await expectUnauthorized(() => anonCaller.incidentes.actualizar({ id: 1, estado: "cerrado" }));
    await expectUnauthorized(() => anonCaller.incidentes.eliminar({ id: 1 }));
  });
});

describe("incidentes.listar — modo degradado", () => {
  it("responde con origen 'sin_bd' y data vacía", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.incidentes.listar({});
    expect(result.origen).toBe("sin_bd");
    expect(result.data).toEqual([]);
  });

  it("acepta filtros de estado/municipio/fecha sin tronar", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.incidentes.listar({ estado: "en_proceso", municipio: "Toluca", desde: "2026-01-01", hasta: "2026-01-31" });
    expect(result.data).toEqual([]);
  });
});

describe("incidentes mutations — modo degradado (sin BD), con sesión", () => {
  const caller = appRouter.createCaller(createContext(AUTH_USER));

  it("crear valida input y degrada a success:false sin BD (no truena)", async () => {
    const result = await caller.incidentes.crear({ tipo: "Robo a transeúnte", municipio: "Toluca", narrativa: "Detalle del hecho", prioridad: "alta" });
    expect(result.success).toBe(false);
  });

  it("crear rechaza input inválido (zod) antes de tocar la BD", async () => {
    await expect(
      caller.incidentes.crear({ tipo: "", municipio: "Toluca", narrativa: "x", prioridad: "alta" })
    ).rejects.toThrow();
    await expect(
      // @ts-expect-error prioridad inválida a propósito
      caller.incidentes.crear({ tipo: "x", municipio: "Toluca", narrativa: "x", prioridad: "urgentísima" })
    ).rejects.toThrow();
  });

  it("actualizar/eliminar degradan a success:false sin BD", async () => {
    expect((await caller.incidentes.actualizar({ id: 1, estado: "cerrado" })).success).toBe(false);
    expect((await caller.incidentes.eliminar({ id: 1 })).success).toBe(false);
  });

  it("actualizar acepta atendido como boolean sin romper zod", async () => {
    const result = await caller.incidentes.actualizar({ id: 1, atendido: true });
    expect(result.success).toBe(false); // degrada por BD, no por validación
  });
});

describe("incidentes mutations — permisos por rol", () => {
  function createCallerWithRole(institutionalRole: AuthenticatedUser["institutionalRole"]) {
    return appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole }));
  }

  it("consulta no puede crear incidentes (canEdit:0)", async () => {
    const caller = createCallerWithRole("consulta");
    try {
      await caller.incidentes.crear({ tipo: "Robo", municipio: "Toluca", narrativa: "x", prioridad: "media" });
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("operador puede crear incidentes (incidentes.canEdit:1)", async () => {
    const caller = createCallerWithRole("operador");
    const result = await caller.incidentes.crear({ tipo: "Robo", municipio: "Toluca", narrativa: "x", prioridad: "media" });
    expect(result.success).toBe(false); // degrada por BD en test, no rechaza por permiso
  });

  it("operador no puede eliminar incidentes (incidentes.canDelete:0)", async () => {
    const caller = createCallerWithRole("operador");
    try {
      await caller.incidentes.eliminar({ id: 1 });
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("admin puede eliminar incidentes (canDelete:1)", async () => {
    const caller = createCallerWithRole("admin");
    const result = await caller.incidentes.eliminar({ id: 1 });
    expect(result.success).toBe(false); // degrada por BD en test, no rechaza por permiso
  });
});
