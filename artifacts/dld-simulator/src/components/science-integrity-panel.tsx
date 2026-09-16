import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FlowAnalysisResponse } from "@workspace/api-client-react/src/generated/api.schemas";

interface ScienceIntegrityPanelProps {
  d1: number;
  d2: number;
  G: number;
  N: number;
  currentDc?: number;
  flowData?: FlowAnalysisResponse | null;
  hasPurityData?: boolean;
}

function dcFormula(G: number, N: number) {
  return 1.4 * G * Math.pow(Math.max(N, 1), -0.48);
}

export function ScienceIntegrityPanel({
  d1,
  d2,
  G,
  N,
  currentDc,
  flowData,
  hasPurityData = false,
}: ScienceIntegrityPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const uncertainty = useMemo(() => {
    const nominal = currentDc ?? dcFormula(G, N);
    // Conservative geometry envelope: independent ±15% manufacturing variation
    // in G and N, shown as a range rather than a statistical confidence interval.
    const low = dcFormula(G * 0.85, N * 1.15);
    const high = dcFormula(G * 1.15, N * 0.85);
    const lowerGap = Math.min(Math.abs(d1 - nominal), Math.abs(d2 - nominal));
    const envelopeWidth = high - low;
    const robust = lowerGap > envelopeWidth / 2 && Math.min(d1, d2) < low && Math.max(d1, d2) > high;

    return {
      nominal,
      low,
      high,
      envelopeWidth,
      sizeGap: Math.abs(d2 - d1),
      robust,
    };
  }, [currentDc, d1, d2, G, N]);

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#378ADD]" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Science Integrity
          </span>
          <span className={`text-[8px] font-mono rounded-full px-1.5 py-0.5 border ${
            uncertainty.robust
              ? "text-[#1D9E75] border-[#1D9E75]/30 bg-[#1D9E75]/10"
              : "text-[#EF9F27] border-[#EF9F27]/30 bg-[#EF9F27]/10"
          }`}>
            {uncertainty.robust ? "robust geometry" : "sensitive geometry"}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
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
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded border border-border/30 bg-muted/15 p-2">
                  <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Nominal Dc</div>
                  <div className="text-[12px] font-mono font-bold text-primary">{uncertainty.nominal.toFixed(2)} µm</div>
                </div>
                <div className="rounded border border-border/30 bg-muted/15 p-2">
                  <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">±15% geometry envelope</div>
                  <div className="text-[12px] font-mono font-bold text-foreground/80">
                    {uncertainty.low.toFixed(2)}–{uncertainty.high.toFixed(2)} µm
                  </div>
                </div>
                <div className="rounded border border-border/30 bg-muted/15 p-2">
                  <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Particle size gap</div>
                  <div className="text-[12px] font-mono font-bold text-foreground/80">{uncertainty.sizeGap.toFixed(2)} µm</div>
                </div>
                <div className="rounded border border-border/30 bg-muted/15 p-2">
                  <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground">Flow model</div>
                  <div className={`text-[10px] font-mono font-bold ${flowData ? "text-[#1D9E75]" : "text-[#EF9F27]"}`}>
                    {flowData ? "Run available" : "Not run"}
                  </div>
                </div>
              </div>

              <div className={`flex gap-2 rounded border p-2.5 ${
                uncertainty.robust
                  ? "border-[#1D9E75]/30 bg-[#1D9E75]/8"
                  : "border-[#EF9F27]/30 bg-[#EF9F27]/8"
              }`}>
                {uncertainty.robust
                  ? <ShieldCheck className="w-3.5 h-3.5 text-[#1D9E75] shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-[#EF9F27] shrink-0 mt-0.5" />}
                <p className="text-[9px] font-mono leading-relaxed text-foreground/75">
                  {uncertainty.robust
                    ? "The predicted threshold remains between both particle populations across the geometry envelope."
                    : "The predicted threshold is close to a particle population or the geometry envelope is wide. Treat purity and efficiency as sensitive to fabrication variation."}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Model basis</div>
                <ul className="space-y-1 text-[9px] font-mono text-foreground/70 leading-relaxed list-disc pl-4">
                  <li>Davis critical diameter: Dc = 1.4 · G · N⁻⁰·⁴⁸.</li>
                  <li>Particles are represented primarily by equivalent diameter.</li>
                  <li>The tolerance range is a conservative engineering envelope, not a confidence interval.</li>
                  <li>Literature points in Charts are external reference data, not measurements from this device.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Known limitations</div>
                <ul className="space-y-1 text-[9px] font-mono text-foreground/70 leading-relaxed list-disc pl-4">
                  <li>Cell deformability, shape, aggregation, adhesion, and cell–cell interactions are simplified.</li>
                  <li>Blood is treated as an idealized carrier fluid; viscosity and hematocrit are not fully resolved.</li>
                  <li>Clogging, wall effects, and outlet recovery require experimental validation.</li>
                  <li>This is an educational design simulator, not a clinical diagnostic device.</li>
                </ul>
              </div>

              <div className="rounded border border-[#E24B4A]/30 bg-[#E24B4A]/8 p-2 text-[9px] font-mono text-[#E24B4A]">
                Do not use these predictions for patient diagnosis, treatment, or device fabrication without laboratory validation.
              </div>

              <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground">
                <span>{hasPurityData ? "Purity model output loaded" : "Run Purity Simulator for enrichment estimates"}</span>
                <span>Model v1.2.0</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}