/**
 * mlPredictor.test.ts — Tests para el servicio ML
 */

import { describe, it, expect } from "vitest";
import {
  buildMunicipioPrediction,
  obtenerMunicipios,
  predecirDelincuenciaMunicipio,
  type PrediccionMlRow,
} from "./services/mlPredictor";

function fila(overrides: Partial<PrediccionMlRow>): PrediccionMlRow {
  return {
    municipio: "Toluca",
    tipoDelito: "robos",
    modeloGanador: "random_forest",
    mapeBacktest: 15,
    horizonte: 1,
    mesPrediccion: 8,
    anioPrediccion: 2026,
    valorPredicho: 100,
    confianza: 80,
    intervaloMin: 85,
    intervaloMax: 115,
    ...overrides,
  };
}

describe("buildMunicipioPrediction (lógica pura, sin BD)", () => {
  it("devuelve null si no hay filas", () => {
    expect(buildMunicipioPrediction("Toluca", [], 3)).toBeNull();
  });

  it("suma los tipos de delito por horizonte para el total agregado", () => {
    const rows = [
      fila({ tipoDelito: "robos", horizonte: 1, valorPredicho: 100, intervaloMin: 85, intervaloMax: 115 }),
      fila({ tipoDelito: "homicidios", horizonte: 1, valorPredicho: 10, intervaloMin: 8, intervaloMax: 12 }),
    ];
    const result = buildMunicipioPrediction("Toluca", rows, 1);
    expect(result).not.toBeNull();
    expect(result!.predicciones[0].prediccion).toBe(110);
    expect(result!.predicciones[0].intervaloConfianza.minimo).toBe(93);
    expect(result!.predicciones[0].intervaloConfianza.maximo).toBe(127);
  });

  it("arma el desglose por tipo solo con las filas de horizonte 1", () => {
    const rows = [
      fila({ tipoDelito: "robos", horizonte: 1, modeloGanador: "poisson" }),
      fila({ tipoDelito: "robos", horizonte: 2 }),
      fila({ tipoDelito: "homicidios", horizonte: 1, modeloGanador: "sma" }),
    ];
    const result = buildMunicipioPrediction("Toluca", rows, 2);
    expect(result!.desglose).toHaveLength(2);
    expect(result!.desglose.find((d) => d.tipo === "robos")?.modelo).toBe("poisson");
  });

  it("detecta tendencia al alza cuando el último mes supera 10% al primero", () => {
    const rows = [
      fila({ horizonte: 1, valorPredicho: 100 }),
      fila({ horizonte: 2, valorPredicho: 130 }),
    ];
    const result = buildMunicipioPrediction("Toluca", rows, 2);
    expect(result!.tendenciaGeneral).toBe("al_alza");
  });

  it("clasifica riesgo crítico cuando el promedio predictivo supera 300", () => {
    const rows = [fila({ horizonte: 1, valorPredicho: 350 })];
    const result = buildMunicipioPrediction("Toluca", rows, 1);
    expect(result!.riesgoProyectado).toBe("crítico");
  });

  it("nunca devuelve predicciones negativas", () => {
    const rows = [fila({ horizonte: 1, valorPredicho: 0, intervaloMin: 0, intervaloMax: 0 })];
    const result = buildMunicipioPrediction("Toluca", rows, 1);
    expect(result!.predicciones[0].prediccion).toBeGreaterThanOrEqual(0);
    expect(result!.predicciones[0].intervaloConfianza.minimo).toBeGreaterThanOrEqual(0);
  });
});

describe("ML Predictor Service — modo degradado (sin BD en tests)", () => {
  it("obtenerMunicipios cae al catálogo estático de municipios sin BD", async () => {
    const municipios = await obtenerMunicipios();
    expect(Array.isArray(municipios)).toBe(true);
    expect(municipios.length).toBeGreaterThan(0);
  });

  it("predecirDelincuenciaMunicipio devuelve null sin BD (nunca inventa datos)", async () => {
    const result = await predecirDelincuenciaMunicipio("Toluca");
    expect(result).toBeNull();
  });
});
