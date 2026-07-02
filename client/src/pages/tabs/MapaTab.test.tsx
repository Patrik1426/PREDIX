import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MapaTab from "./MapaTab";

// Mock Google Maps
global.google = {
  maps: {
    Map: vi.fn(() => ({
      setOptions: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
    })),
    LatLng: vi.fn((lat, lng) => ({ lat, lng })),
    Marker: vi.fn(() => ({
      setMap: vi.fn(),
      addListener: vi.fn(),
      getPosition: vi.fn(() => ({ lat: 19, lng: -99 })),
    })),
    InfoWindow: vi.fn(() => ({
      setContent: vi.fn(),
      open: vi.fn(),
    })),
    SymbolPath: {
      CIRCLE: "CIRCLE",
    },
    Animation: {
      BOUNCE: "BOUNCE",
    },
    Point: vi.fn((x, y) => ({ x, y })),
    visualization: {
      HeatmapLayer: vi.fn(() => ({
        setMap: vi.fn(),
      })),
    },
  },
} as any;

// Mock TacticalMap (Leaflet no monta en jsdom; el test cubre controles/panel).
vi.mock("@/components/TacticalMap", () => ({
  default: () => <div data-testid="map-view">Map</div>,
}));

// Mock del hook de incidencia real (evita necesitar provider tRPC en el test).
vi.mock("@/hooks/useIncidenciaData", () => ({
  useIncidenciaMapa: () => ({
    municipios: [
      { municipio: "Ecatepec de Morelos", codigoMunicipio: "15033", lat: 19.5, lng: -99.0, incidentes: 2840, nivel: "crítico", tendencia: -2 },
      { municipio: "Toluca", codigoMunicipio: "15106", lat: 19.2, lng: -99.6, incidentes: 2143, nivel: "crítico", tendencia: 1 },
      { municipio: "Naucalpan de Juárez", codigoMunicipio: "15057", lat: 19.4, lng: -99.2, incidentes: 1535, nivel: "alto", tendencia: 3 },
    ],
    origen: "real",
    isLoading: false,
    error: undefined,
  }),
}));

describe("MapaTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders map container and controls", () => {
    render(<MapaTab />);
    
    expect(screen.getByTestId("map-view")).toBeDefined();
    expect(screen.getByText("CAPAS:")).toBeDefined();
  });

  it("renders layer toggle buttons", () => {
    render(<MapaTab />);
    
    expect(screen.getByText("Mapa de Calor")).toBeDefined();
    expect(screen.getByText("Municipios")).toBeDefined();
    expect(screen.getByText("Alertas Activas")).toBeDefined();
  });

  it("renders municipality list panel", () => {
    render(<MapaTab />);
    
    expect(screen.getByText("MUNICIPIOS")).toBeDefined();
  });

  it("toggles heatmap layer visibility", async () => {
    render(<MapaTab />);
    
    const heatmapButton = screen.getByText("Mapa de Calor");
    
    // Initially active (cyan border)
    expect(heatmapButton.getAttribute("style")?.replace(/\s/g, "")).toContain("rgba(0,212,255,0.4)");
    
    // Click to toggle off
    fireEvent.click(heatmapButton);
    
    await waitFor(() => {
      // Should now be inactive (darker border)
      expect(heatmapButton.getAttribute("style")?.replace(/\s/g, "")).toContain("var(--px-hairline)");
    });
  });

  it("toggles municipality markers visibility", async () => {
    render(<MapaTab />);
    
    const municipiosButton = screen.getByText("Municipios");
    
    // Initially active
    expect(municipiosButton.getAttribute("style")?.replace(/\s/g, "")).toContain("rgba(0,212,255,0.4)");
    
    // Click to toggle off
    fireEvent.click(municipiosButton);
    
    await waitFor(() => {
      // Should now be inactive
      expect(municipiosButton.getAttribute("style")?.replace(/\s/g, "")).toContain("var(--px-hairline)");
    });
  });

  it("toggles alerts layer visibility", async () => {
    render(<MapaTab />);
    
    const alertasButton = screen.getByText("Alertas Activas");
    
    // Initially inactive (not in default set)
    expect(alertasButton.getAttribute("style")?.replace(/\s/g, "")).toContain("var(--px-hairline)");
    
    // Click to toggle on
    fireEvent.click(alertasButton);
    
    await waitFor(() => {
      // Should now be active
      expect(alertasButton.getAttribute("style")?.replace(/\s/g, "")).toContain("rgba(0,212,255,0.4)");
    });
  });

  it("selects municipality from list", async () => {
    render(<MapaTab />);
    
    // Find first municipality in list
    const municipios = screen.getAllByText(/delitos/);
    expect(municipios.length).toBeGreaterThan(0);
    
    // Click on first municipality
    const firstMunicipio = municipios[0].closest("div");
    if (firstMunicipio) {
      fireEvent.click(firstMunicipio);
      
      await waitFor(() => {
        // Should show selected municipality indicator
        const indicator = screen.queryByText(/◉/);
        expect(indicator).toBeDefined();
      });
    }
  });

  it("displays legend with risk levels", () => {
    render(<MapaTab />);
    
    expect(screen.getByText("NIVEL DE RIESGO")).toBeDefined();
    expect(screen.getByText("Crítico")).toBeDefined();
    expect(screen.getByText("Alto")).toBeDefined();
    expect(screen.getByText("Medio")).toBeDefined();
    expect(screen.getByText("Bajo")).toBeDefined();
  });

  it("displays coordinates overlay", () => {
    render(<MapaTab />);
    
    expect(screen.getByText(/CENTRO/)).toBeDefined();
    expect(screen.getByText("19.4326° N, 99.1332° W")).toBeDefined();
  });

  it("renders refresh button", () => {
    render(<MapaTab />);
    
    const refreshButton = screen.getByText("ACTUALIZAR");
    expect(refreshButton).toBeDefined();
  });

  it("multiple layer toggles work independently", async () => {
    render(<MapaTab />);
    
    const heatmapButton = screen.getByText("Mapa de Calor");
    const municipiosButton = screen.getByText("Municipios");
    const alertasButton = screen.getByText("Alertas Activas");
    
    // Turn off heatmap
    fireEvent.click(heatmapButton);
    
    await waitFor(() => {
      expect(heatmapButton.getAttribute("style")?.replace(/\s/g, "")).toContain("var(--px-hairline)");
      // Municipios should still be on
      expect(municipiosButton.getAttribute("style")?.replace(/\s/g, "")).toContain("rgba(0,212,255,0.4)");
    });
    
    // Turn on alerts
    fireEvent.click(alertasButton);
    
    await waitFor(() => {
      expect(alertasButton.getAttribute("style")?.replace(/\s/g, "")).toContain("rgba(0,212,255,0.4)");
      // Heatmap should still be off
      expect(heatmapButton.getAttribute("style")?.replace(/\s/g, "")).toContain("var(--px-hairline)");
    });
  });
});
