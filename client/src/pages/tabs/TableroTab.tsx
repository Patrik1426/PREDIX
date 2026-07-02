// ============================================================
// TABLERO — Pantalla de entrada (PREDIX v2, "command grid").
// Primera vista del centro de mando: el TERRITORIO es el héroe.
// Tira de KPIs → mapa de calor protagonista → tendencia + riesgo
// → top municipios + frescura del dato. Sin formato de preguntas;
// la jerarquía la marca la importancia operativa.
//
// Totalmente responsivo vía clases .dash-* (index.css): 1 col en
// móvil, 2 en tablet, 4/2 en desktop. Sin grids de px fijos.
//
// Datos derivados de useIncidenciaData (incidencia mensual SESNSP;
// hoy SIMULADO con fallback en modo degradado — se vuelve real con
// el rewire de Fase 3). El "Riesgo 24h" es una MUESTRA del modelo.
// ============================================================

import { useState, useMemo } from "react";
import {
  useIncidenciaSummary, useIncidenciaEstatal,
  type IncidenciaRecord,
} from "@/hooks/useIncidenciaData";
import {
  AlertTriangle, Users, MapPin,
  ArrowUpRight, ArrowDownRight, FlaskConical, Database, RefreshCw, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { KpiCard, TrendBadge, ModuleHeader, EmptyState, DataRow } from "@/components/dashboard";
import { freshness } from "@/lib/freshness";

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const PERIODS = [
  { months: 1, label: "1 mes" },
  { months: 3, label: "3 meses" },
  { months: 6, label: "6 meses" },
  { months: 12, label: "12 meses" },
];

function recTotal(r: IncidenciaRecord) {
  return (r.homicidios || 0) + (r.robos || 0) + (r.lesiones || 0) +
    (r.violenciaSexual || 0) + (r.traficoDeDropgas || 0) + (r.otrosDelitos || 0);
}


// ---- Derivación de todo el tablero a partir de los registros ----
function useDashboard(data: IncidenciaRecord[], periodMonths: number) {
  return useMemo(() => {
    // Agregación mensual: clave "anio-mes" ordenada ascendente.
    const byMonth = new Map<string, { anio: number; mes: number; incidentes: number; victimas: number; municipios: Set<string> }>();
    for (const r of data) {
      const key = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
      let m = byMonth.get(key);
      if (!m) { m = { anio: r.anio, mes: r.mes, incidentes: 0, victimas: 0, municipios: new Set() }; byMonth.set(key, m); }
      m.incidentes += recTotal(r);
      m.victimas += r.victimas || 0;
      m.municipios.add(r.municipio);
    }
    const keys = Array.from(byMonth.keys()).sort();
    const hasData = keys.length > 0;

    // Serie de los últimos 12 meses (para la gráfica de tendencia + sparklines).
    const last12 = keys.slice(-12).map((k) => {
      const m = byMonth.get(k)!;
      return { label: MONTH_ABBR[m.mes - 1] ?? String(m.mes), incidentes: m.incidentes, victimas: m.victimas, municipios: m.municipios.size };
    });

    // Ventana actual (N meses) y ventana previa (N meses anteriores).
    const curKeys = keys.slice(-periodMonths);
    const prevKeys = keys.slice(-periodMonths * 2, -periodMonths);
    const inWindow = (r: IncidenciaRecord, ks: string[]) => ks.includes(`${r.anio}-${String(r.mes).padStart(2, "0")}`);

    const agg = (ks: string[]) => {
      let incidentes = 0, victimas = 0;
      const muni = new Map<string, number>();
      const byType: Record<string, number> = { homicidios: 0, robos: 0, lesiones: 0, violenciaSexual: 0, traficoDeDropgas: 0, otrosDelitos: 0 };
      for (const r of data) {
        if (!inWindow(r, ks)) continue;
        const t = recTotal(r);
        incidentes += t; victimas += r.victimas || 0;
        muni.set(r.municipio, (muni.get(r.municipio) || 0) + t);
        byType.homicidios += r.homicidios || 0; byType.robos += r.robos || 0;
        byType.lesiones += r.lesiones || 0; byType.violenciaSexual += r.violenciaSexual || 0;
        byType.traficoDeDropgas += r.traficoDeDropgas || 0; byType.otrosDelitos += r.otrosDelitos || 0;
      }
      return { incidentes, victimas, municipios: muni.size, muni, byType };
    };

    const cur = agg(curKeys);
    const prev = agg(prevKeys);
    const pctDelta = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : 0);

    const deltas = {
      incidentes: pctDelta(cur.incidentes, prev.incidentes),
      victimas: pctDelta(cur.victimas, prev.victimas),
      municipios: pctDelta(cur.municipios, prev.municipios),
    };

    // Top municipios + heatmap (ventana actual, datos reales).
    const muniSorted = Array.from(cur.muni.entries()).sort((a, b) => b[1] - a[1]);
    const maxMuni = muniSorted[0]?.[1] || 1;
    const topMunicipios = muniSorted.slice(0, 5).map(([name, value]) => ({ name, value, pct: value / maxMuni }));
    const heatCells = muniSorted.slice(0, 125).map(([name, value]) => ({ name, intensity: value / maxMuni }));

    // Semáforo estatal — heurística documentada a partir de la tendencia.
    let level: { txt: string; color: string } = { txt: "ELEVADO", color: "var(--px-warn)" };
    if (deltas.incidentes <= -3) level = { txt: "CALMA", color: "var(--px-ok)" };
    else if (deltas.incidentes > 8) level = { txt: "CRÍTICO", color: "var(--px-crit)" };

    // Riesgo 24h — MUESTRA del modelo: usa el ranking real como proxy, rotulado.
    const riskLevels = ["Alto", "Alto", "Medio", "Medio"];
    const risk = topMunicipios.slice(0, 4).map((m, i) => ({
      name: m.name,
      level: riskLevels[i],
      conf: Math.min(95, 55 + Math.round(m.pct * 40)),
    }));

    return { hasData, last12, cur, deltas, topMunicipios, heatCells, level, risk };
  }, [data, periodMonths]);
}


