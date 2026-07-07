// ============================================================
// TACTICAL MAP — Mapa Leaflet + tiles CARTO dark (SIN API key).
// Reemplaza Google Maps en MapaTab/ZonasTab para que el mapa se vea
// sin depender de VITE_FRONTEND_FORGE_API_KEY. Capas controladas por
// props; marcadores/heat/círculos construidos desde los datos mock.
// ============================================================

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { cn } from "@/lib/utils";
import { ALERTAS_ACTIVAS } from "@/data/securityData";
import { POLICE_ELEMENTS, type PoliceElement } from "@/data/policeData";

export interface TacticalMapLayers {
  heatmap?: boolean;
  municipios?: boolean;
  alertas?: boolean;
  policia?: boolean;
  limites?: boolean;
  /** Círculos de cobertura por municipio (vista Zonas). */
  zonaCircles?: boolean;
}

/** Municipio georreferenciado para las capas de incidencia (datos reales). */
export interface TacticalMunicipio {
  nombre: string;
  lat: number;
  lng: number;
  nivel: string;
  delitos: number;
  tendencia: number;
}

interface TacticalMapProps {
  className?: string;
  center: [number, number];
  zoom: number;
  layers?: TacticalMapLayers;
  /** Municipios reales a pintar (heatmap/marcadores/círculos). */
  municipios?: TacticalMunicipio[];
  /** Recentra el mapa al cambiar `key` (click en panel lateral). */
  focus?: { lat: number; lng: number; zoom?: number; key: number };
  /** Reporta centro/zoom al terminar un movimiento (coords vivas). */
  onViewChange?: (v: { lat: number; lng: number; zoom: number }) => void;
  onSelectMunicipio?: (nombre: string) => void;
  onSelectElement?: (el: PoliceElement) => void;
}

const nivelColor = (nivel: string) =>
  nivel === "crítico" ? "#FF3B3B" : nivel === "alto" ? "#FFB800" : nivel === "medio" ? "#00D4FF" : "#00E676";

// Hover: resalta el marcador (más grueso/opaco) y vuelve al salir.
function withHover(m: L.CircleMarker, base: L.PathOptions) {
  m.on("mouseover", () => m.setStyle({ weight: (base.weight ?? 1) + 1.5, fillOpacity: 1 }));
  m.on("mouseout", () => m.setStyle(base));
  return m;
}

