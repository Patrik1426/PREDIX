/**
 * AlertsPanel.test.tsx — Tests para el componente AlertsPanel
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AlertsPanel, { type Alert } from "./AlertsPanel";

describe("AlertsPanel", () => {
  const mockAlerts: Alert[] = [
    {
      id: "1",
      titulo: "Homicidio",
      descripcion: "Reporte de homicidio",
      nivel: "critical",
      municipio: "Ecatepec",
      hora: "14:32",
      estado: "activa",
    },
    {
      id: "2",
      titulo: "Robo",
      descripcion: "Reporte de robo",
      nivel: "warning",
      municipio: "Naucalpan",
      hora: "13:15",
      estado: "en_proceso",
    },
  ];

  it("should render alerts panel with title", () => {
    const mockOnClose = vi.fn();
    render(
      <AlertsPanel alerts={mockAlerts} onClose={mockOnClose} />
    );
    expect(screen.getByText(/ALERTAS ACTIVAS/i)).toBeTruthy();
  });

  it("should display correct number of alerts", () => {
    const mockOnClose = vi.fn();
    render(
      <AlertsPanel alerts={mockAlerts} onClose={mockOnClose} />
    );
    expect(screen.getByText(/ALERTAS ACTIVAS \(2\)/i)).toBeTruthy();
  });

  it("should show empty state when no alerts", () => {
    const mockOnClose = vi.fn();
    render(
      <AlertsPanel alerts={[]} onClose={mockOnClose} />
    );
    expect(screen.getByText(/Sin alertas activas/i)).toBeTruthy();
  });

  it("should call onClose when close button is clicked", () => {
    const mockOnClose = vi.fn();
    const { container } = render(
      <AlertsPanel alerts={mockAlerts} onClose={mockOnClose} />
    );
    const closeButton = container.querySelector("button:last-of-type");
    closeButton?.click();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should display alert titles", () => {
    const mockOnClose = vi.fn();
    render(
      <AlertsPanel alerts={mockAlerts} onClose={mockOnClose} />
    );
    expect(screen.getByText("Homicidio")).toBeTruthy();
    expect(screen.getByText("Robo")).toBeTruthy();
  });

  it("should display alert municipalities", () => {
    const mockOnClose = vi.fn();
    render(
      <AlertsPanel alerts={mockAlerts} onClose={mockOnClose} />
    );
    expect(screen.getByText("Ecatepec")).toBeTruthy();
    expect(screen.getByText("Naucalpan")).toBeTruthy();
  });

  it("should call onAlertClick when alert is clicked", () => {
    const mockOnClose = vi.fn();
    const mockOnAlertClick = vi.fn();
    const { container } = render(
      <AlertsPanel
        alerts={mockAlerts}
        onClose={mockOnClose}
        onAlertClick={mockOnAlertClick}
      />
    );
    const alertButtons = container.querySelectorAll("button");
    if (alertButtons.length > 1) {
      alertButtons[1]?.click();
      expect(mockOnAlertClick).toHaveBeenCalledWith(mockAlerts[0]);
    }
  });
});
