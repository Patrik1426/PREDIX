import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { router, requirePermission } from "./trpc";
import type { TrpcContext } from "../auth/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(institutionalRole: AuthenticatedUser["institutionalRole"]): AuthenticatedUser {
  return {
    id: 1,
    openId: "sample-user",
    name: "Sample User",
    email: "sample@example.com",
    loginMethod: "manual",
    passwordHash: null,
    role: "user",
    institutionalRole,
    status: "active",
    institution: null,
    department: null,
    employeeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as AuthenticatedUser;
}

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const testRouter = router({
  editarIncidentes: requirePermission("incidentes", "canEdit").query(() => "ok"),
  borrarAlertas: requirePermission("alertas", "canDelete").query(() => "ok"),
});

describe("requirePermission", () => {
  it("consulta no puede editar incidentes (canEdit:0)", async () => {
    const caller = testRouter.createCaller(createContext(makeUser("consulta")));
    try {
      await caller.editarIncidentes();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("operador puede editar incidentes (canEdit:1) pero no borrar alertas (canDelete:0)", async () => {
    const caller = testRouter.createCaller(createContext(makeUser("operador")));
    await expect(caller.editarIncidentes()).resolves.toBe("ok");
    try {
      await caller.borrarAlertas();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("admin puede todo", async () => {
    const caller = testRouter.createCaller(createContext(makeUser("admin")));
    await expect(caller.editarIncidentes()).resolves.toBe("ok");
    await expect(caller.borrarAlertas()).resolves.toBe("ok");
  });

  it("sin sesión rechaza con UNAUTHORIZED (no FORBIDDEN) antes de llegar al chequeo de rol", async () => {
    const caller = testRouter.createCaller(createContext(null));
    try {
      await caller.editarIncidentes();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});
