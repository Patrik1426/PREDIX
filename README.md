# PREDIX — Sistema Estatal de Inteligencia para Seguridad Pública

## Estado de México | Secretaría de Seguridad

**PREDIX** es una plataforma de Command Center / Tactical Intelligence diseñada para la Secretaría de Seguridad del Estado de México. Integra análisis geoespacial, predicción de incidencia delictiva, gestión de alertas en tiempo real, integraciones gubernamentales y administración de usuarios con roles institucionales.

---

## Características Principales

### Módulos Operativos
- **Mapa Geoespacial** — Heatmap de incidencia, marcadores de 125 municipios, capa de elementos policiales/comandantes con georeferencia GPS
- **Alertas Activas** — Gestión de alertas con acciones: Reconocer, Escalar, Despachar, Resolver
- **Incidentes** — Registro y seguimiento de incidentes con archivos adjuntos
- **Modelo Predictivo Avanzado** — Predicciones ML basadas en datos SESNSP 2015-2025 con intervalos de confianza
- **Tablero Operativo** — KPIs en tiempo real con gráficos Recharts
- **Mapa de Calor** — Visualización de zonas de alta incidencia
- **Asistente IA** — Chatbot con dictado y escritura

### Módulos Administrativos
- **Dashboard Ejecutivo** — KPIs, tendencias, comparativas mensuales, municipios críticos
- **Integraciones** — 8 conexiones gubernamentales (SESNSP, C5, INEGI, Plataforma México, etc.)
- **Bóveda de Secretos** — Cifrado AES-256-GCM, auditoría, rotación automática
- **Administración** — 14 usuarios, 7 roles, control de acceso granular

### Capacidades Transversales
- **Notificaciones en Tiempo Real** — Server-Sent Events con reconexión automática
- **Exportación PDF** — Reportes ejecutivos y por municipio con PDFKit
- **Exportación CSV** — Datos de incidentes y predicciones
- **Perfil de Usuario** — Configuración completa con cierre de sesión funcional

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Recharts, shadcn/ui |
| Backend | Express 4, tRPC 11, Superjson |
| Base de Datos | MySQL 8 / TiDB, Drizzle ORM |
| Autenticación | OAuth 2.0, JWT |
| Cifrado | AES-256-GCM (Node.js crypto) |
| Tiempo Real | Server-Sent Events (SSE) |
| PDF | PDFKit |
| Tests | Vitest (152+ tests) |

---

## Inicio Rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con sus credenciales

# 3. Ejecutar migraciones de BD
pnpm db:push

# 4. Iniciar en modo desarrollo
pnpm dev

# 5. Compilar para producción
pnpm build && pnpm start
```

---

## Documentación

- **[docs/DOCUMENTO_CONSOLIDADO.md](./docs/DOCUMENTO_CONSOLIDADO.md)** — 📘 Documento maestro: PRD · TRD · UI/UX · Flujos · Backend · Roadmap
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** — Guía completa de implementación independiente
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** — Esquema detallado de base de datos
- **[API_REFERENCE.md](./API_REFERENCE.md)** — Referencia completa de APIs
- **[todo.md](./todo.md)** — Historial de desarrollo y funcionalidades

---

## Diseño Visual

El sistema utiliza un tema **Command Center / Tactical Intelligence** con:
- **Fondo:** `#0f172a` (slate-900)
- **Acento primario:** `#00D4FF` (cian)
- **Acento secundario:** `#00E676` (verde)
- **Fuentes:** Rajdhani (títulos), IBM Plex Mono (datos), Inter (cuerpo)

---

## Licencia

Desarrollado para la Secretaría de Seguridad del Estado de México.  
Uso exclusivo institucional.

---

*PREDIX v1.0 — Sistema Estatal de Inteligencia para Seguridad Pública*
# PREDIX
