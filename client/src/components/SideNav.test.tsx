/**
 * SideNav.test.tsx — Tests del rail de navegación + bottom nav.
 * Cubre: grupos, módulos, badges, cambio de tab, estado activo y colapsar.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SideNav from "./SideNav";
import { NAV_GROUPS, TAB_IDS } from "./navConfig";

// Módulos accesibles reales (auth.getAccessibleModules) — mutable para que
// cada test pueda simular un rol distinto sin re-mockear el módulo entero.
const { mockModulesRef } = vi.hoisted(() => ({
  mockModulesRef: {
    current: [
      "mapa_geoespacial", "alertas", "incidentes", "predicciones",
      "tablero", "zonas_delictivas", "chatbot", "admin",
    ] as string[],
  },
}));

// Badges reales (useNavBadges) vienen de trpc.alertas.listar/incidentes.listar —
// se mockean con datos fijos: 3 alertas activas (2 resueltas de 5), 2 incidentes
// abiertos (1 cerrado de 3), para probar que el badge refleja el conteo real.
vi.mock("@/lib/trpc", () => ({
  trpc: {
    alertas: {
      listar: {
        useQuery: () => ({
          data: {
            origen: "real",
            data: [
              { id: 1, resuelta: 0 }, { id: 2, resuelta: 0 }, { id: 3, resuelta: 0 },
              { id: 4, resuelta: 1 }, { id: 5, resuelta: 1 },
            ],
          },
        }),
      },
    },
    incidentes: {
      listar: {
        useQuery: () => ({
          data: {
            origen: "real",
            data: [
              { id: 1, estado: "en_proceso" }, { id: 2, estado: "investigacion" }, { id: 3, estado: "cerrado" },
            ],
          },
        }),
      },
    },
    auth: {
      getAccessibleModules: {
        useQuery: () => ({ data: mockModulesRef.current, isLoading: false }),
      },
    },
  },
}));

function setup(overrides: Partial<React.ComponentProps<typeof SideNav>> = {}) {
  const onTabChange = vi.fn();
  const onCollapsedChange = vi.fn();
  render(
    <SideNav
      activeTab="tablero"
      onTabChange={onTabChange}
      collapsed={false}
      onCollapsedChange={onCollapsedChange}
      {...overrides}
    />
  );
  return { onTabChange, onCollapsedChange };
}

describe("SideNav", () => {
  it("renderiza las 3 etiquetas de grupo (con acceso a admin)", () => {
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

  it("muestra los badges reales: 3 alertas activas y 2 incidentes abiertos", () => {
    setup();
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
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

  it("sin acceso al módulo 'admin' oculta el grupo 'Sistema' (Integraciones/Administración)", () => {
    mockModulesRef.current = ["mapa_geoespacial", "alertas", "incidentes", "chatbot"];
    try {
      setup();
      expect(screen.queryByText("Sistema")).not.toBeInTheDocument();
      expect(screen.queryByText("Integraciones")).not.toBeInTheDocument();
      expect(screen.queryByText("Administración")).not.toBeInTheDocument();
      // Operación e Inteligencia siguen visibles.
      expect(screen.getByText("Operación")).toBeInTheDocument();
      expect(screen.getByText("Inteligencia")).toBeInTheDocument();
    } finally {
      mockModulesRef.current = [
        "mapa_geoespacial", "alertas", "incidentes", "predicciones",
        "tablero", "zonas_delictivas", "chatbot", "admin",
      ];
    }
  });
});
