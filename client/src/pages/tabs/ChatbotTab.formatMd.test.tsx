/**
 * ChatbotTab.formatMd.test.tsx — Cubre el escape aplicado antes de renderizar
 * mensajes (propios o del LLM) vía dangerouslySetInnerHTML (ver Issue #31,
 * mismo patrón de bug ya corregido en TacticalMap.tsx).
 */
import { describe, it, expect } from "vitest";
import { formatMd } from "./ChatbotTab";

describe("formatMd", () => {
  it("escapa una carga XSS con <script> antes de aplicar markdown", () => {
    const out = formatMd("<script>alert(1)</script>");
    expect(out).not.toContain("<script>");
    expect(out).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapa un atributo inyectado tipo onerror", () => {
    const out = formatMd(`<img src=x onerror="alert(1)">`);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("sigue convirtiendo **negritas** a <strong> después de escapar", () => {
    expect(formatMd("**importante**")).toBe('<strong style="color:var(--px-text)">importante</strong>');
  });

  it("convierte saltos de línea a <br/>", () => {
    expect(formatMd("línea1\nlínea2")).toBe("línea1<br/>línea2");
  });

  it("no rompe negritas ni saltos de línea cuando el texto incluye caracteres especiales", () => {
    expect(formatMd("**O'Brien & Sons**\nreporte")).toBe(
      '<strong style="color:var(--px-text)">O&#39;Brien &amp; Sons</strong><br/>reporte',
    );
  });
});
