import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Gauge } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TolerancePanelProps {
  G: number;
  N: number;
  d1: number;
  d2: number;
  label1: string;
  label2: string;
}

function critDc(G: number, N: number): number {
  return 1.4 * G * Math.pow(Math.max(N, 0.5), -0.48);
}

function sortEff(d1: number, d2: number, G: number, N: number): number {
  const Dc = critDc(G, N);
  const m1 = d1 >= Dc ? "bump" : "zigzag";
  const m2 = d2 >= Dc ? "bump" : "zigzag";
  if (m1 === m2) return 0;
  const margin1 = Math.abs(d1 - Dc) / Dc;
  const margin2 = Math.abs(d2 - Dc) / Dc;
  return Math.min(100, (margin1 + margin2) * 50);
}

export function TolerancePanel({
  G,
  N,
  d1,
  d2,
}: TolerancePanelProps) {
  const [expanded, setExpanded] = useState(false);

  const { gData, nData, summary } = useMemo(() => {
    // G tolerance sweep ±15%
    const gData = [];
    for (let pct = -15; pct <= 15; pct += 1) {
      const Gvar = G * (1 + pct / 100);
      gData.push({
        pct,
        Dc: +critDc(Gvar, N).toFixed(3),
        eff: +sortEff(d1, d2, Gvar, N).toFixed(2),
      });
    }

    // N tolerance sweep ±15% (continuous N for sensitivity)
    const nData = [];
    for (let pct = -15; pct <= 15; pct += 1) {
      const Nvar = Math.max(1, N * (1 + pct / 100));
      nData.push({
        pct,
        Dc: +critDc(G, Nvar).toFixed(3),
        eff: +sortEff(d1, d2, G, Nvar).toFixed(2),
      });
    }

    // Summary statistics
    const nomEff = sortEff(d1, d2, G, N);
    const nomDc = critDc(G, N);

    const effAt = (gPct: number) => sortEff(d1, d2, G * (1 + gPct / 100), N);
    const dcAt = (gPct: number) => critDc(G * (1 + gPct / 100), N);

    const g5min = Math.min(effAt(-5), effAt(5));
    const g5max = Math.max(effAt(-5), effAt(5));
    const g10min = Math.min(effAt(-10), effAt(10));
    const g10max = Math.max(effAt(-10), effAt(10));

    const dc5min = Math.min(dcAt(-5), dcAt(5));
    const dc5max = Math.max(dcAt(-5), dcAt(5));
    const dc10min = Math.min(dcAt(-10), dcAt(10));
    const dc10max = Math.max(dcAt(-10), dcAt(10));

    return {
      gData,
      nData,
      summary: {
        nomEff,
        nomDc,
        g5effRange: [g5min, g5max],
        g10effRange: [g10min, g10max],
        dc5range: [dc5min, dc5max],
        dc10range: [dc10min, dc10max],
        robustAt5: g5min > 0,
        robustAt10: g10min > 0,
      },
    };
  }, [G, N, d1, d2]);

  const robustColor = summary.robustAt10
    ? "border-[#1D9E75]/40 bg-[#1D9E75]/8 text-[#1D9E75]"
    : summary.robustAt5
    ? "border-[#EF9F27]/40 bg-[#EF9F27]/8 text-[#EF9F27]"
    : "border-[#E24B4A]/40 bg-[#E24B4A]/8 text-[#E24B4A]";

  const robustLabel = summary.robustAt10
    ? "✓ Robust at ±10% fabrication variance"
    : summary.robustAt5
    ? "⚠ Degrades at ±10% — acceptable at ±5%"
    : "✗ Fails at ±5% variance — fragile geometry";

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border text-foreground rounded-lg p-2 text-[9px] font-mono space-y-0.5 shadow-xl">
        <div className="font-bold text-muted-foreground">G variation: {label}%</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === "eff"
              ? `Efficiency: ${Number(p.value).toFixed(1)}%`
              : `Dc: ${Number(p.value).toFixed(2)} µm`}
          </div>
        ))}
      </div>
    );
  };

  const nTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border text-foreground rounded-lg p-2 text-[9px] font-mono space-y-0.5 shadow-xl">
        <div className="font-bold text-muted-foreground">N variation: {label}%</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === "eff"
              ? `Efficiency: ${Number(p.value).toFixed(1)}%`
              : `Dc: ${Number(p.value).toFixed(2)} µm`}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border-t border-border/50">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-[#EF9F27]" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Tolerance Analysis
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <p className="text-[9px] font-mono text-muted-foreground leading-relaxed">
                Lithography introduces fabrication tolerances of typically ±5–10%.
                This shows how G and N variation shifts Dc and degrades separation.
              </p>

              {/* Robustness badge */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded border text-[9px] font-mono ${robustColor}`}
              >
                <span>{robustLabel}</span>
              </div>

              {/* Dc shift summary table */}
              <div className="space-y-1">
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Dc shift (G variation)
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
                  <div className="bg-muted/20 rounded px-2 py-1.5">
                    <div className="text-muted-foreground">Nominal</div>
                    <div className="text-foreground font-bold">
                      {summary.nomDc.toFixed(2)} µm
                    </div>
                  </div>
                  <div className="bg-[#EF9F27]/8 border border-[#EF9F27]/20 rounded px-2 py-1.5">
                    <div className="text-[#EF9F27]">±5% G</div>
                    <div className="font-bold text-foreground/80">
                      {summary.dc5range[0].toFixed(2)}–{summary.dc5range[1].toFixed(2)}µm
                    </div>
                  </div>
                  <div className="bg-[#E24B4A]/8 border border-[#E24B4A]/20 rounded px-2 py-1.5">
                    <div className="text-[#E24B4A]">±10% G</div>
                    <div className="font-bold text-foreground/80">
                      {summary.dc10range[0].toFixed(2)}–{summary.dc10range[1].toFixed(2)}µm
                    </div>
                  </div>
                </div>
              </div>

              {/* Efficiency ranges */}
              <div className="space-y-1">
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Efficiency range (G variation)
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
                  <div className="bg-muted/20 rounded px-2 py-1.5">
                    <div className="text-muted-foreground">Nominal</div>
                    <div className="text-foreground font-bold">
                      {summary.nomEff.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-[#EF9F27]/8 border border-[#EF9F27]/20 rounded px-2 py-1.5">
                    <div className="text-[#EF9F27]">±5% G</div>
                    <div className="font-bold text-foreground/80">
                      {summary.g5effRange[0].toFixed(1)}–{summary.g5effRange[1].toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-[#E24B4A]/8 border border-[#E24B4A]/20 rounded px-2 py-1.5">
                    <div className="text-[#E24B4A]">±10% G</div>
                    <div className="font-bold text-foreground/80">
                      {summary.g10effRange[0].toFixed(1)}–{summary.g10effRange[1].toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* G Tolerance chart */}
              <div>
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Efficiency + Dc vs G variation
                </div>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={gData}
                      margin={{ top: 4, right: 8, left: -28, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="pct"
                        fontSize={8}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                        interval={4}
                      />
                      <YAxis
                        fontSize={8}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                      />
                      <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={1} />
                      <ReferenceLine x={-5} stroke="#EF9F27" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <ReferenceLine x={5} stroke="#EF9F27" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <ReferenceLine x={-10} stroke="#E24B4A" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <ReferenceLine x={10} stroke="#E24B4A" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <Tooltip content={customTooltip} />
                      <Legend
                        verticalAlign="top"
                        height={20}
                        iconType="circle"
                        wrapperStyle={{ fontSize: 8, fontFamily: "monospace" }}
                        formatter={(v: string) =>
                          v === "eff" ? "Efficiency (%)" : "Dc (µm)"
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="eff"
                        name="eff"
                        stroke="#1D9E75"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Dc"
                        name="Dc"
                        stroke="#378ADD"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* N Tolerance chart */}
              <div>
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Efficiency + Dc vs N variation
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={nData}
                      margin={{ top: 4, right: 8, left: -28, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="pct"
                        fontSize={8}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}%`}
                        interval={4}
                      />
                      <YAxis
                        fontSize={8}
                        fontFamily="monospace"
                        tickLine={false}
                        axisLine={false}
                      />
                      <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={1} />
                      <ReferenceLine x={-5} stroke="#EF9F27" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <ReferenceLine x={5} stroke="#EF9F27" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <ReferenceLine x={-10} stroke="#E24B4A" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <ReferenceLine x={10} stroke="#E24B4A" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
                      <Tooltip content={nTooltip} />
                      <Line
                        type="monotone"
                        dataKey="eff"
                        name="eff"
                        stroke="#1D9E75"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Dc"
                        name="Dc"
                        stroke="#378ADD"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <p className="text-[8px] font-mono text-muted-foreground">
                Orange lines = ±5% tolerance bands · Red lines = ±10% bands · Based on G={G}µm, N={N}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
