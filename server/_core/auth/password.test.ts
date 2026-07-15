import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("Demo@2026");
    expect(hash).not.toBe("Demo@2026");
    expect(await verifyPassword("Demo@2026", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Demo@2026");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const hashA = await hashPassword("Demo@2026");
    const hashB = await hashPassword("Demo@2026");
    expect(hashA).not.toBe(hashB);
  });

  it("returns false (not throw) for a malformed/non-bcrypt hash", async () => {
    await expect(verifyPassword("Demo@2026", "not-a-real-hash")).resolves.toBe(false);
  });
});
