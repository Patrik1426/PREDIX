// ============================================================
// INCIDENTES — Registro y seguimiento (PREDIX v2)
// Senior layout: toolbar unificado → tabla master + detalle
// Mobile: card list → tap → detalle full-screen
// ============================================================

import { useState, useMemo } from "react";
import { INCIDENTES_RECIENTES, DATOS_MENSUALES } from "@/data/securityData";
import { Filter, Clock, MapPin, FileText, TrendingUp, ChevronDown, ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { ExportIncidenciaDialog } from "@/components/ExportIncidenciaDialog";
import { AdvancedIncidentFilter, type IncidentFilterState } from "@/components/AdvancedIncidentFilter";
import { useIncidentSearch } from "@/hooks/useIncidentSearch";
import IncidentDetailModal from "@/components/IncidentDetailModal";
import { OriginBadge, EmptyState } from "@/components/dashboard";

const priCfg = (p: string) => ({
  "crítica": { color: "var(--px-crit)", bg: "color-mix(in srgb, var(--px-crit) 10%, transparent)" },
  "alta": { color: "var(--px-warn)", bg: "color-mix(in srgb, var(--px-warn) 10%, transparent)" },
  "media": { color: "var(--px-brand)", bg: "color-mix(in srgb, var(--px-brand) 10%, transparent)" },
  "baja": { color: "var(--px-ok)", bg: "color-mix(in srgb, var(--px-ok) 10%, transparent)" },
}[p] ?? { color: "var(--px-text-muted)", bg: "color-mix(in srgb, var(--px-text-muted) 10%, transparent)" });

const estCfg = (e: string) => ({
  "En proceso": { color: "var(--px-warn)", label: "EN PROCESO" },
  "Cerrado": { color: "var(--px-ok)", label: "CERRADO" },
  "Investigación": { color: "var(--px-brand)", label: "INVESTIGACIÓN" },
}[e] ?? { color: "var(--px-text-muted)", label: e.toUpperCase() });

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--px-surface)", border: "1px solid var(--px-hairline)", borderRadius: "var(--px-r-sm)", padding: "6px 10px" }}>
      <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-brand)", marginBottom: 2 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function IncidentesTab() {
  const [chartView, setChartView] = useState<"bar" | "line">("bar");
  const [sel, setSel] = useState<any>(INCIDENTES_RECIENTES[0]);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState<IncidentFilterState>({ searchText: "", priority: [], status: [], municipios: [], crimeTypes: [] });

  const { filtered, count } = useIncidentSearch(INCIDENTES_RECIENTES, filters);

  const kpis = useMemo(() => ({
    total: INCIDENTES_RECIENTES.length,
    proceso: INCIDENTES_RECIENTES.filter(i => i.estado === "En proceso").length,
    cerrados: INCIDENTES_RECIENTES.filter(i => i.estado === "Cerrado").length,
    criticos: INCIDENTES_RECIENTES.filter(i => i.prioridad === "crítica").length,
  }), []);

  const sp = priCfg(sel.prioridad);
  const se = estCfg(sel.estado);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--px-bg)", padding: "var(--px-3)", gap: "var(--px-3)" }}>

      {/* ── Toolbar unificado: badge + KPIs + filtros + export (1 barra) ── */}
      <div className={`px-card ${showMobileDetail ? "hidden md:flex" : "flex"} flex-col md:flex-row md:items-center gap-3`} style={{ padding: "var(--px-3) var(--px-4)", flexShrink: 0 }}>
        {/* Izq: badge + KPIs */}
        <div className="flex items-center gap-3 flex-wrap">
          <OriginBadge real={false} />
          <div className="flex" style={{ borderRadius: "var(--px-r-sm)", overflow: "hidden", border: "1px solid var(--px-hairline)" }}>
            {[
              { l: "Total", v: kpis.total, c: "var(--px-brand)" },
              { l: "Proceso", v: kpis.proceso, c: "var(--px-warn)" },
              { l: "Cerrados", v: kpis.cerrados, c: "var(--px-ok)" },
              { l: "Críticos", v: kpis.criticos, c: "var(--px-crit)" },
            ].map((k, i, a) => (
              <div key={k.l} className="text-center" style={{ padding: "var(--px-1) var(--px-3)", borderRight: i < a.length - 1 ? "1px solid var(--px-hairline)" : "none" }}>
                <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-lg)", fontWeight: 700, color: k.c, lineHeight: 1 }}>{k.v}</div>
                <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{k.l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Der: registros + filtros + export */}
        <div className="flex items-center gap-2 md:ml-auto">
          <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{count} reg</span>
          <button onClick={() => setShowFilters(!showFilters)} aria-label="Filtros" aria-expanded={showFilters}
            style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
              background: showFilters ? "color-mix(in srgb, var(--px-brand) 15%, transparent)" : "transparent",
              color: showFilters ? "var(--px-brand)" : "var(--px-text-faint)" }}>
            <Filter size={11} className="inline mr-1" />FILTROS
            <ChevronDown size={11} className="inline ml-1" style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          <ExportIncidenciaDialog />
        </div>
      </div>

      {/* Filtros expandibles */}
      {showFilters && !showMobileDetail && (
        <div className="px-card px-dialog-enter" style={{ padding: "var(--px-3)", flexShrink: 0 }}>
          <AdvancedIncidentFilter onFilterChange={setFilters} initialFilters={filters} />
        </div>
      )}

      {/* ── Main: tabla + detalle ── */}
      <div className="flex flex-col md:flex-row flex-1 gap-3" style={{ minHeight: 0 }}>

        {/* Tabla / card list */}
        <div className={`px-card flex flex-col flex-1 ${showMobileDetail ? "hidden md:flex" : "flex"}`} style={{ minHeight: 0 }}>
          {/* Desktop header */}
          <div role="row" className="hidden md:grid px-4 py-2" style={{ gridTemplateColumns: "56px 1fr 56px 100px 80px", borderBottom: "1px solid var(--px-hairline)", background: "rgba(0,0,0,0.1)", flexShrink: 0 }}>
            {["ID", "TIPO / MUNICIPIO", "HORA", "ESTADO", "PRIORIDAD"].map(h => (
              <span key={h} role="columnheader" className="px-eyebrow">{h}</span>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-tactical" role="table" aria-label="Incidentes">
            {filtered.length === 0 && <EmptyState text="Sin incidentes con estos filtros" />}
            {filtered.map(inc => {
              const p = priCfg(inc.prioridad);
              const e = estCfg(inc.estado);
              const isSel = sel.id === inc.id;
              return (
                <div key={inc.id} role="row" aria-selected={isSel} className="cursor-pointer transition-all"
                  style={{ borderBottom: "1px solid var(--px-hairline)", background: isSel ? "color-mix(in srgb, var(--px-brand) 6%, transparent)" : "transparent", boxShadow: isSel ? "inset 3px 0 0 var(--px-brand)" : "none" }}
                  onClick={() => { setSel(inc); setShowMobileDetail(true); }}>
                  {/* Mobile card — compacto */}
                  <div className="md:hidden" style={{ padding: "var(--px-2) var(--px-3)" }}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", fontWeight: 700, color: p.color, textTransform: "uppercase" }}>{inc.prioridad}</span>
                      <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: e.color }}>{e.label}</span>
                      <span className="ml-auto" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{inc.hora}</span>
                    </div>
                    <div className="truncate" style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", fontWeight: 500, color: isSel ? "var(--px-text)" : "var(--px-text-muted)", lineHeight: 1.3, marginTop: 1 }}>{inc.tipo}</div>
                    <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)", marginTop: 1 }}>{inc.municipio} · {inc.colonia}</div>
                  </div>
                  {/* Desktop row */}
                  <div className="hidden md:grid px-4 py-2.5 items-center" style={{ gridTemplateColumns: "56px 1fr 56px 100px 80px" }}>
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-brand)" }}>{inc.id.split("-").pop()}</span>
                    <div className="min-w-0">
                      <div className="truncate" style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", fontWeight: 500, color: "var(--px-text)" }}>{inc.tipo}</div>
                      <div className="truncate" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{inc.municipio} · {inc.colonia}</div>
                    </div>
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{inc.hora}</span>
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: e.color }}>{e.label}</span>
                    <span className="px-delta" style={{ color: p.color, background: p.bg, fontSize: "var(--px-text-xs)", textTransform: "uppercase" }}>{inc.prioridad}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalle */}
        <div className={`px-card shrink-0 w-full md:w-80 lg:w-96 md:overflow-y-auto scrollbar-tactical ${showMobileDetail ? "flex flex-col" : "hidden md:flex md:flex-col"}`}
          role="complementary" aria-label="Detalle del incidente" style={{ padding: "var(--px-4)", minHeight: 0 }}>

          <button onClick={() => setShowMobileDetail(false)} className="md:hidden px-btn px-btn-ghost mb-3" style={{ alignSelf: "flex-start", padding: "6px 12px" }}>
            <ArrowLeft size={14} /> Volver
          </button>

          {sel && (
            <>
              {/* Cabecera — sutil, no gritona */}
              <div style={{ marginBottom: "var(--px-3)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{sel.id}</span>
                  <span className="px-delta" style={{ color: sp.color, background: sp.bg, textTransform: "uppercase" }}>{sel.prioridad}</span>
                  <span className="px-delta" style={{ color: se.color, background: `color-mix(in srgb, ${se.color} 12%, transparent)` }}>{se.label}</span>
                </div>
                <h3 style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-xl)", fontWeight: 700, color: "var(--px-text)", lineHeight: 1.15 }}>
                  {sel.tipo}
                </h3>
              </div>

              {/* Metadata — líneas limpias */}
              <div style={{ marginBottom: "var(--px-3)" }}>
                {[
                  { icon: <MapPin size={13} />, label: "Ubicación", value: `${sel.municipio}, ${sel.colonia}`, color: "var(--px-brand)", bold: true },
                  { icon: <Clock size={13} />, label: "Hora", value: `${sel.hora} · ${sel.fecha}`, color: "var(--px-text-muted)", bold: false },
                  { icon: <FileText size={13} />, label: "Folio", value: sel.id, color: "var(--px-text-faint)", bold: false },
                  { icon: <TrendingUp size={13} />, label: "Coords", value: `${sel.lat}°N, ${Math.abs(sel.lng)}°W`, color: "var(--px-text-faint)", bold: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3" style={{ padding: "var(--px-2) 0", borderBottom: "1px solid var(--px-hairline)" }}>
                    <span style={{ color: item.bold ? item.color : "var(--px-text-faint)", flexShrink: 0 }}>{item.icon}</span>
                    <span className="px-eyebrow" style={{ width: 56, flexShrink: 0 }}>{item.label}</span>
                    <span className="truncate" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", color: item.color, fontWeight: item.bold ? 600 : 400 }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowModal(true)} className="px-btn px-btn-primary w-full mb-3" style={{ minHeight: 40 }}>
                <FileText size={14} /> Ver detalle completo
              </button>

              {/* Chart embebido — solo desktop */}
              <div className="hidden md:block" style={{ borderTop: "1px solid var(--px-hairline)", paddingTop: "var(--px-3)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-eyebrow">TENDENCIA</span>
                  <div className="flex gap-1">
                    {(["bar", "line"] as const).map(v => (
                      <button key={v} onClick={() => setChartView(v)} style={{
                        fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", padding: "3px 8px",
                        borderRadius: 3, border: "none", cursor: "pointer",
                        background: chartView === v ? "color-mix(in srgb, var(--px-brand) 15%, transparent)" : "transparent",
                        color: chartView === v ? "var(--px-brand)" : "var(--px-text-faint)",
                      }}>{v.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  {chartView === "bar" ? (
                    <BarChart data={DATOS_MENSUALES} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: "var(--px-text-faint)", fontSize: 8, fontFamily: "var(--px-mono)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--px-text-faint)", fontSize: 8, fontFamily: "var(--px-mono)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="robos" name="Robos" fill="var(--px-crit)" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="lesiones" name="Lesiones" fill="var(--px-warn)" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={DATOS_MENSUALES} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fill: "var(--px-text-faint)", fontSize: 8, fontFamily: "var(--px-mono)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--px-text-faint)", fontSize: 8, fontFamily: "var(--px-mono)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Line type="monotone" dataKey="robos" name="Robos" stroke="var(--px-crit)" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="lesiones" name="Lesiones" stroke="var(--px-warn)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      <IncidentDetailModal incident={sel} isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
