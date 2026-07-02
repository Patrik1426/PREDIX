/**
 * Tests para dashboardStats.ts
 * Valida funciones de cálculo de KPIs y estadísticas
 */

import { describe, it, expect } from "vitest";
import {
  getKPIMetrics,
  getTrendencyData,
  getMonthComparison,
  getCriticalMunicipalities,
  getCrimeTypeStats,
} from "./dashboardStats";

describe("dashboardStats", () => {
  describe("getKPIMetrics", () => {
    it("en modo degradado (sin BD) devuelve métricas simuladas, no null", async () => {
      // Fase 3: sin BD, los servicios caen al fallback simulado de sesnsp
      // (mismo comportamiento que el Tablero) en vez de devolver null.
      const result = await getKPIMetrics();
      expect(result).not.toBeNull();
      expect(result!.totalIncidentes).toBeGreaterThanOrEqual(0);
      expect(result!.totalVictimas).toBeGreaterThanOrEqual(0);
    });

    it("debe calcular correctamente los KPIs", async () => {
      // Este test requeriría una base de datos de prueba
      // Por ahora validamos que la función existe y retorna el tipo correcto
      const result = await getKPIMetrics();

      if (result) {
        expect(result).toHaveProperty("totalIncidentes");
        expect(result).toHaveProperty("totalVictimas");
        expect(result).toHaveProperty("homicidios");
        expect(result).toHaveProperty("robos");
        expect(result).toHaveProperty("municipiosCriticos");
        expect(result).toHaveProperty("municipiosAltos");

        // Validar que los valores son números no negativos
        expect(result.totalIncidentes).toBeGreaterThanOrEqual(0);
        expect(result.totalVictimas).toBeGreaterThanOrEqual(0);
        expect(result.homicidios).toBeGreaterThanOrEqual(0);
        expect(result.robos).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("getTrendencyData", () => {
    it("debe retornar un array de datos de tendencia", async () => {
      const result = await getTrendencyData(12);

      expect(Array.isArray(result)).toBe(true);

      // Si hay datos, validar estructura
      if (result.length > 0) {
        const firstItem = result[0];
        expect(firstItem).toHaveProperty("mes");
        expect(firstItem).toHaveProperty("anio");
        expect(firstItem).toHaveProperty("delitos");
        expect(firstItem).toHaveProperty("victimas");
        expect(firstItem).toHaveProperty("homicidios");
        expect(firstItem).toHaveProperty("robos");

        // Validar que los valores son números
        expect(typeof firstItem.mes).toBe("number");
        expect(typeof firstItem.anio).toBe("number");
        expect(typeof firstItem.delitos).toBe("number");
      }
    });

    it("debe retornar datos ordenados por fecha", async () => {
      const result = await getTrendencyData(12);

      if (result.length > 1) {
        for (let i = 1; i < result.length; i++) {
          const prev = result[i - 1];
          const curr = result[i];

          // Validar que está ordenado cronológicamente
          if (prev.anio === curr.anio) {
            expect(curr.mes).toBeGreaterThanOrEqual(prev.mes);
          } else {
            expect(curr.anio).toBeGreaterThan(prev.anio);
          }
        }
      }
    });
  });

  describe("getMonthComparison", () => {
    it("debe retornar comparativa mes actual vs mes anterior", async () => {
      const result = await getMonthComparison();

      if (result) {
        expect(result).toHaveProperty("mesActual");
        expect(result).toHaveProperty("mesPasado");
        expect(result).toHaveProperty("cambioDelitos");
        expect(result).toHaveProperty("cambioVictimas");
        expect(result).toHaveProperty("porcentajeDelitos");
        expect(result).toHaveProperty("porcentajeVictimas");

        // Validar estructura de mesActual
        expect(result.mesActual).toHaveProperty("mes");
        expect(result.mesActual).toHaveProperty("anio");
        expect(result.mesActual).toHaveProperty("delitos");
        expect(result.mesActual).toHaveProperty("victimas");

        // Validar estructura de mesPasado
        expect(result.mesPasado).toHaveProperty("mes");
        expect(result.mesPasado).toHaveProperty("anio");
        expect(result.mesPasado).toHaveProperty("delitos");
        expect(result.mesPasado).toHaveProperty("victimas");

        // Validar que los porcentajes son números
        expect(typeof result.porcentajeDelitos).toBe("number");
        expect(typeof result.porcentajeVictimas).toBe("number");
      }
    });
  });

  describe("getCriticalMunicipalities", () => {
    it("debe retornar array de municipios críticos", async () => {
      const result = await getCriticalMunicipalities();

      expect(Array.isArray(result)).toBe(true);

      // Si hay datos, validar estructura
      if (result.length > 0) {
        const firstMun = result[0];
        expect(firstMun).toHaveProperty("municipio");
        expect(firstMun).toHaveProperty("delitos");
        expect(firstMun).toHaveProperty("homicidios");
        expect(firstMun).toHaveProperty("robos");
        expect(firstMun).toHaveProperty("victimas");
        expect(firstMun).toHaveProperty("riesgo");
        expect(firstMun).toHaveProperty("tendencia");

        // Validar valores de riesgo
        expect(["CRÍTICO", "ALTO", "MEDIO", "BAJO"]).toContain(firstMun.riesgo);

        // Validar valores de tendencia
        expect(["aumentando", "disminuyendo", "estable"]).toContain(firstMun.tendencia);
      }
    });

    it("debe retornar máximo 10 municipios por defecto", async () => {
      const result = await getCriticalMunicipalities();

      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getCrimeTypeStats", () => {
    it("debe retornar estadísticas por tipo de delito", async () => {
      const result = await getCrimeTypeStats();

      if (result) {
        expect(result).toHaveProperty("homicidios");
        expect(result).toHaveProperty("robos");
        expect(result).toHaveProperty("lesiones");
        expect(result).toHaveProperty("violenciaSexual");
        expect(result).toHaveProperty("traficoDeDropas");
        expect(result).toHaveProperty("otrosDelitos");
        expect(result).toHaveProperty("total");
        expect(result).toHaveProperty("porcentajes");

        // Validar que los valores son números no negativos
        expect(result.homicidios).toBeGreaterThanOrEqual(0);
        expect(result.robos).toBeGreaterThanOrEqual(0);
        expect(result.total).toBeGreaterThanOrEqual(0);

        // Validar que los porcentajes están entre 0 y 100
        Object.values(result.porcentajes).forEach((pct) => {
          expect(pct).toBeGreaterThanOrEqual(0);
          expect(pct).toBeLessThanOrEqual(100);
        });

        // Validar que la suma de porcentajes es aproximadamente 100
        const sumPorcentajes = Object.values(result.porcentajes).reduce((a, b) => a + b, 0);
        expect(sumPorcentajes).toBeCloseTo(100, 1);
      }
    });
  });

  describe("Validaciones de datos", () => {
    it("los KPIs deben ser números no negativos", async () => {
      const kpis = await getKPIMetrics();

      if (kpis) {
        Object.entries(kpis).forEach(([key, value]) => {
          expect(typeof value).toBe("number");
          expect(value).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it("los municipios críticos deben estar ordenados por riesgo", async () => {
      const municipalities = await getCriticalMunicipalities();

      const riskOrder = { CRÍTICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 };

      if (municipalities.length > 1) {
        for (let i = 1; i < municipalities.length; i++) {
          const prevRisk = riskOrder[municipalities[i - 1].riesgo as keyof typeof riskOrder];
          const currRisk = riskOrder[municipalities[i].riesgo as keyof typeof riskOrder];

          // El riesgo debe ser igual o mayor (menos crítico)
          expect(currRisk).toBeGreaterThanOrEqual(prevRisk);
        }
      }
    });
  });
});
