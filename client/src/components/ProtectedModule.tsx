/**
 * ProtectedModule — Componente para proteger módulos según roles
 * Muestra contenido solo si el usuario tiene permisos
 */

import { ReactNode } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { useModuleAccess, useUserProfile } from "@/hooks/useModuleAccess";

interface ProtectedModuleProps {
  module: string;
  children: ReactNode;
  fallback?: ReactNode;
  requireEdit?: boolean;
  requireDelete?: boolean;
  requireExport?: boolean;
}

export default function ProtectedModule({
  module,
  children,
  fallback,
  requireEdit = false,
  requireDelete = false,
  requireExport = false,
}: ProtectedModuleProps) {
  const { canView, canEdit, canDelete, canExport, isLoading } = useModuleAccess(module);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-400"></div>
      </div>
    );
  }

  // Check if user has required permissions
  const hasPermission =
    canView &&
    (!requireEdit || canEdit) &&
    (!requireDelete || canDelete) &&
    (!requireExport || canExport);

  if (!hasPermission) {
    return (
      fallback || (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Lock className="w-12 h-12 text-red-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Acceso Denegado</h3>
            <p className="text-sm text-gray-400">
              No tienes permisos para acceder a este módulo.
            </p>
            <p className="text-xs text-gray-500 mt-2">Contacta al administrador si crees que esto es un error.</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

/**
 * ProtectedAction — Componente para proteger acciones específicas
 * Deshabilita botones si el usuario no tiene permisos
 */
interface ProtectedActionProps {
  module: string;
  action: "edit" | "delete" | "export";
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProtectedAction({ module, action, children, fallback }: ProtectedActionProps) {
  const { canEdit, canDelete, canExport } = useModuleAccess(module);

  const hasPermission =
    (action === "edit" && canEdit) ||
    (action === "delete" && canDelete) ||
    (action === "export" && canExport);

  if (!hasPermission) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * RoleBasedContent — Componente para mostrar contenido según rol
 */
interface RoleBasedContentProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleBasedContent({ roles, children, fallback }: RoleBasedContentProps) {
  const { role } = useUserProfile();

  const userRole = role || "operador";

  if (!roles.includes(userRole)) {
    return fallback || null;
  }

  return <>{children}</>;
}


