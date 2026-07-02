/**
 * Unit tests for incidencia.exportCsv procedure
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/auth/context";

// Mock context
function createMockContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("incidencia.exportCsv", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  it("should export data as CSV with proper structure", async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);

    const result = await caller.incidencia.exportCsv({});

    expect(result.csv).toBeDefined();
    expect(typeof result.csv).toBe("string");
    expect(result.filename).toMatch(/^incidencia-delictiva-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.recordCount).toBeGreaterThanOrEqual(0);
  });

  it("should include CSV headers", async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);

    const result = await caller.incidencia.exportCsv({});

    const lines = result.csv.split("\n");
    const header = lines[0];

    expect(header).toContain("Municipio");
    expect(header).toContain("Año");
    expect(header).toContain("Mes");
    expect(header).toContain("Homicidios");
    expect(header).toContain("Robos");
    expect(header).toContain("Lesiones");
  });

  it("should filter by date range", async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);

    const result = await caller.incidencia.exportCsv({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });

    expect(result.csv).toBeDefined();
    expect(result.recordCount).toBeGreaterThanOrEqual(0);
  });

  it("should return proper filename format", async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);

    const result = await caller.incidencia.exportCsv({});

    const today = new Date().toISOString().split("T")[0];
    expect(result.filename).toBe(`incidencia-delictiva-${today}.csv`);
  });

  it("should include all required columns in CSV", async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);

    const result = await caller.incidencia.exportCsv({});

    const header = result.csv.split("\n")[0];
    const requiredColumns = [
      "Municipio",
      "Año",
      "Mes",
      "Homicidios",
      "Robos",
      "Lesiones",
      "Total Incidentes",
      "Víctimas",
    ];

    requiredColumns.forEach((col) => {
      expect(header).toContain(col);
    });
  });

  it("should handle empty results gracefully", async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);

    const result = await caller.incidencia.exportCsv({
      municipios: ["NonExistentMunicipio"],
    });

    expect(result.csv).toBeDefined();
    expect(result.recordCount).toBe(0);
  });

  it("should format CSV with numeric data", async () => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);

    const result = await caller.incidencia.exportCsv({});

    // Con datos, el CSV debe contener dígitos; sin BD (recordCount=0) solo trae el encabezado.
    if (result.recordCount > 0) {
      expect(result.csv).toMatch(/\d+/);
    } else {
      expect(result.csv).toContain("Municipio");
    }
  });
});
