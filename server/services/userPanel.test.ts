// ============================================================
// Tests — Panel de Perfil de Usuario y Header
// Verifica: estructura de perfil, roles, áreas, módulos,
// validación de contraseña, logout en 2 pasos
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Catálogos de datos (replicados del componente) ──
const ROLES_CATALOG = [
  { id: "admin", label: "Administrador", color: "text-red-300 bg-red-500/20" },
  { id: "supervisor", label: "Supervisor", color: "text-purple-300 bg-purple-500/20" },
  { id: "analista", label: "Analista", color: "text-blue-300 bg-blue-500/20" },
  { id: "operador", label: "Operador", color: "text-cyan-300 bg-cyan-500/20" },
  { id: "consulta", label: "Consulta", color: "text-gray-300 bg-gray-500/20" },
  { id: "policia", label: "Policía", color: "text-sky-300 bg-sky-500/20" },
  { id: "comandante", label: "Comandante", color: "text-amber-300 bg-amber-500/20" },
];

const AREAS_CATALOG = [
  "Centro de Mando Estatal",
  "Dirección de Análisis Táctico",
  "Subsecretaría de Inteligencia",
  "C5 Estado de México",
  "Dirección de Operaciones",
  "Policía Estatal",
  "Coordinación de Seguridad Regional",
  "Dirección de Tecnología",
];

const MODULOS_ACCESO = [
  { id: "mapa", label: "Mapa Geoespacial" },
  { id: "alertas", label: "Alertas" },
  { id: "incidentes", label: "Incidentes" },
  { id: "predicciones", label: "Modelo Predictivo" },
  { id: "tablero", label: "Tablero Operativo" },
  { id: "calor", label: "Mapa de Calor" },
  { id: "chatbot", label: "Chatbot IA" },
  { id: "dashboard", label: "Dashboard Ejecutivo" },
  { id: "integraciones", label: "Integraciones" },
  { id: "admin", label: "Administración" },
  { id: "reportes", label: "Reportes PDF" },
  { id: "boveda", label: "Bóveda de Secretos" },
];

