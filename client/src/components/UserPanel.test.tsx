/**
 * UserPanel.test.tsx — Tests del panel de credencial de identidad.
 * Cubre: identidad mostrada, N° Empleado, y el gate real de "Niveles de
 * acceso" (Sistema) contra auth.getAccessibleModules (RBAC real).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import UserPanel, { type UserProfile } from "./UserPanel";

// Módulos accesibles reales (auth.getAccessibleModules) — mutable para que
// cada test simule un estado de carga/rol distinto sin re-mockear el módulo.
const { mockModulesRef } = vi.hoisted(() => ({
  mockModulesRef: {
    current: { data: undefined as string[] | undefined, isLoading: true },
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      getAccessibleModules: {
        useQuery: () => mockModulesRef.current,
      },
    },
  },
}));

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
    mockModulesRef.current = { data: ["admin"], isLoading: false };
    setup();
    expect(screen.getByText("Cmdte. Roberto Hernández")).toBeInTheDocument();
    expect(screen.getByText("r.hernandez@edomex.gob.mx")).toBeInTheDocument();
    expect(screen.getByText("▣ ADMINISTRADOR")).toBeInTheDocument();
    expect(screen.getByText("EMP-001")).toBeInTheDocument();
  });

  it("muestra '—' cuando no hay employeeId", () => {
    mockModulesRef.current = { data: ["admin"], isLoading: false };
    setup({ ...baseUser, employeeId: undefined });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("con acceso real al módulo admin, 'Sistema' aparece habilitado", () => {
    mockModulesRef.current = { data: ["mapa_geoespacial", "alertas", "admin"], isLoading: false };
    setup();
    const sistemaRow = screen.getByText("Sistema").closest("li")!;
    expect(sistemaRow).toHaveTextContent("habilitado");
  });

  it("sin acceso real al módulo admin, 'Sistema' aparece restringido", () => {
    mockModulesRef.current = { data: ["mapa_geoespacial", "alertas"], isLoading: false };
    setup();
    const sistemaRow = screen.getByText("Sistema").closest("li")!;
    expect(sistemaRow).toHaveTextContent("restringido");
    // Operación/Inteligencia (sin requireModule) siempre habilitados.
    expect(screen.getByText("Operación").closest("li")).toHaveTextContent("habilitado");
    expect(screen.getByText("Inteligencia").closest("li")).toHaveTextContent("habilitado");
  });

  it("mientras auth.getAccessibleModules carga, 'Sistema' muestra 'verificando…' (no 'restringido')", () => {
    mockModulesRef.current = { data: undefined, isLoading: true };
    setup();
    const sistemaRow = screen.getByText("Sistema").closest("li")!;
    expect(sistemaRow).toHaveTextContent("verificando");
    expect(sistemaRow).not.toHaveTextContent("restringido");
  });
});
