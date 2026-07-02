/**
 * mlPredictor.test.ts — Tests para el servicio ML
 */

import { describe, it, expect, beforeAll } from "vitest";
import { predecirDelincuenciaMunicipio, obtenerMunicipios } from "./services/mlPredictor";

describe("ML Predictor Service", () => {
  it("should return null for non-existent municipality", async () => {
    const result = await predecirDelincuenciaMunicipio("MunicipioNoExistente");
    expect(result).toBeNull();
  });

  it("should generate predictions with correct structure", async () => {
    const municipios = await obtenerMunicipios();
    if (municipios.length === 0) {
      console.warn("No municipalities found in database");
      return;
    }

    const result = await predecirDelincuenciaMunicipio(municipios[0], 3);

    if (result) {
      expect(result).toHaveProperty("municipio");
      expect(result).toHaveProperty("predicciones");
      expect(result).toHaveProperty("promedioPredictivo");
      expect(result).toHaveProperty("tendenciaGeneral");
      expect(result).toHaveProperty("riesgoProyectado");

      expect(result.predicciones).toHaveLength(3);
      expect(result.predicciones[0]).toHaveProperty("prediccion");
      expect(result.predicciones[0]).toHaveProperty("confianza");
      expect(result.predicciones[0]).toHaveProperty("intervaloConfianza");
    }
  });

  it("should return valid risk levels", async () => {
    const municipios = await obtenerMunicipios();
    if (municipios.length === 0) {
      console.warn("No municipalities found in database");
      return;
    }

    const result = await predecirDelincuenciaMunicipio(municipios[0], 3);

    if (result) {
      const validRisks = ["bajo", "medio", "alto", "crítico"];
      expect(validRisks).toContain(result.riesgoProyectado);
    }
  });

  it("should return valid trends", async () => {
    const municipios = await obtenerMunicipios();
    if (municipios.length === 0) {
      console.warn("No municipalities found in database");
      return;
    }

    const result = await predecirDelincuenciaMunicipio(municipios[0], 3);

    if (result) {
      const validTrends = ["al_alza", "a_la_baja", "estable"];
      expect(validTrends).toContain(result.tendenciaGeneral);
    }
  });

  it("should have confidence between 0 and 100", async () => {
    const municipios = await obtenerMunicipios();
    if (municipios.length === 0) {
      console.warn("No municipalities found in database");
      return;
    }

    const result = await predecirDelincuenciaMunicipio(municipios[0], 3);

    if (result) {
      result.predicciones.forEach((pred) => {
        expect(pred.confianza).toBeGreaterThanOrEqual(0);
        expect(pred.confianza).toBeLessThanOrEqual(100);
      });
    }
  });

  it("should have non-negative predictions", async () => {
    const municipios = await obtenerMunicipios();
    if (municipios.length === 0) {
      console.warn("No municipalities found in database");
      return;
    }

    const result = await predecirDelincuenciaMunicipio(municipios[0], 3);

    if (result) {
      result.predicciones.forEach((pred) => {
        expect(pred.prediccion).toBeGreaterThanOrEqual(0);
        expect(pred.intervaloConfianza.minimo).toBeGreaterThanOrEqual(0);
        expect(pred.intervaloConfianza.maximo).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("should return municipalities list", async () => {
    const municipios = await obtenerMunicipios();
    expect(Array.isArray(municipios)).toBe(true);
    expect(municipios.length).toBeGreaterThan(0);
  });

  it("should handle different prediction horizons", async () => {
    const municipios = await obtenerMunicipios();
    if (municipios.length === 0) {
      console.warn("No municipalities found in database");
      return;
    }

    for (const meses of [1, 3, 6, 12]) {
      const result = await predecirDelincuenciaMunicipio(municipios[0], meses);
      if (result) {
        expect(result.predicciones).toHaveLength(meses);
      }
    }
  });
});
