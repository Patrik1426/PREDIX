import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";

function createContext(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("incidencia.syncNow", () => {
  it("rechaza sin sesión (UNAUTHORIZED)", async () => {
    const caller = appRouter.createCaller(createContext(null));
    try {
      await caller.incidencia.syncNow();
      throw new Error("esperaba que rechazara");
    } catch (e) {
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});
