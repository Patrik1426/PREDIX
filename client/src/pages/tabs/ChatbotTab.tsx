// ============================================================
// CHATBOT ATENEA — Asistente táctico (PREDIX v2)
// Chat full-width como héroe + info panel toggle
// Mobile: chat ocupa todo, quick queries en scroll horizontal
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { CHATBOT_RESPONSES } from "@/data/securityData";
import { Send, Mic, MicOff, Bot, User, Trash2, Volume2, VolumeX, Brain, Zap, Info, X } from "lucide-react";

interface Message { id: string; role: "user" | "bot"; content: string; timestamp: Date; }

const QUICK_QUERIES = [
  "Alertas activas",
  "Incidentes de hoy",
  "Predicción de riesgo",
  "Estadísticas",
  "Info Ecatepec",
  "Ayuda",
];

function formatMd(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--px-text)">$1</strong>').replace(/\n/g, "<br/>");
}

function getResponse(input: string): string {
  const l = input.toLowerCase();
  if (l.includes("alerta")) return CHATBOT_RESPONSES.alertas;
  if (l.includes("incidente")) return CHATBOT_RESPONSES.incidentes;
  if (l.includes("ecatepec")) return CHATBOT_RESPONSES.ecatepec;
  if (l.includes("predicci") || l.includes("riesgo")) return CHATBOT_RESPONSES.prediccion;
  if (l.includes("estadística") || l.includes("estadistica") || l.includes("dato")) return CHATBOT_RESPONSES.estadisticas;
  if (l.includes("toluca")) return CHATBOT_RESPONSES.toluca;
  if (l.includes("ayuda") || l.includes("help") || l.includes("qué puedes") || l.includes("que puedes")) return CHATBOT_RESPONSES.ayuda;
  if (l.includes("hola") || l.includes("buenos") || l.includes("buenas")) return "¡Bienvenido al sistema ATENEA! Soy tu asistente de inteligencia táctica para el Estado de México. ¿En qué puedo ayudarte?";
  return CHATBOT_RESPONSES.default;
}