// Tile de Nivel estatal — primer KPI de la tira, con semáforo compacto.
function NivelTile({ level, reportados }: { level: { txt: string; color: string }; reportados: number }) {
  return (
    <div className="px-card relative overflow-hidden flex flex-col justify-between" style={{ padding: "var(--px-5)", minHeight: 148 }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, ${level.color} 16%, transparent), transparent 60%)` }} />
      <div className="px-eyebrow" style={{ position: "relative" }}>Nivel estatal</div>
      <div className="flex items-center gap-2.5" style={{ position: "relative" }}>
        <span className="status-pulse-amber" style={{ width: 13, height: 13, borderRadius: 999, background: level.color, flexShrink: 0 }} />
        <span style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-xl)", fontWeight: 700, letterSpacing: "0.03em", lineHeight: 1, color: level.color }}>{level.txt}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div className="flex gap-1" style={{ marginBottom: 6 }}>
          {["CALMA", "ELEVADO", "CRÍTICO"].map((s) => {
            const on = s === level.txt;
            return <span key={s} style={{ flex: 1, height: 5, borderRadius: 3, background: on ? level.color : "var(--px-hairline)", boxShadow: on ? `0 0 8px ${level.color}` : "none" }} />;
          })}
        </div>
        <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)", lineHeight: 1.4 }}>
          {reportados} de 125 municipios con actividad
        </div>
      </div>
    </div>
  );
}

const TrendTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="px-card-2" style={{ padding: "8px 12px" }}>
        <div style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-base)", color: "var(--px-brand)", marginBottom: 2 }}>{label}</div>
        <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", color: "var(--px-text)" }}>
          {payload[0].value.toLocaleString()} incidentes
        </div>
      </div>
    );
  }
  return null;
};


export default function TableroTab() {
  const [period, setPeriod] = useState(3);

  const { data: summary } = useIncidenciaSummary();
  const { data: incidenciaData, isLoading } = useIncidenciaEstatal();
  const d = useDashboard(incidenciaData, period);

  const heatColor = (i: number) =>
    i > 0.66 ? "var(--px-crit)" : i > 0.4 ? "var(--px-warn)" : i > 0.15 ? "rgba(229,162,61,.4)" : "var(--px-hairline)";

  const trendColor = d.deltas.incidentes > 0 ? "var(--px-crit)" : "var(--px-ok)";
  const fresh = freshness(summary.ultimaActualizacion);
  // Fase 3: badge honesto. El backend marca origen "real" (tabla incidencia_delito
  // poblada) o "simulado" (fallback en modo degradado / tabla vacía).
  const esReal = summary.origen === "real";

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-tactical">
      <div className="px-stagger dash-wrap">

        {/* Toolbar: título + honestidad + periodo */}
        <div className="dash-toolbar">
          <div>
            <div className="px-eyebrow" style={{ marginBottom: 6 }}>Centro de Mando · Estado de México</div>
            <h1 style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-xl)", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1, color: "var(--px-text)" }}>
              Panorama de Seguridad
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-2" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", letterSpacing: "0.1em", color: esReal ? "var(--px-ok)" : "var(--px-warn)", background: esReal ? "rgba(63,185,80,0.1)" : "rgba(229,162,61,0.1)", border: `1px solid ${esReal ? "rgba(63,185,80,0.32)" : "rgba(229,162,61,0.32)"}`, borderRadius: 999, padding: "6px 12px", whiteSpace: "nowrap" }}>
              <FlaskConical size={13} /> {esReal ? "DATOS REALES · SESNSP" : "DATOS SIMULADOS"}
            </span>
            <div className="inline-flex" style={{ background: "var(--px-surface)", border: "1px solid var(--px-hairline)", borderRadius: 10, padding: 3 }}>
              {PERIODS.map((p) => (
                <button key={p.months} onClick={() => setPeriod(p.months)}
                  style={{
                    fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", letterSpacing: "0.04em",
                    color: period === p.months ? "var(--px-text)" : "var(--px-text-muted)",
                    background: period === p.months ? "var(--px-brand-soft)" : "transparent",
                    boxShadow: period === p.months ? "inset 0 0 0 1px rgba(0,212,255,0.2)" : "none",
                    border: "none", padding: "7px 14px", borderRadius: 7, cursor: "pointer", transition: "0.15s",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tira de KPIs: nivel + 3 indicadores héroe */}
        <div className="dash-kpis">
          <NivelTile level={d.level} reportados={summary.municipiosReportados} />
          <KpiCard icon={<AlertTriangle size={18} />} label="Incidentes" value={d.cur.incidentes} color="var(--px-crit)"
            spark={d.last12.map(m => m.incidentes)} delta={<TrendBadge value={d.deltas.incidentes} />} />
          <KpiCard icon={<Users size={18} />} label="Víctimas registradas" value={d.cur.victimas} color="var(--px-crit)"
            spark={d.last12.map(m => m.victimas)} delta={<TrendBadge value={d.deltas.victimas} />} />
          <KpiCard icon={<MapPin size={18} />} label="Municipios con actividad" value={d.cur.municipios} suffix=" / 125" color="var(--px-brand)"
            spark={d.last12.map(m => m.municipios)} delta={<TrendBadge value={d.deltas.municipios} goodDown={false} />} />
        </div>

        {/* Fila principal: HEATMAP protagonista + tendencia/riesgo */}
        <div className="dash-main">
          {/* Heatmap — héroe: el territorio */}
          <div className="px-card flex flex-col" style={{ padding: "var(--px-5)" }}>
            <ModuleHeader
              title="INTENSIDAD GEOGRÁFICA"
              eyebrow={`${d.heatCells.length} municipios · calor por incidencia en el periodo`}
              action={
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("predix:navigate-tab", { detail: "mapa" }))}
                  style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-brand)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                  className="flex items-center gap-1"
                >
                  Ver mapa <ChevronRight size={12} />
                </button>
              }
            />
            {d.heatCells.length ? (
              <div className="flex flex-col" style={{ flex: 1 }}>
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(34px, 1fr))", gap: 5, flex: 1, alignContent: "start" }}>
                  {d.heatCells.map((c) => (
                    <span key={c.name} title={`${c.name}`} style={{ aspectRatio: "1", borderRadius: 4, background: heatColor(c.intensity), boxShadow: c.intensity > 0.66 ? "0 0 7px rgba(229,72,77,.45)" : "none", transition: "0.15s" }} />
                  ))}
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: "var(--px-4)", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>
                  bajo
                  <span style={{ flex: 1, height: 6, borderRadius: 3, background: "linear-gradient(90deg, var(--px-hairline), var(--px-warn), var(--px-crit))" }} />
                  alto
                </div>
              </div>
            ) : <EmptyState text={isLoading ? "Cargando intensidad…" : "Sin datos para el periodo"} />}
          </div>

          {/* Columna lateral: tendencia + riesgo */}
          <div className="dash-side">
            {/* Tendencia */}
            <div className="px-card" style={{ padding: "var(--px-5)" }}>
              <ModuleHeader
                title="TENDENCIA DE INCIDENCIA"
                eyebrow="Total mensual · últimos 12 meses"
                action={
                  <span className="px-delta" style={{ color: trendColor, background: `color-mix(in srgb, ${trendColor} 12%, transparent)`, whiteSpace: "nowrap" }}>
                    {d.deltas.incidentes > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {d.deltas.incidentes >= 0 ? "+" : ""}{d.deltas.incidentes}%
                  </span>
                }
              />
              {d.hasData ? (
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={d.last12} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--px-brand)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--px-brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--px-text-faint)", fontSize: 9, fontFamily: "var(--px-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--px-text-faint)", fontSize: 9, fontFamily: "var(--px-mono)" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: "rgba(0,212,255,0.3)" }} />
                    <Area type="monotone" dataKey="incidentes" stroke="var(--px-brand)" strokeWidth={2} fill="url(#trendFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState text={isLoading ? "Cargando serie temporal…" : "Sin datos para el periodo"} />}
            </div>

            {/* Riesgo 24h */}
            <div className="px-card" style={{ padding: "var(--px-5)" }}>
              <ModuleHeader
                title="RIESGO PRÓXIMAS 24H"
                eyebrow="Estimación por incidencia reciente"
                action={<span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-brand)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap" }}>ATENEA-ML · muestra</span>}
              />
              {d.risk.length ? d.risk.map((r, i) => {
                const c = r.level === "Alto" ? "var(--px-crit)" : "var(--px-warn)";
                return (
                  <div key={r.name} className="flex items-center gap-3" style={{ padding: "10px 0", borderBottom: i < d.risk.length - 1 ? "1px solid var(--px-hairline)" : "none" }}>
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 999, color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}>{r.level}</span>
                    <span style={{ flex: 1, fontFamily: "var(--px-body)", fontSize: "var(--px-text-base)", fontWeight: 500 }} className="truncate">{r.name}</span>
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{r.conf}%</span>
                  </div>
                );
              }) : <EmptyState text="Sin estimación disponible" />}
            </div>
          </div>
        </div>

        {/* Fila inferior: top municipios + frescura del dato */}
        <div className="dash-bottom">
          {/* Top municipios */}
          <div className="px-card" style={{ padding: "var(--px-5)" }}>
            <ModuleHeader title="TOP MUNICIPIOS CRÍTICOS" eyebrow="Mayor incidencia en el periodo" />
            {d.topMunicipios.length ? d.topMunicipios.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3" style={{ padding: "10px 0", borderBottom: i < d.topMunicipios.length - 1 ? "1px solid var(--px-hairline)" : "none" }}>
                <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", color: "var(--px-text-faint)", width: 18, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-base)", fontWeight: 500, width: 130, flexShrink: 0 }} className="truncate">{m.name}</span>
                <span style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--px-hairline)", overflow: "hidden", minWidth: 40 }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.max(6, m.pct * 100)}%`, borderRadius: 999, background: "linear-gradient(90deg, rgba(229,72,77,.5), var(--px-crit))" }} />
                </span>
                <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", width: 56, textAlign: "right", flexShrink: 0 }}>{m.value.toLocaleString()}</span>
              </div>
            )) : <EmptyState text={isLoading ? "Cargando…" : "Sin datos para el periodo"} />}
          </div>

          {/* Frescura del dato — estado del enlace SESNSP */}
          <div className="px-card flex flex-col" style={{ padding: "var(--px-5)" }}>
            <ModuleHeader title="FRESCURA DEL DATO" eyebrow="Estado del enlace · SESNSP" />

            {/* Banner de frescura — signature: qué tan viejo es el dato */}
            <div className="flex items-center justify-between" style={{ gap: 12, padding: "var(--px-4)", borderRadius: "var(--px-r-sm)", background: "color-mix(in srgb, var(--px-warn) 9%, transparent)", border: "1px solid rgba(229,162,61,0.28)" }}>
              <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                <span className="status-pulse-amber" style={{ width: 11, height: 11, borderRadius: 999, background: "var(--px-warn)", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-lg)", fontWeight: 700, color: "var(--px-text)", lineHeight: 1, letterSpacing: "0.02em" }}>{fresh.ago}</div>
                  <div className="truncate" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)", marginTop: 5 }}>{fresh.exact}</div>
                </div>
              </div>
              <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", letterSpacing: "0.1em", color: esReal ? "var(--px-ok)" : "var(--px-warn)", background: esReal ? "rgba(63,185,80,0.12)" : "rgba(229,162,61,0.12)", border: `1px solid ${esReal ? "rgba(63,185,80,0.34)" : "rgba(229,162,61,0.34)"}`, borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap", flexShrink: 0 }}>{esReal ? "REAL" : "SIMULADO"}</span>
            </div>

            {/* Ledger — métricas del enlace, un icono por concepto */}
            <div style={{ marginTop: "var(--px-3)" }}>
              <DataRow icon={<Database size={14} />} label="Registros cargados" value={isLoading ? "…" : incidenciaData.length.toLocaleString()} color="var(--px-brand)" />
              <DataRow icon={<MapPin size={14} />} label="Municipios reportados" value={`${summary.municipiosReportados} / 125`} color="var(--px-ok)" />
              <DataRow icon={<RefreshCw size={14} />} label="Periodicidad de sincronización" value="24 h" color="var(--px-warn)" last />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

