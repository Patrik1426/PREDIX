// ============================================================
// ZONAS DELICTIVAS — Análisis de zonas de riesgo (PREDIX v2)
// Desktop: mapa + sidebar ranking/radar
// Mobile: mapa protagonista + ranking toggle
// ============================================================

import { useMemo, useState } from "react";
import TacticalMap, { type TacticalMunicipio } from "@/components/TacticalMap";
import { MUNICIPIOS_ALTO_RIESGO, TIPOS_DELITO } from "@/data/securityData";
import { useIncidenciaMapa, useIncidenciaSummary } from "@/hooks/useIncidenciaData";
import { Target, TrendingUp, TrendingDown, Minus, BarChart2, ChevronUp, MapPin } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { OriginBadge } from "@/components/dashboard";

const RADAR_DATA = [
  { tipo: "Robo transeúnte", valor: 88 },
  { tipo: "Robo vehículo", valor: 72 },
  { tipo: "Robo negocio", valor: 65 },
  { tipo: "Violencia familiar", valor: 54 },
  { tipo: "Lesiones", valor: 48 },
  { tipo: "Extorsión", valor: 41 },
];

function nivelColor(nivel: string) {
  if (nivel === "crítico") return "var(--px-crit)";
  if (nivel === "alto") return "var(--px-warn)";
  if (nivel === "medio") return "var(--px-brand)";
  return "var(--px-ok)";
}

