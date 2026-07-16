import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const AUTH_USER: AuthenticatedUser = {
  id: 1, openId: "sample-user", email: "sample@example.com", name: "Sample User",
  loginMethod: "manus", role: "user", institutionalRole: "admin",
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("incidentes.exportCsv", () => {
  it("rechaza sin sesión", async () => {
    const caller = appRouter.createCaller(createContext(null));
    try {
      await caller.incidentes.exportCsv({});
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("con sesión, devuelve un CSV vacío pero bien formado en modo degradado (sin BD)", async () => {
    const caller = appRouter.createCaller(createContext(AUTH_USER));
    const result = await caller.incidentes.exportCsv({});
    expect(result.csv).toContain("Folio,Tipo,Municipio,Colonia,Estado,Prioridad,Personal,Atendido,Fecha,Narrativa");
    expect(result.recordCount).toBe(0);
    expect(result.filename).toMatch(/^incidentes-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("acepta los mismos filtros que listar sin tronar", async () => {
    const caller = appRouter.createCaller(createContext(AUTH_USER));
    const result = await caller.incidentes.exportCsv({ estado: "en_proceso", municipio: "Toluca", desde: "2026-01-01", hasta: "2026-01-31" });
    expect(result.recordCount).toBe(0);
  });
});
