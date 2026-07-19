import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Abramowitz & Stegun approximation for erf
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-x * x));
}

function normCdf(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2))));
}

function normPdf(x: number, mu: number, sigma: number): number {
  return (
    (1 / (sigma * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2)
  );
}

interface DistributionPanelProps {
  d1: number;
  d2: number;
  label1: string;
  label2: string;
  Dc: number | null;
}

export function DistributionPanel({
  d1,
  d2,
  label1,
  label2,
  Dc,
}: DistributionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [sd1, setSd1] = useState(0.5);
  const [sd2, setSd2] = useState(1.0);

  const { chartData, stats } = useMemo(() => {
    const pad1 = 4 * sd1;
    const pad2 = 4 * sd2;
    const xMin = Math.min(d1 - pad1, d2 - pad2);
    const xMax = Math.max(d1 + pad1, d2 + pad2);
    const steps = 240;
    const dx = (xMax - xMin) / steps;

    const chartData = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + i * dx;
      chartData.push({
        x: +x.toFixed(3),
        p1: +normPdf(x, d1, sd1).toFixed(5),
        p2: +normPdf(x, d2, sd2).toFixed(5),
      });
    }

    // Purity/contamination at Dc threshold
    let effectivePurity: number | null = null;
    let crossover1: number | null = null;
    let crossover2: number | null = null;

    if (Dc !== null) {
      const m1 = d1 >= Dc ? "bump" : "zigzag";
      const m2 = d2 >= Dc ? "bump" : "zigzag";

      if (m1 !== m2) {
        if (m2 === "bump") {
          // d2 → bump stream, d1 → zigzag stream
          const p2InBump = 1 - normCdf(Dc, d2, sd2);
          const p1InBump = 1 - normCdf(Dc, d1, sd1); // contamination
          crossover1 = p1InBump * 100;
          crossover2 = normCdf(Dc, d2, sd2) * 100;
          effectivePurity =
            p2InBump + p1InBump > 0
              ? (p2InBump / (p2InBump + p1InBump)) * 100
              : 100;
        } else {
          // d1 → bump stream, d2 → zigzag stream
          const p1InBump = 1 - normCdf(Dc, d1, sd1);
          const p2InBump = 1 - normCdf(Dc, d2, sd2); // contamination
          crossover1 = normCdf(Dc, d1, sd1) * 100;
          crossover2 = p2InBump * 100;
          effectivePurity =
            p1InBump + p2InBump > 0
              ? (p1InBump / (p1InBump + p2InBump)) * 100
              : 100;
        }
      }
    }

    return {
      chartData,
      stats: { effectivePurity, crossover1, crossover2 },
    };
  }, [d1, d2, sd1, sd2, Dc]);

  const purityColor =
    stats.effectivePurity === null
      ? ""
      : stats.effectivePurity >= 95
      ? "border-[#1D9E75]/40 bg-[#1D9E75]/8 text-[#1D9E75]"
      : stats.effectivePurity >= 80
      ? "border-[#EF9F27]/40 bg-[#EF9F27]/8 text-[#EF9F27]"
      : "border-[#E24B4A]/40 bg-[#E24B4A]/8 text-[#E24B4A]";

  return (
    <div className="border-t border-border/50">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#8b5cf6]" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Size Distribution
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
                Real cells follow size distributions, not single diameters. Set σ
                (standard deviation) for each to see how overlap reduces effective purity.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-wider text-[#E24B4A] font-mono">
                    {label1} σ (µm)
                  </Label>
                  <Input
                    type="number"
                    value={sd1}
                    onChange={(e) =>
                      setSd1(Math.max(0.05, Number(e.target.value)))
                    }
                    className="font-mono text-xs h-7 bg-background/50"
                    step="0.1"
                    min="0.05"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-wider text-[#378ADD] font-mono">
                    {label2} σ (µm)
                  </Label>
                  <Input
                    type="number"
                    value={sd2}
                    onChange={(e) =>
                      setSd2(Math.max(0.05, Number(e.target.value)))
                    }
                    className="font-mono text-xs h-7 bg-background/50"
                    step="0.1"
                    min="0.05"
                  />
                </div>
              </div>

              {/* Distribution chart */}
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: -32, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="x"
                      fontSize={8}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}µm`}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      fontSize={8}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={false}
                    />
                    {Dc !== null && (
                      <ReferenceLine
                        x={+Dc.toFixed(2)}
                        stroke="#EF9F27"
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        label={{
                          value: `Dc ${Dc.toFixed(1)}µm`,
                          position: "top",
                          fontSize: 8,
                          fill: "#EF9F27",
                          fontFamily: "monospace",
                        }}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        fontSize: 9,
                        fontFamily: "monospace",
                        borderRadius: 6,
                      }}
                      formatter={(v: number, name: string) => [
                        v.toFixed(4),
                        name === "p1" ? label1 : label2,
                      ]}
                      labelFormatter={(l) => `${l} µm`}
                    />
                    <Area
                      type="monotone"
                      dataKey="p1"
                      name="p1"
                      stroke="#E24B4A"
                      fill="#E24B4A"
                      fillOpacity={0.2}
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="p2"
                      name="p2"
                      stroke="#378ADD"
                      fill="#378ADD"
                      fillOpacity={0.2}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Stats */}
              {Dc !== null ? (
                <div className="space-y-1.5">
                  {stats.effectivePurity !== null ? (
                    <div
                      className={`flex items-center justify-between text-[10px] font-mono px-2 py-1.5 rounded border ${purityColor}`}
                    >
                      <span>Effective purity (bump stream)</span>
                      <span className="font-bold">
                        {stats.effectivePurity.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <div className="text-[9px] font-mono text-muted-foreground text-center px-2 py-1.5">
                      Both particles in same mode — no separation at current Dc
                    </div>
                  )}
                  {stats.crossover1 !== null && (
                    <div className="flex items-center justify-between text-[9px] font-mono px-2 text-muted-foreground">
                      <span>{label1} crossover into wrong stream</span>
                      <span>{stats.crossover1.toFixed(3)}%</span>
                    </div>
                  )}
                  {stats.crossover2 !== null && (
                    <div className="flex items-center justify-between text-[9px] font-mono px-2 text-muted-foreground">
                      <span>{label2} crossover into wrong stream</span>
                      <span>{stats.crossover2.toFixed(3)}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[9px] font-mono text-muted-foreground text-center">
                  Run Analysis to compute Dc-based purity estimate.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
