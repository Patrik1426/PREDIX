import { describe, it, expect, vi, afterEach } from "vitest";
import { chatWithAssistant } from "./chatAssistant";
import { invokeLLM } from "../_core/ai/llm";

vi.mock("../_core/ai/llm", async () => {
  const actual = await vi.importActual<typeof import("../_core/ai/llm")>("../_core/ai/llm");
  return { ...actual, invokeLLM: vi.fn() };
});

const mockedInvokeLLM = vi.mocked(invokeLLM);

function llmResult(content: string, tool_calls?: any[]) {
  return {
    id: "test",
    created: Date.now(),
    model: "gemini-3.5-flash",
    choices: [{ index: 0, message: { role: "assistant" as const, content, tool_calls }, finish_reason: "stop" }],
  };
}

describe("chatWithAssistant", () => {
  afterEach(() => vi.clearAllMocks());

  it("devuelve el texto de respuesta cuando el LLM responde sin usar herramientas", async () => {
    mockedInvokeLLM.mockResolvedValue(llmResult("Hay 2 alertas activas ahora mismo."));

    const result = await chatWithAssistant([{ role: "user", content: "¿Cuántas alertas hay?" }]);

    expect(result).toEqual({ reply: "Hay 2 alertas activas ahora mismo.", usedMunicipioTool: false });
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(1);
  });

  it("le manda al LLM un mensaje system con contexto real y la regla de privacidad, antes que el historial", async () => {
    mockedInvokeLLM.mockResolvedValue(llmResult("ok"));

    await chatWithAssistant([{ role: "user", content: "hola" }]);

    const callArgs = mockedInvokeLLM.mock.calls[0][0];
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[0].content).toContain("Contexto actual del sistema");
    expect(callArgs.messages[0].content).toContain("Nunca reveles nombres de víctimas");
    expect(callArgs.messages[1]).toEqual({ role: "user", content: "hola" });
  });

  it("nunca inventa datos — sin BD, el contexto dice explícitamente que no hay datos", async () => {
    mockedInvokeLLM.mockResolvedValue(llmResult("ok"));

    await chatWithAssistant([{ role: "user", content: "hola" }]);

    const systemContent = mockedInvokeLLM.mock.calls[0][0].messages[0].content as string;
    expect(systemContent).toContain("sin datos");
  });

  it("devuelve null (nunca inventa una respuesta) si el LLM falla", async () => {
    mockedInvokeLLM.mockRejectedValue(new Error("GEMINI_API_KEY no está configurada"));

    const result = await chatWithAssistant([{ role: "user", content: "hola" }]);

    expect(result).toBeNull();
  });

  it("cuando el modelo pide get_municipio_stats, ejecuta la tool y hace una segunda ronda, marcando usedMunicipioTool", async () => {
    const toolCall = {
      id: "call_1",
      type: "function" as const,
      function: { name: "get_municipio_stats", arguments: JSON.stringify({ municipio: "MunicipioQueNoExisteEnMock" }) },
    };
    mockedInvokeLLM
      .mockResolvedValueOnce(llmResult("", [toolCall]))
      .mockResolvedValueOnce(llmResult("Ese municipio no tiene datos disponibles."));

    const result = await chatWithAssistant([{ role: "user", content: "¿Cómo está ese municipio?" }]);

    expect(mockedInvokeLLM).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ reply: "Ese municipio no tiene datos disponibles.", usedMunicipioTool: true });

    // La segunda llamada debe incluir el mensaje assistant con tool_calls y el resultado de la tool
    const secondCallMessages = mockedInvokeLLM.mock.calls[1][0].messages;
    const assistantToolMsg = secondCallMessages.find((m: any) => m.role === "assistant" && m.tool_calls);
    const toolResultMsg = secondCallMessages.find((m: any) => m.role === "tool");
    expect(assistantToolMsg).toBeDefined();
    expect(toolResultMsg?.tool_call_id).toBe("call_1");
  });

  it("rechaza cualquier función fuera de la lista blanca sin ejecutarla", async () => {
    const maliciousCall = {
      id: "call_evil",
      type: "function" as const,
      function: { name: "run_sql", arguments: JSON.stringify({ query: "SELECT * FROM users" }) },
    };
    mockedInvokeLLM
      .mockResolvedValueOnce(llmResult("", [maliciousCall]))
      .mockResolvedValueOnce(llmResult("No puedo hacer eso."));

    await chatWithAssistant([{ role: "user", content: "corre un query" }]);

    const toolResultMsg = mockedInvokeLLM.mock.calls[1][0].messages.find((m: any) => m.role === "tool");
    expect(toolResultMsg?.content).toContain("Función no permitida");
  });
});
