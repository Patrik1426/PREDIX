/**
 * UserPanel — Credencial de identidad táctica.
 * Vista "cred": identidad + niveles de acceso (read-only) + logout.
 * Vista "cuenta": contacto editable (local), seguridad read-only con candado
 * (rol/accesos los gestiona el administrador) y datos de sesión/auditoría.
 *
 * El rol y los niveles NO se editan aquí: en gobierno los asigna el admin.
 * La fuente del rol es DemoSessionContext.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  X, LogOut, AlertTriangle, Loader2, Check, Ban,
  Settings, ChevronLeft, Lock, Phone, Save, Send, Clock, Fingerprint, MonitorSmartphone,
} from "lucide-react";
import { NAV_GROUPS } from "./navConfig";
import { useDemoSession, DEMO_CREDENTIALS } from "@/contexts/DemoSessionContext";

const CONTACT_KEY = "predix:contact";

function readContact(): { telefono: string; extension: string } {
  try {
    const raw = window.sessionStorage.getItem(CONTACT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { telefono: "", extension: "" };
}

function formatStamp(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("es-MX", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// El header tiene backdrop-filter → crea un containing block que atrapa a los
// hijos position:fixed. En móvil la credencial debe ser hoja inferior anclada
// al viewport, así que la sacamos por portal a <body>. Este hook decide cuándo.
function useIsMobile(query = "(max-width: 767px)") {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return isMobile;
}

export interface UserProfile {
  nombre: string;
  rol: string;
  correo: string;
  unidad: string;
  ultimaConexion: string;
  estado: "activo" | "inactivo";
  area?: string;
  cargo?: string;
  accesos?: string[];
}

interface UserPanelProps {
  user: UserProfile;
  onClose: () => void;
  onLogout?: () => void;
  /** Mantenido por compatibilidad; ya no se usa (modal read-only). */
  onSettings?: () => void;
}

