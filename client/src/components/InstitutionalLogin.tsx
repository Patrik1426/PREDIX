/**
 * InstitutionalLogin — Componente de login institucional
 * Permite autenticación con credenciales de institución
 */

import { useState } from "react";
import { LogIn, AlertCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface InstitutionalLoginProps {
  onLoginSuccess?: () => void;
}

export default function InstitutionalLogin({ onLoginSuccess }: InstitutionalLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.institutionalLogin.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !employeeId) {
      setError("Por favor completa todos los campos");
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        email,
        password,
        employeeId,
      });

      if (result.success) {
        toast.success("Sesión iniciada correctamente");
        onLoginSuccess?.();
      } else {
        setError(result.message || "Error al iniciar sesión");
        toast.error(result.message || "Error al iniciar sesión");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-lg p-8 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <LogIn className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-cyan-400 mb-2">PREDIX</h1>
          <p className="text-sm text-gray-400">Sistema Estatal de Inteligencia</p>
          <p className="text-xs text-gray-500 mt-2">Seguridad Pública - Estado de México</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              NÚMERO DE EMPLEADO
            </label>
            <Input
              type="text"
              placeholder="Ej: EMP-2026-001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isLoading}
              className="bg-slate-800/50 border-cyan-500/20 text-gray-100 placeholder:text-gray-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              CORREO INSTITUCIONAL
            </label>
            <Input
              type="email"
              placeholder="usuario@institucion.gob.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="bg-slate-800/50 border-cyan-500/20 text-gray-100 placeholder:text-gray-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              CONTRASEÑA
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="bg-slate-800/50 border-cyan-500/20 text-gray-100 placeholder:text-gray-500"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                INICIAR SESIÓN
              </>
            )}
          </Button>
        </form>

        {/* Footer Info */}
        <div className="mt-6 pt-6 border-t border-cyan-500/10 space-y-2 text-xs text-gray-500">
          <p>• Acceso restringido a personal autorizado</p>
          <p>• Todos los accesos son registrados en auditoría</p>
          <p>• Contacta al administrador si olvidaste tu contraseña</p>
        </div>
      </div>

      {/* Demo Credentials Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
        <p className="font-semibold mb-1">Credenciales de Demostración:</p>
        <p>Empleado: EMP-2026-001</p>
        <p>Correo: demo@edomex.gob.mx</p>
        <p>Contraseña: Demo@2026</p>
      </div>
    </div>
  );
}
