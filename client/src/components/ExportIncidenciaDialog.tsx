/**
 * ExportIncidenciaDialog — Exportar incidencia a CSV (PREDIX v2)
 * Combobox con teclado para municipios, pills para tipos de delito
 */

import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, AlertCircle, Loader, Search, X } from "lucide-react";

const CRIME_TYPES = [
  { id: "homicidios", label: "Homicidios", color: "var(--px-crit)" },
  { id: "robos", label: "Robos", color: "var(--px-warn)" },
  { id: "lesiones", label: "Lesiones", color: "var(--px-warn)" },
  { id: "violenciaSexual", label: "V. Sexual", color: "var(--px-crit)" },
  { id: "traficoDeDropgas", label: "Drogas", color: "var(--px-brand)" },
  { id: "otrosDelitos", label: "Otros", color: "var(--px-text-muted)" },
];

export function ExportIncidenciaDialog() {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCrimes, setSelectedCrimes] = useState<string[]>([]);
  const [selectedMunis, setSelectedMunis] = useState<string[]>([]);
  const [muniQuery, setMuniQuery] = useState("");
  const [muniOpen, setMuniOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const { data: municipiosData } = trpc.predicciones.obtenerMunicipios.useQuery();
  const allMunis = municipiosData?.data || [];

  const filteredMunis = useMemo(() => {
    const available = allMunis.filter(m => !selectedMunis.includes(m));
    return muniQuery ? available.filter(m => m.toLowerCase().includes(muniQuery.toLowerCase())) : available;
  }, [allMunis, selectedMunis, muniQuery]);

  const exportQuery = trpc.incidencia.exportCsv.useQuery(
    { startDate: startDate || undefined, endDate: endDate || undefined, crimeTypes: selectedCrimes.length > 0 ? selectedCrimes : undefined },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (result.data?.csv) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setOpen(false);
    }
  };

  const toggleCrime = (id: string) => setSelectedCrimes(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const toggleMuni = (m: string) => setSelectedMunis(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-btn px-btn-secondary" style={{ padding: "4px 10px", fontSize: "var(--px-text-xs)" }}>
          <Download size={12} /> Exportar CSV
        </button>
      </DialogTrigger>
      <DialogContent style={{ background: "var(--px-surface)", borderColor: "var(--px-hairline)", maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--px-display)", fontSize: "var(--px-text-lg)", color: "var(--px-text)" }}>Exportar Incidencia</DialogTitle>
          <DialogDescription style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)" }}>
            Filtra y descarga los datos en CSV
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--px-4)", paddingTop: "var(--px-3)" }}>
          {/* Fechas */}
          <div>
            <div className="px-eyebrow" style={{ marginBottom: 6 }}>Rango de fechas</div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="px-label">Desde</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-input" /></div>
              <div><label className="px-label">Hasta</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-input" /></div>
            </div>
          </div>

          {/* Municipios — combobox con búsqueda */}
          <div ref={comboRef} style={{ position: "relative" }}>
            <div className="px-eyebrow" style={{ marginBottom: 6 }}>Municipios <span style={{ color: "var(--px-text-faint)" }}>({selectedMunis.length ? selectedMunis.length + " selec." : "todos"})</span></div>
            <div className="flex items-center gap-1.5 px-input" style={{ display: "flex", padding: "4px 8px" }}>
              <Search size={11} style={{ color: "var(--px-text-faint)", flexShrink: 0 }} />
              <input type="text" placeholder="Buscar municipio..." value={muniQuery}
                onChange={e => { setMuniQuery(e.target.value); setMuniOpen(true); }}
                onFocus={() => setMuniOpen(true)}
                onBlur={() => setTimeout(() => setMuniOpen(false), 200)}
                style={{ background: "transparent", border: "none", outline: "none", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text)", width: "100%" }} />
              {muniQuery && <button onClick={() => setMuniQuery("")} style={{ color: "var(--px-text-faint)", cursor: "pointer" }}><X size={11} /></button>}
            </div>
            {muniOpen && filteredMunis.length > 0 && (
              <div className="scrollbar-tactical" style={{
                position: "absolute", zIndex: 30, left: 0, right: 0, marginTop: 4,
                maxHeight: 180, overflowY: "auto", background: "var(--px-bg)",
                border: "1px solid var(--px-hairline)", borderRadius: "var(--px-r-sm)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
              }}>
                {filteredMunis.slice(0, 30).map(m => (
                  <div key={m} className="cursor-pointer transition-all" style={{ padding: "7px 12px", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-muted)" }}
                    onMouseDown={e => { e.preventDefault(); toggleMuni(m); setMuniQuery(""); }}>
                    {m}
                  </div>
                ))}
                {filteredMunis.length > 30 && (
                  <div style={{ padding: "6px 12px", fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-text-faint)", borderTop: "1px solid var(--px-hairline)" }}>
                    +{filteredMunis.length - 30} más — escribe para filtrar
                  </div>
                )}
              </div>
            )}
            {selectedMunis.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {selectedMunis.map(m => (
                  <span key={m} className="flex items-center gap-1 cursor-pointer" style={{
                    fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", padding: "2px 8px",
                    borderRadius: 999, background: "color-mix(in srgb, var(--px-brand) 18%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--px-brand) 40%, transparent)", color: "var(--px-brand)",
                  }} onClick={() => toggleMuni(m)}>
                    {m} <X size={9} />
                  </span>
                ))}
                <button onClick={() => setSelectedMunis([])} style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-warn)", background: "none", border: "none", cursor: "pointer" }}>
                  Limpiar
                </button>
              </div>
            )}
          </div>

          {/* Tipos de delito — pills */}
          <div>
            <div className="px-eyebrow" style={{ marginBottom: 6 }}>Tipos de delito <span style={{ color: "var(--px-text-faint)" }}>({selectedCrimes.length ? selectedCrimes.length + " selec." : "todos"})</span></div>
            <div className="flex gap-1.5 flex-wrap">
              {CRIME_TYPES.map(c => (
                <button key={c.id} onClick={() => toggleCrime(c.id)} className="transition-all" style={{
                  fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", padding: "5px 10px",
                  borderRadius: 999, cursor: "pointer",
                  background: selectedCrimes.includes(c.id) ? `color-mix(in srgb, ${c.color} 18%, transparent)` : "transparent",
                  border: `1px solid ${selectedCrimes.includes(c.id) ? `color-mix(in srgb, ${c.color} 40%, transparent)` : "var(--px-hairline)"}`,
                  color: selectedCrimes.includes(c.id) ? c.color : "var(--px-text-faint)",
                }}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center gap-2" style={{ padding: "var(--px-2) var(--px-3)", borderRadius: "var(--px-r-sm)", background: "color-mix(in srgb, var(--px-warn) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--px-warn) 25%, transparent)" }}>
            <AlertCircle size={13} style={{ color: "var(--px-warn)", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--px-mono)", fontSize: "var(--px-text-xs)", color: "var(--px-warn)" }}>
              Sin filtros = todos los registros de los 125 municipios
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 justify-end" style={{ paddingTop: "var(--px-3)" }}>
          <button onClick={() => setOpen(false)} className="px-btn px-btn-secondary">Cancelar</button>
          <button onClick={handleExport} disabled={exportQuery.isPending} className="px-btn px-btn-primary" style={{ minWidth: 140 }}>
            {exportQuery.isPending ? <><Loader size={13} className="animate-spin" /> Exportando...</> : <><Download size={13} /> Descargar CSV</>}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
