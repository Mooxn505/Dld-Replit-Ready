import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Layers3, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ── Physics (frontend-only, mirrors backend formulas) ─────────────────────
function critDc(G: number, N: number) {
  return 1.4 * G * Math.pow(Math.max(N, 1), -0.48);
}
function mode(d: number, G: number, N: number): "bump" | "zigzag" {
  return d >= critDc(G, N) ? "bump" : "zigzag";
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

// Find best G/N to place Dc between two diameters
function findBestGeometry(dSmall: number, dLarge: number) {
  let bestEff = -1, bestG = 10, bestN = 5, bestDc = 0;
  for (let G = 5; G <= 50; G++) {
    for (let N = 2; N <= 12; N++) {
      const Dc = critDc(G, N);
      if (Dc > dSmall && Dc < dLarge) {
        const eff = sortEff(dSmall, dLarge, G, N);
        if (eff > bestEff) {
          bestEff = eff; bestG = G; bestN = N; bestDc = Dc;
        }
      }
    }
  }
  return { G: bestG, N: bestN, Dc: bestDc, efficiency: bestEff };
}

// Simulate trajectory points (same logic as backend)
function simulateTrajectory(diameter: number, G: number, N: number, nRows = 20) {
  const pr = G * 0.4;
  const Dc = critDc(G, N);
  const m = diameter >= Dc ? "bump" : "zigzag";
  const rowPitch = 2 * pr + G;
  const colPitch = rowPitch;
  const rowOffset = colPitch / N;
  let x = 0, y = 0;
  const pts = [{ x: 0, y: 0 }];
  for (let i = 0; i < nRows; i++) {
    y += rowPitch;
    if (m === "bump") x += rowOffset;
    else x += i % N < Math.floor(N / 2) ? rowOffset : -rowOffset;
    pts.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
  }
  return pts;
}

function buildPillars(G: number, N: number, nRows = 20, nCols = 6) {
  const pr = G * 0.4;
  const rowPitch = 2 * pr + G;
  const colPitch = rowPitch;
  const pillars: { cx: number; cy: number; r: number }[] = [];
  for (let row = 0; row <= nRows; row++) {
    const offset = (row % N) * (colPitch / N);
    for (let col = -1; col <= nCols; col++) {
      pillars.push({
        cx: Math.round((col * colPitch + offset) * 100) / 100,
        cy: Math.round(row * rowPitch * 100) / 100,
        r: Math.round(pr * 100) / 100,
      });
    }
  }
  return pillars;
}

interface ThreeParticlePanelProps {
  d1: number;
  label1: string;
  d2: number;
  label2: string;
  onApplyStage1?: (G: number, N: number) => void;
}

const COLORS = ["#E24B4A", "#EF9F27", "#378ADD"] as const;

export function ThreeParticlePanel({
  d1,
  label1,
  d2,
  label2,
  onApplyStage1,
}: ThreeParticlePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [d3, setD3] = useState(18.0);
  const [label3, setLabel3] = useState("CTC");

  const { stage1, stage2, sorted, trajectories } = useMemo(() => {
    // Sort particles smallest → largest
    const particles = [
      { d: d1, label: label1, color: COLORS[0] },
      { d: d2, label: label2, color: COLORS[1] },
      { d: d3, label: label3, color: COLORS[2] },
    ].sort((a, b) => a.d - b.d);

    const [p1, p2, p3] = particles;

    // Stage 1: Dc between p1 and p2 → p1 zigzag, p2+p3 bump
    const stage1 = findBestGeometry(p1.d, p2.d);

    // Stage 2: Dc between p2 and p3 → p2 zigzag, p3 bump
    const stage2 = findBestGeometry(p2.d, p3.d);

    // Which outlet each particle exits in stage 1
    const s1_p1 = mode(p1.d, stage1.G, stage1.N); // should be zigzag
    const s1_p2 = mode(p2.d, stage1.G, stage1.N); // should be bump
    const s1_p3 = mode(p3.d, stage1.G, stage1.N); // should be bump

    // Stage 2 on the bump output of stage 1 (p2 + p3)
    const s2_p2 = mode(p2.d, stage2.G, stage2.N); // should be zigzag
    const s2_p3 = mode(p3.d, stage2.G, stage2.N); // should be bump

    const sorted = [
      { ...p1, stage1Mode: s1_p1, outlet: "Stage 1 — Zigzag outlet", finalOutlet: "Outlet A" },
      { ...p2, stage1Mode: s1_p2, stage2Mode: s2_p2, outlet: "Stage 2 — Zigzag outlet", finalOutlet: "Outlet B" },
      { ...p3, stage1Mode: s1_p3, stage2Mode: s2_p3, outlet: "Stage 2 — Bump outlet", finalOutlet: "Outlet C" },
    ];

    // Stage 1 trajectory visualization
    const pillars = buildPillars(stage1.G, stage1.N);
    const traj = particles.map(p => simulateTrajectory(p.d, stage1.G, stage1.N));

    return { stage1, stage2, sorted, trajectories: { pillars, traj, particles } };
  }, [d1, d2, d3, label1, label2, label3]);

  const svgBounds = useMemo(() => {
    const xs = trajectories.pillars.map(p => p.cx);
    const ys = trajectories.pillars.map(p => p.cy);
    const rs = trajectories.pillars.map(p => p.r);
    const maxR = Math.max(...rs);
    const pad = maxR * 2 + 10;
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
    };
  }, [trajectories.pillars]);

  const svgW = svgBounds.maxX - svgBounds.minX;
  const svgH = svgBounds.maxY - svgBounds.minY;

  const feasible = stage1.efficiency > 0 && stage2.efficiency > 0;

  return (
    <div className="border-t border-border/50">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Layers3 className="w-3.5 h-3.5 text-[#EF9F27]" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            3-Particle Cascade
          </span>
          <span className="text-[8px] font-mono text-[#EF9F27] bg-[#EF9F27]/10 border border-[#EF9F27]/30 rounded-full px-1.5 py-0.5">
            advanced
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
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
                Design a 2-stage cascade to separate 3 particle types into 3 separate outlets.
                Uses Particle 1 and Particle 2 from the main panel plus a third target cell.
              </p>

              {/* 3rd particle input */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-wider font-mono" style={{ color: COLORS[2] }}>
                    Particle 3 diameter (µm)
                  </Label>
                  <Input
                    type="number"
                    value={d3}
                    onChange={e => setD3(Number(e.target.value))}
                    className="font-mono text-xs h-7 bg-background/50"
                    step="0.1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] uppercase tracking-wider font-mono" style={{ color: COLORS[2] }}>
                    Label
                  </Label>
                  <Input
                    value={label3}
                    onChange={e => setLabel3(e.target.value)}
                    className="font-mono text-xs h-7 bg-background/50"
                  />
                </div>
              </div>

              {/* Feasibility indicator */}
              <div className={`px-3 py-2 rounded border text-[9px] font-mono ${
                feasible
                  ? "border-[#1D9E75]/40 bg-[#1D9E75]/8 text-[#1D9E75]"
                  : "border-[#E24B4A]/40 bg-[#E24B4A]/8 text-[#E24B4A]"
              }`}>
                {feasible
                  ? `✓ 3-particle separation is feasible with this geometry`
                  : `⚠ Particle sizes too close — cannot find separating geometry. Try increasing size gaps.`}
              </div>

              {/* Cascade design */}
              {feasible && (
                <div className="space-y-3">
                  <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                    Optimized 2-stage cascade
                  </div>

                  {/* Stage cards */}
                  {[
                    { stage: "Stage 1", geo: stage1, desc: `Separates ${sorted[0].label} (zigzag) from the rest (bump)` },
                    { stage: "Stage 2", geo: stage2, desc: `Separates ${sorted[1].label} (zigzag) from ${sorted[2].label} (bump)` },
                  ].map(({ stage, geo, desc }) => (
                    <div key={stage} className="bg-muted/15 border border-border/40 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-foreground/90">{stage}</span>
                        <div className="flex gap-2 text-[9px] font-mono">
                          <span className="text-primary">G = {geo.G} µm</span>
                          <span className="text-primary">N = {geo.N}</span>
                          <span className={geo.efficiency >= 60 ? "text-[#1D9E75]" : "text-[#EF9F27]"}>
                            Eff: {geo.efficiency.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-[8px] font-mono text-muted-foreground">
                        Dc = {geo.Dc.toFixed(2)} µm · {desc}
                      </div>
                    </div>
                  ))}

                  {/* Outlet routing */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
                      Final outlet routing
                    </div>
                    {sorted.map((p, i) => (
                      <div
                        key={p.label}
                        className="flex items-center justify-between px-2 py-1.5 rounded border text-[9px] font-mono"
                        style={{
                          borderColor: `${p.color}40`,
                          backgroundColor: `${p.color}08`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span style={{ color: p.color }} className="font-bold">{p.label}</span>
                          <span className="text-muted-foreground">({p.d} µm)</span>
                        </div>
                        <span className="text-foreground/70">{p.finalOutlet}</span>
                      </div>
                    ))}
                  </div>

                  {/* Stage 1 trajectory preview */}
                  <div>
                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                      Stage 1 trajectory preview
                    </div>
                    <div className="bg-card border border-border/50 rounded-lg overflow-hidden" style={{ height: 200 }}>
                      <svg
                        viewBox={`${svgBounds.minX} ${svgBounds.minY} ${svgW} ${svgH}`}
                        className="w-full h-full"
                        preserveAspectRatio="xMidYMid meet"
                      >
                        {/* Pillars */}
                        {trajectories.pillars.map((p, i) => (
                          <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#B4B2A9" opacity="0.5" />
                        ))}
                        {/* Trajectories */}
                        {trajectories.traj.map((pts, ti) => {
                          const d = "M " + pts.map(p => `${p.x},${p.y}`).join(" L ");
                          const col = trajectories.particles[ti].color;
                          const diam = trajectories.particles[ti].d;
                          return (
                            <g key={ti}>
                              <path d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                              <circle cx={pts[0].x} cy={pts[0].y} r={diam / 2} fill={col} opacity="0.4" />
                              <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={diam / 2} fill={col} />
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {trajectories.particles.map((p, i) => (
                        <div key={i} className="flex items-center gap-1 text-[8px] font-mono">
                          <div className="w-2 h-[2px]" style={{ backgroundColor: p.color }} />
                          <span style={{ color: p.color }}>{p.label} ({p.d}µm)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Apply stage 1 */}
                  {onApplyStage1 && (
                    <button
                      onClick={() => onApplyStage1(stage1.G, stage1.N)}
                      className="w-full flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase tracking-wider py-1.5 rounded border border-[#EF9F27]/50 text-[#EF9F27] bg-[#EF9F27]/10 hover:bg-[#EF9F27]/20 transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      Apply Stage 1 geometry (G={stage1.G}, N={stage1.N})
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
