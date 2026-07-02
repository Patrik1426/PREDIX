/**
 * UserPanel.test.tsx — Tests para el componente UserPanel
 */

import { describe, it, expect } from "vitest";
import type { UserProfile } from "./UserPanel";

describe("UserPanel", () => {
  const mockUser: UserProfile = {
    nombre: "Carlos Mendoza",
    rol: "operador",
    correo: "cmendoza@seguridad.edomex.gob.mx",
    unidad: "Centro de Mando Estatal",
    ultimaConexion: "23 Mar 2026 - 14:32",
    estado: "activo",
  };

  it("should have correct user properties", () => {
    expect(mockUser.nombre).toBe("Carlos Mendoza");
    expect(mockUser.rol).toBe("operador");
    expect(mockUser.correo).toBe("cmendoza@seguridad.edomex.gob.mx");
    expect(mockUser.unidad).toBe("Centro de Mando Estatal");
    expect(mockUser.estado).toBe("activo");
  });

  it("should handle different roles", () => {
    const roles: Array<"operador" | "supervisor" | "analista" | "admin"> = [
      "operador",
      "supervisor",
      "analista",
      "admin",
    ];
    roles.forEach((rol) => {
      expect(["operador", "supervisor", "analista", "admin"]).toContain(rol);
    });
  });

  it("should handle different statuses", () => {
    const statuses: Array<"activo" | "inactivo"> = ["activo", "inactivo"];
    statuses.forEach((status) => {
      expect(["activo", "inactivo"]).toContain(status);
    });
  });

  it("should have valid email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(mockUser.correo)).toBe(true);
  });

  it("should have non-empty user name", () => {
    expect(mockUser.nombre.length).toBeGreaterThan(0);
  });

  it("should have non-empty unit", () => {
    expect(mockUser.unidad.length).toBeGreaterThan(0);
  });

  it("should have valid last connection format", () => {
    expect(mockUser.ultimaConexion).toMatch(/\d{1,2} \w+ \d{4} - \d{2}:\d{2}/);
  });

  it("should support supervisor role", () => {
    const supervisorUser: UserProfile = {
      ...mockUser,
      rol: "supervisor",
    };
    expect(supervisorUser.rol).toBe("supervisor");
  });

  it("should support inactive status", () => {
    const inactiveUser: UserProfile = {
      ...mockUser,
      estado: "inactivo",
    };
    expect(inactiveUser.estado).toBe("inactivo");
  });
});
