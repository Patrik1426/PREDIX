// ============================================================
// HEADER — Command Center / Tactical Intelligence
// Barra superior con logo, estado del sistema y controles
// Cierre de sesión funcional + Configuración de perfil
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, ChevronDown, Activity, Radio, TrendingUp, TrendingDown } from "lucide-react";
import { useLocation } from "wouter";
import UserPanel, { type UserProfile } from "./UserPanel";
import NotificationPanel from "./NotificationPanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDemoSession, DEMO_CREDENTIALS } from "@/contexts/DemoSessionContext";

// Tokens sobrio-institucional (alineados al NotificationPanel).
// Cian = solo acento de marca puntual; el color lo carga la severidad/estado.
const HX = {
  textTitle: "#E6ECF5",
  textBody: "#AEBACB",
  textMeta: "#6B7A92",
  border: "rgba(255,255,255,0.1)",
  borderSoft: "rgba(255,255,255,0.08)",
  brand: "#00D4FF",
  live: "#3DA35D",
  warn: "#E5A23D",
  crit: "#E5484D",
  mono: "IBM Plex Mono, monospace",
  display: "Rajdhani, sans-serif",
};

// Chip que ancla cada KPI (cuadro redondeado tintado por semántica).
function chip(bg: string, border: string): React.CSSProperties {
  return {
    width: "28px",
    height: "28px",
    borderRadius: "7px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg,
    border: `1px solid ${border}`,
    flexShrink: 0,
  };
}

