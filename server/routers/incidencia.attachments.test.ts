/**
 * Cobertura de los procedimientos de adjuntos de incidencia.ts
 * (uploadAttachment/getAttachments/deleteAttachment). En este entorno
 * BUILT_IN_FORGE_API_URL/KEY están vacías (ver CLAUDE.md issue #8) y no
 * hay DATABASE_URL en test — verifica la degradación específica de cada caso.
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("incidencia.uploadAttachment", () => {
  it("falla con mensaje específico de credenciales Forge faltantes (no truena)", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.incidencia.uploadAttachment({
      incidentId: "INC-001",
      fileName: "evidencia.jpg",
      fileData: Buffer.from("contenido de prueba").toString("base64"),
      mimeType: "image/jpeg",
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Storage proxy credentials missing/i);
  });

  it("rechaza input inválido (zod) antes de llegar al storage", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.incidencia.uploadAttachment({
        incidentId: "",
        fileName: "x.jpg",
        fileData: "abc",
        mimeType: "image/jpeg",
      })
    ).rejects.toThrow();
  });
});

describe("incidencia.getAttachments", () => {
  it("devuelve lista vacía en modo degradado (sin BD), no truena", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.incidencia.getAttachments({ incidentId: "INC-001" });
    expect(result).toEqual([]);
  });
});

describe("incidencia.deleteAttachment", () => {
  it("devuelve success:false en modo degradado (sin BD), no truena", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.incidencia.deleteAttachment({ attachmentId: 1 });
    expect(result.success).toBe(false);
  });
});
