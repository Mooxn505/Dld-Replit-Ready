import { useMemo } from "react";
import type { SweepResponse, DcCurveResponse, FlowAnalysisResponse, ThroughputResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";

interface ChartsPanelProps {
  sweepData: SweepResponse | null;
  dcCurveData: DcCurveResponse | null;
  flowData: FlowAnalysisResponse | null;
  throughputData: ThroughputResponse | null;
  refDcData?: DcCurveResponse | null;
  refFlowData?: FlowAnalysisResponse | null;
  refLabel?: string | null;
}

export function ChartsPanel({ sweepData, dcCurveData, flowData, throughputData, refDcData, refFlowData, refLabel }: ChartsPanelProps) {
  if (!sweepData && !dcCurveData && !flowData && !throughputData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Sweep Heatmap */}
      {sweepData && (
        <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col min-h-[350px]">
          <div className="mb-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-widest">Efficiency Heatmap</h3>
            <p className="text-[10px] font-mono text-muted-foreground">Sweep over Gap (G) and Period (N)</p>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            <Heatmap data={sweepData} />
          </div>
        </div>
      )}

      {/* Dc Curves */}
      {dcCurveData && (
        <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col min-h-[350px]">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest">Critical Diameter (Dc)</h3>
              <p className="text-[10px] font-mono text-muted-foreground">Davis formula vs Pillar Gap (G)</p>
            </div>
            {refLabel && refDcData && (
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border border-[#EF9F27]/40 text-[#EF9F27] bg-[#EF9F27]/8">
                vs {refLabel}
              </span>
            )}
          </div>
          <div className="flex-1 w-full relative">
            <DcLineChart data={dcCurveData} refData={refDcData} refLabel={refLabel} />
          </div>
        </div>
      )}

      {/* Throughput Estimator Card */}
      {throughputData && (
        <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col gap-3 lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-3.5 h-3.5 text-[#1D9E75] shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
            </svg>
            <h3 className="text-sm font-mono font-bold uppercase tracking-widest">Throughput Estimator</h3>
            <span className="ml-auto text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
              @ Q<sub>max</sub> = {throughputData.optimal_q_max_ul_min} µL/min · Eff = {throughputData.efficiency_at_optimal}%
            </span>
          </div>

          {/* Primary metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <ThroughputStat
              label="Throughput"
              value={formatCells(throughputData.throughput_cells_per_min)}
              unit="cells / min"
              accent
            />
            <ThroughputStat
              label="Per hour"
              value={formatCells(throughputData.throughput_cells_per_hour)}
              unit="cells / hr"
              accent
            />
            <ThroughputStat
              label="Processing time"
              value={formatTime(throughputData.processing_time_min)}
              unit={`for ${throughputData.sample_volume_ml} mL sample`}
            />
            <ThroughputStat
              label="Cell recovery"
              value={`${formatCells(throughputData.recovered_cells)} / ${formatCells(throughputData.total_cells_in_sample)}`}
              unit={`${throughputData.efficiency_at_optimal}% efficiency`}
            />
          </div>

          {/* Recovery bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
              <span>Cell recovery</span>
              <span>{throughputData.total_cells_in_sample > 0 ? ((throughputData.recovered_cells / throughputData.total_cells_in_sample) * 100).toFixed(1) : "—"}%</span>
            </div>
            <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1D9E75] to-[#2DD4AA] transition-all duration-700"
                style={{ width: `${throughputData.total_cells_in_sample > 0 ? (throughputData.recovered_cells / throughputData.total_cells_in_sample) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Input summary */}
          <div className="flex gap-4 pt-1 border-t border-border/30">
            <span className="text-[9px] font-mono text-muted-foreground">Input: {formatCells(throughputData.concentration_cells_per_ml)} cells/mL</span>
            <span className="text-[9px] font-mono text-muted-foreground">Sample: {throughputData.sample_volume_ml} mL</span>
            <span className="text-[9px] font-mono text-muted-foreground">Dc: {throughputData.Dc.toFixed(2)} µm</span>
            <span className="text-[9px] font-mono text-muted-foreground">Channel: {throughputData.channel_height_um}×{throughputData.channel_width_um} µm</span>
          </div>
        </div>
      )}

      {/* Flow Rate Analysis */}
      {flowData && (
        <div className="bg-card border border-border/50 rounded-lg p-4 flex flex-col min-h-[350px] lg:col-span-2">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest">Flow Rate Analysis</h3>
              <p className="text-[10px] font-mono text-muted-foreground">
                Sorting efficiency vs velocity — Re degradation model (Re<sub>crit</sub> = {flowData.re_crit})
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <FlowStat label="Ideal eff." value={`${flowData.ideal_efficiency}%`} />
              <FlowStat label="Opt. v range" value={`${flowData.optimal_v_min_mm_s}–${flowData.optimal_v_max_mm_s} mm/s`} accent />
              <FlowStat label="Opt. Q range" value={`${flowData.optimal_q_min_ul_min.toFixed(2)}–${flowData.optimal_q_max_ul_min.toFixed(2)} µL/min`} accent />
              <FlowStat label="Ch. h×w" value={`${flowData.channel_height_um}×${flowData.channel_width_um} µm`} />
            </div>
          </div>
          <div className="flex-1 w-full min-h-[260px]">
            <FlowChart data={flowData} refData={refFlowData} refLabel={refLabel} />
          </div>
        </div>
      )}
    </div>
  );
}

function formatCells(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return n.toFixed(0);
}

function formatTime(min: number): string {
  if (!isFinite(min)) return "∞";
  if (min < 1) return `${(min * 60).toFixed(1)}s`;
  if (min < 60) return `${min.toFixed(1)} min`;
  return `${(min / 60).toFixed(1)} hr`;
}

function ThroughputStat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className="bg-muted/20 border border-border/30 rounded-lg px-3 py-2.5">
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-sm font-mono font-bold tabular-nums leading-tight ${accent ? "text-[#1D9E75]" : "text-foreground/90"}`}>{value}</div>
      <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{unit}</div>
    </div>
  );
}

function FlowStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-muted/30 rounded px-2.5 py-1.5 text-right">
      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-mono font-bold ${accent ? "text-[#1D9E75]" : "text-foreground/80"}`}>{value}</div>
    </div>
  );
}

