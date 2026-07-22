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

describe("admin.auditLog", () => {
  it("rechaza sin sesión", async () => {
    const caller = appRouter.createCaller(createContext(null));
    try {
      await caller.admin.auditLog();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("responde con origen 'sin_bd' y data vacía en modo degradado (rol admin)", async () => {
    const caller = appRouter.createCaller(createContext(AUTH_USER));
    const result = await caller.admin.auditLog();
    expect(result.origen).toBe("sin_bd");
    expect(result.data).toEqual([]);
  });

  it("rechaza con FORBIDDEN a un rol sin permiso de admin (ej. consulta)", async () => {
    const caller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));
    try {
      await caller.admin.auditLog();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

describe("admin.listRolePermissions", () => {
  it("rechaza sin sesión", async () => {
    const caller = appRouter.createCaller(createContext(null));
    try {
      await caller.admin.listRolePermissions();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("rechaza con FORBIDDEN a un rol sin permiso de admin (ej. consulta)", async () => {
    const caller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));
    try {
      await caller.admin.listRolePermissions();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("responde con origen 'fallback' y la matriz de DEFAULT_PERMISSIONS en modo degradado", async () => {
    const caller = appRouter.createCaller(createContext(AUTH_USER));
    const result = await caller.admin.listRolePermissions();
    expect(result.origen).toBe("fallback");
    expect(result.roles).toContain("operador");
    expect(result.modules).toContain("admin");
    expect(result.matrix.operador.mapa_geoespacial.canView).toBe(1);
  });
});

describe("admin.updateRolePermission", () => {
  it("rechaza sin sesión", async () => {
    const caller = appRouter.createCaller(createContext(null));
    try {
      await caller.admin.updateRolePermission({ role: "operador", module: "admin", canView: true, canEdit: false, canDelete: false, canExport: false });
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("rechaza con FORBIDDEN a un rol sin permiso de admin (ej. consulta)", async () => {
    const caller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));
    try {
      await caller.admin.updateRolePermission({ role: "operador", module: "admin", canView: true, canEdit: false, canDelete: false, canExport: false });
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("lanza error en modo degradado (sin BD no se puede persistir)", async () => {
    const caller = appRouter.createCaller(createContext(AUTH_USER));
    await expect(
      caller.admin.updateRolePermission({ role: "operador", module: "admin", canView: true, canEdit: false, canDelete: false, canExport: false })
    ).rejects.toThrow(/BD no disponible/);
  });
});

describe("admin.resetRolePermissions", () => {
  it("rechaza sin sesión", async () => {
    const caller = appRouter.createCaller(createContext(null));
    try {
      await caller.admin.resetRolePermissions({ role: "operador" });
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("rechaza con FORBIDDEN a un rol sin permiso de admin (ej. consulta)", async () => {
    const caller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));
    try {
      await caller.admin.resetRolePermissions({ role: "operador" });
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("lanza error en modo degradado (sin BD no se puede persistir)", async () => {
    const caller = appRouter.createCaller(createContext(AUTH_USER));
    await expect(caller.admin.resetRolePermissions({ role: "operador" })).rejects.toThrow(/BD no disponible/);
  });
});
