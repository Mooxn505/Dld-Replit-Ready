import { useState } from "react";
import { ChevronDown, ChevronUp, History, Download, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { buildPdf, type DataExportPanelProps } from "./data-export-panel";

export interface ReportHistoryEntry extends DataExportPanelProps {
  id: string;
  timestamp: number;
}

interface ReportHistoryPanelProps {
  history: ReportHistoryEntry[];
  onClear: () => void;
  onRemove: (id: string) => void;
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

export function ReportHistoryPanel({ history, onClear, onRemove }: ReportHistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);

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
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-border/40 bg-background/40"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono text-foreground/80 truncate">
                            G={entry.G} N={entry.N} · {entry.label1}/{entry.label2}
                          </p>
                          <p className="text-[9px] font-mono text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
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
                    ))}
                  </div>
                  <button
                    onClick={onClear}
                    className="w-full text-center text-[9px] font-mono text-muted-foreground uppercase tracking-wider py-1.5 hover:text-destructive transition-colors"
                  >
                    Clear all history
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
