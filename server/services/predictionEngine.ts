/**
 * Motor de predicciones basado en análisis de tendencias históricas
 * Utiliza datos SESNSP para predecir incidencia delictiva futura
 */

import { getDb } from "../config/db";
import { incidenciaDelictiva } from "../../drizzle/schema";
import { eq, and, gte, asc } from "drizzle-orm";
import { logger } from "../_core/logger";

export interface CrimeData {
  municipio: string;
  codigoMunicipio: number;
  anio: number;
  mes: number;
  homicidios: number;
  robos: number;
  lesiones: number;
  violenciaSexual: number;
  traficoDeDropas: number;
  otrosDelitos: number;
  victimas: number;
}

export interface Prediction {
  municipio: string;
  codigoMunicipio: number;
  prediccionMes: number;
  prediccionAnio: number;
  homicidiosPredicho: number;
  robosPredicho: number;
  lesionesPredicho: number;
  violenciaSexualPredicha: number;
  traficoDeDropasPredicho: number;
  confianza: number; // 0-1
  tendencia: "aumentando" | "disminuyendo" | "estable";
}

/**
 * Calcular tendencia simple usando regresión lineal
 */
function calculateTrend(values: number[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  if (values.length < 2) {
    return { slope: 0, intercept: values[0] || 0, r2: 0 };
  }

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;

  const xMean = x.reduce((a, b) => a + b, 0) / n;
  const yMean = y.reduce((a, b) => a + b, 0) / n;

  const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
  const denominator = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calcular R²
  const yPredicted = x.map((xi) => intercept + slope * xi);
  const ssRes = y.reduce((sum, yi, i) => sum + (yi - yPredicted[i]) ** 2, 0);
  const ssTot = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

/**
 * Obtener datos históricos de un municipio
 */
async function getHistoricalData(
  municipio: string,
  months: number = 12
): Promise<CrimeData[]> {
  const db = await getDb();
  if (!db) {
    logger.warn("Database not available");
    return [];
  }

  const today = new Date();
  const pastDate = new Date(today.getTime() - months * 30 * 24 * 60 * 60 * 1000);

  try {
    const data = await db
      .select()
      .from(incidenciaDelictiva)
      .where(
        and(
          eq(incidenciaDelictiva.municipio, municipio),
          gte(incidenciaDelictiva.lastUpdated, pastDate)
        )
      )
      .orderBy(asc(incidenciaDelictiva.anio), asc(incidenciaDelictiva.mes))
      .limit(months);

    return data.map((d) => ({
      municipio: d.municipio,
      codigoMunicipio: parseInt(d.codigoMunicipio || "0"),
      anio: d.anio,
      mes: d.mes,
      homicidios: d.homicidios || 0,
      robos: d.robos || 0,
      lesiones: d.lesiones || 0,
      violenciaSexual: d.violenciaSexual || 0,
      traficoDeDropas: d.traficoDeDropgas || 0,
      otrosDelitos: d.otrosDelitos || 0,
      victimas: d.victimas || 0,
    }));
  } catch (error) {
    logger.error(`Error fetching historical data for ${municipio}:`, error);
    return [];
  }
}

/**
 * Generar predicción para un municipio
 */
export async function generatePrediction(municipio: string): Promise<Prediction | null> {
  const historicalData = await getHistoricalData(municipio, 12);

  if (historicalData.length < 3) {
    logger.warn(`Insufficient data for prediction: ${municipio}`);
    return null;
  }

  // Extraer series de tiempo para cada tipo de delito
  const homicidios = historicalData.map((d) => d.homicidios);
  const robos = historicalData.map((d) => d.robos);
  const lesiones = historicalData.map((d) => d.lesiones);
  const violenciaSexual = historicalData.map((d) => d.violenciaSexual);
  const traficoDeDropas = historicalData.map((d) => d.traficoDeDropas);

  // Calcular tendencias
  const homicidiosTrend = calculateTrend(homicidios);
  const robosTrend = calculateTrend(robos);
  const lesionesTorend = calculateTrend(lesiones);
  const violenciaSexualTrend = calculateTrend(violenciaSexual);
  const traficoDeDropasTrend = calculateTrend(traficoDeDropas);

  // Predecir próximo mes
  const nextMonth = historicalData.length;
  const homicidiosPredicho = Math.max(
    0,
    Math.round(homicidiosTrend.intercept + homicidiosTrend.slope * nextMonth)
  );
  const robosPredicho = Math.max(
    0,
    Math.round(robosTrend.intercept + robosTrend.slope * nextMonth)
  );
  const lesionesPredicho = Math.max(
    0,
    Math.round(lesionesTorend.intercept + lesionesTorend.slope * nextMonth)
  );
  const violenciaSexualPredicha = Math.max(
    0,
    Math.round(violenciaSexualTrend.intercept + violenciaSexualTrend.slope * nextMonth)
  );
  const traficoDeDropasPredicho = Math.max(
    0,
    Math.round(traficoDeDropasTrend.intercept + traficoDeDropasTrend.slope * nextMonth)
  );

  // Calcular confianza promedio (basada en R²)
  const confianza =
    (homicidiosTrend.r2 +
      robosTrend.r2 +
      lesionesTorend.r2 +
      violenciaSexualTrend.r2 +
      traficoDeDropasTrend.r2) /
    5;

  // Determinar tendencia general
  const avgSlope =
    (homicidiosTrend.slope +
      robosTrend.slope +
      lesionesTorend.slope +
      violenciaSexualTrend.slope +
      traficoDeDropasTrend.slope) /
    5;

  let tendencia: "aumentando" | "disminuyendo" | "estable";
  if (avgSlope > 5) {
    tendencia = "aumentando";
  } else if (avgSlope < -5) {
    tendencia = "disminuyendo";
  } else {
    tendencia = "estable";
  }

  // Calcular mes y año de predicción
  const lastData = historicalData[historicalData.length - 1];
  let prediccionMes = lastData.mes + 1;
  let prediccionAnio = lastData.anio;
  if (prediccionMes > 12) {
    prediccionMes = 1;
    prediccionAnio += 1;
  }

  return {
    municipio,
    codigoMunicipio: historicalData[0].codigoMunicipio,
    prediccionMes,
    prediccionAnio,
    homicidiosPredicho,
    robosPredicho,
    lesionesPredicho,
    violenciaSexualPredicha,
    traficoDeDropasPredicho,
    confianza: Math.max(0, Math.min(1, confianza)),
    tendencia,
  };
}

/**
 * Generar predicciones para todos los municipios
 */
export async function generateAllPredictions(): Promise<Prediction[]> {
  const db = await getDb();
  if (!db) {
    logger.warn("Database not available");
    return [];
  }

  // Obtener lista de municipios únicos
  const municipios = await db
    .selectDistinct({ municipio: incidenciaDelictiva.municipio })
    .from(incidenciaDelictiva);

  const predictions: Prediction[] = [];

  for (const { municipio } of municipios) {
    const prediction = await generatePrediction(municipio);
    if (prediction) {
      predictions.push(prediction);
    }
  }

  return predictions;
}

/**
 * Calcular nivel de riesgo basado en predicción
 */
export function calculateRiskLevel(prediction: Prediction): "CRÍTICO" | "ALTO" | "MEDIO" | "BAJO" {
  const totalDelitos =
    prediction.homicidiosPredicho +
    prediction.robosPredicho +
    prediction.lesionesPredicho +
    prediction.violenciaSexualPredicha +
    prediction.traficoDeDropasPredicho;

  // Umbrales basados en datos históricos del Estado de México
  if (totalDelitos > 500 || prediction.homicidiosPredicho > 50) {
    return "CRÍTICO";
  } else if (totalDelitos > 300 || prediction.homicidiosPredicho > 25) {
    return "ALTO";
  } else if (totalDelitos > 150 || prediction.homicidiosPredicho > 10) {
    return "MEDIO";
  } else {
    return "BAJO";
  }
}


