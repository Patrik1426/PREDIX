/**
 * AdminTab — Administración de Usuarios, Roles, Permisos y Auditoría
 * Design: Command Center / Tactical Intelligence
 * FUNCIONAL: Nuevo usuario, editar permisos, duplicar roles, campo identificación
 */

import { useState, useMemo, useCallback } from "react";
import {
  Users, UserPlus, Shield, Activity, FileText, Settings,
  Search, Filter, Edit, Trash2, Lock, Unlock, Eye, EyeOff,
  CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown,
  ChevronRight, BarChart3, Calendar, Download, RefreshCw,
  UserCheck, UserX, ShieldCheck, ShieldAlert, KeyRound,
  Copy, MapPin, Radio, Navigation, X, Save, Plus
} from "lucide-react";
import { toast } from "sonner";
import { ModuleHeader, OriginBadge } from "@/components/dashboard";
import { trpc } from "@/lib/trpc";

/* ─── Types ─── */
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "active" | "inactive" | "suspended";
  lastLogin: string;
  loginCount: number;
  createdAt: string;
  modules: string[];
  identification?: {
    type: "patrulla" | "grupo_operativo" | "gps" | "red_celular";
    value: string;
    lat?: number;
    lng?: number;
    lastUpdate?: string;
  };
}

interface Role {
  id: number;
  name: string;
  description: string;
  level: string;
  userCount: number;
  permissions: Record<string, { read: boolean; write: boolean }>;
  color: string;
}

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  detail: string;
  ip: string;
  status: "success" | "failed" | "warning";
}

interface ModuleActivity {
  module: string;
  accesses: number;
  uniqueUsers: number;
  avgDuration: string;
  trend: number;
}

/* ─── All Modules ─── */
const ALL_MODULES = [
  "Mapa Geoespacial", "Alertas", "Incidentes", "Predicciones",
  "Tablero", "Mapa de Calor", "Chatbot IA", "Dashboard",
  "Integraciones", "Administración", "Reportes", "Exportación"
];

/* ─── Initial Demo Data ─── */
const INITIAL_USERS: User[] = [
  { id: 1, name: "Cmdte. Roberto Hernández", email: "r.hernandez@edomex.gob.mx", role: "Administrador", department: "Dirección General de Seguridad", status: "active", lastLogin: "17/04/2026 20:15", loginCount: 342, createdAt: "2025-01-15", modules: ["Todos"] },
  { id: 2, name: "Cap. María Elena Torres", email: "me.torres@edomex.gob.mx", role: "Supervisor", department: "C5 Estado de México", status: "active", lastLogin: "17/04/2026 19:48", loginCount: 287, createdAt: "2025-02-20", modules: ["Mapa Geoespacial", "Alertas", "Incidentes", "Tablero"] },
  { id: 3, name: "Lic. Carlos Mendoza", email: "c.mendoza@edomex.gob.mx", role: "Analista", department: "Unidad de Inteligencia", status: "active", lastLogin: "17/04/2026 18:30", loginCount: 198, createdAt: "2025-03-10", modules: ["Predicciones", "Mapa de Calor", "Tablero"] },
  { id: 4, name: "Ing. Patricia Ramírez", email: "p.ramirez@edomex.gob.mx", role: "Operador", department: "Centro de Monitoreo", status: "active", lastLogin: "17/04/2026 20:10", loginCount: 456, createdAt: "2025-01-20", modules: ["Mapa Geoespacial", "Alertas", "Incidentes"] },
  { id: 5, name: "Mtro. Jorge Sánchez", email: "j.sanchez@edomex.gob.mx", role: "Analista", department: "Prevención del Delito", status: "active", lastLogin: "17/04/2026 17:22", loginCount: 145, createdAt: "2025-04-05", modules: ["Predicciones", "Tablero", "Dashboard"] },
  { id: 6, name: "Lic. Ana García López", email: "a.garcia@edomex.gob.mx", role: "Consulta", department: "Fiscalía General", status: "inactive", lastLogin: "15/04/2026 10:15", loginCount: 67, createdAt: "2025-05-12", modules: ["Tablero", "Dashboard"] },
  { id: 7, name: "Cap. Fernando Díaz", email: "f.diaz@edomex.gob.mx", role: "Comandante", department: "Policía Estatal", status: "active", lastLogin: "17/04/2026 16:45", loginCount: 312, createdAt: "2025-02-01", modules: ["Mapa Geoespacial", "Alertas", "Incidentes", "Chatbot IA"], identification: { type: "grupo_operativo", value: "GRUPO ALFA-7", lat: 19.2933, lng: -99.6533, lastUpdate: "17/04/2026 20:18" } },
  { id: 8, name: "Ing. Luis Morales", email: "l.morales@edomex.gob.mx", role: "Operador", department: "TI - Infraestructura", status: "suspended", lastLogin: "10/04/2026 09:00", loginCount: 89, createdAt: "2025-06-15", modules: ["Integraciones"] },
  { id: 9, name: "Dra. Sofía Vargas", email: "s.vargas@edomex.gob.mx", role: "Analista", department: "Estadística Criminal", status: "active", lastLogin: "17/04/2026 19:55", loginCount: 234, createdAt: "2025-03-25", modules: ["Predicciones", "Mapa de Calor", "Dashboard"] },
  { id: 10, name: "Lic. Miguel Ángel Reyes", email: "ma.reyes@edomex.gob.mx", role: "Consulta", department: "Secretaría de Gobierno", status: "active", lastLogin: "17/04/2026 14:30", loginCount: 45, createdAt: "2025-07-01", modules: ["Dashboard", "Tablero"] },
  { id: 11, name: "Ofc. Pedro Martínez Luna", email: "p.martinez@edomex.gob.mx", role: "Policía", department: "Sector Ecatepec Norte", status: "active", lastLogin: "17/04/2026 20:20", loginCount: 78, createdAt: "2025-08-10", modules: ["Mapa Geoespacial", "Alertas"], identification: { type: "patrulla", value: "P-4521", lat: 19.6010, lng: -99.0500, lastUpdate: "17/04/2026 20:22" } },
  { id: 12, name: "Ofc. Laura Jiménez Ríos", email: "l.jimenez@edomex.gob.mx", role: "Policía", department: "Sector Naucalpan Centro", status: "active", lastLogin: "17/04/2026 20:18", loginCount: 56, createdAt: "2025-09-01", modules: ["Mapa Geoespacial", "Alertas"], identification: { type: "patrulla", value: "P-3287", lat: 19.4786, lng: -99.2394, lastUpdate: "17/04/2026 20:19" } },
  { id: 13, name: "Ofc. Ricardo Flores Vega", email: "r.flores@edomex.gob.mx", role: "Policía", department: "Sector Toluca Sur", status: "active", lastLogin: "17/04/2026 20:05", loginCount: 92, createdAt: "2025-07-20", modules: ["Mapa Geoespacial", "Alertas"], identification: { type: "gps", value: "GPS-TLK-0891", lat: 19.2826, lng: -99.6557, lastUpdate: "17/04/2026 20:21" } },
  { id: 14, name: "Cmdte. Alejandro Ruiz Ortiz", email: "a.ruiz@edomex.gob.mx", role: "Comandante", department: "Zona Oriente", status: "active", lastLogin: "17/04/2026 19:30", loginCount: 189, createdAt: "2025-03-15", modules: ["Mapa Geoespacial", "Alertas", "Incidentes", "Tablero"], identification: { type: "grupo_operativo", value: "GRUPO DELTA-3", lat: 19.3560, lng: -98.9820, lastUpdate: "17/04/2026 20:15" } },
];

