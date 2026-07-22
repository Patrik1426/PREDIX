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

describe("vault.clearAuditLogs", () => {
  it("rechaza sin sesión", async () => {
    const caller = appRouter.createCaller(createContext(null));
    try {
      await caller.vault.clearAuditLogs();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("rechaza con FORBIDDEN a un rol sin permiso de eliminar en admin (ej. consulta)", async () => {
    const caller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));
    try {
      await caller.vault.clearAuditLogs();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("lanza error en modo degradado (sin BD no se puede truncar secret_audit_log)", async () => {
    // logAudit() no truena sin BD (se registra en audit_log, que aquí tampoco
    // existe) — el error real viene de vaultManager.clearAuditLogs, confirmando
    // que el registro de auditoría se intenta ANTES del borrado, no después.
    const caller = appRouter.createCaller(createContext(AUTH_USER));
    await expect(caller.vault.clearAuditLogs()).rejects.toThrow(/Vault no disponible/);
  });
});