export default function UserPanel({ user, onClose, onLogout }: UserPanelProps) {
  const { role, loginAt, sessionId } = useDemoSession();
  const isMobile = useIsMobile();
  const [view, setView] = useState<"cred" | "cuenta">("cred");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // Contacto editable — persiste local (solo este dispositivo), no hay backend.
  const [contact, setContact] = useState(() => readContact());
  const [contactDirty, setContactDirty] = useState(false);

  const updateContact = (patch: Partial<typeof contact>) => {
    setContact((c) => ({ ...c, ...patch }));
    setContactDirty(true);
  };

  const handleSaveContact = () => {
    window.sessionStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
    setContactDirty(false);
    toast.success("Contacto guardado en este dispositivo");
  };

  const handleRequestAccess = () => {
    toast.success("Solicitud enviada al administrador", {
      description: "El cambio de rol o accesos requiere autorización institucional.",
    });
  };

  const cred = role ? DEMO_CREDENTIALS[role] : null;
  const roleLabel = cred ? cred.label : user.rol;
  const employeeId = cred ? cred.employeeId : "—";
  const email = cred ? cred.email : user.correo;

  // Niveles de acceso = grupos de navegación visibles para el rol.
  const clearances = NAV_GROUPS.map((g) => ({
    label: g.label,
    enabled: !g.roles || (role ? g.roles.includes(role) : true),
  }));

  const initials = user.nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    if (!logoutConfirm) {
      setLogoutConfirm(true);
      return;
    }
    setIsLoggingOut(true);
    try {
      await onLogout?.();
    } catch {
      setIsLoggingOut(false);
      setLogoutConfirm(false);
    }
  };

  // ── Vista CREDENCIAL ──
  const credBody = (
    <>
      <div className="px-cred-head">
        <span className="px-cred-eyebrow">// Credencial</span>
        <button onClick={onClose} className="px-cred-x" aria-label="Cerrar">
          <X size={15} />
        </button>
      </div>

      {/* Identidad */}
      <div className="px-cred-id">
        <div className="px-cred-mono" aria-hidden>
          {initials}
        </div>
        <div className="px-cred-id-main">
          <div className="px-cred-name-row">
            <h4 className="px-cred-name">{user.nombre}</h4>
            <span
              className={`px-cred-led ${user.estado === "activo" ? "on" : ""}`}
              title={user.estado === "activo" ? "Activo" : "Inactivo"}
              aria-hidden
            />
          </div>
          <p className="px-cred-mail">{email}</p>
          <span className="px-cred-rolechip">▣ {roleLabel.toUpperCase()}</span>
        </div>
      </div>

      {/* Datos */}
      <div className="px-cred-section">
        <div className="px-cred-section-label">// Datos</div>
        <dl className="px-cred-data">
          <div className="px-cred-row">
            <dt>N° Empleado</dt>
            <dd>{employeeId}</dd>
          </div>
          <div className="px-cred-row">
            <dt>Área</dt>
            <dd>{user.unidad}</dd>
          </div>
          <div className="px-cred-row">
            <dt>Últ. acceso</dt>
            <dd>{user.ultimaConexion}</dd>
          </div>
        </dl>
      </div>

      {/* Niveles de acceso — la firma */}
      <div className="px-cred-section">
        <div className="px-cred-section-label">// Niveles de acceso</div>
        <ul className="px-cred-clear">
          {clearances.map((c) => (
            <li key={c.label} className={`px-cred-clear-row ${c.enabled ? "ok" : "no"}`}>
              <span className="bar" aria-hidden />
              <span className="name">{c.label}</span>
              <span className="state">
                {c.enabled ? (
                  <>
                    <Check size={12} /> habilitado
                  </>
                ) : (
                  <>
                    <Ban size={12} /> restringido
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer: ir a Cuenta + Logout */}
      <div className="px-cred-foot">
        <button onClick={() => setView("cuenta")} className="px-cred-navbtn">
          <Settings size={14} />
          Cuenta y sesión
        </button>
        {!logoutConfirm ? (
          <button onClick={handleLogout} className="px-cred-logout">
            <LogOut size={14} />
            Cerrar sesión
          </button>
        ) : (
          <div className="px-cred-confirm">
            <div className="px-cred-confirm-msg">
              <AlertTriangle size={14} />
              <span>¿Confirmar cierre de sesión?</span>
            </div>
            <div className="px-cred-confirm-actions">
              <button onClick={() => setLogoutConfirm(false)} className="px-cred-btn-cancel">
                Cancelar
              </button>
              <button onClick={handleLogout} disabled={isLoggingOut} className="px-cred-btn-confirm">
                {isLoggingOut ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Cerrando…
                  </>
                ) : (
                  <>
                    <LogOut size={12} /> Sí, cerrar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        <p className="px-cred-version">PREDIX v1.0 · sesión demo</p>
      </div>
    </>
  );

  // ── Vista CUENTA Y SESIÓN ──
  const cuentaBody = (
    <>
      <div className="px-cred-head">
        <button onClick={() => setView("cred")} className="px-cred-x" aria-label="Volver">
          <ChevronLeft size={16} />
        </button>
        <span className="px-cred-eyebrow">// Cuenta y sesión</span>
        <button onClick={onClose} className="px-cred-x" aria-label="Cerrar">
          <X size={15} />
        </button>
      </div>

      {/* Contacto — editable, local */}
      <div className="px-cred-section">
        <div className="px-cred-section-label">
          <Phone size={11} /> Contacto
          <span className="px-cred-hint">solo este dispositivo</span>
        </div>
        <label className="px-cred-fieldlabel" htmlFor="tel">Teléfono</label>
        <input
          id="tel"
          className="px-cred-input"
          type="tel"
          inputMode="tel"
          placeholder="55 1234 5678"
          value={contact.telefono}
          onChange={(e) => updateContact({ telefono: e.target.value })}
        />
        <label className="px-cred-fieldlabel" htmlFor="ext">Extensión</label>
        <input
          id="ext"
          className="px-cred-input"
          type="text"
          inputMode="numeric"
          placeholder="4012"
          value={contact.extension}
          onChange={(e) => updateContact({ extension: e.target.value })}
        />
        <button
          onClick={handleSaveContact}
          disabled={!contactDirty}
          className="px-cred-savebtn"
        >
          <Save size={13} /> Guardar contacto
        </button>
      </div>

      {/* Seguridad — read-only, lo gestiona el admin */}
      <div className="px-cred-section">
        <div className="px-cred-section-label">
          <Lock size={11} /> Seguridad
        </div>
        <dl className="px-cred-data px-cred-data--stack">
          <div className="px-cred-row">
            <dt>Rol</dt>
            <dd className="px-cred-locked"><Lock size={10} /> {roleLabel}</dd>
          </div>
          <div className="px-cred-row">
            <dt>Niveles habilitados</dt>
            <dd className="px-cred-locked">
              <Lock size={10} /> {clearances.filter((c) => c.enabled).map((c) => c.label).join(" · ")}
            </dd>
          </div>
          <div className="px-cred-row">
            <dt>Área</dt>
            <dd className="px-cred-locked"><Lock size={10} /> {user.unidad}</dd>
          </div>
        </dl>
        <button onClick={handleRequestAccess} className="px-cred-navbtn">
          <Send size={13} /> Solicitar cambio de acceso
        </button>
      </div>

      {/* Sesión / auditoría */}
      <div className="px-cred-section">
        <div className="px-cred-section-label">
          <Clock size={11} /> Sesión
        </div>
        <dl className="px-cred-data px-cred-data--stack">
          <div className="px-cred-row">
            <dt>Inicio</dt>
            <dd>{formatStamp(loginAt)}</dd>
          </div>
          <div className="px-cred-row">
            <dt><Fingerprint size={10} style={{ display: "inline", verticalAlign: "-1px" }} /> ID sesión</dt>
            <dd>{sessionId ?? "—"}</dd>
          </div>
          <div className="px-cred-row">
            <dt>Últ. acceso</dt>
            <dd>{user.ultimaConexion}</dd>
          </div>
        </dl>
      </div>

      <div className="px-cred-foot">
        {!logoutConfirm ? (
          <button onClick={handleLogout} className="px-cred-logout">
            <MonitorSmartphone size={14} />
            Cerrar sesión en todos los dispositivos
          </button>
        ) : (
          <div className="px-cred-confirm">
            <div className="px-cred-confirm-msg">
              <AlertTriangle size={14} />
              <span>¿Cerrar sesión en todos los dispositivos?</span>
            </div>
            <div className="px-cred-confirm-actions">
              <button onClick={() => setLogoutConfirm(false)} className="px-cred-btn-cancel">
                Cancelar
              </button>
              <button onClick={handleLogout} disabled={isLoggingOut} className="px-cred-btn-confirm">
                {isLoggingOut ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Cerrando…
                  </>
                ) : (
                  <>
                    <LogOut size={12} /> Sí, cerrar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        <button onClick={() => setView("cred")} className="px-cred-backlink">
          <ChevronLeft size={12} /> Volver a credencial
        </button>
      </div>
    </>
  );

  const panel = (
    <div
      className="px-cred"
      role="dialog"
      aria-label={view === "cred" ? "Credencial de identidad" : "Cuenta y sesión"}
    >
      {/* Handle — afordancia de hoja inferior, solo visible en móvil. */}
      <div className="px-cred-handle" aria-hidden />
      {view === "cred" ? credBody : cuentaBody}
    </div>
  );

  // Móvil: hoja inferior por portal a <body> para escapar el containing block
  // del header (backdrop-filter). data-user-panel evita que el click-outside
  // del Header la cierre al interactuar dentro.
  if (isMobile) {
    return createPortal(
      <div data-user-panel>
        <div className="px-cred-backdrop" onClick={onClose} aria-hidden />
        {panel}
      </div>,
      document.body
    );
  }

  // Desktop: popover anclado al botón de usuario (sin portal).
  return panel;
}
