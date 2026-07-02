// ============================================================
// NAV CONFIG — Fuente ÚNICA de verdad de la navegación PREDIX.
// TabId + módulos agrupados + badges viven aquí (no duplicar).
// Consumido por SideNav (rail + bottom nav) y Home (tipo TabId).
// ============================================================

import {
  Map, Bell, AlertTriangle, TrendingUp, LayoutDashboard, Target,
  MessageSquare, Plug, ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

export type TabId =
  | "mapa" | "alertas" | "incidentes" | "predicciones"
  | "tablero" | "zonas" | "chatbot" | "integracion" | "admin";

export interface NavItem {
  id: TabId;
  label: string;
  icon: ReactNode;
  badge?: number;
  badgeColor?: string;
}

// Roles de la demo (ver DemoSessionContext). Si un grupo omite `roles`,
// es visible para todos los roles. "Sistema" se restringe a admin.
export type NavRole = "admin" | "analista";

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** Roles que pueden ver el grupo. Ausente = todos. */
  roles?: NavRole[];
}

// Badges mock (6 alertas / 47 incidentes). TODO: cablear a conteos reales
// (alertas activas / incidentes del día) cuando exista el endpoint.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { id: "tablero", label: "Tablero", icon: <LayoutDashboard size={18} /> },
      { id: "mapa", label: "Mapa Geoespacial", icon: <Map size={18} /> },
      { id: "alertas", label: "Alertas", icon: <Bell size={18} />, badge: 6, badgeColor: "var(--px-warn)" },
      { id: "incidentes", label: "Incidentes", icon: <AlertTriangle size={18} />, badge: 47, badgeColor: "var(--px-warn)" },
    ],
  },
  {
    label: "Inteligencia",
    items: [
      { id: "predicciones", label: "Modelo Predictivo", icon: <TrendingUp size={18} /> },
      { id: "zonas", label: "Mapa de Calor", icon: <Target size={18} /> },
      { id: "chatbot", label: "Asistente IA", icon: <MessageSquare size={18} /> },
    ],
  },
  {
    label: "Sistema",
    roles: ["admin"],
    items: [
      { id: "integracion", label: "Integraciones", icon: <Plug size={18} /> },
      { id: "admin", label: "Administración", icon: <ShieldCheck size={18} /> },
    ],
  },
];

// Lista plana de ids válidos (deep-links, validación).
export const TAB_IDS: TabId[] = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id));

/** Grupos visibles para un rol (null = sin sesión → sin restricción extra). */
export function groupsForRole(role: NavRole | null): NavGroup[] {
  if (!role) return NAV_GROUPS;
  return NAV_GROUPS.filter((g) => !g.roles || g.roles.includes(role));
}

/** ¿El rol puede acceder a este tab? */
export function canAccessTab(role: NavRole | null, tab: TabId): boolean {
  return groupsForRole(role).some((g) => g.items.some((i) => i.id === tab));
}
