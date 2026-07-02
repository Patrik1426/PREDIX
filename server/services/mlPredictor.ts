/**
 * mlPredictor.ts — Servicio de predicción ML
 * Implementa modelo de series temporales para predecir delincuencia
 */

import { getIncidenciaByMunicipio, getIncidenciaEstatal } from "../data/sesnsp";
import { logger } from "../_core/logger";
import { EDOMEX_CENTROIDES } from "../data/edomexCentroids";

export interface PredictionData {
  municipio: string;
  mes: number;
  anio: number;
  prediccion: number;
  confianza: number;
  tendencia: "al_alza" | "a_la_baja" | "estable";
  intervaloConfianza: {
    minimo: number;
    maximo: number;
  };
}

export interface MunicipioPrediction {
  municipio: string;
  predicciones: PredictionData[];
  promedioPredictivo: number;
  tendenciaGeneral: "al_alza" | "a_la_baja" | "estable";
  riesgoProyectado: "bajo" | "medio" | "alto" | "crítico";
}

/**
 * Calcula media móvil simple (SMA)
 */
function calcularSMA(datos: number[], periodo: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < datos.length; i++) {
    if (i < periodo - 1) {
      sma.push(datos[i]);
    } else {
      const suma = datos.slice(i - periodo + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(suma / periodo);
    }
  }
  return sma;
}

/**
 * Calcula desviación estándar
 */
function calcularDesviacionEstandar(datos: number[]): number {
  const media = datos.reduce((a, b) => a + b, 0) / datos.length;
  const varianza = datos.reduce((a, b) => a + Math.pow(b - media, 2), 0) / datos.length;
  return Math.sqrt(varianza);
}

/**
 * Calcula tendencia lineal usando mínimos cuadrados
 */