// Indicador de tendencia vs periodo previo. goodUp = subir es positivo.
function Delta({ value, goodUp }: { value: number; goodUp: boolean }) {
  if (value === 0) {
    return <span style={{ fontFamily: HX.mono, fontSize: "0.62rem", fontWeight: 700, color: HX.textMeta }}>=</span>;
  }
  const up = value > 0;
  const good = up === goodUp;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        fontFamily: HX.mono,
        fontSize: "0.62rem",
        fontWeight: 700,
        color: good ? HX.live : HX.crit,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {Math.abs(value)}
    </span>
  );
}

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus] = useState("OPERATIVO");
  const [showUserPanel, setShowUserPanel] = useState(false);

  // KPIs operativos (mock de demo). El color de alertas es reactivo: rojo si
  // cruza umbral crítico, ámbar si hay activas. Wirear a datos reales aquí.
  const activeAlerts = 6;
  const activeUnits = 284;
  const alertDelta = 2;    // mock: vs hora previa (subir = malo)
  const unitsDelta = 6;    // mock: vs hora previa (subir = bueno)
  const alertCrit = activeAlerts >= 10;
  const alertColor = alertCrit ? HX.crit : activeAlerts > 0 ? HX.warn : HX.textMeta;
  const alertChipBg = alertCrit ? "rgba(229,72,77,0.12)" : "rgba(229,162,61,0.12)";
  const alertChipBorder = alertCrit ? "rgba(229,72,77,0.28)" : "rgba(229,162,61,0.28)";

  // Flash al cambiar un KPI (WAAPI, mismo patrón del bell). Listo para datos reales.
  const alertNumRef = useRef<HTMLSpanElement>(null);
  const unitsNumRef = useRef<HTMLSpanElement>(null);
  const prevAlerts = useRef(activeAlerts);
  const prevUnits = useRef(activeUnits);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const flash = (el: HTMLElement | null) => {
      if (!el || reduce) return;
      el.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.18)", offset: 0.5 }, { transform: "scale(1)" }],
        { duration: 320, easing: "ease-out" },
      );
    };
    if (activeAlerts !== prevAlerts.current) { flash(alertNumRef.current); prevAlerts.current = activeAlerts; }
    if (activeUnits !== prevUnits.current) { flash(unitsNumRef.current); prevUnits.current = activeUnits; }
  }, [activeAlerts, activeUnits]);

  // ── Auth hook for real logout ──
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const { role: demoRole, logout: demoLogout } = useDemoSession();
  const [, navigate] = useLocation();

  // Etiqueta de rol a mostrar: el rol de la demo manda en la UI.
  const demoRoleLabel = demoRole ? DEMO_CREDENTIALS[demoRole].label : null;

  // Build user profile from auth data or fallback to demo data
  const user: UserProfile = authUser
    ? {
        nombre: authUser.name || "Usuario PREDIX",
        rol: (authUser as any).role || "operador",
        correo: authUser.email || "usuario@seguridad.edomex.gob.mx",
        unidad: "Centro de Mando Estatal",
        ultimaConexion: new Date().toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        estado: "activo",
        cargo: "Operador de Monitoreo",
        accesos: ["mapa", "alertas", "incidentes", "tablero", "calor", "chatbot"],
      }
    : {
        nombre: "Carlos Mendoza",
        rol: "operador",
        correo: "cmendoza@seguridad.edomex.gob.mx",
        unidad: "Centro de Mando Estatal",
        ultimaConexion: new Date().toLocaleString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        estado: "activo",
        cargo: "Operador de Monitoreo",
        accesos: ["mapa", "alertas", "incidentes", "tablero", "calor", "chatbot"],
      };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  // ── Logout handler ──
  const handleLogout = useCallback(async () => {
    try {
      if (isAuthenticated) {
        await logout();
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      // Cierra la sesión demo y vuelve al login (gate de entrada).
      demoLogout();
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, logout, demoLogout, navigate]);

  // ── Settings handler ──
  const handleSettings = useCallback(() => {
    // Settings are handled inside UserPanel's settings view
    // This callback is kept for extensibility
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showUserPanel && !target.closest("[data-user-panel]")) {
        setShowUserPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserPanel]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "linear-gradient(180deg, rgba(11,18,31,0.98) 0%, rgba(14,23,38,0.96) 100%)",
        borderBottom: `1px solid ${HX.border}`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Top accent line — único acento de marca, sutil */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.45) 50%, transparent 100%)",
        }}
      />

      <div className="flex items-center justify-between gap-2 px-2 sm:px-4 py-2" style={{ minHeight: "56px" }}>
        {/* LEFT: Logo + Identity */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Riel de marca — origen del acento que recorre la composición */}
          <span
            aria-hidden
            style={{
              width: "3px",
              height: "34px",
              borderRadius: "2px",
              background: "linear-gradient(180deg, #00D4FF 0%, rgba(0,212,255,0.15) 100%)",
              boxShadow: "0 0 8px rgba(0,212,255,0.4)",
              flexShrink: 0,
            }}
          />
          <div className="relative">
            <Shield
              className="w-9 h-9"
              style={{ color: HX.brand, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}
              aria-label="Escudo Seguridad EdoMex"
            />
          </div>
          <div className="min-w-0">
            {/* Marca destacada + descriptor secundario */}
            <div className="flex items-baseline gap-2 leading-tight min-w-0">
              <span
                style={{
                  fontFamily: HX.display,
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: HX.textTitle,
                  letterSpacing: "0.14em",
                  flexShrink: 0,
                }}
              >
                PREDIX
              </span>
              <span className="hidden md:block" style={{ width: "1px", height: "13px", background: HX.border, flexShrink: 0 }} />
              <span
                className="hidden md:block truncate"
                style={{
                  fontFamily: HX.display,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: HX.textBody,
                  letterSpacing: "0.06em",
                }}
              >
                Sistema Estatal de Inteligencia
              </span>
            </div>
            <div
              className="hidden sm:block truncate"
              style={{
                fontFamily: HX.mono,
                fontSize: "0.6rem",
                color: HX.textMeta,
                letterSpacing: "0.08em",
                marginTop: "1px",
              }}
            >
              SEGURIDAD PÚBLICA · ESTADO DE MÉXICO
            </div>
          </div>
        </div>

        {/* CENTER: KPIs operativos agrupados (adaptativo) */}
        <div
          className="hidden sm:flex items-center gap-3.5 md:gap-5 px-2.5 sm:px-4 shrink-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)",
            border: `1px solid ${HX.border}`,
            borderRadius: "10px",
            paddingTop: "5px",
            paddingBottom: "5px",
            minWidth: 0,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {/* Estado del sistema */}
          <div className="flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            <span className="status-pulse-green" style={chip("rgba(61,163,93,0.12)", "rgba(61,163,93,0.28)")}>
              <Radio size={15} style={{ color: HX.live }} />
            </span>
            <span className="hidden lg:inline" style={{ fontFamily: HX.mono, fontSize: "0.66rem", color: HX.live, letterSpacing: "0.1em" }}>
              {systemStatus}
            </span>
          </div>

          <div className="hidden sm:block" style={{ width: "1px", height: "26px", background: HX.borderSoft, flexShrink: 0 }} />

          {/* Alertas activas (KPI con color reactivo + tendencia) */}
          <div className="flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            <span style={chip(alertChipBg, alertChipBorder)}>
              <Activity size={15} style={{ color: alertColor }} />
            </span>
            <div className="leading-none">
              <div className="flex items-baseline gap-1.5">
                <span ref={alertNumRef} style={{ display: "inline-block", fontFamily: HX.display, fontSize: "1.05rem", fontWeight: 700, color: alertColor, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {activeAlerts}
                </span>
                <Delta value={alertDelta} goodUp={false} />
              </div>
              <div className="hidden lg:block" style={{ fontFamily: HX.mono, fontSize: "0.62rem", color: HX.textMeta, letterSpacing: "0.1em", marginTop: "3px" }}>
                ALERTAS ACTIVAS
              </div>
            </div>
          </div>

          <div className="hidden sm:block" style={{ width: "1px", height: "26px", background: HX.borderSoft, flexShrink: 0 }} />

          {/* Unidades en línea (KPI + tendencia) */}
          <div className="hidden sm:flex items-center gap-2.5" style={{ flexShrink: 0 }}>
            <span style={chip("rgba(255,255,255,0.06)", HX.borderSoft)}>
              <Shield size={15} style={{ color: HX.textBody }} />
            </span>
            <div className="leading-none">
              <div className="flex items-baseline gap-1.5">
                <span ref={unitsNumRef} style={{ display: "inline-block", fontFamily: HX.display, fontSize: "1.05rem", fontWeight: 700, color: HX.textTitle, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {activeUnits}
                </span>
                <Delta value={unitsDelta} goodUp={true} />
              </div>
              <div className="hidden lg:flex items-center gap-1" style={{ marginTop: "3px" }}>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: HX.live }} />
                <span style={{ fontFamily: HX.mono, fontSize: "0.62rem", color: HX.textMeta, letterSpacing: "0.1em" }}>
                  UNIDADES EN LÍNEA
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Time + Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Clock (pill, cohesión con KPIs) */}
          <div
            className="text-right"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)",
              border: `1px solid ${HX.border}`,
              borderRadius: "10px",
              padding: "4px 10px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                fontFamily: HX.mono,
                fontSize: "0.9rem",
                fontWeight: 600,
                color: HX.textTitle,
                letterSpacing: "0.05em",
                lineHeight: 1.2,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {formatTime(currentTime)}
            </div>
            <div
              className="hidden sm:block"
              style={{
                fontFamily: HX.mono,
                fontSize: "0.62rem",
                color: HX.textMeta,
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Divisor */}
          <div className="hidden sm:block" style={{ width: "1px", height: "26px", background: HX.borderSoft }} />

          {/* Notifications — Real-time panel */}
          <NotificationPanel />

          {/* User */}
          <div className="relative block" data-user-panel>
            <button
              onClick={() => setShowUserPanel(!showUserPanel)}
              className="flex items-center gap-2 px-2 py-1 rounded transition-all"
              style={{
                background: showUserPanel ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${HX.border}`,
              }}
            >
              <div
                className="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: HX.textTitle,
                  fontFamily: HX.display,
                }}
              >
                {user.nombre.substring(0, 2).toUpperCase()}
              </div>
              <span
                className="hidden md:inline"
                style={{
                  fontFamily: HX.mono,
                  fontSize: "0.65rem",
                  color: HX.textMeta,
                }}
              >
                {(demoRoleLabel ?? user.rol).toUpperCase()}
              </span>
              <ChevronDown
                size={10}
                className="hidden md:block"
                style={{
                  color: HX.textMeta,
                  transform: showUserPanel ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
            {showUserPanel && (
              <UserPanel
                user={user}
                onClose={() => setShowUserPanel(false)}
                onLogout={handleLogout}
                onSettings={handleSettings}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