export default function ZonasTab() {
  const { data: summary } = useIncidenciaSummary();
  const [selectedMunicipio, setSelectedMunicipio] = useState(MUNICIPIOS_ALTO_RIESGO[0]);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number; key: number }>();
  const [showPanel, setShowPanel] = useState(false);
  const [sideTab, setSideTab] = useState<"ranking" | "perfil">("ranking");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showCircles, setShowCircles] = useState(true);

  const { municipios: mapaData } = useIncidenciaMapa();
  const municipiosReal = useMemo<TacticalMunicipio[]>(
    () => mapaData.map((m) => ({ nombre: m.municipio, lat: m.lat, lng: m.lng, nivel: m.nivel, delitos: m.incidentes, tendencia: m.tendencia })),
    [mapaData],
  );

  const tendIcon = (t: number) => {
    if (t > 2) return <TrendingUp size={11} style={{ color: "var(--px-crit)" }} />;
    if (t < -2) return <TrendingDown size={11} style={{ color: "var(--px-ok)" }} />;
    return <Minus size={11} style={{ color: "var(--px-warn)" }} />;
  };

  const selectMuni = (mun: typeof MUNICIPIOS_ALTO_RIESGO[0]) => {
    setSelectedMunicipio(mun);
    setFocus({ lat: mun.lat, lng: mun.lng, zoom: 11, key: Date.now() });
  };

  const sidebarContent = (
    <>
      {/* Tabs: Ranking / Perfil */}
      <div className="flex" style={{ borderBottom: "1px solid var(--px-hairline)", flexShrink: 0 }}>
        {[
          { id: "ranking" as const, label: "Ranking" },
          { id: "perfil" as const, label: `${selectedMunicipio.nombre.split(" ")[0]}` },
        ].map(t => (
          <button key={t.id} onClick={() => setSideTab(t.id)} className="flex-1" style={{
            fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", padding: "var(--px-2) var(--px-3)",
            color: sideTab === t.id ? "var(--px-brand)" : "var(--px-text-faint)",
            borderBottom: sideTab === t.id ? "2px solid var(--px-brand)" : "2px solid transparent",
            background: "none", border: "none", cursor: "pointer", minHeight: 36,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Ranking — lista completa */}
      {sideTab === "ranking" && (
        <div className="flex-1 overflow-y-auto scrollbar-tactical">
          {MUNICIPIOS_ALTO_RIESGO.map((mun, idx) => {
            const isSel = selectedMunicipio.nombre === mun.nombre;
            const color = nivelColor(mun.nivel);
            const pct = Math.min(100, (mun.delitos / 5000) * 100);
            return (
              <div key={mun.nombre} className="cursor-pointer transition-all"
                style={{ padding: "var(--px-2) var(--px-3)", borderBottom: "1px solid var(--px-hairline)",
                  background: isSel ? "color-mix(in srgb, var(--px-brand) 6%, transparent)" : "transparent",
                  boxShadow: isSel ? `inset 3px 0 0 ${color}` : "none" }}
                onClick={() => { selectMuni(mun); setSideTab("perfil"); }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)", width: 18, flexShrink: 0 }}>{String(idx + 1).padStart(2, "0")}</span>
                  <span className="truncate" style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", fontWeight: 500, color: isSel ? "var(--px-text)" : "var(--px-text-muted)", flex: 1 }}>{mun.nombre}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {tendIcon(mun.tendencia)}
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: mun.tendencia > 0 ? "var(--px-crit)" : "var(--px-ok)" }}>{Math.abs(mun.tendencia)}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: "var(--px-hairline)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color, width: 36, textAlign: "right", flexShrink: 0 }}>{mun.delitos.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Perfil del municipio seleccionado */}
      {sideTab === "perfil" && (
        <div className="flex-1 overflow-y-auto scrollbar-tactical" style={{ padding: "var(--px-3)" }}>
          {/* Header municipio */}
          <div className="flex items-center gap-2 mb-3">
            <span style={{ width: 10, height: 10, borderRadius: 999, background: nivelColor(selectedMunicipio.nivel), flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-md)", fontWeight: 700, color: "var(--px-text)" }}>{selectedMunicipio.nombre}</span>
          </div>

          {/* KPIs del municipio */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div style={{ padding: "var(--px-2)", borderLeft: `3px solid ${nivelColor(selectedMunicipio.nivel)}` }}>
              <div className="px-eyebrow">Nivel</div>
              <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", fontWeight: 700, color: nivelColor(selectedMunicipio.nivel), textTransform: "capitalize" }}>{selectedMunicipio.nivel}</div>
            </div>
            <div style={{ padding: "var(--px-2)", borderLeft: "3px solid var(--px-brand)" }}>
              <div className="px-eyebrow">Delitos</div>
              <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", fontWeight: 700, color: "var(--px-brand)" }}>{selectedMunicipio.delitos.toLocaleString()}</div>
            </div>
            <div style={{ padding: "var(--px-2)", borderLeft: `3px solid ${selectedMunicipio.tendencia > 0 ? "var(--px-crit)" : "var(--px-ok)"}` }}>
              <div className="px-eyebrow">Tendencia</div>
              <div className="flex items-center gap-1">
                {tendIcon(selectedMunicipio.tendencia)}
                <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", fontWeight: 700, color: selectedMunicipio.tendencia > 0 ? "var(--px-crit)" : "var(--px-ok)" }}>{Math.abs(selectedMunicipio.tendencia)}%</span>
              </div>
            </div>
            <div style={{ padding: "var(--px-2)", borderLeft: "3px solid var(--px-text-faint)" }}>
              <div className="px-eyebrow">Coords</div>
              <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{selectedMunicipio.lat.toFixed(3)}°N</div>
            </div>
          </div>

          {/* Radar chart */}
          <div className="px-eyebrow" style={{ marginBottom: "var(--px-1)" }}>Perfil delictivo</div>
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="var(--px-hairline)" />
              <PolarAngleAxis dataKey="tipo" tick={{ fill: "var(--px-text-faint)", fontSize: 8, fontFamily: "var(--px-mono)" }} />
              <Radar dataKey="valor" stroke="var(--px-brand)" fill="var(--px-brand)" fillOpacity={0.12} strokeWidth={1.5} />
              <Tooltip contentStyle={{ background: "var(--px-surface)", border: "1px solid var(--px-hairline)", borderRadius: "var(--px-r-sm)", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text)" }} />
            </RadarChart>
          </ResponsiveContainer>

          {/* Distribución */}
          <div className="px-eyebrow" style={{ marginTop: "var(--px-3)", marginBottom: "var(--px-1)" }}>Distribución</div>
          <div className="flex gap-1 flex-wrap">
            {TIPOS_DELITO.map(d => (
              <span key={d.nombre} style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: d.color, background: `color-mix(in srgb, ${d.color} 12%, transparent)`, padding: "2px 6px", borderRadius: 999 }}>
                {d.nombre} {d.valor}%
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--px-bg)", padding: "var(--px-3)", gap: "var(--px-3)" }}>

      {/* Toolbar */}
      <div className="px-card" style={{ padding: "var(--px-2) var(--px-4)", flexShrink: 0 }}>
        {/* Línea 1: título + badge */}
        <div className="flex items-center gap-2 mb-1">
          <Target size={13} style={{ color: "var(--px-brand)" }} />
          <span style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-sm)", fontWeight: 700, color: "var(--px-text)" }}>ZONAS DELICTIVAS</span>
          <OriginBadge real={summary.origen === "real"} />
        </div>
        {/* Línea 2: capas + leyenda */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[
              { label: "Calor", on: showHeatmap, toggle: () => setShowHeatmap(v => !v) },
              { label: "Círculos", on: showCircles, toggle: () => setShowCircles(v => !v) },
            ].map(l => (
              <button key={l.label} onClick={l.toggle} style={{
                fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", padding: "3px 8px",
                borderRadius: 4, border: "none", cursor: "pointer",
                background: l.on ? "color-mix(in srgb, var(--px-brand) 15%, transparent)" : "transparent",
                color: l.on ? "var(--px-brand)" : "var(--px-text-faint)",
              }}>{l.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {[
              { color: "var(--px-crit)", l: "Crít" },
              { color: "var(--px-warn)", l: "Alta" },
              { color: "var(--px-brand)", l: "Med" },
            ].map(z => (
              <span key={z.l} className="flex items-center gap-1">
                <span style={{ width: 6, height: 6, borderRadius: 999, background: z.color }} />
                <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{z.l}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: mapa + sidebar */}
      <div className="hidden md:flex flex-1 gap-3" style={{ minHeight: 0 }}>
        {/* Mapa */}
        <div className="px-card flex-1 overflow-hidden relative" style={{ minHeight: 0 }}>
          <TacticalMap className="w-full h-full" center={[19.4326, -99.1332]} zoom={9}
            municipios={municipiosReal} layers={{ heatmap: showHeatmap, zonaCircles: showCircles }} focus={focus}
            onSelectMunicipio={(nombre) => { const m = MUNICIPIOS_ALTO_RIESGO.find(x => x.nombre === nombre); if (m) selectMuni(m); }} />
        </div>
        {/* Sidebar ranking + radar */}
        <div className="px-card flex flex-col w-72 lg:w-80 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2" style={{ padding: "var(--px-3) var(--px-4)", borderBottom: "1px solid var(--px-hairline)", flexShrink: 0 }}>
            <BarChart2 size={12} style={{ color: "var(--px-brand)" }} />
            <span className="px-eyebrow">RANKING DE RIESGO</span>
          </div>
          {sidebarContent}
        </div>
      </div>

      {/* Mobile: mapa + floating bar + panel */}
      <div className="md:hidden flex flex-col flex-1 relative" style={{ minHeight: 0 }}>
        {/* Mapa */}
        <div className="px-card flex-1 overflow-hidden" style={{ minHeight: 200 }}>
          <TacticalMap className="w-full h-full" center={[19.4326, -99.1332]} zoom={9}
            municipios={municipiosReal} layers={{ heatmap: showHeatmap, zonaCircles: showCircles }} focus={focus}
            onSelectMunicipio={(nombre) => { const m = MUNICIPIOS_ALTO_RIESGO.find(x => x.nombre === nombre); if (m) { selectMuni(m); setShowPanel(true); } }} />
        </div>

        {/* Floating bar — fuera del overflow-hidden del mapa */}
        {!showPanel && (
          <div className="px-card flex items-center gap-2" style={{ padding: "var(--px-2) var(--px-3)", marginTop: "var(--px-2)", flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: nivelColor(selectedMunicipio.nivel), flexShrink: 0 }} />
            <span className="truncate" style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", fontWeight: 600, color: "var(--px-text)", flex: 1 }}>{selectedMunicipio.nombre}</span>
            <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: nivelColor(selectedMunicipio.nivel) }}>{selectedMunicipio.delitos.toLocaleString()}</span>
            <button onClick={() => setShowPanel(true)} className="px-btn px-btn-primary" style={{ padding: "4px 10px", fontSize: "var(--px-text-xs)", minHeight: 32 }}>
              <BarChart2 size={12} /> Ranking
            </button>
          </div>
        )}

        {/* Panel ranking — slide up */}
        {showPanel && (
          <div className="px-card flex flex-col px-dialog-enter" style={{ maxHeight: "55vh", marginTop: "var(--px-2)" }}>
            <div className="flex items-center justify-between" style={{ padding: "var(--px-2) var(--px-3)", borderBottom: "1px solid var(--px-hairline)", flexShrink: 0 }}>
              <div className="flex items-center gap-2">
                <BarChart2 size={12} style={{ color: "var(--px-brand)" }} />
                <span className="px-eyebrow">RANKING</span>
              </div>
              <button onClick={() => setShowPanel(false)} style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)", background: "none", border: "none", cursor: "pointer" }}>Cerrar</button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-tactical">
              {sidebarContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
