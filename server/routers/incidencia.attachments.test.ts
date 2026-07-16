/**
 * Cobertura de comportamiento de los procedimientos de adjuntos (más allá
 * del auth gate, ver incidencia.attachments.auth.test.ts). Entorno de test
 * corre en modo degradado (sin DATABASE_URL) — verifica que cada
 * procedimiento degrade con gracia en vez de tronar.
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const AUTH_USER: AuthenticatedUser = {
  id: 1, openId: "sample-user", email: "sample@example.com", name: "Sample User",
  loginMethod: "manus", role: "user", institutionalRole: "admin",
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createAuthCaller() {
  const ctx: TrpcContext = {
    user: AUTH_USER,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

describe("incidencia.uploadAttachment", () => {
  it("escribe el archivo en disco y devuelve success:true con attachment:null sin BD (no truena)", async () => {
    const caller = createAuthCaller();
    const result = await caller.incidencia.uploadAttachment({
      incidentId: "INC-001",
      fileName: "evidencia.jpg",
      fileData: Buffer.from("contenido de prueba").toString("base64"),
      mimeType: "image/jpeg",
    });
    // storagePut siempre escribe a disco (no depende de la BD). addIncidentAttachment
    // sí depende de la BD y devuelve null en modo degradado sin lanzar — por eso la
    // mutación completa con éxito (success:true) pero attachment queda null.
    expect(result.success).toBe(true);
    expect(result.attachment).toBeNull();
  });

  it("rechaza input inválido (zod) antes de llegar al storage", async () => {
    const caller = createAuthCaller();
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
    const caller = createAuthCaller();
    const result = await caller.incidencia.getAttachments({ incidentId: "INC-001" });
    expect(result).toEqual([]);
  });
});

describe("incidencia.deleteAttachment", () => {
  it("devuelve success:false en modo degradado (sin BD), no truena", async () => {
    const caller = createAuthCaller();
    const result = await caller.incidencia.deleteAttachment({ attachmentId: 1 });
    expect(result.success).toBe(false);
  });
});
