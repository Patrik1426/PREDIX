/**
 * SideNav.test.tsx — Tests del rail de navegación + bottom nav.
 * Cubre: grupos, módulos, badges, cambio de tab, estado activo y colapsar.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SideNav from "./SideNav";
import { NAV_GROUPS, TAB_IDS } from "./navConfig";
import { DemoSessionProvider } from "@/contexts/DemoSessionContext";

// Sin sesión demo (role = null) el rail muestra TODOS los grupos.
function setup(overrides: Partial<React.ComponentProps<typeof SideNav>> = {}) {
  const onTabChange = vi.fn();
  const onCollapsedChange = vi.fn();
  render(
    <DemoSessionProvider>
      <SideNav
        activeTab="tablero"
        onTabChange={onTabChange}
        collapsed={false}
        onCollapsedChange={onCollapsedChange}
        {...overrides}
      />
    </DemoSessionProvider>
  );
  return { onTabChange, onCollapsedChange };
}

describe("SideNav", () => {
  it("renderiza las 3 etiquetas de grupo", () => {
    setup();
    for (const group of NAV_GROUPS) {
      expect(screen.getByText(group.label)).toBeInTheDocument();
    }
  });

  it("renderiza los 9 módulos por su etiqueta completa (rail)", () => {
    setup();
    expect(TAB_IDS).toHaveLength(9);
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        // La etiqueta completa solo aparece en el rail (el bottom nav usa la 1ª palabra).
        expect(screen.getAllByText(item.label).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("muestra los badges de Alertas (6) e Incidentes (47)", () => {
    setup();
    expect(screen.getAllByText("6").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("47").length).toBeGreaterThanOrEqual(1);
  });

  it("llama onTabChange con el id correcto al hacer click en un módulo", () => {
    const { onTabChange } = setup();
    fireEvent.click(screen.getByText("Administración"));
    expect(onTabChange).toHaveBeenCalledWith("admin");
  });

  it("marca el módulo activo con aria-selected", () => {
    setup({ activeTab: "predicciones" });
    // "Modelo Predictivo" solo existe en el rail (label único) → sin ambigüedad.
    const railTab = screen.getByText("Modelo Predictivo").closest('[role="tab"]');
    expect(railTab).toHaveAttribute("aria-selected", "true");
  });

  it("colapsar invoca onCollapsedChange(true)", () => {
    const { onCollapsedChange } = setup({ collapsed: false });
    fireEvent.click(screen.getByLabelText("Colapsar menú"));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("sin botón de colapsar cuando canToggle=false", () => {
    setup({ canToggle: false });
    expect(screen.queryByLabelText("Colapsar menú")).not.toBeInTheDocument();
  });

  it("el bottom nav expone el botón 'Más'", () => {
    setup();
    expect(screen.getByLabelText("Más módulos")).toBeInTheDocument();
  });

  it("abrir 'Más' muestra la hoja con todos los módulos", () => {
    setup();
    fireEvent.click(screen.getByLabelText("Más módulos"));
    const sheet = screen.getByRole("dialog", { name: "Todos los módulos" });
    expect(within(sheet).getByText("Mapa de Calor")).toBeInTheDocument();
  });

  it("rol Analista oculta el grupo 'Sistema' (Integraciones/Administración)", () => {
    window.sessionStorage.setItem("predix:demo-session", "analista");
    try {
      setup();
      expect(screen.queryByText("Sistema")).not.toBeInTheDocument();
      expect(screen.queryByText("Integraciones")).not.toBeInTheDocument();
      expect(screen.queryByText("Administración")).not.toBeInTheDocument();
      // Operación e Inteligencia siguen visibles.
      expect(screen.getByText("Operación")).toBeInTheDocument();
      expect(screen.getByText("Inteligencia")).toBeInTheDocument();
    } finally {
      window.sessionStorage.removeItem("predix:demo-session");
    }
  });
});
