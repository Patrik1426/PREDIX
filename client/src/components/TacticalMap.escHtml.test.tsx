/**
 * TacticalMap.escHtml.test.ts — Cubre el helper de escape usado antes de
 * interpolar datos reales (alertas.titulo/descripcion, texto libre editable
 * por cualquier usuario con permiso) en el HTML de popups/tooltips de
 * Leaflet (bindPopup/bindTooltip parsean el string como HTML).
 */

import { describe, it, expect } from "vitest";
import { escHtml } from "./TacticalMap";

describe("escHtml", () => {
  it("escapa una carga XSS con <script> — no debe quedar una etiqueta ejecutable", () => {
    const payload = `<script>alert(1)</script>`;
    const out = escHtml(payload);
    expect(out).not.toContain("<script>");
    expect(out).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapa un atributo inyectado tipo onerror", () => {
    const payload = `<img src=x onerror="alert(1)">`;
    const out = escHtml(payload);
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
    expect(out).toContain("&quot;alert(1)&quot;");
  });

  it("escapa comillas simples y ampersands", () => {
    expect(escHtml(`O'Brien & Sons`)).toBe("O&#39;Brien &amp; Sons");
  });

  it("deja intacto un texto normal sin caracteres especiales", () => {
    expect(escHtml("Robo con violencia — Chimalhuacán")).toBe("Robo con violencia — Chimalhuacán");
  });
});
