/**
 * PredictionChart — Componente para visualizar predicciones ML
 * Muestra gráficas de predicciones con intervalos de confianza
 */

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PredictionData {
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

interface PredictionChartProps {
  predicciones: PredictionData[];
  municipio: string;
  tendencia: "al_alza" | "a_la_baja" | "estable";
  riesgo: "bajo" | "medio" | "alto" | "crítico";
}

export default function PredictionChart({
  predicciones,
  municipio,
  tendencia,
  riesgo,
}: PredictionChartProps) {
  // Preparar datos para gráfica
  const chartData = predicciones.map((p) => ({
    fecha: `${p.mes}/${p.anio}`,
    prediccion: p.prediccion,
    minimo: p.intervaloConfianza.minimo,
    maximo: p.intervaloConfianza.maximo,
    confianza: p.confianza,
  }));

  // Colores por riesgo
  const riesgoColors = {
    bajo: "#10b981",
    medio: "#f59e0b",
    alto: "#ef4444",
    crítico: "#7c2d12",
  };

  const riesgoLabels = {
    bajo: "BAJO",
    medio: "MEDIO",
    alto: "ALTO",
    crítico: "CRÍTICO",
  };

  // Icono de tendencia
  const TrendIcon = tendencia === "al_alza" ? TrendingUp : tendencia === "a_la_baja" ? TrendingDown : AlertCircle;
  const trendColor = tendencia === "al_alza" ? "text-red-400" : tendencia === "a_la_baja" ? "text-green-400" : "text-yellow-400";

  return (
    <div className="space-y-4">
      {/* Header con información de riesgo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Riesgo Proyectado */}
        <Card className="bg-slate-800/50 border-cyan-500/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">RIESGO PROYECTADO</p>
              <p className="text-2xl font-bold" style={{ color: riesgoColors[riesgo] }}>
                {riesgoLabels[riesgo]}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${riesgoColors[riesgo]}20` }}>
              <AlertCircle className="w-6 h-6" style={{ color: riesgoColors[riesgo] }} />
            </div>
          </div>
        </Card>

        {/* Tendencia */}
        <Card className="bg-slate-800/50 border-cyan-500/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">TENDENCIA</p>
              <p className="text-lg font-bold text-gray-200 capitalize">{tendencia.replaceAll("_", " ")}</p>
            </div>
            <TrendIcon className={`w-6 h-6 ${trendColor}`} />
          </div>
        </Card>

        {/* Promedio Predicción */}
        <Card className="bg-slate-800/50 border-cyan-500/20 p-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">PROMEDIO PREDICCIÓN</p>
            <p className="text-2xl font-bold text-cyan-400">
              {Math.round(chartData.reduce((a, b) => a + b.prediccion, 0) / chartData.length)}
            </p>
            <p className="text-xs text-gray-500 mt-1">incidentes/mes</p>
          </div>
        </Card>
      </div>

      {/* Gráfica de predicción con intervalo de confianza */}
      <Card className="bg-slate-800/50 border-cyan-500/20 p-4">
        <h3 className="text-sm font-semibold text-cyan-400 mb-4">PROYECCIÓN DE INCIDENTES</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="fecha" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #0891b2",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#06b6d4" }}
            />
            <Area
              type="monotone"
              dataKey="prediccion"
              stroke="#06b6d4"
              fillOpacity={1}
              fill="url(#colorPrediction)"
              name="Predicción"
            />
            <Line
              type="monotone"
              dataKey="maximo"
              stroke="#ef4444"
              strokeDasharray="5 5"
              dot={false}
              name="Máximo (Confianza)"
            />
            <Line
              type="monotone"
              dataKey="minimo"
              stroke="#10b981"
              strokeDasharray="5 5"
              dot={false}
              name="Mínimo (Confianza)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabla de predicciones detalladas */}
      <Card className="bg-slate-800/50 border-cyan-500/20 p-4">
        <h3 className="text-sm font-semibold text-cyan-400 mb-4">DETALLES DE PREDICCIONES</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="text-left py-2 px-3 text-gray-400">Mes</th>
                <th className="text-right py-2 px-3 text-gray-400">Predicción</th>
                <th className="text-right py-2 px-3 text-gray-400">Mínimo</th>
                <th className="text-right py-2 px-3 text-gray-400">Máximo</th>
                <th className="text-right py-2 px-3 text-gray-400">Confianza</th>
              </tr>
            </thead>
            <tbody>
              {predicciones.map((pred, idx) => (
                <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="py-2 px-3 text-gray-300">{pred.mes}/{pred.anio}</td>
                  <td className="text-right py-2 px-3 text-cyan-400 font-semibold">{pred.prediccion}</td>
                  <td className="text-right py-2 px-3 text-green-400">{pred.intervaloConfianza.minimo}</td>
                  <td className="text-right py-2 px-3 text-red-400">{pred.intervaloConfianza.maximo}</td>
                  <td className="text-right py-2 px-3">
                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-400">
                      {pred.confianza}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Leyenda de interpretación */}
      <Card className="bg-slate-800/50 border-cyan-500/20 p-4">
        <h3 className="text-sm font-semibold text-cyan-400 mb-2">INTERPRETACIÓN</h3>
        <ul className="space-y-1 text-xs text-gray-400">
          <li>• <span className="text-cyan-400">Línea azul:</span> Predicción esperada de incidentes</li>
          <li>• <span className="text-red-400">Línea roja punteada:</span> Límite superior del intervalo de confianza</li>
          <li>• <span className="text-green-400">Línea verde punteada:</span> Límite inferior del intervalo de confianza</li>
          <li>• <span className="text-gray-300">Confianza:</span> Porcentaje de certeza de la predicción</li>
        </ul>
      </Card>
    </div>
  );
}
