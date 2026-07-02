/**
 * IntegracionTab — Módulo de Integración con Sistemas Externos
 * Design: PREDIX v2 — CSS custom properties (design tokens)
 * FUNCIONAL: Detalles emergentes, nueva integración, bóveda de secretos interactiva
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plug, Plus, CheckCircle, XCircle, RefreshCw, Code2, Zap,
  FileJson, Shield, Activity, ArrowRightLeft, Globe, Server,
  Key, Lock, Unlock, Eye, EyeOff, Copy, Trash2, Clock,
  AlertTriangle, ChevronRight, Search, Filter, X, Save,
  Download, Edit, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader } from "@/components/dashboard";
import { trpc } from "@/lib/trpc";

/* ─── Types ─── */
interface Integration {
  id: string;
  name: string;
  type: "REST" | "SOAP" | "XML-RPC" | "WEBHOOK" | "SFTP";
  endpoint: string;
  authMethod: string;
  status: "active" | "inactive" | "error";
  lastSync: string;
  requestsToday: number;
  avgLatency: number;
  description?: string;
  version?: string;
  headers?: Record<string, string>;
  rateLimit?: string;
  timeout?: number;
  retries?: number;
}

interface VaultSecret {
  id: number;
  name: string;
  type: string;
  integration: string;
  lastRotated: string;
  expiresIn: number;
  status: "active" | "expiring" | "expired";
  value?: string;
  masked: boolean;
}

interface AuditEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  integration: string;
  status: "success" | "failed" | "denied";
  ip: string;
}

/* ─── Demo Data ─── */
const INITIAL_INTEGRATIONS: Integration[] = [
  { id: "sesnsp-api", name: "SESNSP - Incidencia Delictiva", type: "REST", endpoint: "https://api.sesnsp.gob.mx/v2/incidencia", authMethod: "API_KEY", status: "active", lastSync: "Hace 2 min", requestsToday: 1247, avgLatency: 342, description: "Secretariado Ejecutivo del Sistema Nacional de Seguridad Pública. Provee datos de incidencia delictiva por entidad, municipio y tipo de delito.", version: "v2.1", rateLimit: "1000 req/hr", timeout: 30000, retries: 3 },
  { id: "c5-edomex", name: "C5 Estado de México", type: "SOAP", endpoint: "https://c5.edomex.gob.mx/ws/alertas", authMethod: "CERTIFICATE", status: "active", lastSync: "Hace 15 min", requestsToday: 856, avgLatency: 518, description: "Centro de Comando, Cómputo, Control, Comunicaciones y Contacto Ciudadano del Estado de México. Gestión de alertas y videovigilancia.", version: "v1.3", rateLimit: "500 req/hr", timeout: 45000, retries: 2 },
  { id: "inegi-geo", name: "INEGI - Datos Geoespaciales", type: "REST", endpoint: "https://api.inegi.org.mx/geo/v1", authMethod: "API_KEY", status: "active", lastSync: "Hace 1 hr", requestsToday: 423, avgLatency: 287, description: "Instituto Nacional de Estadística y Geografía. Datos geoespaciales, cartografía y estadísticas demográficas.", version: "v1.0", rateLimit: "2000 req/hr", timeout: 20000, retries: 3 },
  { id: "pgj-edomex", name: "PGJ EdoMéx - Denuncias", type: "SOAP", endpoint: "https://pgj.edomex.gob.mx/ws/denuncias", authMethod: "OAUTH2", status: "error", lastSync: "Hace 3 hrs", requestsToday: 12, avgLatency: 1200, description: "Procuraduría General de Justicia del Estado de México. Sistema de gestión de denuncias y carpetas de investigación.", version: "v2.0", rateLimit: "200 req/hr", timeout: 60000, retries: 5 },
  { id: "ssem-911", name: "SSEM - Llamadas 911", type: "REST", endpoint: "https://ssem.edomex.gob.mx/api/911", authMethod: "BASIC", status: "active", lastSync: "Hace 30 seg", requestsToday: 3421, avgLatency: 156, description: "Secretaría de Seguridad del Estado de México. Registro de llamadas de emergencia 911 en tiempo real.", version: "v3.2", rateLimit: "5000 req/hr", timeout: 10000, retries: 2 },
  { id: "plataforma-mx", name: "Plataforma México", type: "REST", endpoint: "https://plataformamexico.gob.mx/api/v3", authMethod: "CERTIFICATE", status: "inactive", lastSync: "Hace 2 días", requestsToday: 0, avgLatency: 0, description: "Sistema Nacional de Información de Seguridad Pública. Base de datos nacional de antecedentes penales y registros policiales.", version: "v3.0", rateLimit: "100 req/hr", timeout: 30000, retries: 3 },
  { id: "denue-inegi", name: "DENUE - Directorio Empresas", type: "REST", endpoint: "https://www.inegi.org.mx/app/api/denue/v1", authMethod: "API_KEY", status: "active", lastSync: "Hace 6 hrs", requestsToday: 89, avgLatency: 445, description: "Directorio Estadístico Nacional de Unidades Económicas. Geolocalización de negocios y establecimientos.", version: "v1.0", rateLimit: "1500 req/hr", timeout: 25000, retries: 2 },
  { id: "webhook-alertas", name: "Webhook - Alertas Sísmicas", type: "WEBHOOK", endpoint: "https://predix.edomex.gob.mx/hooks/sismos", authMethod: "NONE", status: "active", lastSync: "Hace 45 min", requestsToday: 23, avgLatency: 45, description: "Recepción de alertas sísmicas del Servicio Sismológico Nacional. Notificaciones push automáticas.", version: "v1.1", rateLimit: "Sin límite", timeout: 5000, retries: 1 },
];

