import { useState, useMemo } from "react";
import { useAnalyzeCascade } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Layers, ArrowRight, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CascadeResponse } from "@workspace/api-client-react/src/generated/api.schemas";

const DC_FORMULA = (G: number, N: number) => 1.4 * G * Math.pow(N, -0.48);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

interface StageCardProps {
  label: string;
  color: string;
  G: number;
  N: number;
  d1: number;
  d2: number;
  onGChange: (v: number) => void;
  onNChange: (v: number) => void;
  onApply?: () => void;
  result?: CascadeResponse["stage1"] | null;
}

function StageCard({ label, color, G, N, d1, d2, onGChange, onNChange, onApply, result }: StageCardProps) {
  const previewDc = DC_FORMULA(G, N);
  const d1Above = d1 >= previewDc;
  const d2Above = d2 >= previewDc;
  const separated = d1Above !== d2Above;

  return (
    <div className={`flex-1 rounded-lg border ${color} bg-muted/10 p-2.5 space-y-2`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-70">{label}</span>
        {onApply && (
          <button
            onClick={onApply}
            className="text-[8px] font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            apply
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[8px] font-mono text-muted-foreground block mb-0.5">G (µm)</label>
          <input
            type="number"
            value={G}
            min={5}
            max={60}
            step={5}
            onChange={(e) => onGChange(clamp(parseFloat(e.target.value) || 10, 5, 60))}
            className="w-full h-6 px-1.5 text-[10px] font-mono bg-background/60 border border-border/40 rounded focus:outline-none focus:border-current text-foreground"
          />
        </div>
        <div>
          <label className="text-[8px] font-mono text-muted-foreground block mb-0.5">N</label>
          <input
            type="number"
            value={N}
            min={2}
            max={15}
            step={1}
            onChange={(e) => onNChange(clamp(parseInt(e.target.value) || 4, 2, 15))}
            className="w-full h-6 px-1.5 text-[10px] font-mono bg-background/60 border border-border/40 rounded focus:outline-none focus:border-current text-foreground"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-[8px] font-mono text-muted-foreground">Dc</div>
          <div className="text-[12px] font-mono font-semibold">{previewDc.toFixed(1)} µm</div>
        </div>
        <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${separated ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/8" : "text-rose-400 border-rose-400/40 bg-rose-400/8"}`}>
          {separated ? "✓ separates" : "✗ mixed"}
        </div>
      </div>

      {result && (
        <div className="border-t border-border/30 pt-1.5 space-y-0.5">
          <div className="flex justify-between text-[8px] font-mono">
            <span className="text-muted-foreground">Efficiency</span>
            <span className="text-foreground">{result.ideal_efficiency.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-[8px] font-mono">
            <span className="text-muted-foreground">Q_max</span>
            <span className="text-foreground">{result.q_max_ul_min.toFixed(3)} µL/min</span>
          </div>
          <div className="flex justify-between text-[8px] font-mono">
            <span className="text-muted-foreground">P1 ({d1}µm)</span>
            <span className={result.d1_mode === "bump" ? "text-sky-400" : "text-amber-400"}>
              {result.d1_mode}
            </span>
          </div>
          <div className="flex justify-between text-[8px] font-mono">
            <span className="text-muted-foreground">P2 ({d2}µm)</span>
            <span className={result.d2_mode === "bump" ? "text-sky-400" : "text-amber-400"}>
              {result.d2_mode}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface FlowDiagramProps {
  d1: number;
  d2: number;
  result: CascadeResponse | null;
  g1: number; n1: number;
  g2: number; n2: number;
}

function FlowDiagram({ d1, d2, result, g1, n1, g2, n2 }: FlowDiagramProps) {
  const dc1 = result ? result.stage1.Dc : DC_FORMULA(g1, n1);
  const dc2 = result ? result.stage2.Dc : DC_FORMULA(g2, n2);

  const p1s1 = d1 >= dc1 ? "B" : "Z";
  const p2s1 = d2 >= dc1 ? "B" : "Z";
  const p1s2 = d1 >= dc2 ? "B" : "Z";
  const p2s2 = d2 >= dc2 ? "B" : "Z";

  const modeLabel = (m: string) => m === "B" ? "↑" : "→";
  const modeColor = (m: string) => m === "B" ? "text-sky-400" : "text-amber-400";

  return (
    <div className="rounded-md border border-border/30 bg-muted/5 px-2 py-2 font-mono text-[8px]">
      <div className="flex items-center gap-1 justify-between">
        <div className="text-muted-foreground text-center leading-tight">
          <div className="text-[9px] font-bold mb-0.5">SAMPLE</div>
          <div>P1: {d1}µm</div>
          <div>P2: {d2}µm</div>
        </div>

        <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />

        <div className="text-center leading-tight border border-border/40 rounded px-1.5 py-1">
          <div className="text-[8px] font-bold mb-0.5 text-violet-400">CHIP 1</div>
          <div className="text-[7px] text-muted-foreground">G={g1} N={n1}</div>
          <div className="text-[7px] text-muted-foreground">Dc={dc1.toFixed(1)}</div>
          <div className={`mt-0.5 ${modeColor(p1s1)}`}>P1{modeLabel(p1s1)}</div>
          <div className={modeColor(p2s1)}>P2{modeLabel(p2s1)}</div>
        </div>

        <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />

        <div className="text-center leading-tight border border-border/40 rounded px-1.5 py-1">
          <div className="text-[8px] font-bold mb-0.5 text-cyan-400">CHIP 2</div>
          <div className="text-[7px] text-muted-foreground">G={g2} N={n2}</div>
          <div className="text-[7px] text-muted-foreground">Dc={dc2.toFixed(1)}</div>
          <div className={`mt-0.5 ${modeColor(p1s2)}`}>P1{modeLabel(p1s2)}</div>
          <div className={modeColor(p2s2)}>P2{modeLabel(p2s2)}</div>
        </div>

        <ArrowRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />

        <div className="text-center leading-tight">
          <div className="text-[9px] font-bold mb-0.5 text-muted-foreground">OUT</div>
          {p1s2 !== p2s2 ? (
            <>
              <div className="text-emerald-400 text-[7px]">P1 lane A</div>
              <div className="text-emerald-400 text-[7px]">P2 lane B</div>
            </>
          ) : (
            <div className="text-rose-400 text-[7px]">mixed</div>
          )}
        </div>
      </div>

      <div className="mt-1.5 text-[7px] text-muted-foreground text-center">
        ↑ bump (lateral displacement) &nbsp;|&nbsp; → zigzag (straight)
      </div>
    </div>
  );
}

interface CascadePanelProps {
  d1: number;
  d2: number;
  currentG: number;
  currentN: number;
  setG: (v: number) => void;
  setN: (v: number) => void;
  onApply: () => void;
  onResult?: (data: CascadeResponse) => void;
}

export function CascadePanel({ d1, d2, currentG, currentN, setG, setN, onApply, onResult }: CascadePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [g1, setG1] = useState(currentG);
  const [n1, setN1] = useState(currentN);
  const [g2, setG2] = useState(Math.max(5, currentG - 10));
  const [n2, setN2] = useState(Math.min(15, currentN + 3));
  const [result, setResult] = useState<CascadeResponse | null>(null);

  const analyze = useAnalyzeCascade();

  const handleRun = () => {
    analyze.mutate(
      {
        data: { d1, d2, stage1: { G: g1, N: n1 }, stage2: { G: g2, N: n2 } },
      },
      { onSuccess: (data) => { setResult(data); onResult?.(data); } },
    );
  };

  const applyStage = (G: number, N: number) => {
    setG(G);
    setN(N);
    setTimeout(onApply, 50);
  };

  const statusIcon = useMemo(() => {
    if (!result) return null;
    const { separation_achieved, stages_agree } = result.summary;
    if (stages_agree) return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (separation_achieved) return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    return <XCircle className="w-3 h-3 text-rose-400" />;
  }, [result]);

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="flex-1 text-[11px] font-mono font-semibold uppercase tracking-widest">
          Cascade Designer
        </span>
        {result && !expanded && statusIcon}
        {result && !expanded && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyan-400/40 text-cyan-400 bg-cyan-400/8">
            {result.summary.overall_efficiency.toFixed(1)}% eff
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
                Model two DLD chips in series. Stage 1 does a coarse sort;
                Stage 2 refines. Combined Dc window = |Dc₁ − Dc₂|.
              </p>

              <div className="flex gap-2">
                <StageCard
                  label="Stage 1"
                  color="border-violet-400/30"
                  G={g1} N={n1} d1={d1} d2={d2}
                  onGChange={setG1} onNChange={setN1}
                  onApply={() => applyStage(g1, n1)}
                  result={result?.stage1}
                />
                <StageCard
                  label="Stage 2"
                  color="border-cyan-400/30"
                  G={g2} N={n2} d1={d1} d2={d2}
                  onGChange={setG2} onNChange={setN2}
                  onApply={() => applyStage(g2, n2)}
                  result={result?.stage2}
                />
              </div>

              <FlowDiagram d1={d1} d2={d2} result={result} g1={g1} n1={n1} g2={g2} n2={n2} />

              <Button
                onClick={handleRun}
                disabled={analyze.isPending}
                className="w-full h-8 font-mono text-[10px] uppercase tracking-wider bg-cyan-700 hover:bg-cyan-600 text-white border-0"
              >
                <Layers className="w-3 h-3 mr-1.5" />
                {analyze.isPending ? "Analyzing…" : "Analyze Cascade"}
              </Button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md border border-border/40 bg-muted/10 divide-y divide-border/30"
                >
                  <div className="px-3 py-2 flex items-center gap-2">
                    {statusIcon}
                    <span className="text-[10px] font-mono font-semibold text-foreground">
                      {result.summary.stages_agree
                        ? "Both stages reinforce separation"
                        : result.summary.separation_achieved
                        ? "Partial separation achieved"
                        : "No separation — adjust geometry"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border/30">
                    {[
                      ["Overall Eff.", `${result.summary.overall_efficiency.toFixed(1)}%`],
                      ["Dc Window", `${result.summary.dc_window_um.toFixed(1)} µm`],
                      ["Bottleneck Q", `${result.summary.bottleneck_q_max_ul_min.toFixed(3)} µL/min`],
                      ["Stages agree", result.summary.stages_agree ? "Yes" : "No"],
                    ].map(([label, value]) => (
                      <div key={label} className="px-3 py-2">
                        <div className="text-[8px] font-mono text-muted-foreground">{label}</div>
                        <div className="text-[11px] font-mono font-semibold text-foreground">{value}</div>
                      </div>
                    ))}
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