export default function ChatbotTab() {
  const [messages, setMessages] = useState<Message[]>([{ id: "init", role: "bot", content: CHATBOT_RESPONSES.default, timestamp: new Date() }]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSpeechSupported(true);
      const r = new SR(); r.lang = "es-MX"; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1;
      r.onresult = (e: any) => {
        let fin = "", inter = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) fin += e.results[i][0].transcript;
          else inter += e.results[i][0].transcript;
        }
        if (fin) { setInput(fin); setTranscript(""); } else setTranscript(inter);
      };
      r.onend = () => { setIsListening(false); setTranscript(""); };
      r.onerror = () => { setIsListening(false); setTranscript(""); };
      recognitionRef.current = r;
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }
    else { try { recognitionRef.current?.start(); setIsListening(true); setInput(""); } catch {} }
  }, [isListening, speechSupported]);

  const sendMessage = useCallback(async (text?: string) => {
    const t = text || input.trim();
    if (!t) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: t, timestamp: new Date() }]);
    setInput(""); setIsTyping(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
    const resp = getResponse(t);
    if (speechEnabled && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(resp.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\n/g, " "));
      u.lang = "es-MX"; u.rate = 0.9; window.speechSynthesis.speak(u);
    }
    setIsTyping(false);
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "bot", content: resp, timestamp: new Date() }]);
  }, [input, speechEnabled]);

  const fmt = (d: Date) => d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--px-bg)", padding: "var(--px-3)", gap: "var(--px-3)" }}>

      {/* Toolbar */}
      <div className="px-card flex items-center gap-2" style={{ padding: "var(--px-2) var(--px-4)", flexShrink: 0 }}>
        <div className="relative shrink-0">
          <Bot className="w-7 h-7" style={{ color: "var(--px-brand)", filter: "drop-shadow(0 0 4px color-mix(in srgb, var(--px-brand) 40%, transparent))" }} aria-label="ATENEA" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: "var(--px-ok)", border: "1.5px solid var(--px-surface)" }} />
        </div>
        <div>
          <span style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-sm)", fontWeight: 700, color: "var(--px-text)" }}>ATENEA</span>
          <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-ok)", marginLeft: 6 }}>EN LÍNEA</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setSpeechEnabled(!speechEnabled)} title={speechEnabled ? "Desactivar voz" : "Activar voz"} style={{
            padding: "4px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)",
            background: speechEnabled ? "color-mix(in srgb, var(--px-brand) 12%, transparent)" : "transparent",
            color: speechEnabled ? "var(--px-brand)" : "var(--px-text-faint)",
          }}>
            {speechEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>
          <button onClick={() => setMessages([{ id: "init-" + Date.now(), role: "bot", content: CHATBOT_RESPONSES.default, timestamp: new Date() }])} title="Limpiar" style={{
            padding: 4, borderRadius: 4, border: "none", cursor: "pointer", color: "var(--px-text-faint)", background: "transparent",
          }}>
            <Trash2 size={13} />
          </button>
          <button onClick={() => setShowInfo(!showInfo)} title="Info del modelo" style={{
            padding: 4, borderRadius: 4, border: "none", cursor: "pointer",
            color: showInfo ? "var(--px-brand)" : "var(--px-text-faint)", background: showInfo ? "color-mix(in srgb, var(--px-brand) 12%, transparent)" : "transparent",
          }}>
            <Info size={13} />
          </button>
        </div>
      </div>

      {/* Main: chat + info panel */}
      <div className="flex flex-1 gap-3" style={{ minHeight: 0 }}>

        {/* Chat */}
        <div className="px-card flex flex-col flex-1" style={{ minHeight: 0 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-tactical" style={{ padding: "var(--px-4)" }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 mb-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5" style={{
                  background: msg.role === "bot" ? "color-mix(in srgb, var(--px-brand) 10%, transparent)" : "color-mix(in srgb, var(--px-warn) 10%, transparent)",
                  color: msg.role === "bot" ? "var(--px-brand)" : "var(--px-warn)",
                }}>
                  {msg.role === "bot" ? <Bot size={13} /> : <User size={13} />}
                </div>
                <div style={{ maxWidth: "75%" }}>
                  <div style={{
                    padding: "var(--px-3)", borderRadius: msg.role === "bot" ? "4px 12px 12px 4px" : "12px 4px 12px 12px",
                    background: msg.role === "bot" ? "var(--px-surface)" : "color-mix(in srgb, var(--px-warn) 8%, transparent)",
                    border: `1px solid ${msg.role === "bot" ? "var(--px-hairline)" : "color-mix(in srgb, var(--px-warn) 18%, transparent)"}`,
                    fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", color: "var(--px-text-muted)", lineHeight: 1.6,
                  }} dangerouslySetInnerHTML={{ __html: formatMd(msg.content) }} />
                  <div className={`mt-1 ${msg.role === "user" ? "text-right" : ""}`} style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>
                    {fmt(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 mb-3">
                <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, var(--px-brand) 10%, transparent)", color: "var(--px-brand)" }}><Bot size={13} /></div>
                <div className="flex items-center gap-1.5" style={{ padding: "var(--px-3)", borderRadius: "4px 12px 12px 4px", background: "var(--px-surface)", border: "1px solid var(--px-hairline)" }}>
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--px-brand)", animation: `blink-cursor 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice transcript */}
          {(isListening || transcript) && (
            <div className="flex items-center gap-2 mx-3 mb-2" style={{ padding: "var(--px-2) var(--px-3)", borderRadius: "var(--px-r-sm)", background: "color-mix(in srgb, var(--px-crit) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--px-crit) 25%, transparent)" }}>
              <div className="w-2 h-2 rounded-full status-pulse-red" style={{ background: "var(--px-crit)" }} />
              <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-crit)" }}>{transcript || "Escuchando..."}</span>
            </div>
          )}

          {/* Quick queries — scroll horizontal */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-tactical mx-3 mb-2" style={{ flexShrink: 0 }}>
            {QUICK_QUERIES.map(q => (
              <button key={q} onClick={() => sendMessage(q)} className="shrink-0" style={{
                fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", padding: "4px 10px",
                borderRadius: 999, border: "1px solid var(--px-hairline)", cursor: "pointer",
                background: "transparent", color: "var(--px-text-faint)", whiteSpace: "nowrap",
              }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2" style={{ padding: "var(--px-3)", borderTop: "1px solid var(--px-hairline)", flexShrink: 0 }}>
            {speechSupported && (
              <button onClick={toggleListening} className="shrink-0" style={{
                width: 40, height: 40, borderRadius: "var(--px-r-sm)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                background: isListening ? "color-mix(in srgb, var(--px-crit) 15%, transparent)" : "transparent",
                color: isListening ? "var(--px-crit)" : "var(--px-brand)",
              }}>
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <input ref={inputRef} type="text" value={input}
              placeholder={isListening ? "Dictando..." : "Escribe tu consulta..."}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="px-input flex-1" style={{ fontSize: "var(--px-text-sm)" }} />
            <button onClick={() => sendMessage()} disabled={!input.trim()} className="px-btn px-btn-primary shrink-0" style={{ width: 40, height: 40, padding: 0 }}>
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Info panel — desktop sidebar / mobile overlay */}
        {showInfo && (
          <div className="fixed md:relative inset-0 md:inset-auto md:w-72 lg:w-80 md:shrink-0 z-50 md:z-auto flex flex-col">
            {/* Mobile backdrop */}
            <div className="md:hidden absolute inset-0 bg-black/50" onClick={() => setShowInfo(false)} />
            <div className="relative md:static ml-auto w-80 md:w-full h-full px-card flex flex-col overflow-y-auto scrollbar-tactical px-dialog-enter" style={{ background: "var(--px-surface)" }}>
              <div className="flex items-center justify-between" style={{ padding: "var(--px-3) var(--px-4)", borderBottom: "1px solid var(--px-hairline)", flexShrink: 0 }}>
                <div className="flex items-center gap-2">
                  <Bot className="w-8 h-8" style={{ color: "var(--px-brand)" }} />
                  <div>
                    <div style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-md)", fontWeight: 700, color: "var(--px-text)" }}>ATENEA</div>
                    <div style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-brand)" }}>ASISTENTE TÁCTICO v1.0</div>
                  </div>
                </div>
                <button onClick={() => setShowInfo(false)} style={{ color: "var(--px-text-faint)", background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
              </div>

              <div style={{ padding: "var(--px-4)" }}>
                <div style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", color: "var(--px-text-faint)", lineHeight: 1.6, marginBottom: "var(--px-4)" }}>
                  IA especializada en seguridad pública del Estado de México. Accede a alertas, predicciones y estadísticas.
                </div>

                <div className="px-eyebrow" style={{ marginBottom: "var(--px-2)" }}>Capacidades</div>
                {[
                  { icon: <Brain size={12} />, label: "Análisis de incidentes" },
                  { icon: <Zap size={12} />, label: "Alertas en tiempo real" },
                  { icon: <Bot size={12} />, label: "Predicciones ML" },
                  { icon: <Mic size={12} />, label: "Dictado por voz" },
                  { icon: <Volume2 size={12} />, label: "Respuesta por voz" },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2" style={{ padding: "var(--px-2) 0", borderBottom: "1px solid var(--px-hairline)" }}>
                    <span style={{ color: "var(--px-brand)" }}>{c.icon}</span>
                    <span style={{ fontFamily: "var(--px-body)", fontSize: "var(--px-text-sm)", color: "var(--px-text-muted)" }}>{c.label}</span>
                  </div>
                ))}

                <div className="mt-4" style={{ padding: "var(--px-2) var(--px-3)", borderRadius: "var(--px-r-sm)", background: speechSupported ? "color-mix(in srgb, var(--px-ok) 6%, transparent)" : "color-mix(in srgb, var(--px-crit) 6%, transparent)", border: `1px solid ${speechSupported ? "color-mix(in srgb, var(--px-ok) 20%, transparent)" : "color-mix(in srgb, var(--px-crit) 20%, transparent)"}` }}>
                  <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: speechSupported ? "var(--px-ok)" : "var(--px-crit)" }}>
                    {speechSupported ? "✓ Dictado disponible" : "✗ Dictado no disponible"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
