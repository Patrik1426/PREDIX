// ============================================================
// APP — Configuración principal
// Tema: dark (Command Center / Tactical Intelligence)
// ============================================================

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { DemoSessionProvider, useDemoSession } from "./contexts/DemoSessionContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import DashboardEjecutivo from "./pages/DashboardEjecutivo";
import Integracion from "./pages/Integracion";
import { AuthGuard } from "./components/AuthGuard";

// Gate de la demo: sin rol asignado (sin sesión demo) → al login.
function DemoGate({ children }: { children: React.ReactNode }) {
  const { role } = useDemoSession();
  if (!role) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"}>
        <DemoGate><Home /></DemoGate>
      </Route>
      <Route path={"/dashboard"}>
        <AuthGuard><DashboardEjecutivo /></AuthGuard>
      </Route>
      <Route path={"/integracion"}>
        <AuthGuard><Integracion /></AuthGuard>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <DemoSessionProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster richColors position="top-right" />
              <Router />
            </TooltipProvider>
          </NotificationProvider>
        </DemoSessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
