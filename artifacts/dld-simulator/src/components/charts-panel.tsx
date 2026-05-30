import { useMemo } from "react";
import type { SweepResponse, DcCurveResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChartsPanelProps {
  sweepData: SweepResponse | null;
  dcCurveData: DcCurveResponse | null;
}

export function ChartsPanel({ sweepData, dcCurveData }: ChartsPanelProps) {
  if (!sweepData && !dcCurveData) return null;

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
          <div className="mb-4">
            <h3 className="text-sm font-mono font-bold uppercase tracking-widest">Critical Diameter (Dc)</h3>
            <p className="text-[10px] font-mono text-muted-foreground">Davis formula vs Pillar Gap (G)</p>
          </div>
          <div className="flex-1 w-full relative">
            <DcLineChart data={dcCurveData} />
          </div>
        </div>
      )}
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

function DcLineChart({ data }: { data: DcCurveResponse }) {
  const chartData = useMemo(() => {
    return data.G_vals.map((g, i) => {
      const pt: any = { G: g };
      data.curves.forEach(c => {
        pt[`N${c.N}`] = c.Dc_vals[i];
      });
      return pt;
    });
  }, [data]);

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
        />
        <Legend 
          verticalAlign="top" 
          height={36}
          iconType="circle"
          wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
        />
        {data.curves.map((c, i) => (
          <Line 
            key={c.N} 
            type="monotone" 
            dataKey={`N${c.N}`} 
            name={`N=${c.N}`} 
            stroke={colors[i % colors.length]} 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
