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

function createContext(): TrpcContext {
  return {
    user: AUTH_USER,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("usuarios.crear / resetPassword", () => {
  it("requires a password of at least 8 characters to create a user", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.usuarios.crear({
        name: "Nuevo Usuario",
        email: "nuevo@edomex.gob.mx",
        institutionalRole: "operador",
        password: "corta",
      })
    ).rejects.toThrow();
  });

  it("returns success:false in degraded mode (no DB) for crear", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.usuarios.crear({
      name: "Nuevo Usuario",
      email: "nuevo@edomex.gob.mx",
      institutionalRole: "operador",
      password: "Password123",
    });

    expect(result).toEqual({ success: false });
  });

  it("returns success:false in degraded mode (no DB) for resetPassword", async () => {
    const caller = appRouter.createCaller(createContext());

    const result = await caller.usuarios.resetPassword({
      id: 1,
      password: "NuevaPassword123",
    });

    expect(result).toEqual({ success: false });
  });
});