const INITIAL_ROLES: Role[] = [
  { id: 1, name: "Administrador", description: "Acceso total al sistema. Gestión de usuarios, configuración y todos los módulos.", level: "admin", userCount: 1, permissions: Object.fromEntries(ALL_MODULES.map(m => [m, { read: true, write: true }])), color: "#FF3B3B" },
  { id: 2, name: "Supervisor", description: "Supervisión operativa. Acceso a módulos tácticos y gestión de operadores.", level: "supervisor", userCount: 2, permissions: { "Mapa Geoespacial": { read: true, write: true }, "Alertas": { read: true, write: true }, "Incidentes": { read: true, write: true }, "Tablero": { read: true, write: false }, "Chatbot IA": { read: true, write: false }, "Dashboard": { read: true, write: false }, "Predicciones": { read: false, write: false }, "Mapa de Calor": { read: false, write: false }, "Integraciones": { read: false, write: false }, "Administración": { read: false, write: false }, "Reportes": { read: true, write: false }, "Exportación": { read: true, write: false } }, color: "#FFB800" },
  { id: 3, name: "Analista", description: "Análisis de datos e inteligencia. Acceso a predicciones y estadísticas.", level: "analista", userCount: 3, permissions: { "Mapa Geoespacial": { read: true, write: false }, "Alertas": { read: true, write: false }, "Incidentes": { read: true, write: false }, "Predicciones": { read: true, write: true }, "Tablero": { read: true, write: false }, "Mapa de Calor": { read: true, write: true }, "Chatbot IA": { read: false, write: false }, "Dashboard": { read: true, write: false }, "Integraciones": { read: false, write: false }, "Administración": { read: false, write: false }, "Reportes": { read: true, write: true }, "Exportación": { read: true, write: false } }, color: "#00D4FF" },
  { id: 4, name: "Operador", description: "Operación en tiempo real. Monitoreo de mapa, alertas e incidentes.", level: "operador", userCount: 2, permissions: { "Mapa Geoespacial": { read: true, write: false }, "Alertas": { read: true, write: true }, "Incidentes": { read: true, write: true }, "Predicciones": { read: false, write: false }, "Tablero": { read: true, write: false }, "Mapa de Calor": { read: false, write: false }, "Chatbot IA": { read: false, write: false }, "Dashboard": { read: false, write: false }, "Integraciones": { read: true, write: false }, "Administración": { read: false, write: false }, "Reportes": { read: false, write: false }, "Exportación": { read: false, write: false } }, color: "#00FF88" },
  { id: 5, name: "Consulta", description: "Solo lectura. Acceso limitado a tableros y dashboards.", level: "consulta", userCount: 2, permissions: { "Mapa Geoespacial": { read: false, write: false }, "Alertas": { read: false, write: false }, "Incidentes": { read: false, write: false }, "Predicciones": { read: false, write: false }, "Tablero": { read: true, write: false }, "Mapa de Calor": { read: false, write: false }, "Chatbot IA": { read: false, write: false }, "Dashboard": { read: true, write: false }, "Integraciones": { read: false, write: false }, "Administración": { read: false, write: false }, "Reportes": { read: false, write: false }, "Exportación": { read: false, write: false } }, color: "var(--px-text-muted)" },
  { id: 6, name: "Policía", description: "Elemento policial en campo. Acceso a mapa y alertas. Georeferenciado por GPS/patrulla.", level: "policia", userCount: 3, permissions: { "Mapa Geoespacial": { read: true, write: false }, "Alertas": { read: true, write: true }, "Incidentes": { read: true, write: true }, "Predicciones": { read: false, write: false }, "Tablero": { read: false, write: false }, "Mapa de Calor": { read: false, write: false }, "Chatbot IA": { read: false, write: false }, "Dashboard": { read: false, write: false }, "Integraciones": { read: false, write: false }, "Administración": { read: false, write: false }, "Reportes": { read: false, write: false }, "Exportación": { read: false, write: false } }, color: "#4FC3F7" },
  { id: 7, name: "Comandante", description: "Comandante de zona/sector. Supervisión de elementos y operaciones tácticas.", level: "comandante", userCount: 2, permissions: { "Mapa Geoespacial": { read: true, write: true }, "Alertas": { read: true, write: true }, "Incidentes": { read: true, write: true }, "Predicciones": { read: true, write: false }, "Tablero": { read: true, write: false }, "Mapa de Calor": { read: true, write: false }, "Chatbot IA": { read: true, write: false }, "Dashboard": { read: true, write: false }, "Integraciones": { read: false, write: false }, "Administración": { read: false, write: false }, "Reportes": { read: true, write: false }, "Exportación": { read: true, write: false } }, color: "#AB47BC" },
];

const DEMO_AUDIT_LOGS: AuditLog[] = [
  { id: 1, timestamp: "17/04/2026 20:15:32", user: "Cmdte. Roberto Hernández", action: "LOGIN", module: "Sistema", detail: "Inicio de sesión exitoso", ip: "10.0.1.45", status: "success" },
  { id: 2, timestamp: "17/04/2026 20:12:18", user: "Cap. María Elena Torres", action: "VIEW_MAP", module: "Mapa Geoespacial", detail: "Consulta de mapa con capas activas", ip: "10.0.1.102", status: "success" },
  { id: 3, timestamp: "17/04/2026 20:08:45", user: "Lic. Carlos Mendoza", action: "EXPORT_REPORT", module: "Dashboard", detail: "Exportación de reporte ejecutivo PDF", ip: "10.0.2.33", status: "success" },
  { id: 4, timestamp: "17/04/2026 19:55:10", user: "Ing. Luis Morales", action: "ACCESS_DENIED", module: "Integraciones", detail: "Intento de acceso con cuenta suspendida", ip: "10.0.3.78", status: "failed" },
  { id: 5, timestamp: "17/04/2026 19:42:30", user: "Ing. Patricia Ramírez", action: "CREATE_ALERT", module: "Alertas", detail: "Nueva alerta: Robo a transporte en Ecatepec", ip: "10.0.1.88", status: "success" },
  { id: 6, timestamp: "17/04/2026 19:30:00", user: "Dra. Sofía Vargas", action: "RUN_PREDICTION", module: "Predicciones", detail: "Modelo predictivo ejecutado para Q2 2026", ip: "10.0.2.55", status: "success" },
  { id: 7, timestamp: "17/04/2026 19:15:22", user: "Cap. Fernando Díaz", action: "UPDATE_INCIDENT", module: "Incidentes", detail: "Actualización de estado: INC-2026-0447", ip: "10.0.1.67", status: "success" },
  { id: 8, timestamp: "17/04/2026 18:58:11", user: "Lic. Ana García López", action: "LOGIN_FAILED", module: "Sistema", detail: "Contraseña incorrecta (intento 2/5)", ip: "10.0.3.12", status: "warning" },
  { id: 9, timestamp: "17/04/2026 18:45:00", user: "Mtro. Jorge Sánchez", action: "VIEW_DASHBOARD", module: "Dashboard Ejecutivo", detail: "Consulta de KPIs mensuales", ip: "10.0.2.44", status: "success" },
  { id: 10, timestamp: "17/04/2026 18:30:15", user: "Cmdte. Roberto Hernández", action: "MODIFY_USER", module: "Administración", detail: "Suspensión de usuario: l.morales@edomex.gob.mx", ip: "10.0.1.45", status: "success" },
  { id: 11, timestamp: "17/04/2026 18:15:00", user: "Sistema", action: "AUTO_BACKUP", module: "Sistema", detail: "Respaldo automático de base de datos completado", ip: "127.0.0.1", status: "success" },
  { id: 12, timestamp: "17/04/2026 17:58:30", user: "Lic. Miguel Ángel Reyes", action: "VIEW_REPORT", module: "Tablero", detail: "Consulta de estadísticas mensuales", ip: "10.0.4.22", status: "success" },
];

