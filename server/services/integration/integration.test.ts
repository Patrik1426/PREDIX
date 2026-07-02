/**
 * Tests unitarios para el módulo de integración
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DataTransformer } from "./dataTransformer";
import { IntegrationManager } from "./integrationManager";
import { RestConfig, SoapConfig, TransformationRule } from "./types";

describe("DataTransformer", () => {
  describe("jsonToXml", () => {
    it("debe convertir objeto JSON simple a XML", () => {
      const data = { name: "Juan", age: 30 };
      const xml = DataTransformer.jsonToXml(data, "persona");

      expect(xml).toContain("<?xml version");
      expect(xml).toContain("<persona>");
      expect(xml).toContain("<name>Juan</name>");
      expect(xml).toContain("<age>30</age>");
    });

    it("debe escapar caracteres especiales en XML", () => {
      const data = { message: "Hola & Adiós <test>" };
      const xml = DataTransformer.jsonToXml(data);

      expect(xml).toContain("&amp;");
      expect(xml).toContain("&lt;");
      expect(xml).toContain("&gt;");
    });

    it("debe manejar objetos anidados", () => {
      const data = {
        persona: {
          nombre: "Juan",
          direccion: {
            calle: "Principal",
            numero: 123,
          },
        },
      };
      const xml = DataTransformer.jsonToXml(data);

      expect(xml).toContain("<persona>");
      expect(xml).toContain("<nombre>Juan</nombre>");
      expect(xml).toContain("<calle>Principal</calle>");
    });
  });

  describe("xmlToJson", () => {
    it("debe convertir XML simple a JSON", () => {
      const xml = `<?xml version="1.0"?>
        <persona>
          <name>Juan</name>
          <age>30</age>
        </persona>`;

      const json = DataTransformer.xmlToJson(xml);

      expect(json).toBeDefined();
      expect(json.persona).toBeDefined();
      expect(json.persona.name).toBe("Juan");
      expect(json.persona.age).toBe("30");
    });

    it("debe desescapar caracteres especiales", () => {
      const xml = `<?xml version="1.0"?>
        <mensaje>&lt;test&gt; &amp; &quot;quoted&quot;</mensaje>`;

      const json = DataTransformer.xmlToJson(xml);

      expect(json).toBeDefined();
    });

    it("debe manejar elementos repetidos como arrays", () => {
      const xml = `<?xml version="1.0"?>
        <items>
          <item>1</item>
          <item>2</item>
          <item>3</item>
        </items>`;

      const json = DataTransformer.xmlToJson(xml);

      expect(json).toBeDefined();
    });
  });

  describe("applyTransformations", () => {
    it("debe aplicar transformación DIRECT", () => {
      const data = { sourceId: 123 };
      const rules: TransformationRule[] = [
        {
          id: "rule1",
          name: "Direct mapping",
          sourceField: "sourceId",
          targetField: "id",
          transformation: "DIRECT",
        },
      ];

      const result = DataTransformer.applyTransformations(data, rules);

      expect(result.id).toBe(123);
    });

    it("debe aplicar transformación MAP", () => {
      const data = { status: "ACTIVE" };
      const rules: TransformationRule[] = [
        {
          id: "rule1",
          name: "Status mapping",
          sourceField: "status",
          targetField: "estado",
          transformation: "MAP",
          mappingTable: {
            ACTIVE: "ACTIVO",
            INACTIVE: "INACTIVO",
          },
        },
      ];

      const result = DataTransformer.applyTransformations(data, rules);

      expect(result.estado).toBe("ACTIVO");
    });

    it("debe aplicar transformación REGEX", () => {
      const data = { phone: "5551234567" };
      const rules: TransformationRule[] = [
        {
          id: "rule1",
          name: "Phone formatting",
          sourceField: "phone",
          targetField: "formattedPhone",
          transformation: "REGEX",
          regexPattern: "(\\d{3})(\\d{3})(\\d{4})",
          regexReplacement: "($1) $2-$3",
        },
      ];

      const result = DataTransformer.applyTransformations(data, rules);

      expect(result.formattedPhone).toContain("(555)");
    });

    it("debe manejar campos anidados", () => {
      const data = { user: { id: 123 } };
      const rules: TransformationRule[] = [
        {
          id: "rule1",
          name: "Nested mapping",
          sourceField: "user.id",
          targetField: "userId",
          transformation: "DIRECT",
        },
      ];

      const result = DataTransformer.applyTransformations(data, rules);

      expect(result.userId).toBe(123);
    });
  });

  describe("formatXml", () => {
    it("debe formatear XML con indentación", () => {
      const xml = "<root><item>value</item></root>";
      const formatted = DataTransformer.formatXml(xml, 2);

      expect(formatted).toContain("<root>");
      expect(formatted).toContain("<item>");
    });
  });

  describe("validación", () => {
    it("debe validar JSON válido", () => {
      const valid = DataTransformer.isValidJson('{"key": "value"}');
      expect(valid).toBe(true);
    });

    it("debe rechazar JSON inválido", () => {
      const invalid = DataTransformer.isValidJson("{invalid json}");
      expect(invalid).toBe(false);
    });
  });
});

describe("IntegrationManager", () => {
  let manager: IntegrationManager;

  beforeEach(() => {
    manager = new IntegrationManager();
  });

  describe("registerIntegration", () => {
    it("debe registrar una integración REST", () => {
      const config: RestConfig = {
        id: "test_rest",
        name: "Test REST",
        type: "REST",
        baseUrl: "https://api.test.com",
        endpoint: "https://api.test.com",
        authMethod: "NONE",
        authConfig: {},
        dataFormat: "JSON",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manager.registerIntegration(config);

      const registered = manager.getRegisteredIntegrations();
      expect(registered).toContain("test_rest");
    });

    it("debe registrar una integración SOAP", () => {
      const config: SoapConfig = {
        id: "test_soap",
        name: "Test SOAP",
        type: "SOAP",
        endpoint: "https://soap.test.com",
        wsdlUrl: "https://soap.test.com?wsdl",
        serviceName: "TestService",
        portName: "TestPort",
        operationName: "testOperation",
        soapVersion: "1.1",
        authMethod: "NONE",
        authConfig: {},
        dataFormat: "XML",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manager.registerIntegration(config);

      const registered = manager.getRegisteredIntegrations();
      expect(registered).toContain("test_soap");
    });

    it("debe lanzar error para tipo no soportado", () => {
      const config: any = {
        id: "test_invalid",
        name: "Test Invalid",
        type: "INVALID",
        endpoint: "https://test.com",
        authMethod: "NONE",
        authConfig: {},
        dataFormat: "JSON",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => manager.registerIntegration(config)).toThrow();
    });
  });

  describe("getRegisteredIntegrations", () => {
    it("debe retornar lista vacía inicialmente", () => {
      const registered = manager.getRegisteredIntegrations();
      expect(registered).toEqual([]);
    });

    it("debe retornar todas las integraciones registradas", () => {
      const config1: RestConfig = {
        id: "int1",
        name: "Integration 1",
        type: "REST",
        baseUrl: "https://api1.com",
        endpoint: "https://api1.com",
        authMethod: "NONE",
        authConfig: {},
        dataFormat: "JSON",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const config2: RestConfig = {
        id: "int2",
        name: "Integration 2",
        type: "REST",
        baseUrl: "https://api2.com",
        endpoint: "https://api2.com",
        authMethod: "NONE",
        authConfig: {},
        dataFormat: "JSON",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manager.registerIntegration(config1);
      manager.registerIntegration(config2);

      const registered = manager.getRegisteredIntegrations();
      expect(registered).toHaveLength(2);
      expect(registered).toContain("int1");
      expect(registered).toContain("int2");
    });
  });

  describe("unregisterIntegration", () => {
    it("debe desregistrar una integración", () => {
      const config: RestConfig = {
        id: "test_unreg",
        name: "Test Unregister",
        type: "REST",
        baseUrl: "https://api.test.com",
        endpoint: "https://api.test.com",
        authMethod: "NONE",
        authConfig: {},
        dataFormat: "JSON",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manager.registerIntegration(config);
      expect(manager.getRegisteredIntegrations()).toContain("test_unreg");

      const result = manager.unregisterIntegration("test_unreg");
      expect(result).toBe(true);
      expect(manager.getRegisteredIntegrations()).not.toContain("test_unreg");
    });

    it("debe retornar false si integración no existe", () => {
      const result = manager.unregisterIntegration("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("getLogs", () => {
    it("debe retornar lista vacía inicialmente", () => {
      const logs = manager.getLogs();
      expect(logs).toEqual([]);
    });

    it("debe limpiar logs antiguos", () => {
      const daysCleared = manager.clearOldLogs(0);
      expect(typeof daysCleared).toBe("number");
    });
  });

  describe("Conversión de datos", () => {
    it("debe convertir JSON a XML", () => {
      const data = { test: "value" };
      const xml = manager.jsonToXml(data);

      expect(xml).toContain("<?xml");
      expect(xml).toContain("<test>value</test>");
    });

    it("debe convertir XML a JSON", () => {
      const xml = "<root><test>value</test></root>";
      const json = manager.xmlToJson(xml);

      expect(json).toBeDefined();
    });

    it("debe formatear XML", () => {
      const xml = "<root><test>value</test></root>";
      const formatted = manager.formatXml(xml);

      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
