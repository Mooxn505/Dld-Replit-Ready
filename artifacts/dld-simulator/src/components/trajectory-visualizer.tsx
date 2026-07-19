import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { AnalyzeResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";

interface TrajectoryVisualizerProps {
  data: AnalyzeResponse | null;
  d1: number;
  d2: number;
  label1: string;
  label2: string;
}

const ANIM_DURATION = 3200; // ms for one full pass

export function TrajectoryVisualizer({
  data,
  d1,
  d2,
  label1,
  label2,
}: TrajectoryVisualizerProps) {
  const [progress, setProgress] = useState(0); // 0..1
  const [isPlaying, setIsPlaying] = useState(true);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number | null>(null);
  // Increment animKey whenever we want to restart animation (new data or replay)
  const [animKey, setAnimKey] = useState(0);

  const replay = useCallback(() => {
    setProgress(0);
    startRef.current = null;
    setIsPlaying(true);
    setAnimKey((k) => k + 1);
  }, []);

  // Restart animation whenever data changes
  useEffect(() => {
    replay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!isPlaying) return;

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / ANIM_DURATION);
      setProgress(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, animKey]);

  const svgBounds = useMemo(() => {
    if (!data?.pillars || data.pillars.length === 0)
      return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
    const xs = data.pillars.map((p) => p.cx);
    const ys = data.pillars.map((p) => p.cy);
    const rs = data.pillars.map((p) => p.r);
    const maxR = Math.max(...rs);
    const pad = maxR * 2 + 10;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, [data]);

  // Animated trajectory: show only the first `progress` fraction of points
  const animPts1 = useMemo(() => {
    if (!data?.trajectory1?.length) return [];
    const n = Math.max(2, Math.ceil(progress * data.trajectory1.length));
    return data.trajectory1.slice(0, n);
  }, [data?.trajectory1, progress]);

  const animPts2 = useMemo(() => {
    if (!data?.trajectory2?.length) return [];
    const n = Math.max(2, Math.ceil(progress * data.trajectory2.length));
    return data.trajectory2.slice(0, n);
  }, [data?.trajectory2, progress]);

  const animPath1 = useMemo(
    () =>
      animPts1.length < 2
        ? ""
        : "M " + animPts1.map((p) => `${p.x},${p.y}`).join(" L "),
    [animPts1]
  );
  const animPath2 = useMemo(
    () =>
      animPts2.length < 2
        ? ""
        : "M " + animPts2.map((p) => `${p.x},${p.y}`).join(" L "),
    [animPts2]
  );

  const dot1 = animPts1.length ? animPts1[animPts1.length - 1] : null;
  const dot2 = animPts2.length ? animPts2[animPts2.length - 1] : null;
  const start1 = data?.trajectory1?.[0] ?? null;
  const start2 = data?.trajectory2?.[0] ?? null;

  if (!data) {
    return (
      <div className="w-full h-[500px] border border-border/50 bg-card/50 rounded-lg flex items-center justify-center">
        <div className="font-mono text-sm text-muted-foreground uppercase tracking-widest animate-pulse">
          Awaiting Analysis…
        </div>
      </div>
    );
  }

  const { result, pillars } = data;

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4">
      {/* Visualizer */}
      <div className="flex-1 bg-card border border-border/50 rounded-lg relative overflow-hidden flex items-center justify-center min-h-[500px]">
        {/* Dot-grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <svg
          viewBox={`${svgBounds.minX} ${svgBounds.minY} ${svgBounds.width} ${svgBounds.height}`}
          className="w-full h-full p-4 relative z-10"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Defs: glow filters */}
          <defs>
            <filter id="glow1" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

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

          {/* Ghost (full) paths at low opacity — gives context */}
          {data.trajectory1.length >= 2 && (
            <path
              d={
                "M " +
                data.trajectory1.map((p) => `${p.x},${p.y}`).join(" L ")
              }
              fill="none"
              stroke="#E24B4A"
              strokeWidth="1"
              opacity="0.15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {data.trajectory2.length >= 2 && (
            <path
              d={
                "M " +
                data.trajectory2.map((p) => `${p.x},${p.y}`).join(" L ")
              }
              fill="none"
              stroke="#378ADD"
              strokeWidth="1"
              opacity="0.15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Animated path 1 */}
          {animPath1 && (
            <path
              d={animPath1}
              fill="none"
              stroke="#E24B4A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}

          {/* Animated path 2 */}
          {animPath2 && (
            <path
              d={animPath2}
              fill="none"
              stroke="#378ADD"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}

          {/* Static start dots */}
          {start1 && (
            <circle cx={start1.x} cy={start1.y} r={d1 / 2} fill="#E24B4A" opacity="0.4" />
          )}
          {start2 && (
            <circle cx={start2.x} cy={start2.y} r={d2 / 2} fill="#378ADD" opacity="0.4" />
          )}

          {/* Animated moving particles (the "head" of each trail) */}
          {dot1 && progress > 0 && (
            <circle
              cx={dot1.x}
              cy={dot1.y}
              r={d1 / 2}
              fill="#E24B4A"
              filter="url(#glow1)"
            >
              {/* Pulse ring */}
              <animate
                attributeName="r"
                values={`${d1 / 2};${d1 / 2 + 2};${d1 / 2}`}
                dur="0.8s"
                repeatCount="indefinite"
              />
            </circle>
          )}
          {dot2 && progress > 0 && (
            <circle
              cx={dot2.x}
              cy={dot2.y}
              r={d2 / 2}
              fill="#378ADD"
              filter="url(#glow2)"
            >
              <animate
                attributeName="r"
                values={`${d2 / 2};${d2 / 2 + 2};${d2 / 2}`}
                dur="0.8s"
                repeatCount="indefinite"
              />
            </circle>
          )}

          {/* End dots when complete */}
          {progress >= 1 && data.trajectory1.length > 0 && (
            <circle
              cx={data.trajectory1[data.trajectory1.length - 1].x}
              cy={data.trajectory1[data.trajectory1.length - 1].y}
              r={d1 / 2}
              fill="#E24B4A"
            />
          )}
          {progress >= 1 && data.trajectory2.length > 0 && (
            <circle
              cx={data.trajectory2[data.trajectory2.length - 1].x}
              cy={data.trajectory2[data.trajectory2.length - 1].y}
              r={d2 / 2}
              fill="#378ADD"
            />
          )}
        </svg>

        {/* Efficiency Overlay */}
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md border border-border/50 rounded flex flex-col items-end p-3 pointer-events-none">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1">
            Efficiency
          </div>
          <div className="text-3xl font-mono font-bold text-foreground">
            {result.efficiency.toFixed(1)}
            <span className="text-lg text-muted-foreground">%</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-full px-3 py-1.5">
          {/* Progress bar */}
          <div className="w-20 h-1 bg-muted/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-none"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <button
            onClick={() => {
              if (isPlaying) {
                setIsPlaying(false);
              } else if (progress >= 1) {
                replay();
              } else {
                startRef.current = null;
                setIsPlaying(true);
              }
            }}
            className="text-[10px] font-mono uppercase tracking-wider text-foreground/70 hover:text-foreground transition-colors px-1"
          >
            {isPlaying ? "⏸ Pause" : progress >= 1 ? "↺ Replay" : "▶ Play"}
          </button>
          <button
            onClick={replay}
            className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            ↺
          </button>
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
            <Badge
              variant="outline"
              className={`font-mono text-[10px] uppercase ${
                result.mode_p1 === "bump"
                  ? "bg-[#E24B4A]/10 text-[#E24B4A] border-[#E24B4A]/30"
                  : "bg-[#378ADD]/10 text-[#378ADD] border-[#378ADD]/30"
              }`}
            >
              {result.mode_p1}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#378ADD]" />
              <span className="text-xs font-mono text-foreground/80">{label2}</span>
            </div>
            <Badge
              variant="outline"
              className={`font-mono text-[10px] uppercase ${
                result.mode_p2 === "bump"
                  ? "bg-[#E24B4A]/10 text-[#E24B4A] border-[#E24B4A]/30"
                  : "bg-[#378ADD]/10 text-[#378ADD] border-[#378ADD]/30"
              }`}
            >
              {result.mode_p2}
            </Badge>
          </div>
        </div>

        {/* Legend */}
        <div className="border border-border/50 rounded-lg p-3 bg-card space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground border-b border-border/50 pb-2">
            Legend
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/60">
            <div className="w-6 h-[2px] bg-[#E24B4A] opacity-20" />
            <span>Ghost path (full trajectory)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/70">
            <div className="w-6 h-[2.5px] bg-[#E24B4A]" />
            <span>Animated trail</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-foreground/70">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E24B4A]" />
            <span>Moving particle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueColor = "text-foreground",
}: {
  label: string;
  value: string | React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="border border-border/50 rounded-lg p-3 bg-card flex flex-col justify-center">
      <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`text-base font-mono font-semibold ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
