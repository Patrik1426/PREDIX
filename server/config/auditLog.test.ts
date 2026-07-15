import { describe, expect, it, vi } from "vitest";
import { logAudit } from "./auditLog";
import * as dbModule from "./db";

describe("logAudit", () => {
  it("no lanza cuando no hay BD (modo degradado)", async () => {
    await expect(
      logAudit({ userId: 1, action: "CREATE_ALERTA", module: "alertas" })
    ).resolves.toBeUndefined();
  });

  it("no lanza si la inserción falla", async () => {
    vi.spyOn(dbModule, "getDb").mockResolvedValue({
      insert: () => ({ values: () => { throw new Error("boom"); } }),
    } as unknown as Awaited<ReturnType<typeof dbModule.getDb>>);

    await expect(
      logAudit({ userId: 1, action: "CREATE_ALERTA", module: "alertas" })
    ).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });
});
