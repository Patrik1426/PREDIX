/**
 * institutionalRoles.ts — Fuente única del mapeo entre los 7 roles
 * institucionales reales (users.institutionalRole) y su etiqueta en español.
 * Antes vivía duplicado en Header.tsx y AdminTab.tsx (mismos 7 pares,
 * mantenidos a mano en dos archivos) — unificado aquí para evitar que
 * diverjan si algún día se agrega/renombra un rol.
 */

export const INSTITUTIONAL_ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  analista: "Analista",
  operador: "Operador",
  consulta: "Consulta",
  policia: "Policía",
  comandante: "Comandante",
};

/** Inverso del mapa anterior — label visible → slug institucional real. */
export const ROLE_LABEL_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(INSTITUTIONAL_ROLE_LABELS).map(([slug, label]) => [label, slug])
);
