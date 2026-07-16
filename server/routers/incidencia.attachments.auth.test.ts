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

async function expectCode(fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
    throw new Error("esperaba que rechazara");
  } catch (e) {
    expect((e as TRPCError).code).toBe(code);
  }
}

describe("incidencia — adjuntos — auth gate", () => {
  const anonCaller = appRouter.createCaller(createContext(null));
  const authCaller = appRouter.createCaller(createContext(AUTH_USER));
  const consultaCaller = appRouter.createCaller(createContext({ ...AUTH_USER, institutionalRole: "consulta" }));

  it("uploadAttachment rechaza sin sesión", async () => {
    await expectCode(
      () => anonCaller.incidencia.uploadAttachment({ incidentId: "INC-001", fileName: "x.jpg", fileData: "YWJj", mimeType: "image/jpeg" }),
      "UNAUTHORIZED"
    );
  });

  it("uploadAttachment rechaza a un rol sin permiso de edición (consulta)", async () => {
    await expectCode(
      () => consultaCaller.incidencia.uploadAttachment({ incidentId: "INC-001", fileName: "x.jpg", fileData: "YWJj", mimeType: "image/jpeg" }),
      "FORBIDDEN"
    );
  });

  it("getAttachments rechaza sin sesión", async () => {
    await expectCode(() => anonCaller.incidencia.getAttachments({ incidentId: "INC-001" }), "UNAUTHORIZED");
  });

  it("getAttachments no rechaza por auth con sesión válida (puede fallar por BD, no por auth)", async () => {
    try {
      await authCaller.incidencia.getAttachments({ incidentId: "INC-001" });
    } catch (e) {
      expect((e as TRPCError).code).not.toBe("UNAUTHORIZED");
    }
  });

  it("deleteAttachment rechaza sin sesión", async () => {
    await expectCode(() => anonCaller.incidencia.deleteAttachment({ attachmentId: 1 }), "UNAUTHORIZED");
  });

  it("deleteAttachment rechaza a un rol sin permiso de borrado (consulta)", async () => {
    await expectCode(() => consultaCaller.incidencia.deleteAttachment({ attachmentId: 1 }), "FORBIDDEN");
  });
});
