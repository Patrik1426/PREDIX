// ============================================================
// DEMO SESSION — Sesión de presentación 100% client-side.
// Fuente de verdad del ROL visible en la UI (Administrador/Analista).
// Persiste en sessionStorage. El rol se recibe de auth.institutionalLogin
// (login real contra la tabla users) y solo se usa para el gate de
// tabs "Sistema" en Home; AuthGuard usa ctx.user real vía auth.me.
// ============================================================

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DemoRole = "admin" | "analista";

// Solo etiqueta de despliegue — ya no hay credenciales fake que mostrar,
// el login real vive en auth.institutionalLogin.
export const DEMO_ROLE_LABELS: Record<DemoRole, string> = {
  admin: "Administrador",
  analista: "Analista",
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
