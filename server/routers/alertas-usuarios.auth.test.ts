/**
 * Verifica que las mutaciones de alertas/usuarios exijan sesión (protectedProcedure).
 * Ver CLAUDE.md → Issue crítico #11.
 */

import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

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

async function expectUnauthorized(fn: () => Promise<unknown>) {
  await expect(fn()).rejects.toThrow(TRPCError);
  try {
    await fn();
  } catch (e) {
    expect((e as TRPCError).code).toBe("UNAUTHORIZED");
  }
}

describe("alertasRouter — auth gate", () => {
  const anonCaller = appRouter.createCaller(createContext(null));
  const authCaller = appRouter.createCaller(createContext(AUTH_USER));

  it("listar sigue público (lectura de dashboard)", async () => {
    await expect(anonCaller.alertas.listar({})).resolves.toBeDefined();
  });

  it("crear rechaza sin sesión", async () => {
    await expectUnauthorized(() =>
      anonCaller.alertas.crear({ nivel: "info", titulo: "x", municipio: "Toluca" })
    );
  });

  it("eliminar/reconocer/escalar/despachar/resolver rechazan sin sesión", async () => {
    await expectUnauthorized(() => anonCaller.alertas.eliminar({ id: 1 }));
    await expectUnauthorized(() => anonCaller.alertas.reconocer({ id: 1 }));
    await expectUnauthorized(() => anonCaller.alertas.escalar({ id: 1 }));
    await expectUnauthorized(() => anonCaller.alertas.despachar({ id: 1 }));
    await expectUnauthorized(() => anonCaller.alertas.resolver({ id: 1 }));
  });

  it("crear no lanza UNAUTHORIZED con sesión válida (puede fallar por BD, no por auth)", async () => {
    try {
      await authCaller.alertas.crear({ nivel: "info", titulo: "x", municipio: "Toluca" });
    } catch (e) {
      expect((e as TRPCError).code).not.toBe("UNAUTHORIZED");
    }
  });
});

describe("usuariosRouter — auth gate", () => {
  const anonCaller = appRouter.createCaller(createContext(null));
  const authCaller = appRouter.createCaller(createContext(AUTH_USER));

  it("listar rechaza sin sesión (PII de usuarios institucionales)", async () => {
    await expectUnauthorized(() => anonCaller.usuarios.listar());
  });

  it("crear/actualizar/eliminar rechazan sin sesión", async () => {
    await expectUnauthorized(() =>
      anonCaller.usuarios.crear({ name: "x", email: "x@x.com", institutionalRole: "operador" })
    );
    await expectUnauthorized(() => anonCaller.usuarios.actualizar({ id: 1, name: "x" }));
    await expectUnauthorized(() => anonCaller.usuarios.eliminar({ id: 1 }));
  });

  it("listar no lanza UNAUTHORIZED con sesión válida", async () => {
    try {
      await authCaller.usuarios.listar();
    } catch (e) {
      expect((e as TRPCError).code).not.toBe("UNAUTHORIZED");
    }
  });
});