const INITIAL_SECRETS: VaultSecret[] = [
  { id: 1, name: "SESNSP_API_KEY", type: "API_KEY", integration: "SESNSP", lastRotated: "2026-04-01", expiresIn: 45, status: "active", value: "sk-sesnsp-****-****-7f3a", masked: true },
  { id: 2, name: "C5_CERTIFICATE", type: "CERTIFICATE", integration: "C5 EdoMéx", lastRotated: "2026-03-15", expiresIn: 12, status: "expiring", value: "cert-c5-****-****-9b2e", masked: true },
  { id: 3, name: "INEGI_TOKEN", type: "API_KEY", integration: "INEGI", lastRotated: "2026-04-10", expiresIn: 82, status: "active", value: "tok-inegi-****-****-4d1c", masked: true },
  { id: 4, name: "PGJ_OAUTH_SECRET", type: "OAUTH_TOKEN", integration: "PGJ EdoMéx", lastRotated: "2026-02-20", expiresIn: -5, status: "expired", value: "oauth-pgj-****-****-2a8f", masked: true },
  { id: 5, name: "SSEM_BASIC_CREDS", type: "BASIC_AUTH", integration: "SSEM 911", lastRotated: "2026-04-05", expiresIn: 60, status: "active", value: "basic-ssem-****-****-6e3d", masked: true },
  { id: 6, name: "PLATAFORMA_MX_CERT", type: "CERTIFICATE", integration: "Plataforma México", lastRotated: "2026-01-10", expiresIn: -20, status: "expired", value: "cert-pmx-****-****-1b5a", masked: true },
];

const DEMO_AUDIT: AuditEntry[] = [
  { id: 1, timestamp: "17/04/2026 20:15:32", user: "admin@edomex.gob.mx", action: "READ_SECRET", integration: "SESNSP", status: "success", ip: "10.0.1.45" },
  { id: 2, timestamp: "17/04/2026 20:12:18", user: "operador.c5@edomex.gob.mx", action: "SYNC_DATA", integration: "C5 EdoMéx", status: "success", ip: "10.0.1.102" },
  { id: 3, timestamp: "17/04/2026 20:08:45", user: "analista@edomex.gob.mx", action: "API_CALL", integration: "INEGI", status: "success", ip: "10.0.2.33" },
  { id: 4, timestamp: "17/04/2026 19:55:10", user: "sistema@predix", action: "ROTATE_SECRET", integration: "PGJ EdoMéx", status: "failed", ip: "127.0.0.1" },
  { id: 5, timestamp: "17/04/2026 19:42:30", user: "admin@edomex.gob.mx", action: "CREATE_SECRET", integration: "SSEM 911", status: "success", ip: "10.0.1.45" },
  { id: 6, timestamp: "17/04/2026 19:30:00", user: "invitado@edomex.gob.mx", action: "READ_SECRET", integration: "Plataforma MX", status: "denied", ip: "10.0.3.78" },
  { id: 7, timestamp: "17/04/2026 19:15:22", user: "sistema@predix", action: "AUTO_SYNC", integration: "SSEM 911", status: "success", ip: "127.0.0.1" },
  { id: 8, timestamp: "17/04/2026 18:58:11", user: "operador.c5@edomex.gob.mx", action: "UPDATE_CONFIG", integration: "C5 EdoMéx", status: "success", ip: "10.0.1.102" },
];

/* ─── Sub-tabs ─── */
type SubTab = "conexiones" | "boveda" | "auditoria" | "convertidor" | "docs";
const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: "conexiones", label: "Conexiones", icon: <Plug size={14} /> },
  { id: "boveda", label: "Bóveda de Secretos", icon: <Shield size={14} /> },
  { id: "auditoria", label: "Auditoría", icon: <Activity size={14} /> },
  { id: "convertidor", label: "Convertidor", icon: <ArrowRightLeft size={14} /> },
  { id: "docs", label: "Documentación", icon: <FileJson size={14} /> },
];

/* ─── Helpers ─── */
const statusColor = (s: string) => {
  switch (s) { case "active": case "success": return "var(--px-ok)"; case "inactive": return "var(--px-text-muted)"; case "error": case "failed": case "expired": return "var(--px-crit)"; case "expiring": return "var(--px-warn)"; case "denied": return "#FF6B35"; default: return "var(--px-text-muted)"; }
};
const statusLabel = (s: string) => {
  switch (s) { case "active": return "ACTIVO"; case "inactive": return "INACTIVO"; case "error": return "ERROR"; case "success": return "EXITOSO"; case "failed": return "FALLIDO"; case "denied": return "DENEGADO"; case "expiring": return "POR VENCER"; case "expired": return "EXPIRADO"; default: return s.toUpperCase(); }
};
const typeIcon = (type: string) => {
  switch (type) { case "REST": return <Globe size={14} />; case "SOAP": return <Server size={14} />; case "WEBHOOK": return <Zap size={14} />; default: return <Code2 size={14} />; }
};

