import { useState } from "react";
import { useEstimateThroughput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ThroughputResponse } from "@workspace/api-client-react/src/generated/api.schemas";

const PRESETS = [
  { label: "Whole blood (WBC)", value: 5_000_000 },
  { label: "Diluted blood 1:10", value: 500_000 },
  { label: "Bone marrow aspirate", value: 20_000_000 },
  { label: "Urine (CTC search)", value: 10_000 },
];

interface ThroughputPanelProps {
  d1: number;
  d2: number;
  G: number;
  N: number;
  onResult: (data: ThroughputResponse) => void;
}

export function ThroughputPanel({ d1, d2, G, N, onResult }: ThroughputPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [concentration, setConcentration] = useState(5_000_000);
  const [sampleVolume, setSampleVolume] = useState(1.0);

  const estimateThroughput = useEstimateThroughput();

  const handleRun = () => {
    estimateThroughput.mutate(
      {
        data: {
          d1, d2, G, N,
          concentration_cells_per_ml: concentration,
          sample_volume_ml: sampleVolume,
        },
      },
      { onSuccess: onResult },
    );
  };

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-[#1D9E75] shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Throughput Estimator
          </span>
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
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                Computes cells/min at the optimal Re-limited flow rate for G={G} µm, N={N}.
              </p>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block">
                  Concentration preset
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setConcentration(p.value)}
                      className={`text-left px-2 py-1.5 rounded text-[9px] font-mono border transition-colors ${
                        concentration === p.value
                          ? "border-[#1D9E75]/60 bg-[#1D9E75]/10 text-[#1D9E75]"
                          : "border-border/40 bg-background/40 text-muted-foreground hover:border-border/70"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                  Concentration (cells/mL)
                </label>
                <input
                  type="number"
                  value={concentration}
                  onChange={(e) => setConcentration(Number(e.target.value))}
                  step="100000"
                  min="1000"
                  className="w-full bg-muted/30 border border-border/50 rounded px-2 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-[#1D9E75]/40"
                />
              </div>

              <div>
                <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                  Sample volume (mL)
                </label>
                <input
                  type="number"
                  value={sampleVolume}
                  onChange={(e) => setSampleVolume(Number(e.target.value))}
                  step="0.5"
                  min="0.01"
                  className="w-full bg-muted/30 border border-border/50 rounded px-2 py-1 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-[#1D9E75]/40"
                />
              </div>

              <Button
                variant="outline"
                onClick={handleRun}
                disabled={estimateThroughput.isPending || !concentration || !sampleVolume}
                className="w-full font-mono text-[10px] uppercase tracking-wider h-8 border-[#1D9E75]/40 text-[#1D9E75] bg-[#1D9E75]/5 hover:bg-[#1D9E75]/15"
              >
                {estimateThroughput.isPending ? (
                  <span className="animate-pulse">Computing…</span>
                ) : (
                  <>
                    <svg className="w-3 h-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Estimate Throughput
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
