import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/auth/context";
import * as dbModule from "./config/db";
import { hashPassword } from "./_core/auth/password";

function createContext(): { ctx: TrpcContext; cookiesSet: Array<{ name: string; value: string }> } {
  const cookiesSet: Array<{ name: string; value: string }> = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => {
        cookiesSet.push({ name, value });
      },
    } as unknown as TrpcContext["res"],
  };
  return { ctx, cookiesSet };
}

describe("auth.institutionalLogin", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invalid credentials when the user does not exist", async () => {
    vi.spyOn(dbModule, "getUserByEmail").mockResolvedValue(undefined);
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.institutionalLogin({
        email: "nadie@edomex.gob.mx",
        password: "cualquier-cosa",
        employeeId: "EMP-0000",
      })
    ).rejects.toThrow();
  });

  it("rejects a wrong password for an existing user", async () => {
    const passwordHash = await hashPassword("Correcta@2026");
    vi.spyOn(dbModule, "getUserByEmail").mockResolvedValue({
      id: 1,
      openId: "manual:analista@edomex.gob.mx",
      name: "Analista Demo",
      email: "analista@edomex.gob.mx",
      loginMethod: "manual",
      passwordHash,
      role: "user",
      institutionalRole: "analista",
      status: "active",
      institution: null,
      department: null,
      employeeId: "ANA-2026-014",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.institutionalLogin({
        email: "analista@edomex.gob.mx",
        password: "incorrecta",
        employeeId: "ANA-2026-014",
      })
    ).rejects.toThrow();
  });

  it("rejects a suspended/inactive user even with correct credentials", async () => {
    const passwordHash = await hashPassword("Correcta@2026");
    vi.spyOn(dbModule, "getUserByEmail").mockResolvedValue({
      id: 1,
      openId: "manual:suspendido@edomex.gob.mx",
      name: "Suspendido Demo",
      email: "suspendido@edomex.gob.mx",
      loginMethod: "manual",
      passwordHash,
      role: "user",
      institutionalRole: "analista",
      status: "suspended",
      institution: null,
      department: null,
      employeeId: "SUS-2026-001",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.institutionalLogin({
        email: "suspendido@edomex.gob.mx",
        password: "Correcta@2026",
        employeeId: "SUS-2026-001",
      })
    ).rejects.toThrow();
  });

  it("rejects a mismatched employeeId even with correct password", async () => {
    const passwordHash = await hashPassword("Correcta@2026");
    vi.spyOn(dbModule, "getUserByEmail").mockResolvedValue({
      id: 1,
      openId: "manual:analista@edomex.gob.mx",
      name: "Analista Demo",
      email: "analista@edomex.gob.mx",
      loginMethod: "manual",
      passwordHash,
      role: "user",
      institutionalRole: "analista",
      status: "active",
      institution: null,
      department: null,
      employeeId: "ANA-2026-014",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.institutionalLogin({
        email: "analista@edomex.gob.mx",
        password: "Correcta@2026",
        employeeId: "OTRO-ID",
      })
    ).rejects.toThrow();
  });

  it("accepts correct credentials, sets a session cookie, and returns the role", async () => {
    const passwordHash = await hashPassword("Correcta@2026");
    vi.spyOn(dbModule, "getUserByEmail").mockResolvedValue({
      id: 1,
      openId: "manual:analista@edomex.gob.mx",
      name: "Analista Demo",
      email: "analista@edomex.gob.mx",
      loginMethod: "manual",
      passwordHash,
      role: "user",
      institutionalRole: "analista",
      status: "active",
      institution: null,
      department: null,
      employeeId: "ANA-2026-014",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    vi.spyOn(dbModule, "upsertUser").mockResolvedValue(undefined);
    const { ctx, cookiesSet } = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.institutionalLogin({
      email: "analista@edomex.gob.mx",
      password: "Correcta@2026",
      employeeId: "ANA-2026-014",
    });

    expect(result).toEqual({ success: true, role: "analista" });
    expect(cookiesSet).toHaveLength(1);
  });
});