function Heatmap({ data }: { data: SweepResponse }) {
  const { G_vals, N_vals, eff_matrix, best } = data;
  
  const maxEff = 100;
  
  // Custom color scale: red (0) -> yellow (50) -> green (100)
  const getColor = (eff: number) => {
    if (eff < 50) {
      const t = eff / 50;
      return `rgb(${Math.round(226 * (1-t) + 234 * t)}, ${Math.round(75 * (1-t) + 179 * t)}, ${Math.round(74 * (1-t) + 8 * t)})`;
    } else {
      const t = (eff - 50) / 50;
      return `rgb(${Math.round(234 * (1-t) + 34 * t)}, ${Math.round(179 * (1-t) + 197 * t)}, ${Math.round(8 * (1-t) + 94 * t)})`;
    }
  };

  return (
    <div className="w-full max-w-sm aspect-square relative flex">
      {/* Y-axis labels (N) */}
      <div className="absolute -left-6 top-0 bottom-6 flex flex-col justify-between items-end text-[10px] font-mono text-muted-foreground pr-2">
        {N_vals.map((n, i) => <div key={i}>{n}</div>).reverse()}
      </div>
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono text-muted-foreground tracking-widest uppercase origin-center">
        Period (N)
      </div>

      <div className="flex-1 border border-border/50 flex flex-col relative" style={{ marginBottom: '24px' }}>
        {/* We reverse N because N=2 should be bottom, N=12 top */}
        {[...eff_matrix].reverse().map((row, i) => {
          const actualNIndex = N_vals.length - 1 - i;
          const currentN = N_vals[actualNIndex];
          return (
            <div key={i} className="flex-1 flex">
              {row.map((eff, j) => {
                const currentG = G_vals[j];
                const isBest = best.G === currentG && best.N === currentN;
                return (
                  <div 
                    key={j} 
                    className="flex-1 group relative transition-colors duration-200 border-[0.5px] border-background/10"
                    style={{ backgroundColor: getColor(eff) }}
                  >
                    {isBest && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute opacity-0 group-hover:opacity-100 bg-black/90 text-white text-[10px] font-mono p-1 rounded pointer-events-none z-50 whitespace-nowrap -top-8 left-1/2 -translate-x-1/2">
                      G: {currentG}, N: {currentN}<br/>
                      Eff: {eff.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* X-axis labels (G) */}
      <div className="absolute bottom-0 left-0 right-0 h-6 flex justify-between items-end text-[10px] font-mono text-muted-foreground pt-1">
        {G_vals.filter((_,i) => i%2===0).map((g, i) => <div key={i}>{g}</div>)}
      </div>
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
        Gap G (µm)
      </div>
    </div>
  );
}

const REGIME_COLORS: Record<string, string> = {
  "deep-stokes": "rgba(29,158,117,0.12)",
  "stokes":      "rgba(29,158,117,0.18)",
  "transition":  "rgba(239,159,39,0.14)",
  "inertial":    "rgba(226,75,74,0.14)",
};

function FlowChart({ data, refData, refLabel }: { data: FlowAnalysisResponse; refData?: FlowAnalysisResponse | null; refLabel?: string | null }) {
  const chartData = useMemo(() => {
    return data.points.map((p, i) => ({
      v: p.v_mm_s,
      Re: p.Re,
      eff: p.efficiency,
      Q: p.flow_rate_ul_min,
      regime: p.regime,
      refEff: refData?.points[i]?.efficiency ?? undefined,
    }));
  }, [data, refData]);

  const regimeBands = useMemo(() => {
    const bands: { x1: number; x2: number; regime: string }[] = [];
    let current = chartData[0]?.regime;
    let x1 = chartData[0]?.v;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].regime !== current) {
        bands.push({ x1, x2: chartData[i].v, regime: current });
        current = chartData[i].regime;
        x1 = chartData[i].v;
      }
    }
    if (chartData.length > 0) {
      bands.push({ x1, x2: chartData[chartData.length - 1].v, regime: current });
    }
    return bands;
  }, [chartData]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const pt = payload[0]?.payload;
    return (
      <div className="bg-card border border-border text-foreground rounded-lg p-2 text-[10px] font-mono space-y-0.5 shadow-xl">
        <div className="font-bold text-primary">{Number(label).toFixed(4)} mm/s</div>
        <div>Re = {pt?.Re?.toFixed(5)}</div>
        <div>Q = {pt?.Q?.toFixed(4)} µL/min</div>
        <div>Eff = {pt?.eff?.toFixed(1)}%</div>
        <div className="capitalize text-muted-foreground">{pt?.regime?.replace("-", " ")}</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 20, left: -10, bottom: 28 }}>
        {/* Regime background bands */}
        {regimeBands.map((b, i) => (
          <ReferenceArea
            key={i}
            x1={b.x1}
            x2={b.x2}
            fill={REGIME_COLORS[b.regime] ?? "transparent"}
            fillOpacity={1}
          />
        ))}

        {/* Re=0.1 critical line */}
        <ReferenceLine
          x={data.optimal_v_max_mm_s}
          stroke="#EF9F27"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: `Re=0.1 (v=${data.optimal_v_max_mm_s} mm/s)`, position: "insideTopRight", fontSize: 9, fill: "#EF9F27", fontFamily: "monospace" }}
        />

        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="v"
          scale="log"
          type="number"
          domain={["dataMin", "dataMax"]}
          stroke="hsl(var(--muted-foreground))"
          fontSize={9}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v < 0.01 ? v.toFixed(3) : v < 1 ? v.toFixed(2) : v.toFixed(1)}
          label={{ value: "Flow velocity (mm/s)  —  log scale", position: "insideBottom", offset: -16, fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={9}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          label={{ value: "Efficiency (%)", angle: -90, position: "insideLeft", offset: 20, fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
        />
        <Tooltip content={customTooltip} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          wrapperStyle={{ fontSize: 9, fontFamily: "monospace" }}
          formatter={(value: string) => {
            if (value === "eff") return "Efficiency (%)";
            if (value === "refEff") return `Ref (${refLabel ?? "pinned"}) Eff (%)`;
            return value;
          }}
        />
        <Line
          type="monotone"
          dataKey="eff"
          name="eff"
          stroke="#1D9E75"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#1D9E75" }}
        />
        {refData && (
          <Line
            type="monotone"
            dataKey="refEff"
            name="refEff"
            stroke="#EF9F27"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 3, fill: "#EF9F27" }}
            connectNulls={false}
          />
        )}
        {refData && (
          <ReferenceLine
            x={refData.optimal_v_max_mm_s}
            stroke="#EF9F27"
            strokeDasharray="2 4"
            strokeWidth={1}
            strokeOpacity={0.55}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

function DcLineChart({ data, refData, refLabel }: { data: DcCurveResponse; refData?: DcCurveResponse | null; refLabel?: string | null }) {
  const chartData = useMemo(() => {
    const primary = data.G_vals.map((g, i) => {
      const pt: Record<string, number> = { G: g };
      data.curves.forEach(c => { pt[`N${c.N}`] = c.Dc_vals[i]; });
      return pt;
    });
    if (refData) {
      const refByG: Record<number, Record<string, number>> = {};
      refData.G_vals.forEach((g, i) => {
        refByG[g] = {};
        refData.curves.forEach(c => { refByG[g][`refN${c.N}`] = c.Dc_vals[i]; });
      });
      primary.forEach(pt => {
        const refPt = refByG[pt.G];
        if (refPt) Object.assign(pt, refPt);
      });
    }
    return primary;
  }, [data, refData]);

  const colors = ["#E24B4A", "#378ADD", "#10b981", "#f59e0b", "#8b5cf6", "#6366f1"];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis 
          dataKey="G" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(v) => `${v}`}
          label={{ value: "Pillar Gap (µm)", position: "bottom", fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace", textAnchor: "middle" }}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          label={{ value: "Dc (µm)", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "monospace" }}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontSize: 12, fontFamily: "monospace", borderRadius: 8 }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value: number, name: string) => {
            const isRef = name.startsWith("refN");
            const label = isRef ? `Ref N=${name.slice(4)} (${refLabel ?? "pinned"})` : name;
            return [value.toFixed(2) + " µm", label];
          }}
        />
        <Legend 
          verticalAlign="top" 
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
          formatter={(value: string) => {
            if (value.startsWith("refN")) return `Ref N=${value.slice(4)}`;
            return value;
          }}
        />
        {/* Current geometry curves */}
        {data.curves.map((c, i) => (
          <Line 
            key={`cur-${c.N}`}
            type="monotone" 
            dataKey={`N${c.N}`} 
            name={`N=${c.N}`} 
            stroke={colors[i % colors.length]} 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
        {/* Reference geometry curves — same color, dashed, thinner */}
        {refData && refData.curves.map((c, i) => (
          <Line
            key={`ref-${c.N}`}
            type="monotone"
            dataKey={`refN${c.N}`}
            name={`refN${c.N}`}
            stroke={colors[i % colors.length]}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeOpacity={0.65}
            dot={false}
            activeDot={{ r: 3 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
