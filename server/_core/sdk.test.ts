/**
 * sdk.test.ts — Cubre el bootId embebido en la sesión JWT: cada arranque del
 * proceso genera un id nuevo, y una sesión firmada por un arranque anterior
 * debe invalidarse (fuerza login de nuevo tras reiniciar el servidor, en vez
 * de que una cookie de ~1 año siga vigente indefinidamente entre reinicios).
 */
import { describe, expect, it, vi } from "vitest";

describe("sdk — sesión atada al arranque del proceso (bootId)", () => {
  it("un token firmado y verificado dentro del mismo arranque es válido", async () => {
    vi.resetModules();
    const { sdk } = await import("./sdk");
    const token = await sdk.createSessionToken("test-open-id", { name: "Test User" });
    const session = await sdk.verifySession(token);
    expect(session).toEqual({ openId: "test-open-id", name: "Test User" });
  });

  it("un token firmado por un arranque anterior del servidor se invalida", async () => {
    vi.resetModules();
    const { sdk: sdkBoot1 } = await import("./sdk");
    const token = await sdkBoot1.createSessionToken("test-open-id", { name: "Test User" });

    // Simula un reinicio del servidor: el módulo se recarga, generando un
    // bootId nuevo — la misma cookie ya no debe verificar.
    vi.resetModules();
    const { sdk: sdkBoot2 } = await import("./sdk");
    const session = await sdkBoot2.verifySession(token);
    expect(session).toBeNull();
  });
});