function calcularTendenciaLineal(datos: number[]): { pendiente: number; interseccion: number } {
  const n = datos.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = datos.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * datos[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const interseccion = (sumY - pendiente * sumX) / n;

  return { pendiente, interseccion };
}

/**
 * Predice valores futuros usando regresión lineal exponencial suavizada
 */
function predecirValoresFuturos(
  datos: number[],
  periodos: number,
  alfa: number = 0.3
): { predicciones: number[]; confianza: number[] } {
  const predicciones: number[] = [];
  const confianza: number[] = [];

  // Suavizado exponencial
  let suavizado = datos[0];
  for (let i = 1; i < datos.length; i++) {
    suavizado = alfa * datos[i] + (1 - alfa) * suavizado;
  }

  // Calcular tendencia
  const { pendiente } = calcularTendenciaLineal(datos);
  const desviacion = calcularDesviacionEstandar(datos);

  // Generar predicciones
  for (let i = 1; i <= periodos; i++) {
    const prediccion = suavizado + pendiente * i;
    predicciones.push(Math.max(0, prediccion)); // No negativos

    // Confianza disminuye con distancia temporal
    const confianzaBase = Math.max(0.5, 1 - i * 0.1);
    confianza.push(confianzaBase);
  }

  return { predicciones, confianza };
}

/**
 * Obtiene datos históricos de un municipio
 */
async function obtenerHistoricoMunicipio(
  municipio: string,
  tipoDelito: string = "todos"
): Promise<number[]> {
  try {
    // Datos reales (tabla granular). Ordenar ascendente para la serie temporal.
    const registros = (await getIncidenciaByMunicipio(municipio)).sort(
      (a, b) => a.anio - b.anio || a.mes - b.mes,
    );

    if (registros.length === 0) {
      return [];
    }

    // Sumar todos los delitos si es "todos"
    if (tipoDelito === "todos") {
      return registros.map((r) => {
        const total =
          (r.homicidios || 0) +
          (r.robos || 0) +
          (r.lesiones || 0) +
          (r.violenciaSexual || 0) +
          (r.traficoDeDropgas || 0) +
          (r.otrosDelitos || 0);
        return total;
      });
    }

    // Retornar tipo específico
    return registros.map((r) => {
      switch (tipoDelito) {
        case "homicidios":
          return r.homicidios || 0;
        case "robos":
          return r.robos || 0;
        case "lesiones":
          return r.lesiones || 0;
        case "violencia_sexual":
          return r.violenciaSexual || 0;
        case "trafico_drogas":
          return r.traficoDeDropgas || 0;
        default:
          return r.otrosDelitos || 0;
      }
    });
  } catch (error) {
    logger.error("[ML] Error fetching historical data:", error);
    return [];
  }
}

/**
 * Predice delincuencia para un municipio
 */
export async function predecirDelincuenciaMunicipio(
  municipio: string,
  meses: number = 3
): Promise<MunicipioPrediction | null> {
  try {
    const historico = await obtenerHistoricoMunicipio(municipio);

    if (historico.length < 3) {
      logger.warn(`[ML] Insufficient data for ${municipio}`);
      return null;
    }

    const { predicciones, confianza } = predecirValoresFuturos(historico, meses);

    // Calcular tendencia
    const ultimosValores = historico.slice(-3);
    const promedio = ultimosValores.reduce((a, b) => a + b, 0) / ultimosValores.length;
    const { pendiente } = calcularTendenciaLineal(ultimosValores);

    let tendenciaGeneral: "al_alza" | "a_la_baja" | "estable";
    if (pendiente > 5) {
      tendenciaGeneral = "al_alza";
    } else if (pendiente < -5) {
      tendenciaGeneral = "a_la_baja";
    } else {
      tendenciaGeneral = "estable";
    }

    // Calcular riesgo proyectado
    const promedioPredictivo = predicciones.reduce((a, b) => a + b, 0) / predicciones.length;
    let riesgoProyectado: "bajo" | "medio" | "alto" | "crítico";
    if (promedioPredictivo < 50) {
      riesgoProyectado = "bajo";
    } else if (promedioPredictivo < 150) {
      riesgoProyectado = "medio";
    } else if (promedioPredictivo < 300) {
      riesgoProyectado = "alto";
    } else {
      riesgoProyectado = "crítico";
    }

    // Construir predicciones con fechas
    const hoy = new Date();
    const prediccionesConFecha: PredictionData[] = predicciones.map((pred, i) => {
      const fecha = new Date(hoy);
      fecha.setMonth(fecha.getMonth() + i + 1);

      const intervaloConfianza = {
        minimo: Math.max(0, pred * (1 - (1 - confianza[i]!))),
        maximo: pred * (1 + (1 - confianza[i]!)),
      };

      return {
        municipio,
        mes: fecha.getMonth() + 1,
        anio: fecha.getFullYear(),
        prediccion: Math.round(pred),
        confianza: Math.round(confianza[i]! * 100),
        tendencia: tendenciaGeneral,
        intervaloConfianza: {
          minimo: Math.round(intervaloConfianza.minimo),
          maximo: Math.round(intervaloConfianza.maximo),
        },
      };
    });

    return {
      municipio,
      predicciones: prediccionesConFecha,
      promedioPredictivo: Math.round(promedioPredictivo),
      tendenciaGeneral,
      riesgoProyectado,
    };
  } catch (error) {
    logger.error(`[ML] Error predicting for ${municipio}:`, error);
    return null;
  }
}

/**
 * Predice delincuencia para múltiples municipios
 */
export async function predecirDelincuenciaMultiple(
  municipios: string[],
  meses: number = 3
): Promise<MunicipioPrediction[]> {
  const predicciones: MunicipioPrediction[] = [];

  for (const municipio of municipios) {
    const prediccion = await predecirDelincuenciaMunicipio(municipio, meses);
    if (prediccion) {
      predicciones.push(prediccion);
    }
  }

  return predicciones;
}

/**
 * Obtiene municipios únicos de la BD
 */
export async function obtenerMunicipios(): Promise<string[]> {
  try {
    // Municipios con datos reales (ventana reciente). Dedup por nombre.
    const registros = await getIncidenciaEstatal();
    const nombres = Array.from(
      new Set(registros.map((r) => r.municipio).filter((m) => m && m.length > 0)),
    );
    // Fallback al catálogo estático si la BD aún no tiene datos cargados.
    return nombres.length > 0 ? nombres : EDOMEX_CENTROIDES.map((m) => m.nombre);
  } catch (error) {
    logger.error("[ML] Error fetching municipalities:", error);
    return EDOMEX_CENTROIDES.map((m) => m.nombre);
  }
}
