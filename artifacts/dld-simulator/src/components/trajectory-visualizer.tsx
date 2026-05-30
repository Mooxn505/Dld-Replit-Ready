import { useMemo } from "react";
import type { AnalyzeResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";

interface TrajectoryVisualizerProps {
  data: AnalyzeResponse | null;
  d1: number;
  d2: number;
  label1: string;
  label2: string;
}

export function TrajectoryVisualizer({ data, d1, d2, label1, label2 }: TrajectoryVisualizerProps) {
  
  const svgBounds = useMemo(() => {
    if (!data?.pillars || data.pillars.length === 0) return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
    
    const xs = data.pillars.map(p => p.cx);
    const ys = data.pillars.map(p => p.cy);
    const rs = data.pillars.map(p => p.r);
    
    const maxR = Math.max(...rs);
    const pad = maxR * 2 + 10;
    
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, [data]);

  const p1Path = useMemo(() => {
    if (!data?.trajectory1 || data.trajectory1.length === 0) return "";
    return "M " + data.trajectory1.map(p => `${p.x},${p.y}`).join(" L ");
  }, [data?.trajectory1]);

  const p2Path = useMemo(() => {
    if (!data?.trajectory2 || data.trajectory2.length === 0) return "";
    return "M " + data.trajectory2.map(p => `${p.x},${p.y}`).join(" L ");
  }, [data?.trajectory2]);

  if (!data) {
    return (
      <div className="w-full h-[500px] border border-border/50 bg-card/50 rounded-lg flex items-center justify-center">
        <div className="font-mono text-sm text-muted-foreground uppercase tracking-widest animate-pulse">
          Awaiting Analysis...
        </div>
      </div>
    );
  }

  const { result, pillars } = data;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4">
      {/* Visualizer */}
      <div className="flex-1 bg-card border border-border/50 rounded-lg relative overflow-hidden flex items-center justify-center min-h-[500px]">
        {/* SVG Grid background pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        
        <svg 
          viewBox={`${svgBounds.minX} ${svgBounds.minY} ${svgBounds.width} ${svgBounds.height}`}
          className="w-full h-full p-4 relative z-10"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Pillars */}
          {pillars.map((p, i) => (
            <circle 
              key={`p-${i}`} 
              cx={p.cx} 
              cy={p.cy} 
              r={p.r} 
              fill="#B4B2A9" 
              opacity="0.6"
            />
          ))}
          
          {/* Trajectory 1 */}
          {p1Path && (
            <>
              <path 
                d={p1Path} 
                fill="none" 
                stroke="#E24B4A" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                opacity="0.8"
              />
              <circle cx={data.trajectory1[0].x} cy={data.trajectory1[0].y} r={d1/2} fill="#E24B4A" />
              <circle cx={data.trajectory1[data.trajectory1.length-1].x} cy={data.trajectory1[data.trajectory1.length-1].y} r={d1/2} fill="#E24B4A" />
            </>
          )}

          {/* Trajectory 2 */}
          {p2Path && (
            <>
              <path 
                d={p2Path} 
                fill="none" 
                stroke="#378ADD" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                opacity="0.8"
              />
              <circle cx={data.trajectory2[0].x} cy={data.trajectory2[0].y} r={d2/2} fill="#378ADD" />
              <circle cx={data.trajectory2[data.trajectory2.length-1].x} cy={data.trajectory2[data.trajectory2.length-1].y} r={d2/2} fill="#378ADD" />
            </>
          )}
        </svg>

        {/* Efficiency Overlay */}
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md border border-border/50 rounded flex flex-col items-end p-3 pointer-events-none">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1">Efficiency</div>
          <div className="text-3xl font-mono font-bold text-foreground">
            {result.efficiency.toFixed(1)}<span className="text-lg text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Metrics Sidebar */}
      <div className="w-full lg:w-64 flex flex-col gap-3">
        <MetricCard 
          label="Separation Status" 
          value={result.separated ? "Separated" : "Mixed"}
          valueColor={result.separated ? "text-green-500" : "text-destructive"}
        />
        <MetricCard 
          label="Critical Diameter (Dc)" 
          value={`${result.Dc.toFixed(2)} µm`}
          valueColor="text-primary"
        />
        <MetricCard 
          label="Δ Lateral Displacement" 
          value={`${result.delta_ld.toFixed(2)} µm/row`}
        />
        
        <div className="border border-border/50 rounded-lg p-3 bg-card mt-auto space-y-3">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground border-b border-border/50 pb-2">
            Particle Behaviors
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E24B4A]" />
              <span className="text-xs font-mono text-foreground/80">{label1}</span>
            </div>
            <Badge variant="outline" className={`font-mono text-[10px] uppercase ${result.mode_p1 === 'bump' ? 'bg-[#E24B4A]/10 text-[#E24B4A] border-[#E24B4A]/30' : 'bg-[#378ADD]/10 text-[#378ADD] border-[#378ADD]/30'}`}>
              {result.mode_p1}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#378ADD]" />
              <span className="text-xs font-mono text-foreground/80">{label2}</span>
            </div>
            <Badge variant="outline" className={`font-mono text-[10px] uppercase ${result.mode_p2 === 'bump' ? 'bg-[#E24B4A]/10 text-[#E24B4A] border-[#E24B4A]/30' : 'bg-[#378ADD]/10 text-[#378ADD] border-[#378ADD]/30'}`}>
              {result.mode_p2}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, valueColor = "text-foreground" }: { label: string, value: string | React.ReactNode, valueColor?: string }) {
  return (
    <div className="border border-border/50 rounded-lg p-3 bg-card flex flex-col justify-center">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1">{label}</div>
      <div className={`text-base font-mono font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}
