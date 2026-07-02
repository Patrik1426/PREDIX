// ============================================================
// DEMO SESSION — Sesión de presentación 100% client-side.
// Fuente de verdad del ROL en la demo (Administrador/Analista).
// Persiste en sessionStorage; NO toca OAuth ni protectedProcedure
// (esos siguen usando ctx.user real). Capa de presentación para
// mostrar el control de acceso por rol sin depender de MySQL.
//
// ⚠️ Antes de producción: reemplazar por el rol real del usuario
// autenticado (users.institutionalRole) — ver auth.ts DEFAULT_PERMISSIONS.
// Administrador → "admin", Analista → "analista".
// ============================================================

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DemoRole = "admin" | "analista";

export interface DemoCredential {
  role: DemoRole;
  label: string;
  employeeId: string;
  email: string;
  password: string;
}

// Credenciales demo. El form valida contra estas para asignar rol;
// los botones de acceso rápido entran directo con el rol.
export const DEMO_CREDENTIALS: Record<DemoRole, DemoCredential> = {
  admin: {
    role: "admin",
    label: "Administrador",
    employeeId: "ADM-2026-001",
    email: "admin@edomex.gob.mx",
    password: "Demo@2026",
  },
  analista: {
    role: "analista",
    label: "Analista",
    employeeId: "ANA-2026-014",
    email: "analista@edomex.gob.mx",
    password: "Demo@2026",
  },
};

const STORAGE_KEY = "predix:demo-session";
const LOGIN_AT_KEY = "predix:demo-login-at";
const SESSION_ID_KEY = "predix:demo-session-id";

interface DemoSessionState {
  role: DemoRole | null;
  /** Epoch ms del inicio de sesión demo (null si no hay sesión). */
  loginAt: number | null;
  /** Identificador de sesión (demo, generado en el cliente). */
  sessionId: string | null;
  login: (role: DemoRole) => void;
  logout: () => void;
}

function makeSessionId(): string {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `PX-${rand}`;
}

function readStored(): DemoRole | null {
  if (typeof window === "undefined") return null;
  const v = window.sessionStorage.getItem(STORAGE_KEY);
  return v === "admin" || v === "analista" ? v : null;
}

const DemoSessionContext = createContext<DemoSessionState | null>(null);

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<DemoRole | null>(() => readStored());
  const [loginAt, setLoginAt] = useState<number | null>(() => {
    const v = window.sessionStorage.getItem(LOGIN_AT_KEY);
    return v ? Number(v) : null;
  });
  const [sessionId, setSessionId] = useState<string | null>(
    () => window.sessionStorage.getItem(SESSION_ID_KEY)
  );

  const login = useCallback((next: DemoRole) => {
    const now = Date.now();
    const sid = makeSessionId();
    window.sessionStorage.setItem(STORAGE_KEY, next);
    window.sessionStorage.setItem(LOGIN_AT_KEY, String(now));
    window.sessionStorage.setItem(SESSION_ID_KEY, sid);
    setRole(next);
    setLoginAt(now);
    setSessionId(sid);
  }, []);

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(LOGIN_AT_KEY);
    window.sessionStorage.removeItem(SESSION_ID_KEY);
    setRole(null);
    setLoginAt(null);
    setSessionId(null);
  }, []);

  const value = useMemo(
    () => ({ role, loginAt, sessionId, login, logout }),
    [role, loginAt, sessionId, login, logout]
  );

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>;
}

export function useDemoSession(): DemoSessionState {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) throw new Error("useDemoSession debe usarse dentro de <DemoSessionProvider>");
  return ctx;
}

/** Intenta resolver un rol a partir de credenciales tecleadas. */
export function resolveRoleFromCredentials(
  employeeId: string,
  email: string,
  password: string,
): DemoRole | null {
  const id = employeeId.trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  for (const cred of Object.values(DEMO_CREDENTIALS)) {
    if (
      cred.employeeId.toLowerCase() === id &&
      cred.email.toLowerCase() === mail &&
      cred.password === password
    ) {
      return cred.role;
    }
  }
  return null;
}