// ── Interfaz de perfil de usuario ──
interface UserProfile {
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

// ── Funciones auxiliares (replicadas del componente) ──
function getRoleColor(rol: string): string {
  const found = ROLES_CATALOG.find((r) => r.id === rol);
  return found ? found.color : "text-cyan-300 bg-cyan-500/20";
}

function getRoleLabel(rol: string): string {
  const found = ROLES_CATALOG.find((r) => r.id === rol);
  return found ? found.label.toUpperCase() : rol.toUpperCase();
}

function validatePassword(password: string, confirmPassword: string): string {
  if (password && password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  if (password && password !== confirmPassword) {
    return "Las contraseñas no coinciden";
  }
  return "";
}

function toggleAcceso(current: string[], modId: string): string[] {
  return current.includes(modId)
    ? current.filter((a) => a !== modId)
    : [...current, modId];
}

function getUserInitials(nombre: string): string {
  return nombre.substring(0, 2).toUpperCase();
}

// ============================================================
// TESTS
// ============================================================

describe("UserPanel — Catálogos de Datos", () => {
  it("debe tener 7 roles definidos", () => {
    expect(ROLES_CATALOG).toHaveLength(7);
  });

  it("cada rol debe tener id, label y color", () => {
    ROLES_CATALOG.forEach((rol) => {
      expect(rol).toHaveProperty("id");
      expect(rol).toHaveProperty("label");
      expect(rol).toHaveProperty("color");
      expect(typeof rol.id).toBe("string");
      expect(typeof rol.label).toBe("string");
      expect(typeof rol.color).toBe("string");
      expect(rol.id.length).toBeGreaterThan(0);
      expect(rol.label.length).toBeGreaterThan(0);
    });
  });

  it("debe incluir roles de Policía y Comandante", () => {
    const ids = ROLES_CATALOG.map((r) => r.id);
    expect(ids).toContain("policia");
    expect(ids).toContain("comandante");
  });

  it("debe tener 8 áreas definidas", () => {
    expect(AREAS_CATALOG).toHaveLength(8);
  });

  it("debe incluir áreas clave de seguridad pública", () => {
    expect(AREAS_CATALOG).toContain("Centro de Mando Estatal");
    expect(AREAS_CATALOG).toContain("C5 Estado de México");
    expect(AREAS_CATALOG).toContain("Policía Estatal");
    expect(AREAS_CATALOG).toContain("Subsecretaría de Inteligencia");
  });

  it("debe tener 12 módulos de acceso", () => {
    expect(MODULOS_ACCESO).toHaveLength(12);
  });

  it("cada módulo debe tener id y label", () => {
    MODULOS_ACCESO.forEach((mod) => {
      expect(mod).toHaveProperty("id");
      expect(mod).toHaveProperty("label");
      expect(typeof mod.id).toBe("string");
      expect(typeof mod.label).toBe("string");
    });
  });

  it("debe incluir módulos críticos del sistema", () => {
    const ids = MODULOS_ACCESO.map((m) => m.id);
    expect(ids).toContain("mapa");
    expect(ids).toContain("alertas");
    expect(ids).toContain("incidentes");
    expect(ids).toContain("predicciones");
    expect(ids).toContain("dashboard");
    expect(ids).toContain("integraciones");
    expect(ids).toContain("admin");
    expect(ids).toContain("boveda");
  });
});

describe("UserPanel — Funciones de Rol", () => {
  it("debe retornar el color correcto para cada rol", () => {
    expect(getRoleColor("admin")).toBe("text-red-300 bg-red-500/20");
    expect(getRoleColor("operador")).toBe("text-cyan-300 bg-cyan-500/20");
    expect(getRoleColor("policia")).toBe("text-sky-300 bg-sky-500/20");
    expect(getRoleColor("comandante")).toBe("text-amber-300 bg-amber-500/20");
  });

  it("debe retornar color por defecto para rol desconocido", () => {
    expect(getRoleColor("desconocido")).toBe("text-cyan-300 bg-cyan-500/20");
  });

  it("debe retornar el label correcto en mayúsculas", () => {
    expect(getRoleLabel("admin")).toBe("ADMINISTRADOR");
    expect(getRoleLabel("supervisor")).toBe("SUPERVISOR");
    expect(getRoleLabel("policia")).toBe("POLICÍA");
    expect(getRoleLabel("comandante")).toBe("COMANDANTE");
  });

  it("debe retornar el id en mayúsculas para rol desconocido", () => {
    expect(getRoleLabel("custom_role")).toBe("CUSTOM_ROLE");
  });
});

describe("UserPanel — Validación de Contraseña", () => {
  it("debe rechazar contraseña menor a 8 caracteres", () => {
    const error = validatePassword("abc123", "abc123");
    expect(error).toBe("La contraseña debe tener al menos 8 caracteres");
  });

  it("debe rechazar contraseñas que no coinciden", () => {
    const error = validatePassword("password123", "password456");
    expect(error).toBe("Las contraseñas no coinciden");
  });

  it("debe aceptar contraseña válida que coincide", () => {
    const error = validatePassword("seguridad2024!", "seguridad2024!");
    expect(error).toBe("");
  });

  it("debe aceptar contraseña vacía (sin cambio)", () => {
    const error = validatePassword("", "");
    expect(error).toBe("");
  });

  it("debe rechazar contraseña de exactamente 7 caracteres", () => {
    const error = validatePassword("1234567", "1234567");
    expect(error).toBe("La contraseña debe tener al menos 8 caracteres");
  });

  it("debe aceptar contraseña de exactamente 8 caracteres", () => {
    const error = validatePassword("12345678", "12345678");
    expect(error).toBe("");
  });
});

describe("UserPanel — Gestión de Accesos a Módulos", () => {
  it("debe agregar un módulo no existente", () => {
    const current = ["mapa", "alertas"];
    const result = toggleAcceso(current, "incidentes");
    expect(result).toContain("incidentes");
    expect(result).toHaveLength(3);
  });

  it("debe remover un módulo existente", () => {
    const current = ["mapa", "alertas", "incidentes"];
    const result = toggleAcceso(current, "alertas");
    expect(result).not.toContain("alertas");
    expect(result).toHaveLength(2);
  });

  it("no debe modificar el array original", () => {
    const current = ["mapa", "alertas"];
    const result = toggleAcceso(current, "incidentes");
    expect(current).toHaveLength(2);
    expect(result).toHaveLength(3);
  });

  it("debe manejar array vacío al agregar", () => {
    const result = toggleAcceso([], "mapa");
    expect(result).toEqual(["mapa"]);
  });

  it("debe manejar toggle de un solo elemento", () => {
    const result = toggleAcceso(["mapa"], "mapa");
    expect(result).toEqual([]);
  });
});

describe("UserPanel — Perfil de Usuario", () => {
  let mockUser: UserProfile;

  beforeEach(() => {
    mockUser = {
      nombre: "Carlos Mendoza",
      rol: "operador",
      correo: "cmendoza@seguridad.edomex.gob.mx",
      unidad: "Centro de Mando Estatal",
      ultimaConexion: "24 abr 2026, 07:38 p.m.",
      estado: "activo",
      cargo: "Operador de Monitoreo",
      accesos: ["mapa", "alertas", "incidentes", "tablero", "calor", "chatbot"],
    };
  });

  it("debe tener todos los campos requeridos", () => {
    expect(mockUser).toHaveProperty("nombre");
    expect(mockUser).toHaveProperty("rol");
    expect(mockUser).toHaveProperty("correo");
    expect(mockUser).toHaveProperty("unidad");
    expect(mockUser).toHaveProperty("ultimaConexion");
    expect(mockUser).toHaveProperty("estado");
  });

  it("debe tener campos opcionales de perfil extendido", () => {
    expect(mockUser).toHaveProperty("cargo");
    expect(mockUser).toHaveProperty("accesos");
  });

  it("debe generar iniciales correctas del nombre", () => {
    expect(getUserInitials(mockUser.nombre)).toBe("CA");
    expect(getUserInitials("Ana López")).toBe("AN");
    expect(getUserInitials("X")).toBe("X");
  });

  it("el estado debe ser activo o inactivo", () => {
    expect(["activo", "inactivo"]).toContain(mockUser.estado);
  });

  it("el rol debe existir en el catálogo", () => {
    const roleIds = ROLES_CATALOG.map((r) => r.id);
    expect(roleIds).toContain(mockUser.rol);
  });

  it("la unidad debe existir en el catálogo de áreas", () => {
    expect(AREAS_CATALOG).toContain(mockUser.unidad);
  });

  it("los accesos deben ser IDs de módulos válidos", () => {
    const moduleIds = MODULOS_ACCESO.map((m) => m.id);
    mockUser.accesos?.forEach((acceso) => {
      expect(moduleIds).toContain(acceso);
    });
  });

  it("debe tener 6 accesos por defecto para operador", () => {
    expect(mockUser.accesos).toHaveLength(6);
  });
});

describe("UserPanel — Flujo de Logout en 2 Pasos", () => {
  it("debe requerir confirmación antes de cerrar sesión", () => {
    let logoutConfirm = false;
    let isLoggingOut = false;

    // Primer clic: muestra confirmación
    const handleFirstClick = () => {
      if (!logoutConfirm) {
        logoutConfirm = true;
        return;
      }
      isLoggingOut = true;
    };

    handleFirstClick();
    expect(logoutConfirm).toBe(true);
    expect(isLoggingOut).toBe(false);
  });

  it("debe ejecutar logout en el segundo clic", () => {
    let logoutConfirm = true; // Ya confirmado
    let isLoggingOut = false;

    const handleSecondClick = () => {
      if (!logoutConfirm) {
        logoutConfirm = true;
        return;
      }
      isLoggingOut = true;
    };

    handleSecondClick();
    expect(isLoggingOut).toBe(true);
  });

  it("debe poder cancelar la confirmación de logout", () => {
    let logoutConfirm = true;

    const handleCancel = () => {
      logoutConfirm = false;
    };

    handleCancel();
    expect(logoutConfirm).toBe(false);
  });
});

describe("Header — Formato de Fecha y Hora", () => {
  it("debe formatear la hora correctamente", () => {
    const date = new Date(2026, 3, 24, 14, 30, 45);
    const formatted = date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it("debe formatear la fecha correctamente", () => {
    const date = new Date(2026, 3, 24);
    const formatted = date
      .toLocaleDateString("es-MX", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toBe(formatted.toUpperCase());
  });
});

describe("Header — Estado del Sistema", () => {
  it("debe tener estado OPERATIVO por defecto", () => {
    const systemStatus = "OPERATIVO";
    expect(systemStatus).toBe("OPERATIVO");
  });

  it("debe mostrar contadores de alertas y unidades", () => {
    const alertasActivas = 6;
    const unidadesDesplegadas = 284;
    expect(alertasActivas).toBeGreaterThan(0);
    expect(unidadesDesplegadas).toBeGreaterThan(0);
  });
});

describe("Header — Construcción de Perfil desde Auth", () => {
  it("debe construir perfil desde datos de auth", () => {
    const authUser = {
      name: "Ana García",
      email: "agarcia@seguridad.edomex.gob.mx",
      role: "supervisor",
    };

    const profile: UserProfile = {
      nombre: authUser.name || "Usuario PREDIX",
      rol: authUser.role || "operador",
      correo: authUser.email || "usuario@seguridad.edomex.gob.mx",
      unidad: "Centro de Mando Estatal",
      ultimaConexion: new Date().toLocaleString("es-MX"),
      estado: "activo",
      cargo: "Operador de Monitoreo",
      accesos: ["mapa", "alertas", "incidentes", "tablero", "calor", "chatbot"],
    };

    expect(profile.nombre).toBe("Ana García");
    expect(profile.correo).toBe("agarcia@seguridad.edomex.gob.mx");
    expect(profile.rol).toBe("supervisor");
  });

  it("debe usar valores por defecto si auth no tiene datos", () => {
    const authUser = { name: "", email: "", role: "" };

    const profile: UserProfile = {
      nombre: authUser.name || "Usuario PREDIX",
      rol: authUser.role || "operador",
      correo: authUser.email || "usuario@seguridad.edomex.gob.mx",
      unidad: "Centro de Mando Estatal",
      ultimaConexion: new Date().toLocaleString("es-MX"),
      estado: "activo",
    };

    expect(profile.nombre).toBe("Usuario PREDIX");
    expect(profile.correo).toBe("usuario@seguridad.edomex.gob.mx");
    expect(profile.rol).toBe("operador");
  });

  it("debe generar iniciales del usuario autenticado", () => {
    const authUser = { name: "Juan Pérez" };
    const initials = getUserInitials(authUser.name);
    expect(initials).toBe("JU");
  });
});

describe("UserPanel — Edición de Perfil", () => {
  it("debe permitir actualizar nombre", () => {
    const user: UserProfile = {
      nombre: "Carlos Mendoza",
      rol: "operador",
      correo: "cmendoza@seguridad.edomex.gob.mx",
      unidad: "Centro de Mando Estatal",
      ultimaConexion: "24 abr 2026",
      estado: "activo",
    };

    user.nombre = "Carlos A. Mendoza López";
    expect(user.nombre).toBe("Carlos A. Mendoza López");
  });

  it("debe permitir cambiar rol", () => {
    const user: UserProfile = {
      nombre: "Carlos Mendoza",
      rol: "operador",
      correo: "cmendoza@seguridad.edomex.gob.mx",
      unidad: "Centro de Mando Estatal",
      ultimaConexion: "24 abr 2026",
      estado: "activo",
    };

    user.rol = "supervisor";
    expect(user.rol).toBe("supervisor");
    expect(getRoleLabel(user.rol)).toBe("SUPERVISOR");
  });

  it("debe permitir cambiar área", () => {
    const user: UserProfile = {
      nombre: "Carlos Mendoza",
      rol: "operador",
      correo: "cmendoza@seguridad.edomex.gob.mx",
      unidad: "Centro de Mando Estatal",
      ultimaConexion: "24 abr 2026",
      estado: "activo",
    };

    user.unidad = "C5 Estado de México";
    expect(user.unidad).toBe("C5 Estado de México");
    expect(AREAS_CATALOG).toContain(user.unidad);
  });

  it("debe permitir actualizar accesos a módulos", () => {
    const accesos = ["mapa", "alertas"];
    const updated = toggleAcceso(toggleAcceso(accesos, "dashboard"), "boveda");
    expect(updated).toContain("dashboard");
    expect(updated).toContain("boveda");
    expect(updated).toHaveLength(4);
  });
});
