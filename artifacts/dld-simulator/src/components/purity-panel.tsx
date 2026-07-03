import { useState, useMemo } from "react";
import { useAnalyzePurity } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Droplets, ArrowRight, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PurityResponse } from "@workspace/api-client-react/src/generated/api.schemas";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function PurityBar({ pct, colorClass, label }: { pct: number; colorClass: string; label: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/20 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${clamp(pct, 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface PurityPanelProps {
  d1: number;
  d2: number;
  label1: string;
  label2: string;
  currentG: number;
  currentN: number;
  setG: (v: number) => void;
  setN: (v: number) => void;
  onApply: () => void;
}

export function PurityPanel({ d1, d2, label1, label2, currentG, currentN, setG, setN, onApply }: PurityPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState<"d1" | "d2">("d2");
  const [targetFractionPct, setTargetFractionPct] = useState(1);
  const [g1, setG1] = useState(currentG);
  const [n1, setN1] = useState(currentN);
  const [useStage2, setUseStage2] = useState(false);
  const [g2, setG2] = useState(Math.max(5, currentG - 10));
  const [n2, setN2] = useState(Math.min(15, currentN + 3));
  const [result, setResult] = useState<PurityResponse | null>(null);

  const analyze = useAnalyzePurity();

  const targetLabel = target === "d1" ? label1 : label2;
  const otherLabel = target === "d1" ? label2 : label1;

  const handleRun = () => {
    analyze.mutate(
      {
        data: {
          d1,
          d2,
          target_fraction_pct: targetFractionPct,
          target,
          stage1: { G: g1, N: n1 },
          stage2: useStage2 ? { G: g2, N: n2 } : undefined,
        },
      },
      { onSuccess: (data) => setResult(data) },
    );
  };

  const applyStage = (G: number, N: number) => {
    setG(G);
    setN(N);
    setTimeout(onApply, 50);
  };

  const enrichmentLabel = useMemo(() => {
    if (!result) return null;
    return `${result.summary.enrichment_factor.toFixed(1)}×`;
  }, [result]);

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        <Droplets className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span className="flex-1 text-[11px] font-mono font-semibold uppercase tracking-widest">
          Purity Simulator
        </span>
        {result && !expanded && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-teal-400/40 text-teal-400 bg-teal-400/8">
            {result.summary.final_purity_pct.toFixed(1)}% purity
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
              <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
                Models a mixed sample with realistic (non-binary) sorting
                near Dc, then computes output purity & recovery yield.
              </p>

              {/* Target selector */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                  Target to enrich
                </span>
                <div className="flex gap-1.5">
                  {(["d1", "d2"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTarget(t)}
                      className={`flex-1 px-2 py-1.5 rounded-md border text-[10px] font-mono transition-colors ${
                        target === t
                          ? "border-teal-400/50 bg-teal-400/10 text-teal-300"
                          : "border-border/30 bg-muted/10 text-muted-foreground hover:bg-muted/20"
                      }`}
                    >
                      {t === "d1" ? label1 : label2} ({t === "d1" ? d1 : d2}µm)
                    </button>
                  ))}
                </div>
              </div>

              {/* Sample composition */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider block">
                  Sample composition — {targetLabel} at {targetFractionPct}%
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={targetFractionPct}
                  onChange={(e) => setTargetFractionPct(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
                <p className="text-[9px] font-mono text-muted-foreground">
                  {targetFractionPct}% {targetLabel} + {(100 - targetFractionPct).toFixed(1)}% {otherLabel}
                </p>
              </div>

              {/* Stage 1 geometry */}
              <div className="rounded-lg border border-violet-400/30 bg-muted/10 p-2.5 space-y-1.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-violet-300">
                  Stage 1
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="text-[8px] font-mono text-muted-foreground block mb-0.5">G (µm)</label>
                    <input
                      type="number"
                      value={g1}
                      min={5}
                      max={60}
                      step={5}
                      onChange={(e) => setG1(clamp(parseFloat(e.target.value) || 10, 5, 60))}
                      className="w-full h-6 px-1.5 text-[10px] font-mono bg-background/60 border border-border/40 rounded focus:outline-none focus:border-violet-400/50 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-muted-foreground block mb-0.5">N</label>
                    <input
                      type="number"
                      value={n1}
                      min={2}
                      max={15}
                      step={1}
                      onChange={(e) => setN1(clamp(parseInt(e.target.value) || 4, 2, 15))}
                      className="w-full h-6 px-1.5 text-[10px] font-mono bg-background/60 border border-border/40 rounded focus:outline-none focus:border-violet-400/50 text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Stage 2 toggle */}
              {!useStage2 ? (
                <button
                  onClick={() => setUseStage2(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-border/40 text-[9px] font-mono text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add second stage
                </button>
              ) : (
                <div className="rounded-lg border border-cyan-400/30 bg-muted/10 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                      Stage 2
                    </span>
                    <button onClick={() => setUseStage2(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[8px] font-mono text-muted-foreground block mb-0.5">G (µm)</label>
                      <input
                        type="number"
                        value={g2}
                        min={5}
                        max={60}
                        step={5}
                        onChange={(e) => setG2(clamp(parseFloat(e.target.value) || 10, 5, 60))}
                        className="w-full h-6 px-1.5 text-[10px] font-mono bg-background/60 border border-border/40 rounded focus:outline-none focus:border-cyan-400/50 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-mono text-muted-foreground block mb-0.5">N</label>
                      <input
                        type="number"
                        value={n2}
                        min={2}
                        max={15}
                        step={1}
                        onChange={(e) => setN2(clamp(parseInt(e.target.value) || 4, 2, 15))}
                        className="w-full h-6 px-1.5 text-[10px] font-mono bg-background/60 border border-border/40 rounded focus:outline-none focus:border-cyan-400/50 text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleRun}
                disabled={analyze.isPending}
                className="w-full h-8 font-mono text-[10px] uppercase tracking-wider bg-teal-700 hover:bg-teal-600 text-white border-0"
              >
                <Droplets className="w-3 h-3 mr-1.5" />
                {analyze.isPending ? "Simulating…" : "Simulate Purity"}
              </Button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2.5"
                >
                  {/* Funnel */}
                  <div className="flex items-center gap-1 font-mono text-[8px] text-muted-foreground justify-between">
                    <div className="text-center leading-tight">
                      <div className="font-bold text-[9px] mb-0.5">SAMPLE</div>
                      <div>{result.summary.initial_purity_pct.toFixed(1)}%</div>
                      <div>{targetLabel}</div>
                    </div>
                    <ArrowRight className="w-3 h-3 shrink-0 opacity-40" />
                    <div className="text-center leading-tight">
                      <div className="font-bold text-[9px] mb-0.5 text-violet-400">STAGE 1</div>
                      <div>{result.stage1.chosen_outlet} outlet</div>
                      <div>
                        {(result.stage1.chosen_outlet === "bump"
                          ? result.stage1.outlet_bump
                          : result.stage1.outlet_zigzag
                        ).purity_target_pct.toFixed(1)}
                        %
                      </div>
                    </div>
                    {result.stage2 && (
                      <>
                        <ArrowRight className="w-3 h-3 shrink-0 opacity-40" />
                        <div className="text-center leading-tight">
                          <div className="font-bold text-[9px] mb-0.5 text-cyan-400">STAGE 2</div>
                          <div>{result.stage2.chosen_outlet} outlet</div>
                          <div>
                            {(result.stage2.chosen_outlet === "bump"
                              ? result.stage2.outlet_bump
                              : result.stage2.outlet_zigzag
                            ).purity_target_pct.toFixed(1)}
                            %
                          </div>
                        </div>
                      </>
                    )}
                    <ArrowRight className="w-3 h-3 shrink-0 opacity-40" />
                    <div className="text-center leading-tight">
                      <div className="font-bold text-[9px] mb-0.5 text-teal-400">OUTPUT</div>
                      <div className="text-teal-300 font-bold">
                        {result.summary.final_purity_pct.toFixed(1)}%
                      </div>
                      <div>{targetLabel}</div>
                    </div>
                  </div>

                  {/* Before/after bars */}
                  <div className="rounded-md border border-border/40 bg-muted/10 p-2.5 space-y-2">
                    <PurityBar
                      pct={result.summary.initial_purity_pct}
                      colorClass="bg-muted-foreground/50"
                      label={`Before (${targetLabel})`}
                    />
                    <PurityBar
                      pct={result.summary.final_purity_pct}
                      colorClass="bg-teal-400"
                      label={`After (${targetLabel})`}
                    />
                  </div>

                  {/* Metrics */}
                  <div className="rounded-md border border-border/40 bg-muted/10 grid grid-cols-3 divide-x divide-border/30">
                    <div className="px-2 py-2">
                      <div className="text-[8px] font-mono text-muted-foreground">Final Purity</div>
                      <div className="text-[11px] font-mono font-semibold text-foreground">
                        {result.summary.final_purity_pct.toFixed(1)}%
                      </div>
                    </div>
                    <div className="px-2 py-2">
                      <div className="text-[8px] font-mono text-muted-foreground">Recovery</div>
                      <div className="text-[11px] font-mono font-semibold text-foreground">
                        {result.summary.recovery_pct.toFixed(1)}%
                      </div>
                    </div>
                    <div className="px-2 py-2">
                      <div className="text-[8px] font-mono text-muted-foreground">Enrichment</div>
                      <div className="text-[11px] font-mono font-semibold text-teal-300">
                        {enrichmentLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => applyStage(result.stage1.G, result.stage1.N)}
                      className="flex-1 text-[8px] font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 text-center py-1"
                    >
                      Apply Stage 1 geometry
                    </button>
                    {result.stage2 && (
                      <button
                        onClick={() => applyStage(result.stage2!.G, result.stage2!.N)}
                        className="flex-1 text-[8px] font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 text-center py-1"
                      >
                        Apply Stage 2 geometry
                      </button>
                    )}
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