function TacticalCard({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (<div onClick={onClick} className={`px-card rounded ${className}`} style={{ backdropFilter: "blur(6px)" }}>{children}</div>);
}

const inputStyle: React.CSSProperties = { background: "var(--px-bg)", border: "1px solid var(--px-hairline)", color: "var(--px-text)", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", outline: "none" };
const labelStyle: React.CSSProperties = { fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)", letterSpacing: "0.08em" };

function relativeTime(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} hr${diffH > 1 ? "s" : ""}`;
  return `Hace ${Math.floor(diffH / 24)} días`;
}

/* ─── Main Component ─── */
export default function IntegracionTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("conexiones");
  const [searchQuery, setSearchQuery] = useState("");
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);

  // Estado real del pipeline SESNSP — sobreescribe el conector mock con datos verificables
  const { data: sesnspStatus } = trpc.incidencia.syncStatus.useQuery();
  const sesnspEsReal = sesnspStatus?.origen === "real" && sesnspStatus.conectado;
  useEffect(() => {
    if (!sesnspStatus || sesnspStatus.origen !== "real") return;
    setIntegrations(prev => prev.map(i => i.id === "sesnsp-api" ? {
      ...i,
      status: sesnspStatus.conectado ? "active" : "inactive",
      lastSync: sesnspStatus.ultimoSync ? relativeTime(new Date(sesnspStatus.ultimoSync)) : "Sin datos",
      requestsToday: sesnspStatus.filasCargadas,
    } : i));
  }, [sesnspStatus]);
  const [secrets, setSecrets] = useState<VaultSecret[]>(INITIAL_SECRETS);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(DEMO_AUDIT);

  // Dialogs
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showNewSecretDialog, setShowNewSecretDialog] = useState(false);

  // New integration form
  const [newInteg, setNewInteg] = useState({ name: "", endpoint: "", type: "REST" as Integration["type"], authMethod: "API_KEY", description: "" });

  // New secret form
  const [newSecret, setNewSecret] = useState({ name: "", type: "API_KEY", integration: "", value: "", expiresInDays: "90" });

  // Converter
  const [xmlInput, setXmlInput] = useState("");
  const [jsonOutput, setJsonOutput] = useState("");
  const [conversionDirection, setConversionDirection] = useState<"xml2json" | "json2xml">("xml2json");

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const active = integrations.filter(i => i.status === "active").length;
    const errors = integrations.filter(i => i.status === "error").length;
    const totalRequests = integrations.reduce((sum, i) => sum + i.requestsToday, 0);
    const activeWithLatency = integrations.filter(i => i.avgLatency > 0);
    const avgLatency = activeWithLatency.length > 0 ? Math.round(activeWithLatency.reduce((sum, i) => sum + i.avgLatency, 0) / activeWithLatency.length) : 0;
    const expiredSecrets = secrets.filter(s => s.status === "expired").length;
    const expiringSecrets = secrets.filter(s => s.status === "expiring").length;
    return { active, errors, totalRequests, avgLatency, expiredSecrets, expiringSecrets };
  }, [integrations, secrets]);

  const filteredIntegrations = useMemo(() => {
    if (!searchQuery) return integrations;
    const q = searchQuery.toLowerCase();
    return integrations.filter(i => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
  }, [searchQuery, integrations]);

  /* ─── Add audit ─── */
  const addAudit = useCallback((action: string, integration: string, status: "success" | "failed" | "denied" = "success") => {
    const now = new Date();
    const ts = `${now.toLocaleDateString("es-MX")} ${now.toLocaleTimeString("es-MX")}`;
    setAuditLogs(prev => [{ id: prev.length + 1, timestamp: ts, user: "admin@edomex.gob.mx", action, integration, status, ip: "10.0.1.45" }, ...prev]);
  }, []);

  /* ─── Create Integration ─── */
  const handleCreateIntegration = () => {
    if (!newInteg.name || !newInteg.endpoint) { toast.error("Nombre y endpoint son obligatorios"); return; }
    const integration: Integration = {
      id: `custom-${Date.now()}`, name: newInteg.name, type: newInteg.type, endpoint: newInteg.endpoint,
      authMethod: newInteg.authMethod, status: "inactive", lastSync: "Nunca", requestsToday: 0, avgLatency: 0,
      description: newInteg.description || "Integración personalizada", version: "v1.0", rateLimit: "Sin definir", timeout: 30000, retries: 3,
    };
    setIntegrations(prev => [...prev, integration]);
    addAudit("CREATE_INTEGRATION", newInteg.name);
    toast.success(`Integración "${newInteg.name}" registrada exitosamente`);
    setShowNewDialog(false);
    setNewInteg({ name: "", endpoint: "", type: "REST", authMethod: "API_KEY", description: "" });
  };

  /* ─── Delete Integration ─── */
  const handleDeleteIntegration = (id: string) => {
    const integ = integrations.find(i => i.id === id);
    setIntegrations(prev => prev.filter(i => i.id !== id));
    addAudit("DELETE_INTEGRATION", integ?.name || id);
    toast.success(`Integración eliminada`);
    if (selectedIntegration?.id === id) { setShowDetailDialog(false); setSelectedIntegration(null); }
  };

  /* ─── Toggle Integration Status ─── */
  const handleToggleStatus = (id: string) => {
    setIntegrations(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newStatus = i.status === "active" ? "inactive" : "active";
      addAudit(newStatus === "active" ? "ACTIVATE_INTEGRATION" : "DEACTIVATE_INTEGRATION", i.name);
      return { ...i, status: newStatus, lastSync: newStatus === "active" ? "Ahora" : i.lastSync };
    }));
    toast.success("Estado de integración actualizado");
  };

  /* ─── Sync Integration ─── */
  const handleSync = (integ: Integration) => {
    setIntegrations(prev => prev.map(i => i.id === integ.id ? { ...i, lastSync: "Ahora", requestsToday: i.requestsToday + 1 } : i));
    addAudit("SYNC_DATA", integ.name);
    toast.success(`Sincronizando ${integ.name}...`);
  };

  /* ─── Create Secret ─── */
  const handleCreateSecret = () => {
    if (!newSecret.name || !newSecret.value) { toast.error("Nombre y valor son obligatorios"); return; }
    const secret: VaultSecret = {
      id: secrets.length + 1, name: newSecret.name, type: newSecret.type, integration: newSecret.integration || "General",
      lastRotated: new Date().toISOString().split("T")[0], expiresIn: parseInt(newSecret.expiresInDays) || 90,
      status: "active", value: `${newSecret.value.substring(0, 8)}****`, masked: true,
    };
    setSecrets(prev => [...prev, secret]);
    addAudit("CREATE_SECRET", newSecret.integration || "General");
    toast.success(`Secreto "${newSecret.name}" almacenado`);
    setShowNewSecretDialog(false);
    setNewSecret({ name: "", type: "API_KEY", integration: "", value: "", expiresInDays: "90" });
  };

  /* ─── Rotate Secret ─── */
  const handleRotateSecret = (id: number) => {
    setSecrets(prev => prev.map(s => s.id === id ? { ...s, lastRotated: new Date().toISOString().split("T")[0], expiresIn: 90, status: "active" as const } : s));
    const secret = secrets.find(s => s.id === id);
    addAudit("ROTATE_SECRET", secret?.integration || "");
    toast.success(`Secreto "${secret?.name}" rotado exitosamente`);
  };

  /* ─── Delete Secret ─── */
  const handleDeleteSecret = (id: number) => {
    const secret = secrets.find(s => s.id === id);
    setSecrets(prev => prev.filter(s => s.id !== id));
    addAudit("DELETE_SECRET", secret?.integration || "");
    toast.success(`Secreto "${secret?.name}" eliminado`);
  };

  /* ─── Toggle Secret Visibility ─── */
  const toggleSecretVisibility = (id: number) => {
    setSecrets(prev => prev.map(s => s.id === id ? { ...s, masked: !s.masked } : s));
  };

  /* ─── Conversion ─── */
  const handleConvert = () => {
    if (!xmlInput.trim()) { toast.error("Ingrese datos para convertir"); return; }
    try {
      if (conversionDirection === "xml2json") {
        const result = { converted: true, source: "XML", target: "JSON", data: xmlInput.substring(0, 100), timestamp: new Date().toISOString() };
        setJsonOutput(JSON.stringify(result, null, 2));
      } else {
        JSON.parse(xmlInput);
        setJsonOutput(`<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <converted>true</converted>\n  <source>JSON</source>\n  <target>XML</target>\n  <timestamp>${new Date().toISOString()}</timestamp>\n</root>`);
      }
      toast.success("Conversión completada");
    } catch { toast.error("Error en la conversión. Verifique el formato."); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "var(--px-display)", background: "var(--px-bg)", padding: "var(--px-3)", gap: "var(--px-3)" }}>
      {/* Toolbar: título + KPIs inline + acción */}
      <div className="px-card flex items-center gap-2 flex-wrap" style={{ padding: "var(--px-2) var(--px-4)", flexShrink: 0 }}>
        <Plug size={13} style={{ color: "var(--px-brand)" }} />
        <span style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-sm)", fontWeight: 700, color: "var(--px-text)" }}>INTEGRACIONES</span>
        <div className="flex items-center gap-2 ml-auto">
          <div className="hidden sm:flex items-center gap-3">
            {[
              { l: "Activas", v: stats.active, c: "var(--px-ok)" },
              { l: "Errores", v: stats.errors, c: "var(--px-crit)" },
              { l: "Req/hoy", v: stats.totalRequests.toLocaleString(), c: "var(--px-brand)" },
            ].map(k => (
              <span key={k.l} className="flex items-center gap-1" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: k.c }}>
                <span style={{ fontWeight: 700 }}>{k.v}</span> {k.l}
              </span>
            ))}
          </div>
          <button onClick={() => setShowNewDialog(true)} className="px-btn px-btn-primary" style={{ padding: "4px 10px", fontSize: "var(--px-text-xs)" }}>
            <Plus size={12} /> Nueva
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="px-card flex overflow-x-auto" role="tablist" aria-label="Secciones de integración" style={{ flexShrink: 0 }}>
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} role="tab" aria-selected={activeSubTab === tab.id} aria-controls={`tabpanel-${tab.id}`} id={`tab-${tab.id}`} className="flex items-center transition-all whitespace-nowrap flex-1 justify-center" style={{ gap: "var(--px-1)", padding: "var(--px-3)", fontWeight: activeSubTab === tab.id ? 600 : 400, fontSize: "var(--px-text-xs)", color: activeSubTab === tab.id ? "var(--px-brand)" : "var(--px-text-faint)", borderBottom: activeSubTab === tab.id ? "2px solid var(--px-brand)" : "2px solid transparent", background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer", minHeight: 40 }}>
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-card flex-1 overflow-y-auto scrollbar-tactical" role="tabpanel" id={`tabpanel-${activeSubTab}`} aria-labelledby={`tab-${activeSubTab}`} style={{ padding: "var(--px-4)" }}>

        {/* ═══ CONEXIONES ═══ */}
        {activeSubTab === "conexiones" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6" style={{ gap: "var(--px-3)" }}>
              {[
                { label: "ACTIVAS", value: stats.active, color: "var(--px-ok)", icon: <CheckCircle size={16} /> },
                { label: "CON ERROR", value: stats.errors, color: "var(--px-crit)", icon: <XCircle size={16} /> },
                { label: "REQUESTS HOY", value: stats.totalRequests.toLocaleString(), color: "var(--px-brand)", icon: <Activity size={16} /> },
                { label: "LATENCIA PROM.", value: `${stats.avgLatency}ms`, color: "var(--px-warn)", icon: <Clock size={16} /> },
                { label: "SECRETOS EXPIRADOS", value: stats.expiredSecrets, color: "var(--px-crit)", icon: <AlertTriangle size={16} /> },
                { label: "POR VENCER", value: stats.expiringSecrets, color: "var(--px-warn)", icon: <Key size={16} /> },
              ].map((kpi, i) => (
                <TacticalCard key={i} className="p-3">
                  <div className="flex items-center gap-2 mb-1"><span style={{ color: kpi.color }}>{kpi.icon}</span><span className="px-eyebrow">{kpi.label}</span></div>
                  <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-lg)", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                </TacticalCard>
              ))}
            </div>

            <div className="flex items-center" style={{ gap: "var(--px-3)" }}>
              <div className="flex-1 relative">
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--px-text-muted)" }} />
                <input type="text" placeholder="Buscar integración..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar integración" className="w-full pl-8 pr-3 py-2 rounded" style={inputStyle} />
              </div>
            </div>

            <div className="space-y-2">
              {filteredIntegrations.map(integration => (
                <div key={integration.id} className="cursor-pointer transition-all" onClick={() => { setSelectedIntegration(integration); setShowDetailDialog(true); }}
                  style={{ padding: "var(--px-3)", borderBottom: "1px solid var(--px-hairline)", boxShadow: `inset 3px 0 0 ${statusColor(integration.status)}` }}>
                  {/* Línea 1: nombre + status */}
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: statusColor(integration.status) }}>{typeIcon(integration.type)}</span>
                    <span className="truncate" style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", fontWeight: 600, color: "var(--px-text)", flex: 1 }}>{integration.name}</span>
                    {integration.id === "sesnsp-api" && sesnspEsReal && (
                      <span className="px-delta" style={{ color: "var(--px-ok)", background: "color-mix(in srgb, var(--px-ok) 12%, transparent)" }}>DATOS REALES</span>
                    )}
                    <span className="px-delta" style={{ color: statusColor(integration.status), background: `color-mix(in srgb, ${statusColor(integration.status)} 12%, transparent)` }}>{statusLabel(integration.status)}</span>
                  </div>
                  {/* Línea 2: endpoint truncado */}
                  <div className="truncate" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)", marginBottom: 4 }}>{integration.endpoint}</div>
                  {/* Línea 3: métricas + acciones */}
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-brand)" }}><span style={{ fontWeight: 700 }}>{integration.requestsToday.toLocaleString()}</span> {integration.id === "sesnsp-api" && sesnspEsReal ? "filas BD" : "req"}</span>
                    {!(integration.id === "sesnsp-api" && sesnspEsReal) && (
                      <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: integration.avgLatency > 500 ? "var(--px-warn)" : "var(--px-ok)" }}><span style={{ fontWeight: 700 }}>{integration.avgLatency}</span>ms</span>
                    )}
                    <div className="ml-auto flex gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleSync(integration)} aria-label={`Sincronizar ${integration.name}`} style={{ padding: 4, borderRadius: 4, background: "none", border: "none", cursor: "pointer", color: "var(--px-brand)" }}><RefreshCw size={13} /></button>
                      <button aria-label="Ver detalle" style={{ padding: 4, borderRadius: 4, background: "none", border: "none", cursor: "pointer", color: "var(--px-text-faint)" }}><ChevronRight size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ BÓVEDA DE SECRETOS ═══ */}
        {activeSubTab === "boveda" && (
          <div className="space-y-4">
            {stats.expiredSecrets > 0 && (
              <TacticalCard className="p-3">
                <div className="flex items-center" style={{ gap: "var(--px-3)" }}>
                  <AlertTriangle size={16} style={{ color: "var(--px-crit)" }} />
                  <span style={{ fontSize: "var(--px-text-base)", color: "var(--px-crit)", fontWeight: 600 }}>{stats.expiredSecrets} secreto(s) expirado(s) requieren rotación inmediata</span>
                  <button onClick={() => { secrets.filter(s => s.status === "expired").forEach(s => handleRotateSecret(s.id)); }} className="ml-auto px-3 py-1 rounded" style={{ background: "color-mix(in srgb, var(--px-crit) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--px-crit) 30%, transparent)", color: "var(--px-crit)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}>ROTAR TODOS</button>
                </div>
              </TacticalCard>
            )}
            <TacticalCard className="overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-2" style={{ padding: "var(--px-3) var(--px-4)", borderBottom: "1px solid var(--px-hairline)" }}>
                <span className="px-section-title">CREDENCIALES ALMACENADAS</span>
                <button onClick={() => setShowNewSecretDialog(true)} className="flex items-center gap-1 px-3 py-1 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 20%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}><Plus size={12} /> AGREGAR SECRETO</button>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", minWidth: "800px" }}>
                <thead>
                  <tr style={{ background: "color-mix(in srgb, var(--px-brand) 4%, transparent)" }}>
                    {["NOMBRE", "TIPO", "INTEGRACIÓN", "VALOR", "ÚLTIMA ROTACIÓN", "EXPIRA EN", "ESTADO", "ACCIONES"].map(h => (
                      <th key={h} className="px-3 py-2 text-left" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {secrets.map(secret => (
                    <tr key={secret.id} style={{ borderBottom: "1px solid var(--px-hairline)" }}>
                      <td className="px-3 py-2.5"><div className="flex items-center gap-2"><Lock size={12} style={{ color: "var(--px-brand)" }} /><span style={{ color: "var(--px-text)", fontWeight: 600 }}>{secret.name}</span></div></td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-xs)" }}>{secret.type}</span></td>
                      <td className="px-3 py-2.5" style={{ color: "var(--px-text)" }}>{secret.integration}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)" }}>{secret.masked ? "••••••••••••" : secret.value}</td>
                      <td className="px-3 py-2.5" style={{ color: "var(--px-text-muted)" }}>{secret.lastRotated}</td>
                      <td className="px-3 py-2.5"><span style={{ color: secret.expiresIn <= 0 ? "var(--px-crit)" : secret.expiresIn <= 15 ? "var(--px-warn)" : "var(--px-ok)" }}>{secret.expiresIn <= 0 ? "EXPIRADO" : `${secret.expiresIn} días`}</span></td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${statusColor(secret.status)} 10%, transparent)`, color: statusColor(secret.status), fontSize: "var(--px-text-xs)", fontWeight: 600 }}>{statusLabel(secret.status)}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => toggleSecretVisibility(secret.id)} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 8%, transparent)" }} title={secret.masked ? "Mostrar" : "Ocultar"} aria-label={secret.masked ? "Mostrar secreto" : "Ocultar secreto"}>{secret.masked ? <Eye size={11} style={{ color: "var(--px-text-muted)" }} /> : <EyeOff size={11} style={{ color: "var(--px-brand)" }} />}</button>
                          <button onClick={() => { navigator.clipboard.writeText(secret.value || ""); toast.info("Copiado al portapapeles"); addAudit("READ_SECRET", secret.integration); }} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 8%, transparent)" }} title="Copiar" aria-label="Copiar secreto"><Copy size={11} style={{ color: "var(--px-text-muted)" }} /></button>
                          <button onClick={() => handleRotateSecret(secret.id)} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 8%, transparent)" }} title="Rotar" aria-label="Rotar secreto"><RefreshCw size={11} style={{ color: "var(--px-brand)" }} /></button>
                          <button onClick={() => handleDeleteSecret(secret.id)} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-crit) 8%, transparent)" }} title="Eliminar" aria-label="Eliminar secreto"><Trash2 size={11} style={{ color: "var(--px-crit)" }} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </TacticalCard>
          </div>
        )}

        {/* ═══ AUDITORÍA ═══ */}
        {activeSubTab === "auditoria" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-section-title">REGISTRO DE AUDITORÍA ({auditLogs.length} entradas)</span>
              <button onClick={() => { const csv = ["Timestamp,Usuario,Acción,Integración,Estado,IP", ...auditLogs.map(l => `${l.timestamp},${l.user},${l.action},${l.integration},${l.status},${l.ip}`)].join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "auditoria_integraciones.csv"; a.click(); URL.revokeObjectURL(url); toast.success("Auditoría exportada"); }} className="flex items-center gap-1 px-3 py-1.5 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 20%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}><Download size={12} /> EXPORTAR</button>
            </div>
            <TacticalCard className="overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", minWidth: "700px" }}>
                <thead><tr style={{ background: "color-mix(in srgb, var(--px-brand) 4%, transparent)" }}>{["TIMESTAMP", "USUARIO", "ACCIÓN", "INTEGRACIÓN", "ESTADO", "IP"].map(h => (<th key={h} className="px-4 py-2 text-left" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</th>))}</tr></thead>
                <tbody>
                  {auditLogs.map(entry => (
                    <tr key={entry.id} style={{ borderBottom: "1px solid var(--px-hairline)" }}>
                      <td className="px-4 py-2.5" style={{ color: "var(--px-text-muted)" }}>{entry.timestamp}</td>
                      <td className="px-4 py-2.5" style={{ color: "var(--px-text)" }}>{entry.user}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-xs)" }}>{entry.action}</span></td>
                      <td className="px-4 py-2.5" style={{ color: "var(--px-text)" }}>{entry.integration}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${statusColor(entry.status)} 10%, transparent)`, color: statusColor(entry.status), fontSize: "var(--px-text-xs)", fontWeight: 600 }}>{statusLabel(entry.status)}</span></td>
                      <td className="px-4 py-2.5" style={{ color: "var(--px-text-muted)" }}>{entry.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </TacticalCard>
          </div>
        )}

        {/* ═══ CONVERTIDOR ═══ */}
        {activeSubTab === "convertidor" && (
          <div className="space-y-4">
            <TacticalCard className="p-4">
              <div className="flex items-center justify-between" style={{ marginBottom: "var(--px-4)" }}>
                <span className="px-section-title">CONVERTIDOR DE DATOS</span>
                <div className="flex gap-2">
                  {(["xml2json", "json2xml"] as const).map(dir => (
                    <button key={dir} onClick={() => setConversionDirection(dir)} className="px-3 py-1 rounded" style={{ background: conversionDirection === dir ? "color-mix(in srgb, var(--px-brand) 15%, transparent)" : "transparent", border: `1px solid ${conversionDirection === dir ? "color-mix(in srgb, var(--px-brand) 40%, transparent)" : "var(--px-hairline)"}`, color: conversionDirection === dir ? "var(--px-brand)" : "var(--px-text-muted)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}>
                      {dir === "xml2json" ? "XML → JSON" : "JSON → XML"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--px-4)" }}>
                <div>
                  <label style={labelStyle}>{conversionDirection === "xml2json" ? "ENTRADA XML" : "ENTRADA JSON"}</label>
                  <textarea value={xmlInput} onChange={e => setXmlInput(e.target.value)} rows={12} className="w-full mt-1 p-3 rounded" style={{ ...inputStyle, resize: "none" }} placeholder={conversionDirection === "xml2json" ? '<root>\n  <dato>valor</dato>\n</root>' : '{\n  "dato": "valor"\n}'} />
                </div>
                <div>
                  <label style={labelStyle}>{conversionDirection === "xml2json" ? "SALIDA JSON" : "SALIDA XML"}</label>
                  <textarea value={jsonOutput} readOnly rows={12} className="w-full mt-1 p-3 rounded" style={{ ...inputStyle, border: "1px solid color-mix(in srgb, var(--px-ok) 15%, transparent)", color: "var(--px-ok)", resize: "none" }} placeholder="Resultado de la conversión..." />
                </div>
              </div>
              <div className="flex justify-center" style={{ marginTop: "var(--px-4)" }}>
                <button onClick={handleConvert} className="flex items-center gap-2 rounded" style={{ padding: "var(--px-2) var(--px-5)", background: "color-mix(in srgb, var(--px-brand) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 40%, transparent)", color: "var(--px-brand)", fontWeight: 600, fontSize: "var(--px-text-base)" }}><ArrowRightLeft size={14} /> CONVERTIR</button>
              </div>
            </TacticalCard>
          </div>
        )}

        {/* ═══ DOCUMENTACIÓN ═══ */}
        {activeSubTab === "docs" && (
          <div className="space-y-4">
            <TacticalCard className="p-4">
              <h3 className="px-section-title" style={{ marginBottom: "var(--px-3)" }}>GUÍA DE INTEGRACIÓN</h3>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--px-4)" }}>
                {[
                  { title: "REST API", desc: "APIs HTTP/HTTPS con JSON. Estándar para servicios modernos como SESNSP e INEGI.", methods: "GET, POST, PUT, DELETE", auth: "API Key, OAuth 2.0, Bearer Token" },
                  { title: "SOAP Web Service", desc: "Web Services basados en XML/WSDL. Común en sistemas gubernamentales legacy como C5 y PGJ.", methods: "POST (XML Envelope)", auth: "WS-Security, Certificados X.509" },
                  { title: "XML-RPC", desc: "Llamadas a procedimiento remoto usando XML. Compatible con sistemas legacy del gobierno.", methods: "POST (XML)", auth: "Basic Auth, API Key" },
                  { title: "Webhooks", desc: "Notificaciones push para eventos en tiempo real. Ideal para alertas y sincronización.", methods: "POST (callback)", auth: "HMAC Signature, Token" },
                ].map((doc, i) => (
                  <TacticalCard key={i} className="p-3">
                    <h4 style={{ fontWeight: 600, fontSize: "var(--px-text-base)", color: "var(--px-brand)", marginBottom: "var(--px-1)" }}>{doc.title}</h4>
                    <p style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)", marginBottom: "var(--px-2)" }}>{doc.desc}</p>
                    <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)" }}>
                      <div><span style={{ color: "var(--px-text-muted)" }}>Métodos:</span> <span style={{ color: "var(--px-text)" }}>{doc.methods}</span></div>
                      <div><span style={{ color: "var(--px-text-muted)" }}>Auth:</span> <span style={{ color: "var(--px-text)" }}>{doc.auth}</span></div>
                    </div>
                  </TacticalCard>
                ))}
              </div>
            </TacticalCard>
            <TacticalCard className="p-4">
              <h3 className="px-section-title" style={{ marginBottom: "var(--px-3)" }}>ENDPOINTS DISPONIBLES</h3>
              <div className="space-y-2" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)" }}>
                {[
                  { method: "POST", path: "/api/trpc/integration.register", desc: "Registrar nueva integración" },
                  { method: "POST", path: "/api/trpc/integration.execute", desc: "Ejecutar integración" },
                  { method: "GET", path: "/api/trpc/integration.getRegistered", desc: "Listar integraciones" },
                  { method: "POST", path: "/api/trpc/vault.storeSecret", desc: "Almacenar secreto" },
                  { method: "GET", path: "/api/trpc/vault.retrieveSecret", desc: "Recuperar secreto" },
                  { method: "GET", path: "/api/trpc/vault.getAuditLogs", desc: "Logs de auditoría" },
                ].map((ep, i) => (
                  <div key={i} className="px-3 py-2 rounded" style={{ background: "var(--px-bg)", border: "1px solid var(--px-hairline)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-delta" style={{ background: ep.method === "GET" ? "color-mix(in srgb, var(--px-ok) 15%, transparent)" : "color-mix(in srgb, var(--px-brand) 15%, transparent)", color: ep.method === "GET" ? "var(--px-ok)" : "var(--px-brand)" }}>{ep.method}</span>
                      <span style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)" }}>{ep.desc}</span>
                    </div>
                    <div className="truncate" style={{ color: "var(--px-text)", fontSize: "var(--px-text-xs)" }}>{ep.path}</div>
                  </div>
                ))}
              </div>
            </TacticalCard>
          </div>
        )}
      </div>

      {/* ═══════════════ DIALOGS ═══════════════ */}

      {/* ═══ Detail Dialog ═══ */}
      {showDetailDialog && selectedIntegration && (() => {
        const sc = statusColor(selectedIntegration.status);
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 px-overlay" role="dialog" aria-modal="true" aria-labelledby="detail-dialog-title" style={{ background: "rgba(0,0,0,0.7)" }}>
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-tactical px-card px-dialog-enter" style={{ padding: 0 }}>
              {/* Header con gradient de estado */}
              <div className="relative" style={{ padding: "var(--px-4)", borderBottom: "1px solid var(--px-hairline)" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${sc}, transparent 70%)` }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span style={{ color: sc }}>{typeIcon(selectedIntegration.type)}</span>
                    <div className="min-w-0">
                      <h3 id="detail-dialog-title" className="truncate" style={{ fontFamily: "var(--px-display)", fontWeight: 700, fontSize: "var(--px-text-lg)", color: "var(--px-text)" }}>{selectedIntegration.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-delta" style={{ color: sc, background: `color-mix(in srgb, ${sc} 12%, transparent)` }}>{statusLabel(selectedIntegration.status)}</span>
                        <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{selectedIntegration.type} · {selectedIntegration.version}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowDetailDialog(false)} aria-label="Cerrar" style={{ color: "var(--px-text-faint)", background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={16} /></button>
                </div>
              </div>

              <div style={{ padding: "var(--px-4)" }}>
                <p style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", color: "var(--px-text-faint)", lineHeight: 1.6, marginBottom: "var(--px-4)" }}>{selectedIntegration.description}</p>

                {/* KPIs inline */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { l: "Requests", v: selectedIntegration.requestsToday.toLocaleString(), c: "var(--px-brand)" },
                    { l: "Latencia", v: `${selectedIntegration.avgLatency}ms`, c: selectedIntegration.avgLatency > 500 ? "var(--px-warn)" : "var(--px-ok)" },
                    { l: "Uptime", v: selectedIntegration.status === "active" ? "99.8%" : "0%", c: "var(--px-ok)" },
                  ].map(k => (
                    <div key={k.l} style={{ padding: "var(--px-2)", borderLeft: `3px solid ${k.c}` }}>
                      <div className="px-eyebrow">{k.l}</div>
                      <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-lg)", fontWeight: 700, color: k.c, lineHeight: 1 }}>{k.v}</div>
                    </div>
                  ))}
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-md overflow-hidden mb-4" style={{ border: "1px solid var(--px-hairline)" }}>
                  {[
                    { l: "Endpoint", v: selectedIntegration.endpoint },
                    { l: "Autenticación", v: selectedIntegration.authMethod },
                    { l: "Rate limit", v: selectedIntegration.rateLimit || "—" },
                    { l: "Timeout", v: selectedIntegration.timeout ? `${selectedIntegration.timeout / 1000}s` : "—" },
                    { l: "Reintentos", v: String(selectedIntegration.retries ?? "—") },
                    { l: "Última sync", v: selectedIntegration.lastSync },
                  ].map(item => (
                    <div key={item.l} style={{ padding: "var(--px-3)", background: "var(--px-bg)" }}>
                      <div className="px-eyebrow">{item.l}</div>
                      <div className="truncate" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", color: "var(--px-text)", fontWeight: 500, marginTop: 1 }}>{item.v}</div>
                    </div>
                  ))}
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => { handleSync(selectedIntegration); setShowDetailDialog(false); }} className="px-btn px-btn-primary flex-1" style={{ minHeight: 40 }}><RefreshCw size={14} /> Sincronizar</button>
                  <button onClick={() => { handleToggleStatus(selectedIntegration.id); setShowDetailDialog(false); }} className="px-btn px-btn-secondary flex-1" style={{ minHeight: 40 }}>
                    {selectedIntegration.status === "active" ? <><XCircle size={14} /> Desactivar</> : <><CheckCircle size={14} /> Activar</>}
                  </button>
                  <button onClick={() => handleDeleteIntegration(selectedIntegration.id)} className="px-btn px-btn-danger" style={{ minHeight: 40 }}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ New Integration Dialog ═══ */}
      {showNewDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 px-overlay" role="dialog" aria-modal="true" aria-labelledby="new-integ-title" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto scrollbar-tactical px-card px-dialog-enter" style={{ padding: "var(--px-4)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 id="new-integ-title" style={{ fontFamily: "var(--px-display)", fontWeight: 700, fontSize: "var(--px-text-lg)", color: "var(--px-text)" }}>Nueva integración</h3>
              <button onClick={() => setShowNewDialog(false)} aria-label="Cerrar" style={{ color: "var(--px-text-faint)", background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--px-3)" }}>
              <div><label className="px-label">Nombre *</label><input value={newInteg.name} onChange={e => setNewInteg(p => ({ ...p, name: e.target.value }))} className="px-input" placeholder="Ej: Sistema de Denuncias" /></div>
              <div><label className="px-label">Endpoint *</label><input value={newInteg.endpoint} onChange={e => setNewInteg(p => ({ ...p, endpoint: e.target.value }))} className="px-input" placeholder="https://api.ejemplo.gob.mx/v1" /></div>
              <div><label className="px-label">Descripción</label><input value={newInteg.description} onChange={e => setNewInteg(p => ({ ...p, description: e.target.value }))} className="px-input" placeholder="Descripción de la integración" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="px-label">Tipo</label><select value={newInteg.type} onChange={e => setNewInteg(p => ({ ...p, type: e.target.value as Integration["type"] }))} className="px-input"><option value="REST">REST API</option><option value="SOAP">SOAP</option><option value="XML-RPC">XML-RPC</option><option value="WEBHOOK">Webhook</option><option value="SFTP">SFTP</option></select></div>
                <div><label className="px-label">Autenticación</label><select value={newInteg.authMethod} onChange={e => setNewInteg(p => ({ ...p, authMethod: e.target.value }))} className="px-input"><option value="NONE">Sin Auth</option><option value="BASIC">Basic</option><option value="API_KEY">API Key</option><option value="OAUTH2">OAuth 2.0</option><option value="CERTIFICATE">Certificado</option></select></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowNewDialog(false)} className="px-btn px-btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCreateIntegration} className="px-btn px-btn-primary flex-1"><Save size={14} /> Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ New Secret Dialog ═══ */}
      {showNewSecretDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 px-overlay" role="dialog" aria-modal="true" aria-labelledby="new-secret-title" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto scrollbar-tactical px-card px-dialog-enter" style={{ padding: "var(--px-4)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 id="new-secret-title" style={{ fontFamily: "var(--px-display)", fontWeight: 700, fontSize: "var(--px-text-lg)", color: "var(--px-text)" }}>Agregar secreto</h3>
              <button onClick={() => setShowNewSecretDialog(false)} aria-label="Cerrar" style={{ color: "var(--px-text-faint)", background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--px-3)" }}>
              <div><label className="px-label">Nombre del secreto *</label><input value={newSecret.name} onChange={e => setNewSecret(p => ({ ...p, name: e.target.value }))} className="px-input" placeholder="Ej: SESNSP_API_KEY_V2" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="px-label">Tipo</label><select value={newSecret.type} onChange={e => setNewSecret(p => ({ ...p, type: e.target.value }))} className="px-input"><option value="API_KEY">API Key</option><option value="OAUTH_TOKEN">OAuth Token</option><option value="BASIC_AUTH">Basic Auth</option><option value="CERTIFICATE">Certificado</option><option value="SSH_KEY">SSH Key</option></select></div>
                <div><label className="px-label">Integración</label><select value={newSecret.integration} onChange={e => setNewSecret(p => ({ ...p, integration: e.target.value }))} className="px-input"><option value="">General</option>{integrations.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}</select></div>
              </div>
              <div><label className="px-label">Valor del secreto *</label><input type="password" value={newSecret.value} onChange={e => setNewSecret(p => ({ ...p, value: e.target.value }))} className="px-input" placeholder="Ingrese el valor" /></div>
              <div><label className="px-label">Expiración (días)</label><input type="number" value={newSecret.expiresInDays} onChange={e => setNewSecret(p => ({ ...p, expiresInDays: e.target.value }))} className="px-input" placeholder="90" /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowNewSecretDialog(false)} className="px-btn px-btn-secondary flex-1">Cancelar</button>
              <button onClick={handleCreateSecret} className="px-btn px-btn-primary flex-1"><Lock size={14} /> Almacenar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
