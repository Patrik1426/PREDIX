import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import { csvSafe } from "./incidentes";
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

  it("rechaza a un rol sin permiso de exportación (consulta, canExport:0)", async () => {
    const caller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));
    try {
      await caller.incidentes.exportCsv({});
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

describe("csvSafe — neutraliza CSV formula injection (CWE-1236)", () => {
  it("antepone un apóstrofo si el valor empieza con =, +, -, @ o tab", () => {
    expect(csvSafe("=cmd|'/c calc'!A1")).toBe("\"'=cmd|'/c calc'!A1\"");
    expect(csvSafe("+1+1")).toBe('"\'+1+1"');
    expect(csvSafe("-1+1")).toBe('"\'-1+1"');
    expect(csvSafe("@SUM(A1)")).toBe('"\'@SUM(A1)"');
    expect(csvSafe("\tmalicious")).toBe('"\'\tmalicious"');
  });

  it("no toca valores normales", () => {
    expect(csvSafe("Robo a transeúnte")).toBe('"Robo a transeúnte"');
  });

  it("sigue escapando comillas dobles internas", () => {
    expect(csvSafe('Dijo "hola"')).toBe('"Dijo ""hola"""');
  });
});
