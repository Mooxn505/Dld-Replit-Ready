import { useState, useMemo } from "react";
import { useOptimizeGeometry } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Sparkles, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { OptimizeResponse } from "@workspace/api-client-react/src/generated/api.schemas";

type Objective = "efficiency" | "q_max" | "dc_target";

const OBJECTIVES: { value: Objective; label: string; description: string }[] = [
  { value: "efficiency", label: "Max Efficiency", description: "Best geometric separation for your particles" },
  { value: "q_max", label: "Max Q_max", description: "Highest flow rate while staying in Stokes regime" },
  { value: "dc_target", label: "Target Dc", description: "Find G, N giving Dc closest to a specified size" },
];

interface OptimizePanelProps {
  d1: number;
  d2: number;
  setG: (v: number) => void;
  setN: (v: number) => void;
  onAnalyze: () => void;
}

function ValueHeatmap({ data }: { data: OptimizeResponse }) {
  const { G_vals, N_vals, value_matrix, best_G, best_N, objective } = data;

  const allValues = value_matrix.flat();
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal;

  const getColor = (val: number) => {
    const t = range > 0 ? (val - minVal) / range : 0.5;
    if (objective === "q_max") {
      const r = Math.round(55 * (1 - t) + 29 * t);
      const g = Math.round(114 * (1 - t) + 158 * t);
      const b = Math.round(255 * (1 - t) + 117 * t);
      return `rgb(${r},${g},${b})`;
    }
    if (t < 0.5) {
      const s = t / 0.5;
      return `rgb(${Math.round(226 * (1 - s) + 234 * s)},${Math.round(75 * (1 - s) + 179 * s)},${Math.round(74 * (1 - s) + 8 * s)})`;
    } else {
      const s = (t - 0.5) / 0.5;
      return `rgb(${Math.round(234 * (1 - s) + 29 * s)},${Math.round(179 * (1 - s) + 158 * s)},${Math.round(8 * (1 - s) + 117 * s)})`;
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex gap-px" style={{ flexDirection: "column" }}>
        {[...value_matrix].reverse().map((row, revI) => {
          const nIdx = N_vals.length - 1 - revI;
          const currentN = N_vals[nIdx];
          return (
            <div key={currentN} className="flex gap-px items-center">
              <span className="text-[8px] font-mono text-muted-foreground w-4 text-right shrink-0 pr-0.5">
                {currentN}
              </span>
              <div className="flex gap-px flex-1">
                {row.map((val, gIdx) => {
                  const currentG = G_vals[gIdx];
                  const isBest = currentG === best_G && currentN === best_N;
                  return (
                    <div
                      key={currentG}
                      title={`G=${currentG} N=${currentN}: ${val.toFixed(3)}`}
                      className="flex-1 relative"
                      style={{
                        height: "14px",
                        backgroundColor: getColor(val),
                        outline: isBest ? "2px solid white" : undefined,
                        outlineOffset: isBest ? "-1px" : undefined,
                        zIndex: isBest ? 1 : undefined,
                      }}
                    >
                      {isBest && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-white opacity-80" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex mt-1 ml-5 gap-px">
        {G_vals.filter((_, i) => i % 2 === 0).map((g) => (
          <div key={g} className="flex-1 text-center text-[7px] font-mono text-muted-foreground">{g}</div>
        ))}
      </div>
      <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-0.5 ml-5">
        <span>G (µm) →</span>
        <span className="text-[7px]">N ↑ (left axis)</span>
      </div>
    </div>
  );
}

export function OptimizePanel({ d1, d2, setG, setN, onAnalyze }: OptimizePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [objective, setObjective] = useState<Objective>("efficiency");
  const [dcTarget, setDcTarget] = useState(10);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [applied, setApplied] = useState(false);

  const optimize = useOptimizeGeometry();

  const handleRun = () => {
    optimize.mutate(
      {
        data: {
          d1,
          d2,
          objective,
          dc_target: objective === "dc_target" ? dcTarget : undefined,
        },
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setApplied(false);
        },
      },
    );
  };

  const handleApply = () => {
    if (!result) return;
    setG(result.best_G);
    setN(result.best_N);
    setApplied(true);
    setTimeout(onAnalyze, 50);
  };

  const resultLabel = useMemo(() => {
    if (!result) return null;
    if (result.objective === "efficiency") return `${result.best_value.toFixed(1)}%`;
    if (result.objective === "q_max") return `${result.best_value.toFixed(4)} µL/min`;
    return `Dc ≈ ${result.best_value < 0 ? "off" : result.best_value.toFixed(2)} µm`;
  }, [result]);

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <span className="flex-1 text-[11px] font-mono font-semibold uppercase tracking-widest">
          Geometry Optimizer
        </span>
        {result && !expanded && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-violet-400/40 text-violet-400 bg-violet-400/8">
            G={result.best_G} N={result.best_N}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Objective selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                  Objective
                </span>
                <div className="space-y-1">
                  {OBJECTIVES.map((obj) => (
                    <button
                      key={obj.value}
                      onClick={() => setObjective(obj.value)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md border transition-colors ${
                        objective === obj.value
                          ? "border-violet-400/50 bg-violet-400/10 text-violet-300"
                          : "border-border/30 bg-muted/10 text-muted-foreground hover:bg-muted/20"
                      }`}
                    >
                      <div className="text-[10px] font-mono font-semibold">{obj.label}</div>
                      <div className="text-[9px] font-mono opacity-70">{obj.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* dc_target input */}
              <AnimatePresence>
                {objective === "dc_target" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                        Target Dc (µm)
                      </label>
                      <input
                        type="number"
                        value={dcTarget}
                        min={1}
                        max={100}
                        step={0.5}
                        onChange={(e) => setDcTarget(parseFloat(e.target.value) || 10)}
                        className="w-full h-7 px-2 text-[11px] font-mono bg-muted/20 border border-border/50 rounded focus:outline-none focus:border-violet-400/50 text-foreground"
                      />
                      <p className="text-[9px] font-mono text-muted-foreground">
                        Typical: between d1={d1} and d2={d2} µm
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Run button */}
              <Button
                onClick={handleRun}
                disabled={optimize.isPending}
                className="w-full h-8 font-mono text-[10px] uppercase tracking-wider bg-violet-600 hover:bg-violet-500 text-white border-0"
              >
                <Sparkles className="w-3 h-3 mr-1.5" />
                {optimize.isPending ? "Optimizing…" : "Run Optimizer"}
              </Button>

              {/* Results */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2.5"
                >
                  {/* Best result badge */}
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-violet-400/30 bg-violet-400/8">
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">
                        Best geometry
                      </div>
                      <div className="text-[13px] font-mono font-bold text-violet-300">
                        G = {result.best_G} µm · N = {result.best_N}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                        {result.metric_label}: {resultLabel}
                      </div>
                    </div>
                    <Button
                      onClick={handleApply}
                      size="sm"
                      className={`h-7 px-2.5 text-[9px] font-mono uppercase tracking-wider shrink-0 transition-colors ${
                        applied
                          ? "bg-emerald-700 hover:bg-emerald-700 text-white"
                          : "bg-violet-600 hover:bg-violet-500 text-white"
                      } border-0`}
                    >
                      {applied ? (
                        <>
                          <CheckCheck className="w-3 h-3 mr-1" />
                          Applied
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>

                  {/* Mini heatmap */}
                  <div>
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                      Objective landscape — white dot = best
                    </div>
                    <ValueHeatmap data={result} />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
