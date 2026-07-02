import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  plugins: [react() as any],
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "jsdom",
    // Server tests corren en Node (PDFKit, crypto, etc. no funcionan bien en jsdom);
    // client tests en jsdom (DOM).
    environmentMatchGlobs: [["server/**", "node"]],
    // Secretos/llaves de prueba para que cargar appRouter (vault) no truene.
    env: {
      VAULT_MASTER_KEY: "test-master-key-for-testing-purposes-only-12345",
      JWT_SECRET: "test-jwt-secret",
    },
    testTimeout: 20000,
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/src/**/*.test.tsx",
      "client/src/**/*.spec.tsx",
    ],
    setupFiles: ["./client/src/setupTests.ts"],
    globals: true,
  },
});