export default function TacticalMap({
  className,
  center,
  zoom,
  layers = { heatmap: true, municipios: true, policia: true },
  municipios = [],
  focus,
  onViewChange,
  onSelectMunicipio,
  onSelectElement,
}: TacticalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const groups = useRef<Record<keyof TacticalMapLayers, L.LayerGroup>>({
    heatmap: L.layerGroup(),
    municipios: L.layerGroup(),
    alertas: L.layerGroup(),
    policia: L.layerGroup(),
    limites: L.layerGroup(),
    zonaCircles: L.layerGroup(),
  });
  // Callbacks en ref para no recrear el mapa cuando cambian.
  const cbMun = useRef(onSelectMunicipio);
  const cbEl = useRef(onSelectElement);
  const cbView = useRef(onViewChange);
  cbMun.current = onSelectMunicipio;
  cbEl.current = onSelectElement;
  cbView.current = onViewChange;

  // ── Init mapa (una vez) ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    });
    mapRef.current = map;

    const tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);
    tiles.on("load", () => { setLoading(false); setOffline(false); });
    tiles.on("tileerror", () => { setLoading(false); setOffline(true); });
    // Salvaguarda: si en 6s no cargaron tiles, quita el skeleton igual.
    const loadTimer = setTimeout(() => setLoading(false), 6000);

    const g = groups.current;

    // Las capas de incidencia (heatmap/marcadores/círculos) se construyen desde
    // la prop `municipios` (datos reales) en un efecto aparte, para que se
    // re-pinten cuando llegan/cambian los datos.

    // Alertas críticas (marcador pulsante para llamar la atención)
    ALERTAS_ACTIVAS.filter((a) => a.nivel === "critical").forEach((al) => {
      const icon = L.divIcon({
        className: "tac-alert-icon",
        html: `<span class="tac-ping"></span><span class="tac-ping-core"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([al.lat, al.lng], { icon })
        .bindPopup(
          `<div class="tac-pop tac-pop-crit"><div class="tac-pop-eyebrow">⚠ ALERTA CRÍTICA — ${al.id}</div>
           <div class="tac-pop-title" style="color:#FF6B6B">${al.titulo}</div>
           <div class="tac-pop-desc">${al.descripcion}</div>
           <div class="tac-pop-meta">${al.municipio} · ${al.hora}</div></div>`
        )
        .addTo(g.alertas);
    });

    // Elementos en campo
    POLICE_ELEMENTS.filter((e) => e.status === "active").forEach((el) => {
      const isCmd = el.role === "Comandante";
      const color = isCmd ? "#AB47BC" : "#4FC3F7";
      const base: L.PathOptions = { color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 0.9 };
      withHover(
        L.circleMarker([el.identification.lat, el.identification.lng], { radius: isCmd ? 9 : 6, ...base })
          .bindTooltip(`${el.name} · ${el.identification.value}`, { direction: "top", className: "tac-tip" })
          .bindPopup(
            `<div class="tac-pop"><div class="tac-pop-eyebrow" style="color:${color}">${el.role.toUpperCase()}</div>
             <div class="tac-pop-title">${el.name}</div>
             <div class="tac-pop-row"><span>Identificación</span><b style="color:${color}">${el.identification.value}</b></div>
             <div class="tac-pop-row"><span>Tipo rastreo</span><b>${el.identification.type.replace("_", " ").toUpperCase()}</b></div>
             <div class="tac-pop-row"><span>Departamento</span><b>${el.department}</b></div>
             <div class="tac-pop-meta">${el.identification.lat.toFixed(4)}° N, ${Math.abs(el.identification.lng).toFixed(4)}° W</div></div>`
          )
          .on("click", () => cbEl.current?.(el)),
        base,
      ).addTo(g.policia);
    });

    // Coords vivas: reporta al terminar cada movimiento (barato vs "move").
    const emitView = () => {
      const c = map.getCenter();
      cbView.current?.({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    map.on("moveend", emitView);
    emitView();

    // Recalcula tamaño tras montar y cuando el contenedor cambia de tamaño.
    setTimeout(() => map.invalidateSize(), 0);
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) map.invalidateSize();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      clearTimeout(loadTimer);
      map.remove();
      mapRef.current = null;
      // Reinicia grupos para un posible remonte limpio.
      (Object.keys(groups.current) as (keyof TacticalMapLayers)[]).forEach((k) => {
        groups.current[k] = L.layerGroup();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle de capas según props ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const g = groups.current;
    const want: Record<keyof TacticalMapLayers, boolean> = {
      heatmap: !!layers.heatmap,
      municipios: !!layers.municipios,
      alertas: !!layers.alertas,
      policia: !!layers.policia,
      limites: !!layers.limites,
      zonaCircles: !!layers.zonaCircles,
    };
    (Object.keys(want) as (keyof TacticalMapLayers)[]).forEach((k) => {
      const has = map.hasLayer(g[k]);
      if (want[k] && !has) g[k].addTo(map);
      else if (!want[k] && has) map.removeLayer(g[k]);
    });
  }, [layers.heatmap, layers.municipios, layers.alertas, layers.policia, layers.limites, layers.zonaCircles]);

  // ── Carga GeoJSON de límites municipales ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const g = groups.current;
    g.limites.clearLayers();

    // Genera polígonos aproximados alrededor de cada municipio.
    // TODO: reemplazar con GeoJSON oficial INEGI cuando esté disponible.
    municipios.forEach((mun) => {
      const offset = 0.15; // aprox 15km (increased for better visibility on zoom)
      const bounds = [
        [mun.lat - offset, mun.lng - offset],
        [mun.lat + offset, mun.lng - offset],
        [mun.lat + offset, mun.lng + offset],
        [mun.lat - offset, mun.lng + offset],
        [mun.lat - offset, mun.lng - offset],
      ];
      L.polyline(bounds as L.LatLngExpression[], {
        color: "#00D4FF", weight: 3, opacity: 0.8, dashArray: "5,3",
      }).addTo(g.limites);
    });
  }, [municipios]);

  // ── (Re)construye capas de incidencia desde datos reales (`municipios`) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const g = groups.current;
    g.heatmap.clearLayers();
    g.municipios.clearLayers();
    g.zonaCircles.clearLayers();
    if (municipios.length === 0) return;
    const container = mapRef.current?.getContainer();
    if (container && (container.clientWidth === 0 || container.clientHeight === 0)) return;

    // Heatmap (leaflet.heat): municipios como puntos ponderados por incidencia.
    const heatPoints: [number, number, number][] = municipios.map(
      (m) => [m.lat, m.lng, Math.min(1, m.delitos / 3000)] as [number, number, number],
    );
    try {
      const heat = (L as any).heatLayer(heatPoints, {
        radius: 38, blur: 28, max: 1, minOpacity: 0.25,
        gradient: { 0.2: "#0064FF", 0.4: "#00D4FF", 0.6: "#FFB800", 0.8: "#FF6400", 1.0: "#FF3B3B" },
      });
      if (heat) heat.addTo(g.heatmap);
    } catch (e) {
      console.warn("Heatmap renderering failed:", e);
    }

    // Marcadores por municipio.
    municipios.forEach((mun) => {
      const color = nivelColor(mun.nivel);
      const r = mun.nivel === "crítico" ? 11 : mun.nivel === "alto" ? 8 : 6;
      const tIcon = mun.tendencia > 0 ? "▲" : "▼";
      const tColor = mun.tendencia > 0 ? "#FF3B3B" : "#00E676";
      const base: L.PathOptions = { color: "#ffffff", weight: 1.5, fillColor: color, fillOpacity: 0.85 };
      withHover(
        L.circleMarker([mun.lat, mun.lng], { radius: r, ...base })
          .bindTooltip(mun.nombre, { direction: "top", className: "tac-tip" })
          .bindPopup(
            `<div class="tac-pop"><div class="tac-pop-title" style="color:${color}">${mun.nombre}</div>
             <div class="tac-pop-row"><span>Nivel de riesgo</span><b style="color:${color};text-transform:uppercase">${mun.nivel}</b></div>
             <div class="tac-pop-row"><span>Incidentes (mes)</span><b>${mun.delitos.toLocaleString()}</b></div>
             <div class="tac-pop-row"><span>Tendencia mensual</span><b style="color:${tColor}">${tIcon} ${Math.abs(mun.tendencia)}%</b></div></div>`
          )
          .on("click", () => cbMun.current?.(mun.nombre)),
        base,
      ).addTo(g.municipios);
    });

    // Círculos de cobertura por municipio (vista Zonas).
    municipios.forEach((mun) => {
      const color = nivelColor(mun.nivel);
      L.circle([mun.lat, mun.lng], {
        radius: mun.delitos * 3, color, weight: 1, opacity: 0.4, fillColor: color, fillOpacity: 0.08,
      }).addTo(g.zonaCircles);
    });
  }, [municipios]);

  // ── Recentrado imperativo (panel lateral) ──
  useEffect(() => {
    if (!mapRef.current || !focus) return;
    if (!isFinite(focus.lat) || !isFinite(focus.lng)) return;
    const container = mapRef.current.getContainer();
    if (container.clientWidth === 0 || container.clientHeight === 0) return;
    mapRef.current.flyTo([focus.lat, focus.lng], focus.zoom ?? mapRef.current.getZoom(), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  return (
    <div className={cn("relative w-full h-full", className)} style={{ minHeight: 220 }}>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 220, background: "var(--px-bg)" }} />

      {/* Skeleton mientras cargan los tiles */}
      {loading && (
        <div className="tac-overlay" aria-hidden>
          <div className="tac-skeleton-grid" />
          <div className="tac-overlay-label">Cargando mapa…</div>
        </div>
      )}

      {/* Estado sin conexión a tiles */}
      {offline && !loading && (
        <div className="tac-overlay tac-overlay-offline" role="status">
          <div className="tac-overlay-label">Sin conexión al servicio de mapas. Reintenta o revisa tu red.</div>
        </div>
      )}
    </div>
  );
}