const MODULE_ACTIVITY: ModuleActivity[] = [
  { module: "Mapa Geoespacial", accesses: 1247, uniqueUsers: 6, avgDuration: "12:34", trend: 15.2 },
  { module: "Alertas", accesses: 856, uniqueUsers: 5, avgDuration: "08:15", trend: 8.7 },
  { module: "Incidentes", accesses: 723, uniqueUsers: 4, avgDuration: "15:42", trend: -3.2 },
  { module: "Modelo Predictivo", accesses: 445, uniqueUsers: 3, avgDuration: "22:18", trend: 25.6 },
  { module: "Tablero Avanzado", accesses: 1089, uniqueUsers: 8, avgDuration: "06:45", trend: 12.1 },
  { module: "Mapa de Calor", accesses: 367, uniqueUsers: 3, avgDuration: "09:30", trend: 18.4 },
  { module: "Asistente IA", accesses: 234, uniqueUsers: 4, avgDuration: "04:12", trend: 42.3 },
  { module: "Dashboard Ejecutivo", accesses: 567, uniqueUsers: 7, avgDuration: "10:55", trend: 20.8 },
  { module: "Integraciones", accesses: 89, uniqueUsers: 2, avgDuration: "18:22", trend: 5.1 },
];

/* ─── Mapeo etiqueta ↔ slug institucional (BD) ─── */
const ROLE_LABEL_TO_SLUG: Record<string, string> = {
  Administrador: "admin", Supervisor: "supervisor", Analista: "analista",
  Operador: "operador", Consulta: "consulta", Policía: "policia", Comandante: "comandante",
};
const ROLE_SLUG_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_LABEL_TO_SLUG).map(([label, slug]) => [slug, label])
);

/* ─── Sub-tabs ─── */
type SubTab = "usuarios" | "roles" | "auditoria" | "actividad";

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: "usuarios", label: "Usuarios", icon: <Users size={14} /> },
  { id: "roles", label: "Roles y Permisos", icon: <Shield size={14} /> },
  { id: "auditoria", label: "Auditoría", icon: <Activity size={14} /> },
  { id: "actividad", label: "Reportes de Actividad", icon: <BarChart3 size={14} /> },
];

/* ─── Helpers ─── */
const statusColor = (s: string) => {
  switch (s) {
    case "active": case "success": return "var(--px-ok)";
    case "inactive": return "var(--px-text-muted)";
    case "suspended": case "failed": return "var(--px-crit)";
    case "warning": return "var(--px-warn)";
    default: return "var(--px-text-muted)";
  }
};

const statusLabel = (s: string) => {
  switch (s) {
    case "active": return "ACTIVO";
    case "inactive": return "INACTIVO";
    case "suspended": return "SUSPENDIDO";
    case "success": return "EXITOSO";
    case "failed": return "FALLIDO";
    case "warning": return "ADVERTENCIA";
    default: return s.toUpperCase();
  }
};

const idTypeLabel = (t: string) => {
  switch (t) {
    case "patrulla": return "PATRULLA";
    case "grupo_operativo": return "GRUPO OPERATIVO";
    case "gps": return "RASTREO GPS";
    case "red_celular": return "RED CELULAR";
    default: return t.toUpperCase();
  }
};

