import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";
import * as realtimeModule from "../services/realtimeService";

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

function createContext(): TrpcContext {
  return {
    user: AUTH_USER,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("incidentes mutations — no emiten evento cuando la mutación degrada (sin BD)", () => {
  it("crear NO llama emitEvent si la BD no está disponible", async () => {
    const spy = vi.spyOn(realtimeModule, "emitEvent");
    const caller = appRouter.createCaller(createContext());
    await caller.incidentes.crear({ tipo: "Robo", municipio: "Toluca", narrativa: "x", prioridad: "media" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
