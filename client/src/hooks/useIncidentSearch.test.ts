/**
 * Tests for useIncidentSearch hook
 */

import { describe, expect, it } from "vitest";
import { useIncidentSearch, type Incident } from "./useIncidentSearch";
import type { IncidentFilterState } from "@/components/AdvancedIncidentFilter";

// Mock incidents data
const mockIncidents: Incident[] = [
  {
    id: "INC-2026-0847",
    tipo: "Robo a transeúnte",
    municipio: "Ecatepec",
    colonia: "Jardines de Morelos",
    hora: "14:22",
    estado: "En proceso",
    prioridad: "alta",
    lat: 19.615,
    lng: -99.048,
  },
  {
    id: "INC-2026-0846",
    tipo: "Robo a vehículo",
    municipio: "Toluca",
    colonia: "Centro Histórico",
    hora: "13:58",
    estado: "Cerrado",
    prioridad: "media",
    lat: 19.283,
    lng: -99.657,
  },
  {
    id: "INC-2026-0845",
    tipo: "Violencia familiar",
    municipio: "Tlalnepantla",
    colonia: "Industrial Vallejo",
    hora: "13:31",
    estado: "En proceso",
    prioridad: "alta",
    lat: 19.541,
    lng: -99.197,
  },
  {
    id: "INC-2026-0843",
    tipo: "Homicidio doloso",
    municipio: "Ecatepec",
    colonia: "Las Américas",
    hora: "12:45",
    estado: "Investigación",
    prioridad: "crítica",
    lat: 19.622,
    lng: -99.055,
  },
];

describe("useIncidentSearch", () => {
  it("should return all incidents when no filters are applied", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: [],
      status: [],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(4);
    expect(filtered.length).toBe(4);
  });

  it("should filter by search text", () => {
    const filters: IncidentFilterState = {
      searchText: "Robo",
      priority: [],
      status: [],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(2);
    expect(filtered.every((inc) => inc.tipo.includes("Robo"))).toBe(true);
  });

  it("should filter by priority", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: ["crítica"],
      status: [],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(1);
    expect(filtered[0]?.prioridad).toBe("crítica");
  });

  it("should filter by status", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: [],
      status: ["Cerrado"],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(1);
    expect(filtered[0]?.estado).toBe("Cerrado");
  });

  it("should filter by municipality", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: [],
      status: [],
      municipios: ["Ecatepec"],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(2);
    expect(filtered.every((inc) => inc.municipio === "Ecatepec")).toBe(true);
  });

  it("should filter by crime type", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: [],
      status: [],
      municipios: [],
      crimeTypes: ["Robo"],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(2);
    expect(filtered.every((inc) => inc.tipo.includes("Robo"))).toBe(true);
  });

  it("should apply multiple filters together", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: ["alta"],
      status: ["En proceso"],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(2);
    expect(filtered.every((inc) => inc.prioridad === "alta" && inc.estado === "En proceso")).toBe(true);
  });

  it("should calculate statistics correctly", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: [],
      status: [],
      municipios: [],
      crimeTypes: [],
    };

    const { statistics } = useIncidentSearch(mockIncidents, filters);

    expect(statistics.total).toBe(4);
    expect(statistics.byPriority["alta"]).toBe(2);
    expect(statistics.byPriority["crítica"]).toBe(1);
    expect(statistics.byStatus["En proceso"]).toBe(2);
    expect(statistics.byMunicipio["Ecatepec"]).toBe(2);
  });

  it("should sort by priority (crítica first)", () => {
    const filters: IncidentFilterState = {
      searchText: "",
      priority: [],
      status: [],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered } = useIncidentSearch(mockIncidents, filters);

    expect(filtered[0]?.prioridad).toBe("crítica");
  });

  it("should handle empty results", () => {
    const filters: IncidentFilterState = {
      searchText: "NonExistent",
      priority: [],
      status: [],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(0);
    expect(filtered.length).toBe(0);
  });

  it("should be case insensitive for search", () => {
    const filters: IncidentFilterState = {
      searchText: "ROBO",
      priority: [],
      status: [],
      municipios: [],
      crimeTypes: [],
    };

    const { filtered, count } = useIncidentSearch(mockIncidents, filters);

    expect(count).toBe(2);
  });
});
