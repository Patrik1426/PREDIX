/**
 * UserPanel.test.tsx — Tests del panel de credencial de identidad.
 * Cubre identidad mostrada (nombre, correo, rol, N° Empleado). Ya no incluye
 * "Niveles de acceso" — se quitó de la UI (cada usuario ya conoce su propio
 * alcance, era redundante mostrarlo aquí; ver CLAUDE.md).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import UserPanel, { type UserProfile } from "./UserPanel";

// UserPanel usa useIsMobile (window.matchMedia) — jsdom no lo implementa.
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

const baseUser: UserProfile = {
  nombre: "Cmdte. Roberto Hernández",
  rol: "Administrador",
  correo: "r.hernandez@edomex.gob.mx",
  unidad: "Dirección General de Seguridad",
  ultimaConexion: "22 jul 2026, 14:15",
  estado: "activo",
  employeeId: "EMP-001",
};

function setup(user: UserProfile = baseUser) {
  const onClose = vi.fn();
  const onLogout = vi.fn();
  render(<UserPanel user={user} onClose={onClose} onLogout={onLogout} />);
  return { onClose, onLogout };
}

describe("UserPanel", () => {
  it("muestra la identidad real (nombre, correo, rol, N° Empleado)", () => {
    setup();
    expect(screen.getByText("Cmdte. Roberto Hernández")).toBeInTheDocument();
    expect(screen.getByText("r.hernandez@edomex.gob.mx")).toBeInTheDocument();
    expect(screen.getByText("▣ ADMINISTRADOR")).toBeInTheDocument();
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
  });

  it("muestra '—' cuando no hay employeeId", () => {
    setup({ ...baseUser, employeeId: undefined });
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
