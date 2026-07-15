import { describe, expect, it } from "vitest";
import { toPublicUser } from "./sanitizeUser";
import type { User } from "../../../drizzle/schema";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "manual:test@edomex.gob.mx",
    name: "Test User",
    email: "test@edomex.gob.mx",
    loginMethod: "manual",
    passwordHash: "$2b$12$abc",
    role: "user",
    institutionalRole: "operador",
    status: "active",
    institution: null,
    department: null,
    employeeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

describe("toPublicUser", () => {
  it("strips passwordHash from the user object", () => {
    const result = toPublicUser(makeUser());
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.email).toBe("test@edomex.gob.mx");
  });
});
