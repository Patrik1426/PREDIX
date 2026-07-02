/**
 * Tests para reportGenerator.ts
 * Valida generación de reportes PDF
 */

import { describe, it, expect, beforeEach } from "vitest";
import { generateExecutiveReport, generateMunicipalityReport } from "./reportGenerator";

describe("reportGenerator", () => {
  describe("generateExecutiveReport", () => {
    it("debe generar un PDF válido", async () => {
      const pdfBuffer = await generateExecutiveReport({
        includeKPIs: true,
        includeTrends: true,
        includeCriminalTypes: true,
        includeCriticalMunicipalities: true,
        includeComparison: true,
      });

      // Validar que es un Buffer
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);

      // Validar que tiene contenido
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Validar que comienza con la firma PDF
      const pdfSignature = pdfBuffer.toString("ascii", 0, 4);
      expect(pdfSignature).toBe("%PDF");
    });

    it("debe respetar las opciones de inclusión", async () => {
      const pdfBuffer = await generateExecutiveReport({
        includeKPIs: true,
        includeTrends: false,
        includeCriminalTypes: false,
        includeCriticalMunicipalities: false,
        includeComparison: false,
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it("debe generar PDF sin opciones", async () => {
      const pdfBuffer = await generateExecutiveReport();

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it("debe incluir título personalizado", async () => {
      const pdfBuffer = await generateExecutiveReport({
        title: "REPORTE PERSONALIZADO",
        subtitle: "Test",
      });

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe("generateMunicipalityReport", () => {
    it("debe generar reporte de municipio", async () => {
      const pdfBuffer = await generateMunicipalityReport("Ecatepec");

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Validar firma PDF
      const pdfSignature = pdfBuffer.toString("ascii", 0, 4);
      expect(pdfSignature).toBe("%PDF");
    });

    it("debe manejar municipios con espacios", async () => {
      const pdfBuffer = await generateMunicipalityReport("Naucalpan de Juárez");

      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it("debe generar PDF válido para cualquier municipio", async () => {
      const municipios = ["Toluca", "Metepec", "Atizapán"];

      for (const municipio of municipios) {
        const pdfBuffer = await generateMunicipalityReport(municipio);

        expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
        expect(pdfBuffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Validaciones de PDF", () => {
    it("el PDF debe tener estructura válida", async () => {
      const pdfBuffer = await generateExecutiveReport();

      // Validar firma
      const signature = pdfBuffer.toString("ascii", 0, 4);
      expect(signature).toBe("%PDF");

      // Validar que contiene EOF
      const content = pdfBuffer.toString("ascii");
      expect(content).toContain("%%EOF");
    });

    it("el tamaño del PDF debe ser razonable", async () => {
      const pdfBuffer = await generateExecutiveReport();

      // Debe ser mayor a 1KB (contenido mínimo)
      expect(pdfBuffer.length).toBeGreaterThan(1024);

      // Debe ser menor a 10MB (límite razonable)
      expect(pdfBuffer.length).toBeLessThan(10 * 1024 * 1024);
    });

    it("múltiples generaciones deben producir PDFs válidos", async () => {
      for (let i = 0; i < 3; i++) {
        const pdfBuffer = await generateExecutiveReport();

        expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
        expect(pdfBuffer.length).toBeGreaterThan(0);

        // Validar firma
        const signature = pdfBuffer.toString("ascii", 0, 4);
        expect(signature).toBe("%PDF");
      }
    });
  });
});
