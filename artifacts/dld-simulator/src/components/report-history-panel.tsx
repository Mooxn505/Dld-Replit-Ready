import { Fragment, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, History, Download, Trash2, GitCompare, X, Star, RotateCcw, Pencil, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { buildPdf, buildCombinedPdf, type DataExportPanelProps } from "./data-export-panel";

export interface ReportHistoryEntry extends DataExportPanelProps {
  id: string;
  timestamp: number;
  note?: string;
}

export interface LoadConfigPayload {
  G: number;
  N: number;
  d1: number;
  d2: number;
  label1: string;
  label2: string;
}

interface ReportHistoryPanelProps {
  history: ReportHistoryEntry[];
  onClear: () => void;
  onRemove: (id: string) => void;
  onLoadConfig?: (payload: LoadConfigPayload) => void;
  onUpdateNote?: (id: string, note: string) => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmt(n: number | undefined | null, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(decimals);
}

interface ComparisonMetric {
  label: string;
  a: string;
  b: string;
  better?: "a" | "b" | null;
}

function buildComparisonMetrics(a: ReportHistoryEntry, b: ReportHistoryEntry): ComparisonMetric[] {
  const metrics: ComparisonMetric[] = [];

  const pick = (higherIsBetter: boolean, av: number | null, bv: number | null): "a" | "b" | null => {
    if (av == null || bv == null || av === bv) return null;
    if (higherIsBetter) return av > bv ? "a" : "b";
    return av < bv ? "a" : "b";
  };

  metrics.push({ label: "Geometry (G/N)", a: `${a.G}/${a.N}`, b: `${b.G}/${b.N}` });

  const effA = a.analyzeData?.efficiency ?? null;
  const effB = b.analyzeData?.efficiency ?? null;
  metrics.push({
    label: "Sorting efficiency (%)",
    a: effA != null ? fmt(effA, 1) : "—",
    b: effB != null ? fmt(effB, 1) : "—",
    better: pick(true, effA, effB),
  });

  const dcA = a.analyzeData?.Dc ?? null;
  const dcB = b.analyzeData?.Dc ?? null;
  metrics.push({
    label: "Critical diameter Dc (µm)",
    a: fmt(dcA),
    b: fmt(dcB),
  });

  const thrA = a.throughputData?.throughput_cells_per_min ?? null;
  const thrB = b.throughputData?.throughput_cells_per_min ?? null;
  metrics.push({
    label: "Throughput (cells/min)",
    a: thrA != null ? thrA.toFixed(0) : "—",
    b: thrB != null ? thrB.toFixed(0) : "—",
    better: pick(true, thrA, thrB),
  });

  const cascEffA = a.cascadeData?.summary.overall_efficiency ?? null;
  const cascEffB = b.cascadeData?.summary.overall_efficiency ?? null;
  metrics.push({
    label: "Cascade overall efficiency (%)",
    a: cascEffA != null ? fmt(cascEffA, 1) : "—",
    b: cascEffB != null ? fmt(cascEffB, 1) : "—",
    better: pick(true, cascEffA, cascEffB),
  });

  const purA = a.purityData?.summary.final_purity_pct ?? null;
  const purB = b.purityData?.summary.final_purity_pct ?? null;
  metrics.push({
    label: "Final purity (%)",
    a: purA != null ? fmt(purA, 1) : "—",
    b: purB != null ? fmt(purB, 1) : "—",
    better: pick(true, purA, purB),
  });

  const recA = a.purityData?.summary.recovery_pct ?? null;
  const recB = b.purityData?.summary.recovery_pct ?? null;
  metrics.push({
    label: "Recovery (%)",
    a: recA != null ? fmt(recA, 1) : "—",
    b: recB != null ? fmt(recB, 1) : "—",
    better: pick(true, recA, recB),
  });

  const enrA = a.purityData?.summary.enrichment_factor ?? null;
  const enrB = b.purityData?.summary.enrichment_factor ?? null;
  metrics.push({
    label: "Enrichment factor",
    a: enrA != null ? `${fmt(enrA, 1)}x` : "—",
    b: enrB != null ? `${fmt(enrB, 1)}x` : "—",
    better: pick(true, enrA, enrB),
  });

  return metrics;
}

function computeCompositeScores(history: ReportHistoryEntry[]): Map<string, number> {
  const scores = new Map<string, number>();
  if (history.length < 2) return scores;

  const maxThroughput = Math.max(
    0,
    ...history.map((e) => e.throughputData?.throughput_cells_per_min ?? 0),
  );

  for (const entry of history) {
    const parts: number[] = [];
    if (entry.analyzeData?.efficiency != null) parts.push(entry.analyzeData.efficiency);
    if (entry.cascadeData?.summary.overall_efficiency != null)
      parts.push(entry.cascadeData.summary.overall_efficiency);
    if (entry.purityData?.summary.final_purity_pct != null)
      parts.push(entry.purityData.summary.final_purity_pct);
    if (entry.purityData?.summary.recovery_pct != null)
      parts.push(entry.purityData.summary.recovery_pct);
    if (maxThroughput > 0 && entry.throughputData?.throughput_cells_per_min != null) {
      parts.push((entry.throughputData.throughput_cells_per_min / maxThroughput) * 100);
    }
    if (parts.length > 0) {
      scores.set(
        entry.id,
        parts.reduce((sum, v) => sum + v, 0) / parts.length,
      );
    }
  }

  return scores;
}

export function ReportHistoryPanel({ history, onClear, onRemove, onLoadConfig, onUpdateNote }: ReportHistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const compositeScores = useMemo(() => computeCompositeScores(history), [history]);
  const bestId = useMemo(() => {
    if (compositeScores.size === 0) return null;
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const [id, score] of compositeScores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    return best;
  }, [compositeScores]);

  const toggleSelect = (id: string) => {
    setShowComparison(false);
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const selectedEntries = selectedIds
    .map((id) => history.find((e) => e.id === id))
    .filter((e): e is ReportHistoryEntry => !!e);

  const handleRedownload = (entry: ReportHistoryEntry) => {
    const doc = buildPdf(entry);
    const ts = new Date(entry.timestamp).toISOString().slice(0, 10);
    doc.save(`dld_lab_report_G${entry.G}_N${entry.N}_${ts}.pdf`);
  };

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-[#1D9E75] shrink-0" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Report History
          </span>
          {history.length > 0 && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30">
              {history.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                  No reports generated yet. Use "Generate Full Report" to create one.
                </p>
              ) : (
                <>
                  <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1">
                    Select two entries to compare
                    {bestId && (
                      <span className="flex items-center gap-0.5 text-yellow-400/90 normal-case">
                        · <Star className="w-2.5 h-2.5 fill-yellow-400" /> = best run
                      </span>
                    )}
                  </p>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {history.map((entry) => {
                      const isSelected = selectedIds.includes(entry.id);
                      return (
                        <div
                          key={entry.id}
                          className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded border transition-colors ${
                            isSelected
                              ? "border-[#1D9E75]/60 bg-[#1D9E75]/10"
                              : "border-border/40 bg-background/40"
                          }`}
                        >
                          <button
                            onClick={() => toggleSelect(entry.id)}
                            className="flex items-center gap-2 min-w-0 text-left flex-1"
                            title="Select for comparison"
                          >
                            <span
                              className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center ${
                                isSelected
                                  ? "bg-[#1D9E75] border-[#1D9E75]"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                            </span>
                            <span className="min-w-0">
                              <p className="text-[10px] font-mono text-foreground/80 truncate flex items-center gap-1">
                                {entry.id === bestId && (
                                  <span title="Best performing run">
                                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 shrink-0" />
                                  </span>
                                )}
                                G={entry.G} N={entry.N} · {entry.label1}/{entry.label2}
                              </p>
                              <p className="text-[9px] font-mono text-muted-foreground">
                                {formatTimestamp(entry.timestamp)}
                              </p>
                              {editingNoteId === entry.id ? (
                                <div className="mt-1 flex items-start gap-1" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    ref={noteInputRef}
                                    value={draftNote}
                                    onChange={(e) => setDraftNote(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        onUpdateNote?.(entry.id, draftNote.trim());
                                        setEditingNoteId(null);
                                      }
                                      if (e.key === "Escape") setEditingNoteId(null);
                                    }}
                                    rows={2}
                                    placeholder="Add a note… (Enter to save)"
                                    className="flex-1 text-[9px] font-mono bg-background/60 border border-border/60 rounded px-1.5 py-1 text-foreground/80 placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-[#1D9E75]/60"
                                  />
                                  <button
                                    onClick={() => {
                                      onUpdateNote?.(entry.id, draftNote.trim());
                                      setEditingNoteId(null);
                                    }}
                                    className="mt-0.5 p-1 rounded text-[#1D9E75] hover:bg-[#1D9E75]/10 transition-colors"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : entry.note ? (
                                <p className="text-[9px] font-mono text-foreground/60 mt-0.5 leading-tight line-clamp-2">
                                  "{entry.note}"
                                </p>
                              ) : null}
                            </span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            {onUpdateNote && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDraftNote(entry.note ?? "");
                                  setEditingNoteId(editingNoteId === entry.id ? null : entry.id);
                                  setTimeout(() => noteInputRef.current?.focus(), 50);
                                }}
                                title={entry.note ? "Edit note" : "Add note"}
                                className={`p-1.5 rounded border transition-colors ${
                                  entry.note
                                    ? "border-amber-500/40 text-amber-400 bg-amber-500/5 hover:bg-amber-500/15"
                                    : "border-border/40 text-muted-foreground/60 bg-background/40 hover:text-amber-400 hover:border-amber-500/40"
                                }`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {onLoadConfig && (
                              <button
                                onClick={() =>
                                  onLoadConfig({
                                    G: entry.G,
                                    N: entry.N,
                                    d1: entry.d1,
                                    d2: entry.d2,
                                    label1: entry.label1,
                                    label2: entry.label2,
                                  })
                                }
                                title="Load this configuration into the simulator"
                                className="p-1.5 rounded border border-blue-500/40 text-blue-400 bg-blue-500/5 hover:bg-blue-500/15 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRedownload(entry)}
                              title="Re-download PDF"
                              className="p-1.5 rounded border border-[#1D9E75]/40 text-[#1D9E75] bg-[#1D9E75]/5 hover:bg-[#1D9E75]/15 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onRemove(entry.id)}
                              title="Remove entry"
                              className="p-1.5 rounded border border-border/40 text-muted-foreground bg-background/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedEntries.length === 2 && (
                    <button
                      onClick={() => setShowComparison((v) => !v)}
                      className="w-full flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider py-1.5 rounded border border-[#1D9E75]/50 text-[#1D9E75] bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20 transition-colors"
                    >
                      <GitCompare className="w-3 h-3" />
                      {showComparison ? "Hide Comparison" : "Compare Selected"}
                    </button>
                  )}

                  <AnimatePresence initial={false}>
                    {showComparison && selectedEntries.length === 2 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="rounded border border-border/50 bg-background/40 p-2 space-y-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                              Comparison
                            </span>
                            <button
                              onClick={() => setShowComparison(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1 text-[9px] font-mono">
                            <span className="text-muted-foreground">Metric</span>
                            <span className="text-right text-foreground/70">
                              {formatTimestamp(selectedEntries[0].timestamp)}
                            </span>
                            <span className="text-right text-foreground/70">
                              {formatTimestamp(selectedEntries[1].timestamp)}
                            </span>
                            {(selectedEntries[0].note || selectedEntries[1].note) && (
                              <Fragment key="notes">
                                <span className="text-muted-foreground">Notes</span>
                                <span className="text-right text-amber-400/80 max-w-[80px] truncate" title={selectedEntries[0].note ?? ""}>
                                  {selectedEntries[0].note || "—"}
                                </span>
                                <span className="text-right text-amber-400/80 max-w-[80px] truncate" title={selectedEntries[1].note ?? ""}>
                                  {selectedEntries[1].note || "—"}
                                </span>
                              </Fragment>
                            )}
                            {buildComparisonMetrics(selectedEntries[0], selectedEntries[1]).map((m) => (
                              <Fragment key={m.label}>
                                <span className="text-muted-foreground truncate">
                                  {m.label}
                                </span>
                                <span
                                  className={`text-right ${
                                    m.better === "a" ? "text-[#1D9E75] font-bold" : "text-foreground/80"
                                  }`}
                                >
                                  {m.a}
                                </span>
                                <span
                                  className={`text-right ${
                                    m.better === "b" ? "text-[#1D9E75] font-bold" : "text-foreground/80"
                                  }`}
                                >
                                  {m.b}
                                </span>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2 pt-1">
                    {history.length >= 2 && (
                      <button
                        onClick={() => {
                          const doc = buildCombinedPdf(history);
                          const ts = new Date().toISOString().slice(0, 10);
                          doc.save(`dld_combined_report_${ts}_${history.length}runs.pdf`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase tracking-wider py-1.5 rounded border border-[#1D9E75]/50 text-[#1D9E75] bg-[#1D9E75]/8 hover:bg-[#1D9E75]/20 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Export all ({history.length}) as PDF
                      </button>
                    )}
                    <button
                      onClick={onClear}
                      className={`text-[9px] font-mono text-muted-foreground uppercase tracking-wider py-1.5 hover:text-destructive transition-colors ${history.length >= 2 ? "" : "w-full text-center"}`}
                    >
                      Clear all
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