/* ─── Card Wrapper ─── */
function TacticalCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`px-card rounded ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ─── Main Component ─── */
export default function AdminTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("usuarios");
  const [searchQuery, setSearchQuery] = useState("");

  // BD: usuarios reales con fallback a datos demo
  const { data: dbUsers, refetch: refetchUsers } = trpc.usuarios.listar.useQuery();
  const esReal = dbUsers?.origen === "real" && (dbUsers?.data?.length ?? 0) > 0;
  const users: User[] = useMemo(() => {
    if (esReal && dbUsers) {
      return dbUsers.data.map(u => ({
        id: u.id,
        name: u.name || u.email || "Sin nombre",
        email: u.email || "",
        role: ROLE_SLUG_TO_LABEL[u.institutionalRole] || u.institutionalRole,
        department: u.department || "",
        status: u.status,
        lastLogin: u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString("es-MX") : "—",
        loginCount: 0,
        createdAt: new Date(u.createdAt).toISOString().split("T")[0],
        modules: ["Dashboard"],
      }));
    }
    return INITIAL_USERS;
  }, [dbUsers, esReal]);

  const crearUsuarioMut = trpc.usuarios.crear.useMutation({ onSuccess: () => refetchUsers() });
  const actualizarUsuarioMut = trpc.usuarios.actualizar.useMutation({ onSuccess: () => refetchUsers() });
  const eliminarUsuarioMut = trpc.usuarios.eliminar.useMutation({ onSuccess: () => refetchUsers() });

  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(DEMO_AUDIT_LOGS);
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>("all");

  // Dialog states
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showEditPermissionsDialog, setShowEditPermissionsDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // New user form
  const [newUser, setNewUser] = useState({
    name: "", email: "", department: "", cargo: "", role: "Operador", status: "active" as "active" | "inactive",
    modules: [] as string[],
    idType: "patrulla" as "patrulla" | "grupo_operativo" | "gps" | "red_celular",
    idValue: "", lat: "", lng: "",
  });

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === "active").length;
    const inactiveUsers = users.filter(u => u.status === "inactive").length;
    const suspendedUsers = users.filter(u => u.status === "suspended").length;
    const totalLogins = users.reduce((sum, u) => sum + u.loginCount, 0);
    const todayActions = auditLogs.length;
    return { totalUsers, activeUsers, inactiveUsers, suspendedUsers, totalLogins, todayActions };
  }, [users, auditLogs]);

  /* ─── Filtered users ─── */
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) || u.department.toLowerCase().includes(q)
    );
  }, [searchQuery, users]);

  /* ─── Filtered audit ─── */
  const filteredAudit = useMemo(() => {
    if (auditFilter === "all") return auditLogs;
    return auditLogs.filter(a => a.status === auditFilter);
  }, [auditFilter, auditLogs]);

  /* ─── Add audit log ─── */
  const addAuditLog = useCallback((action: string, module: string, detail: string, status: "success" | "failed" | "warning" = "success") => {
    const now = new Date();
    const ts = `${now.toLocaleDateString("es-MX")} ${now.toLocaleTimeString("es-MX")}`;
    setAuditLogs(prev => [{ id: prev.length + 1, timestamp: ts, user: "Cmdte. Roberto Hernández", action, module, detail, ip: "10.0.1.45", status }, ...prev]);
  }, []);

  /* ─── Create User ─── */
  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email) { toast.error("Nombre y correo son obligatorios"); return; }
    const needsId = newUser.role === "Policía" || newUser.role === "Comandante";
    if (needsId && !newUser.idValue) { toast.error("El campo de identificación es obligatorio para este rol"); return; }

    crearUsuarioMut.mutate({
      name: newUser.name,
      email: newUser.email,
      institutionalRole: (ROLE_LABEL_TO_SLUG[newUser.role] || "operador") as any,
      department: newUser.department,
    });
    setRoles(prev => prev.map(r => r.name === newUser.role ? { ...r, userCount: r.userCount + 1 } : r));
    addAuditLog("CREATE_USER", "Administración", `Nuevo usuario creado: ${newUser.name} (${newUser.role})`);
    toast.success(`Usuario "${newUser.name}" registrado exitosamente`);
    setShowNewUserDialog(false);
    setNewUser({ name: "", email: "", department: "", cargo: "", role: "Operador", status: "active", modules: [], idType: "patrulla", idValue: "", lat: "", lng: "" });
  };

  /* ─── Toggle User Status ─── */
  const toggleUserStatus = (user: User) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    actualizarUsuarioMut.mutate({ id: user.id, status: newStatus });
    addAuditLog("MODIFY_USER", "Administración", `${newStatus === "suspended" ? "Suspensión" : "Activación"} de usuario: ${user.email}`);
    toast.success(`Usuario ${user.name} ${newStatus === "suspended" ? "suspendido" : "activado"}`);
  };

  /* ─── Delete User ─── */
  const handleDeleteUser = () => {
    if (!deleteTarget) return;
    eliminarUsuarioMut.mutate({ id: deleteTarget.id });
    setRoles(prev => prev.map(r => r.name === deleteTarget.role ? { ...r, userCount: Math.max(0, r.userCount - 1) } : r));
    addAuditLog("DELETE_USER", "Administración", `Usuario eliminado: ${deleteTarget.email}`);
    toast.success(`Usuario "${deleteTarget.name}" eliminado`);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  /* ─── Edit User ─── */
  const handleEditUser = () => {
    if (!editingUser) return;
    actualizarUsuarioMut.mutate({
      id: editingUser.id,
      name: editingUser.name,
      department: editingUser.department,
      institutionalRole: (ROLE_LABEL_TO_SLUG[editingUser.role] || "operador") as any,
      status: editingUser.status,
    });
    addAuditLog("MODIFY_USER", "Administración", `Usuario editado: ${editingUser.email}`);
    toast.success(`Usuario "${editingUser.name}" actualizado`);
    setShowEditUserDialog(false);
    setEditingUser(null);
  };

  /* ─── Duplicate Role ─── */
  const handleDuplicateRole = (role: Role) => {
    const newRole: Role = {
      ...role,
      id: roles.length + 1,
      name: `${role.name} (Copia)`,
      userCount: 0,
      permissions: { ...role.permissions },
    };
    setRoles(prev => [...prev, newRole]);
    addAuditLog("CREATE_ROLE", "Administración", `Rol duplicado: ${role.name} → ${newRole.name}`);
    toast.success(`Rol "${role.name}" duplicado como "${newRole.name}"`);
  };

  /* ─── Save Permissions ─── */
  const handleSavePermissions = () => {
    if (!editingRole) return;
    setRoles(prev => prev.map(r => r.id === editingRole.id ? editingRole : r));
    addAuditLog("MODIFY_PERMISSIONS", "Administración", `Permisos actualizados para rol: ${editingRole.name}`);
    toast.success(`Permisos del rol "${editingRole.name}" actualizados`);
    setShowEditPermissionsDialog(false);
    setEditingRole(null);
  };

  /* ─── Toggle Module ─── */
  const toggleModule = (mod: string) => {
    setNewUser(prev => ({
      ...prev,
      modules: prev.modules.includes(mod) ? prev.modules.filter(m => m !== mod) : [...prev.modules, mod]
    }));
  };

  const needsIdentification = newUser.role === "Policía" || newUser.role === "Comandante";

  const inputStyle = { background: "var(--px-surface)", border: "1px solid var(--px-hairline)", color: "var(--px-text)", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", outline: "none" };
  const labelStyle = { fontFamily: "var(--px-mono)" as const, fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)", letterSpacing: "0.08em" };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "var(--px-display)", background: "var(--px-bg)", padding: "var(--px-3)", gap: "var(--px-3)" }}>
      {/* ─── Toolbar ─── */}
      <div className="px-card flex items-center gap-2 flex-wrap" style={{ padding: "var(--px-2) var(--px-4)", flexShrink: 0 }}>
        <Shield size={13} style={{ color: "var(--px-brand)" }} />
        <span style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-sm)", fontWeight: 700, color: "var(--px-text)" }}>ADMINISTRACIÓN</span>
        <OriginBadge real={esReal} />
        <div className="hidden sm:flex items-center gap-3 ml-2">
          <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-ok)" }}><span style={{ fontWeight: 700 }}>{stats.activeUsers}</span> activos</span>
          <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>{stats.todayActions} acciones hoy</span>
        </div>
        <button onClick={() => setShowNewUserDialog(true)} className="ml-auto px-btn px-btn-primary" style={{ padding: "4px 10px", fontSize: "var(--px-text-xs)" }}>
          <UserPlus size={12} /> Nuevo
        </button>
      </div>

      {/* ─── Sub-tabs ─── */}
      <div className="px-card flex overflow-x-auto" role="tablist" aria-label="Secciones de administración" style={{ flexShrink: 0 }}>
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} role="tab" aria-selected={activeSubTab === tab.id} aria-controls={`panel-${tab.id}`} id={`tab-${tab.id}`} className="flex items-center transition-all whitespace-nowrap flex-1 justify-center" style={{ gap: "var(--px-1)", padding: "var(--px-3)", fontWeight: activeSubTab === tab.id ? 600 : 400, fontSize: "var(--px-text-xs)", color: activeSubTab === tab.id ? "var(--px-brand)" : "var(--px-text-faint)", borderBottom: activeSubTab === tab.id ? "2px solid var(--px-brand)" : "2px solid transparent", background: "none", border: "none", borderBottomStyle: "solid", cursor: "pointer", minHeight: 40 }}>
            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div className="px-card flex-1 overflow-y-auto scrollbar-tactical" role="tabpanel" id={`panel-${activeSubTab}`} aria-labelledby={`tab-${activeSubTab}`} style={{ padding: "var(--px-4)" }}>

        {/* ═══ USUARIOS ═══ */}
        {activeSubTab === "usuarios" && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6" style={{ gap: "var(--px-3)" }}>
              {[
                { label: "TOTAL USUARIOS", value: stats.totalUsers, color: "var(--px-brand)", icon: <Users size={16} /> },
                { label: "ACTIVOS", value: stats.activeUsers, color: "var(--px-ok)", icon: <UserCheck size={16} /> },
                { label: "INACTIVOS", value: stats.inactiveUsers, color: "var(--px-text-muted)", icon: <UserX size={16} /> },
                { label: "SUSPENDIDOS", value: stats.suspendedUsers, color: "var(--px-crit)", icon: <ShieldAlert size={16} /> },
                { label: "ROLES DEFINIDOS", value: roles.length, color: "var(--px-warn)", icon: <Shield size={16} /> },
                { label: "LOGINS TOTALES", value: stats.totalLogins.toLocaleString(), color: "var(--px-brand)", icon: <KeyRound size={16} /> },
              ].map((kpi, i) => (
                <TacticalCard key={i} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: kpi.color }}>{kpi.icon}</span>
                    <span className="px-eyebrow">{kpi.label}</span>
                  </div>
                  <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-lg)", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                </TacticalCard>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center" style={{ gap: "var(--px-3)" }}>
              <div className="flex-1 relative">
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--px-text-muted)" }} />
                <input type="text" placeholder="Buscar usuario por nombre, email, rol o departamento..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Buscar usuarios" className="w-full pl-8 pr-3 py-2 rounded" style={{ ...inputStyle }} />
              </div>
            </div>

            {/* Users Table */}
            <TacticalCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", minWidth: 800 }}>
                  <thead>
                    <tr style={{ background: "color-mix(in srgb, var(--px-brand) 4%, transparent)" }}>
                      {["USUARIO", "ROL", "DEPARTAMENTO", "ESTADO", "IDENTIFICACION", "ULTIMO ACCESO", "ACCIONES"].map(h => (
                        <th key={h} scope="col" className="px-3 py-2 text-left" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => {
                      const roleData = roles.find(r => r.name === user.role);
                      return (
                        <tr key={user.id} style={{ borderBottom: "1px solid var(--px-hairline)" }}>
                          <td className="px-3 py-2.5">
                            <div>
                              <div style={{ color: "var(--px-text)", fontWeight: 600, fontSize: "var(--px-text-sm)" }}>{user.name}</div>
                              <div style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)" }}>{user.email}</div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded" style={{ background: `${roleData?.color || "var(--px-text-muted)"}20`, color: roleData?.color || "var(--px-text-muted)", fontSize: "var(--px-text-xs)", fontWeight: 600 }}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5" style={{ color: "var(--px-text)", fontSize: "var(--px-text-xs)" }}>{user.department}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded" style={{ background: `${statusColor(user.status)}15`, color: statusColor(user.status), fontSize: "var(--px-text-xs)", fontWeight: 600 }}>
                              {statusLabel(user.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {user.identification ? (
                              <div className="flex items-center gap-1">
                                <MapPin size={10} style={{ color: "var(--px-ok)" }} aria-hidden="true" />
                                <span style={{ color: "var(--px-ok)", fontSize: "var(--px-text-xs)", fontWeight: 600 }}>{user.identification.value}</span>
                              </div>
                            ) : (
                              <span style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)" }}>—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)" }}>{user.lastLogin}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingUser({ ...user }); setShowEditUserDialog(true); }} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 8%, transparent)" }} title="Editar" aria-label={`Editar usuario ${user.name}`}><Edit size={11} style={{ color: "var(--px-brand)" }} /></button>
                              <button onClick={() => toggleUserStatus(user)} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 8%, transparent)" }} title={user.status === "active" ? "Suspender" : "Activar"} aria-label={user.status === "active" ? `Suspender usuario ${user.name}` : `Activar usuario ${user.name}`}>
                                {user.status === "active" ? <Lock size={11} style={{ color: "var(--px-warn)" }} /> : <Unlock size={11} style={{ color: "var(--px-ok)" }} />}
                              </button>
                              <button onClick={() => { setDeleteTarget(user); setShowDeleteConfirm(true); }} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-crit) 8%, transparent)" }} title="Eliminar" aria-label={`Eliminar usuario ${user.name}`}><Trash2 size={11} style={{ color: "var(--px-crit)" }} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TacticalCard>
          </div>
        )}

        {/* ═══ ROLES Y PERMISOS ═══ */}
        {activeSubTab === "roles" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1" style={{ gap: "var(--px-3)" }}>
              {roles.map(role => (
                <TacticalCard key={role.id} className="overflow-hidden">
                  <button onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)} className="w-full flex items-center justify-between" aria-expanded={expandedRole === role.id} aria-controls={`role-details-${role.id}`} style={{ padding: "var(--px-3) var(--px-4)", borderBottom: expandedRole === role.id ? "1px solid var(--px-hairline)" : "none" }}>
                    <div className="flex items-center" style={{ gap: "var(--px-4)" }}>
                      <div className="flex items-center justify-center w-10 h-10 rounded" style={{ background: `${role.color}15`, border: `1px solid ${role.color}30` }}>
                        <ShieldCheck size={18} style={{ color: role.color }} />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span style={{ fontWeight: 600, fontSize: "var(--px-text-md)", color: "var(--px-text)" }}>{role.name}</span>
                          <span className="px-2 py-0.5 rounded" style={{ background: `${role.color}20`, color: role.color, fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", fontWeight: 600 }}>
                            NIVEL: {role.level.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)" }}>{role.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center" style={{ gap: "var(--px-4)" }}>
                      <div className="text-right">
                        <div className="px-eyebrow">USUARIOS</div>
                        <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-lg)", fontWeight: 700, color: role.color }}>{role.userCount}</div>
                      </div>
                      <div className="text-right">
                        <div className="px-eyebrow">PERMISOS</div>
                        <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-lg)", fontWeight: 700, color: "var(--px-brand)" }}>
                          {Object.values(role.permissions).filter(p => p.read || p.write).length}
                        </div>
                      </div>
                      {expandedRole === role.id ? <ChevronDown size={16} style={{ color: "var(--px-text-muted)" }} /> : <ChevronRight size={16} style={{ color: "var(--px-text-muted)" }} />}
                    </div>
                  </button>

                  {expandedRole === role.id && (
                    <div id={`role-details-${role.id}`} style={{ padding: "var(--px-3) var(--px-4)" }}>
                      <div className="px-eyebrow" style={{ marginBottom: "var(--px-2)" }}>
                        PERMISOS ASIGNADOS
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {ALL_MODULES.map(mod => {
                          const perm = role.permissions[mod] || { read: false, write: false };
                          return (
                            <div key={mod} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: "var(--px-surface)", border: `1px solid ${perm.read ? "color-mix(in srgb, var(--px-ok) 15%, transparent)" : "color-mix(in srgb, var(--px-crit) 10%, transparent)"}` }}>
                              <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: perm.read ? "var(--px-text)" : "var(--px-text-muted)" }}>{mod}</span>
                              <div className="flex gap-1">
                                <span className="px-1.5 py-0.5 rounded" style={{ background: perm.read ? "color-mix(in srgb, var(--px-ok) 15%, transparent)" : "color-mix(in srgb, var(--px-crit) 10%, transparent)", color: perm.read ? "var(--px-ok)" : "var(--px-crit)", fontSize: "var(--px-text-xs)", fontWeight: 600 }}>
                                  {perm.read ? "R" : "—"}
                                </span>
                                <span className="px-1.5 py-0.5 rounded" style={{ background: perm.write ? "color-mix(in srgb, var(--px-brand) 15%, transparent)" : "color-mix(in srgb, var(--px-crit) 10%, transparent)", color: perm.write ? "var(--px-brand)" : "var(--px-crit)", fontSize: "var(--px-text-xs)", fontWeight: 600 }}>
                                  {perm.write ? "W" : "—"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setEditingRole({ ...role, permissions: { ...role.permissions } }); setShowEditPermissionsDialog(true); }} className="flex items-center gap-1 px-3 py-1.5 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 20%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}>
                          <Edit size={12} /> EDITAR PERMISOS
                        </button>
                        <button onClick={() => handleDuplicateRole(role)} className="flex items-center gap-1 px-3 py-1.5 rounded" style={{ border: "1px solid var(--px-hairline)", color: "var(--px-text-muted)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}>
                          <Copy size={12} /> DUPLICAR ROL
                        </button>
                      </div>
                    </div>
                  )}
                </TacticalCard>
              ))}
            </div>
          </div>
        )}

        {/* ═══ AUDITORÍA ═══ */}
        {activeSubTab === "auditoria" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar registros de auditoria">
              {[{ id: "all", label: "Todos" }, { id: "success", label: "Exitosos" }, { id: "failed", label: "Fallidos" }, { id: "warning", label: "Advertencias" }].map(f => (
                <button key={f.id} onClick={() => setAuditFilter(f.id)} className="px-3 py-1.5 rounded" style={{ background: auditFilter === f.id ? "color-mix(in srgb, var(--px-brand) 15%, transparent)" : "transparent", border: `1px solid ${auditFilter === f.id ? "color-mix(in srgb, var(--px-brand) 40%, transparent)" : "var(--px-hairline)"}`, color: auditFilter === f.id ? "var(--px-brand)" : "var(--px-text-muted)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}>
                  {f.label}
                </button>
              ))}
              <div className="ml-auto">
                <button onClick={() => { const csv = ["Timestamp,Usuario,Acción,Módulo,Detalle,IP,Estado", ...auditLogs.map(l => `${l.timestamp},${l.user},${l.action},${l.module},${l.detail},${l.ip},${l.status}`)].join("\n"); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "auditoria_predix.csv"; a.click(); URL.revokeObjectURL(url); toast.success("Logs de auditoría exportados"); }} className="flex items-center gap-1 px-3 py-1.5 rounded" aria-label="Exportar registros de auditoria a CSV" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 20%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-sm)", fontWeight: 600 }}>
                  <Download size={12} /> EXPORTAR
                </button>
              </div>
            </div>
            <TacticalCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", minWidth: 800 }}>
                  <thead>
                    <tr style={{ background: "color-mix(in srgb, var(--px-brand) 4%, transparent)" }}>
                      {["TIMESTAMP", "USUARIO", "ACCION", "MODULO", "DETALLE", "IP", "ESTADO"].map(h => (
                        <th key={h} scope="col" className="px-3 py-2 text-left" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.map(log => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--px-hairline)" }}>
                        <td className="px-3 py-2.5" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)" }}>{log.timestamp}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--px-text)" }}>{log.user}</td>
                        <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-xs)" }}>{log.action}</span></td>
                        <td className="px-3 py-2.5" style={{ color: "var(--px-text)", fontSize: "var(--px-text-xs)" }}>{log.module}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.detail}</td>
                        <td className="px-3 py-2.5" style={{ color: "var(--px-text-muted)" }}>{log.ip}</td>
                        <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded" style={{ background: `${statusColor(log.status)}15`, color: statusColor(log.status), fontSize: "var(--px-text-xs)", fontWeight: 600 }}>{statusLabel(log.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TacticalCard>
          </div>
        )}

        {/* ═══ REPORTES DE ACTIVIDAD ═══ */}
        {activeSubTab === "actividad" && (
          <div className="space-y-4">
            <TacticalCard className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="px-section-title">ACTIVIDAD POR MODULO</span>
                <div className="flex items-center gap-2">
                  <Calendar size={12} style={{ color: "var(--px-text-muted)" }} />
                  <span className="px-eyebrow">ULTIMAS 24 HORAS</span>
                </div>
              </div>
              <div className="space-y-2">
                {MODULE_ACTIVITY.sort((a, b) => b.accesses - a.accesses).map((mod, i) => {
                  const maxAccesses = Math.max(...MODULE_ACTIVITY.map(m => m.accesses));
                  const barWidth = (mod.accesses / maxAccesses) * 100;
                  return (
                    <div key={i} className="flex items-center" style={{ gap: "var(--px-3)" }}>
                      <div style={{ width: 160, fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text)", flexShrink: 0 }}>{mod.module}</div>
                      <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: "var(--px-surface)" }}>
                        <div className="h-full rounded flex items-center px-2" style={{ width: `${barWidth}%`, background: "linear-gradient(90deg, color-mix(in srgb, var(--px-brand) 30%, transparent), color-mix(in srgb, var(--px-brand) 15%, transparent))", border: "1px solid color-mix(in srgb, var(--px-brand) 20%, transparent)", transition: "width 0.5s ease" }}>
                          <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-brand)", fontWeight: 700 }}>{mod.accesses.toLocaleString()}</span>
                        </div>
                      </div>
                      <div style={{ width: 60, textAlign: "right" }}><span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)" }}>{mod.uniqueUsers} usr</span></div>
                      <div style={{ width: 60, textAlign: "right" }}><span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)" }}>{mod.avgDuration}</span></div>
                      <div style={{ width: 60, textAlign: "right" }}><span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: mod.trend > 0 ? "var(--px-ok)" : "var(--px-crit)", fontWeight: 600 }}>{mod.trend > 0 ? "+" : ""}{mod.trend}%</span></div>
                    </div>
                  );
                })}
              </div>
            </TacticalCard>

            <TacticalCard className="p-4">
              <span className="px-section-title" style={{ display: "block", marginBottom: "var(--px-3)" }}>USUARIOS MAS ACTIVOS</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" style={{ gap: "var(--px-3)" }}>
                {[...users].sort((a, b) => b.loginCount - a.loginCount).slice(0, 5).map((user, i) => {
                  const roleData = roles.find(r => r.name === user.role);
                  return (
                    <TacticalCard key={user.id} className="p-3 text-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-2" style={{ background: `${roleData?.color || "#00D4FF"}15`, border: `1px solid ${roleData?.color || "#00D4FF"}30` }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--px-text-md)", color: roleData?.color || "var(--px-brand)" }}>#{i + 1}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "var(--px-text-sm)", color: "var(--px-text)" }}>{user.name.split(" ").slice(0, 2).join(" ")}</div>
                      <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)" }}>{user.role}</div>
                      <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-md)", fontWeight: 700, color: "var(--px-brand)", marginTop: "var(--px-1)" }}>{user.loginCount}</div>
                      <div className="px-eyebrow">SESIONES</div>
                    </TacticalCard>
                  );
                })}
              </div>
            </TacticalCard>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DIALOGS */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* ─── New User Dialog ─── */}
      {showNewUserDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-overlay" style={{ background: "rgba(0,0,0,0.7)" }} role="dialog" aria-modal="true" aria-labelledby="new-user-dialog-title">
          <TacticalCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 px-dialog-enter" style={{ padding: "var(--px-5)" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--px-4)" }}>
              <h3 id="new-user-dialog-title" style={{ fontWeight: 700, fontSize: "var(--px-text-lg)", color: "var(--px-brand)" }}>REGISTRAR NUEVO USUARIO</h3>
              <button onClick={() => setShowNewUserDialog(false)} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-crit) 10%, transparent)" }} aria-label="Cerrar"><X size={16} style={{ color: "var(--px-crit)" }} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--px-3)" }}>
              <div>
                <label className="px-label">NOMBRE COMPLETO *</label>
                <input value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} className="px-input mt-1" placeholder="Ej: Cap. Juan Pérez" />
              </div>
              <div>
                <label className="px-label">CORREO INSTITUCIONAL *</label>
                <input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} className="px-input mt-1" placeholder="usuario@edomex.gob.mx" />
              </div>
              <div>
                <label className="px-label">DEPARTAMENTO</label>
                <input value={newUser.department} onChange={e => setNewUser(p => ({ ...p, department: e.target.value }))} className="px-input mt-1" placeholder="Ej: C5 Estado de México" />
              </div>
              <div>
                <label className="px-label">CARGO</label>
                <input value={newUser.cargo} onChange={e => setNewUser(p => ({ ...p, cargo: e.target.value }))} className="px-input mt-1" placeholder="Ej: Jefe de Monitoreo" />
              </div>
              <div>
                <label className="px-label">ROL *</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))} className="px-input mt-1">
                  {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="px-label">ESTADO INICIAL</label>
                <select value={newUser.status} onChange={e => setNewUser(p => ({ ...p, status: e.target.value as "active" | "inactive" }))} className="px-input mt-1">
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            {/* ─── Identification Section (Policía/Comandante) ─── */}
            {needsIdentification && (
              <div className="rounded" style={{ marginTop: "var(--px-4)", padding: "var(--px-3)", background: "color-mix(in srgb, var(--px-brand) 5%, transparent)", border: "1px solid var(--px-hairline)" }}>
                <div className="flex items-center gap-2" style={{ marginBottom: "var(--px-3)" }}>
                  <Navigation size={14} style={{ color: "var(--px-brand)" }} />
                  <span style={{ ...labelStyle, color: "var(--px-brand)", fontSize: "var(--px-text-sm)" }}>IDENTIFICACION Y RASTREO</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--px-3)" }}>
                  <div>
                    <label className="px-label">TIPO DE IDENTIFICACION *</label>
                    <select value={newUser.idType} onChange={e => setNewUser(p => ({ ...p, idType: e.target.value as any }))} className="px-input mt-1">
                      <option value="patrulla">Patrulla Asignada</option>
                      <option value="grupo_operativo">Grupo Operativo</option>
                      <option value="gps">Rastreo GPS</option>
                      <option value="red_celular">Red Celular</option>
                    </select>
                  </div>
                  <div>
                    <label className="px-label">VALOR / IDENTIFICADOR *</label>
                    <input value={newUser.idValue} onChange={e => setNewUser(p => ({ ...p, idValue: e.target.value }))} className="px-input mt-1" placeholder={newUser.idType === "patrulla" ? "Ej: P-4521" : newUser.idType === "grupo_operativo" ? "Ej: GRUPO ALFA-7" : newUser.idType === "gps" ? "Ej: GPS-TLK-0891" : "Ej: CEL-5512345678"} />
                  </div>
                  <div>
                    <label className="px-label">LATITUD (OPCIONAL)</label>
                    <input value={newUser.lat} onChange={e => setNewUser(p => ({ ...p, lat: e.target.value }))} className="px-input mt-1" placeholder="Ej: 19.2933" />
                  </div>
                  <div>
                    <label className="px-label">LONGITUD (OPCIONAL)</label>
                    <input value={newUser.lng} onChange={e => setNewUser(p => ({ ...p, lng: e.target.value }))} className="px-input mt-1" placeholder="Ej: -99.6533" />
                  </div>
                </div>
                <p style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)", marginTop: "var(--px-2)" }}>
                  La georeferencia del elemento será visible en el Mapa Geoespacial en tiempo real.
                </p>
              </div>
            )}

            {/* Modules */}
            <div style={{ marginTop: "var(--px-3)" }}>
              <label className="px-label">MODULOS AUTORIZADOS</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-1">
                {ALL_MODULES.map(mod => (
                  <label key={mod} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer" style={{ background: newUser.modules.includes(mod) ? "color-mix(in srgb, var(--px-brand) 12%, transparent)" : "var(--px-surface)", border: `1px solid ${newUser.modules.includes(mod) ? "color-mix(in srgb, var(--px-brand) 30%, transparent)" : "var(--px-hairline)"}` }}>
                    <input type="checkbox" checked={newUser.modules.includes(mod)} onChange={() => toggleModule(mod)} className="accent-cyan-500" />
                    <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: newUser.modules.includes(mod) ? "var(--px-brand)" : "var(--px-text)" }}>{mod}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2" style={{ marginTop: "var(--px-5)" }}>
              <button onClick={() => setShowNewUserDialog(false)} className="flex-1 px-4 py-2 rounded" style={{ border: "1px solid var(--px-hairline)", color: "var(--px-text-muted)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>CANCELAR</button>
              <button onClick={handleCreateUser} className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2" style={{ background: "color-mix(in srgb, var(--px-brand) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 40%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>
                <Save size={14} /> REGISTRAR USUARIO
              </button>
            </div>
          </TacticalCard>
        </div>
      )}

      {/* ─── Edit User Dialog ─── */}
      {showEditUserDialog && editingUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-overlay" style={{ background: "rgba(0,0,0,0.7)" }} role="dialog" aria-modal="true" aria-labelledby="edit-user-dialog-title">
          <TacticalCard className="w-full max-w-lg mx-4 px-dialog-enter" style={{ padding: "var(--px-5)" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--px-4)" }}>
              <h3 id="edit-user-dialog-title" style={{ fontWeight: 700, fontSize: "var(--px-text-lg)", color: "var(--px-brand)" }}>EDITAR USUARIO</h3>
              <button onClick={() => setShowEditUserDialog(false)} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-crit) 10%, transparent)" }} aria-label="Cerrar"><X size={16} style={{ color: "var(--px-crit)" }} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "var(--px-3)" }}>
              <div>
                <label className="px-label">NOMBRE</label>
                <input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className="px-input mt-1" />
              </div>
              <div>
                <label className="px-label">EMAIL</label>
                <input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className="px-input mt-1" />
              </div>
              <div>
                <label className="px-label">DEPARTAMENTO</label>
                <input value={editingUser.department} onChange={e => setEditingUser({ ...editingUser, department: e.target.value })} className="px-input mt-1" />
              </div>
              <div>
                <label className="px-label">ROL</label>
                <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className="px-input mt-1">
                  {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2" style={{ marginTop: "var(--px-5)" }}>
              <button onClick={() => setShowEditUserDialog(false)} className="flex-1 px-4 py-2 rounded" style={{ border: "1px solid var(--px-hairline)", color: "var(--px-text-muted)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>CANCELAR</button>
              <button onClick={handleEditUser} className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2" style={{ background: "color-mix(in srgb, var(--px-brand) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 40%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>
                <Save size={14} /> GUARDAR CAMBIOS
              </button>
            </div>
          </TacticalCard>
        </div>
      )}

      {/* ─── Edit Permissions Dialog ─── */}
      {showEditPermissionsDialog && editingRole && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-overlay" style={{ background: "rgba(0,0,0,0.7)" }} role="dialog" aria-modal="true" aria-labelledby="edit-perms-dialog-title">
          <TacticalCard className="w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4 px-dialog-enter" style={{ padding: "var(--px-5)" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--px-4)" }}>
              <h3 id="edit-perms-dialog-title" style={{ fontWeight: 700, fontSize: "var(--px-text-lg)", color: "var(--px-brand)" }}>EDITAR PERMISOS — {editingRole.name.toUpperCase()}</h3>
              <button onClick={() => setShowEditPermissionsDialog(false)} className="p-1 rounded" style={{ background: "color-mix(in srgb, var(--px-crit) 10%, transparent)" }} aria-label="Cerrar"><X size={16} style={{ color: "var(--px-crit)" }} /></button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full" style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", minWidth: 400 }}>
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--px-brand) 4%, transparent)" }}>
                  <th scope="col" className="px-3 py-2 text-left" style={{ color: "var(--px-text-muted)", fontSize: "var(--px-text-xs)" }}>MODULO</th>
                  <th scope="col" className="px-3 py-2 text-center" style={{ color: "var(--px-ok)", fontSize: "var(--px-text-xs)" }}>LECTURA (R)</th>
                  <th scope="col" className="px-3 py-2 text-center" style={{ color: "var(--px-brand)", fontSize: "var(--px-text-xs)" }}>ESCRITURA (W)</th>
                </tr>
              </thead>
              <tbody>
                {ALL_MODULES.map(mod => {
                  const perm = editingRole.permissions[mod] || { read: false, write: false };
                  return (
                    <tr key={mod} style={{ borderBottom: "1px solid var(--px-hairline)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--px-text)" }}>{mod}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={perm.read} aria-label={`Lectura para ${mod}`} onChange={() => {
                          const newPerms = { ...editingRole.permissions };
                          newPerms[mod] = { ...perm, read: !perm.read };
                          if (!perm.read === false) newPerms[mod].write = false;
                          setEditingRole({ ...editingRole, permissions: newPerms });
                        }} className="accent-green-500 w-4 h-4" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={perm.write} disabled={!perm.read} aria-label={`Escritura para ${mod}`} onChange={() => {
                          const newPerms = { ...editingRole.permissions };
                          newPerms[mod] = { ...perm, write: !perm.write };
                          setEditingRole({ ...editingRole, permissions: newPerms });
                        }} className="accent-cyan-500 w-4 h-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div className="flex gap-2" style={{ marginTop: "var(--px-5)" }}>
              <button onClick={() => setShowEditPermissionsDialog(false)} className="flex-1 px-4 py-2 rounded" style={{ border: "1px solid var(--px-hairline)", color: "var(--px-text-muted)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>CANCELAR</button>
              <button onClick={handleSavePermissions} className="flex-1 px-4 py-2 rounded flex items-center justify-center gap-2" style={{ background: "color-mix(in srgb, var(--px-brand) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--px-brand) 40%, transparent)", color: "var(--px-brand)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>
                <Save size={14} /> GUARDAR PERMISOS
              </button>
            </div>
          </TacticalCard>
        </div>
      )}

      {/* ─── Delete Confirmation Dialog ─── */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-overlay" style={{ background: "rgba(0,0,0,0.7)" }} role="dialog" aria-modal="true" aria-labelledby="delete-confirm-dialog-title">
          <TacticalCard className="w-full max-w-md mx-4 px-dialog-enter" style={{ padding: "var(--px-5)" }}>
            <div className="flex items-center" style={{ gap: "var(--px-3)", marginBottom: "var(--px-4)" }}>
              <AlertTriangle size={24} style={{ color: "var(--px-crit)" }} aria-hidden="true" />
              <h3 id="delete-confirm-dialog-title" style={{ fontWeight: 700, fontSize: "var(--px-text-lg)", color: "var(--px-crit)" }}>CONFIRMAR ELIMINACION</h3>
            </div>
            <p style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-sm)", color: "var(--px-text)", marginBottom: "var(--px-2)" }}>
              ¿Está seguro de eliminar al usuario <strong style={{ color: "var(--px-crit)" }}>{deleteTarget.name}</strong>?
            </p>
            <p style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)" }}>
              Esta acción no se puede deshacer. Se eliminará el acceso y todos los datos asociados.
            </p>
            <div className="flex gap-2" style={{ marginTop: "var(--px-5)" }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded" style={{ border: "1px solid var(--px-hairline)", color: "var(--px-text-muted)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>CANCELAR</button>
              <button onClick={handleDeleteUser} className="flex-1 px-4 py-2 rounded" style={{ background: "color-mix(in srgb, var(--px-crit) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--px-crit) 40%, transparent)", color: "var(--px-crit)", fontSize: "var(--px-text-base)", fontWeight: 600 }}>
                ELIMINAR USUARIO
              </button>
            </div>
          </TacticalCard>
        </div>
      )}
    </div>
  );
}
