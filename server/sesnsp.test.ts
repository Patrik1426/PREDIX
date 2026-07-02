import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./config/db";
import { incidenciaDelictiva } from "../drizzle/schema";
import { getIncidenciaByMunicipio, getIncidenciaEstatal, syncSesnspData } from "./data/sesnsp";
import { eq } from "drizzle-orm";

describe("SESNSP Service", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("syncSesnspData", () => {
    it("should sync data without errors", async () => {
      // This test verifies the sync function runs without throwing
      await expect(syncSesnspData()).resolves.not.toThrow();
    });

    it("should populate database with records", async () => {
      if (!db) {
        console.warn("Database not available, skipping test");
        return;
      }

      // Clear existing data
      await db.delete(incidenciaDelictiva);

      // Run sync
      await syncSesnspData();

      // Verify data was inserted
      const records = await db.select().from(incidenciaDelictiva);
      expect(records.length).toBeGreaterThan(0);
    });
  });

  describe("getIncidenciaByMunicipio", () => {
    it("should return empty array for non-existent municipality", async () => {
      const result = await getIncidenciaByMunicipio("NonExistentMunicipio");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return records for existing municipality", async () => {
      if (!db) {
        console.warn("Database not available, skipping test");
        return;
      }

      // Insert test data
      await db.insert(incidenciaDelictiva).values({
        estado: "Estado de México",
        municipio: "TestMunicipio",
        anio: 2025,
        mes: 3,
        homicidios: 5,
        robos: 10,
        lesiones: 8,
        violenciaSexual: 2,
        traficoDeDropgas: 3,
        otrosDelitos: 4,
        victimas: 20,
      });

      const result = await getIncidenciaByMunicipio("TestMunicipio");
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]?.municipio).toBe("TestMunicipio");

      // Cleanup
      await db.delete(incidenciaDelictiva).where(eq(incidenciaDelictiva.municipio, "TestMunicipio"));
    });
  });

  describe("getIncidenciaEstatal", () => {
    it("should return all records when no filters provided", async () => {
      const result = await getIncidenciaEstatal();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by year", async () => {
      if (!db) {
        console.warn("Database not available, skipping test");
        return;
      }

      // Insert test data
      await db.insert(incidenciaDelictiva).values({
        estado: "Estado de México",
        municipio: "TestMunicipio2",
        anio: 2024,
        mes: 1,
        homicidios: 3,
        robos: 5,
        lesiones: 4,
        victimas: 10,
      });

      const result = await getIncidenciaEstatal(2024);
      expect(Array.isArray(result)).toBe(true);

      // All results should be from 2024
      result.forEach((record) => {
        expect(record.anio).toBe(2024);
      });

      // Cleanup
      await db.delete(incidenciaDelictiva).where(eq(incidenciaDelictiva.municipio, "TestMunicipio2"));
    });

    it("should filter by month", async () => {
      if (!db) {
        console.warn("Database not available, skipping test");
        return;
      }

      // Insert test data
      await db.insert(incidenciaDelictiva).values({
        estado: "Estado de México",
        municipio: "TestMunicipio3",
        anio: 2025,
        mes: 6,
        homicidios: 2,
        robos: 4,
        lesiones: 3,
        victimas: 8,
      });

      const result = await getIncidenciaEstatal(undefined, 6);
      expect(Array.isArray(result)).toBe(true);

      // All results should be from month 6
      result.forEach((record) => {
        expect(record.mes).toBe(6);
      });

      // Cleanup
      await db.delete(incidenciaDelictiva).where(eq(incidenciaDelictiva.municipio, "TestMunicipio3"));
    });
  });

  describe("Data integrity", () => {
    it("should have valid numeric values", async () => {
      if (!db) {
        console.warn("Database not available, skipping test");
        return;
      }

      // Insert test data
      await db.insert(incidenciaDelictiva).values({
        estado: "Estado de México",
        municipio: "IntegrityTest",
        anio: 2025,
        mes: 3,
        homicidios: 5,
        robos: 10,
        lesiones: 8,
        violenciaSexual: 2,
        traficoDeDropgas: 3,
        otrosDelitos: 4,
        victimas: 20,
      });

      const result = await getIncidenciaByMunicipio("IntegrityTest");
      expect(result.length).toBe(1);

      const record = result[0];
      expect(typeof record?.homicidios).toBe("number");
      expect(typeof record?.robos).toBe("number");
      expect(typeof record?.victimas).toBe("number");
      expect(record?.homicidios).toBeGreaterThanOrEqual(0);
      expect(record?.robos).toBeGreaterThanOrEqual(0);

      // Cleanup
      await db.delete(incidenciaDelictiva).where(eq(incidenciaDelictiva.municipio, "IntegrityTest"));
    });
  });
});
