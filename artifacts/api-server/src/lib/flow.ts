/**
 * flow.ts
 * -------
 * Step 3 of the DLD project plan: flow rate analysis.
 *
 * Models how sorting efficiency degrades as flow velocity increases.
 *
 * Key physics:
 *   - DLD requires Stokes flow (Re << 1). Above Re ≈ 0.1 inertial effects
 *     cause particles to overshoot pillar gaps and stop sorting correctly.
 *   - Reynolds number: Re = ρ·v·G / µ
 *       ρ_water = 1000 kg/m³, µ_water = 0.001 Pa·s
 *       → Re = v_mm_s × G_µm × 1e-6  (practical units)
 *   - Efficiency degradation factor:
 *       f(Re) = 1 / (1 + (Re / Re_crit)^1.5)
 *       Re_crit = 0.1 — efficiency halved at this point
 *   - Volumetric flow rate: Q = v × w × h (converted to µL/min)
 *
 * The "optimal operating window" is where:
 *   1. Re < Re_crit (still in Stokes regime)
 *   2. Efficiency after degradation ≥ 50 % of ideal
 */

import { sortingEfficiency } from "./dld";

export const RE_CRIT = 0.1; // efficiency halved at this Re
const RHO = 1000; // kg/m³ (water)
const MU = 0.001; // Pa·s (water at 20 °C)

export interface FlowPoint {
  v_mm_s: number;
  Re: number;
  flow_rate_ul_min: number;
  efficiency: number;
  regime: "deep-stokes" | "stokes" | "transition" | "inertial";
}

export interface FlowAnalysis {
  points: FlowPoint[];
  ideal_efficiency: number;
  Dc: number;
  optimal_v_min_mm_s: number;
  optimal_v_max_mm_s: number;
  optimal_q_min_ul_min: number;
  optimal_q_max_ul_min: number;
  re_crit: number;
  channel_height_um: number;
  channel_width_um: number;
}

function reynoldsNumber(v_mm_s: number, G_um: number): number {
  // Re = ρ × v × G / µ (SI units)
  const v_m_s = v_mm_s * 1e-3;
  const G_m = G_um * 1e-6;
  return (RHO * v_m_s * G_m) / MU;
}

function efficiencyFactor(Re: number): number {
  // Soft degradation: f = 1 / (1 + (Re/Re_crit)^1.5)
  // At Re = Re_crit: f = 0.5
  return 1 / (1 + Math.pow(Re / RE_CRIT, 1.5));
}

function flowRegime(Re: number): FlowPoint["regime"] {
  if (Re < 0.01) return "deep-stokes";
  if (Re < 0.1) return "stokes";
  if (Re < 1) return "transition";
  return "inertial";
}

function volumetricFlowRate(v_mm_s: number, width_um: number, height_um: number): number {
  // Q = v × cross-section area, converted to µL/min
  // v in mm/s, width/height in µm → mm
  const w_mm = width_um / 1000;
  const h_mm = height_um / 1000;
  // Q [mm³/s] × 60 [s/min] / 1000 [mm³/µL]
  return v_mm_s * w_mm * h_mm * 60 / 1000;
}

export interface ThroughputResult {
  optimal_q_max_ul_min: number;
  throughput_cells_per_min: number;
  throughput_cells_per_hour: number;
  processing_time_min: number;
  total_cells_in_sample: number;
  recovered_cells: number;
  efficiency_at_optimal: number;
  concentration_cells_per_ml: number;
  sample_volume_ml: number;
  Dc: number;
  channel_height_um: number;
  channel_width_um: number;
}

export function computeThroughput(
  d1: number,
  d2: number,
  G: number,
  N: number,
  concentrationCellsPerMl: number,
  sampleVolumeMl = 1.0,
  channelHeightUm = 50,
  channelWidthUm = 500,
): ThroughputResult {
  const flow = analyzeFlowRate(d1, d2, G, N, channelHeightUm, channelWidthUm);

  // Use the max of the optimal operating window
  const optQMax = flow.optimal_q_max_ul_min; // µL/min
  const effFraction = flow.ideal_efficiency / 100;

  // Throughput: Q [µL/min] × 1e-3 [mL/µL] × concentration [cells/mL]
  const cellsPerMin = optQMax * 1e-3 * concentrationCellsPerMl;
  const cellsPerHour = cellsPerMin * 60;

  const totalCells = sampleVolumeMl * concentrationCellsPerMl;
  // Processing time: sample_volume [mL] / (Q_max [µL/min] × 1e-3 [mL/µL])
  const processingTimeMin = optQMax > 0 ? sampleVolumeMl / (optQMax * 1e-3) : Infinity;

  const recoveredCells = Math.round(totalCells * effFraction);

  return {
    optimal_q_max_ul_min: Math.round(optQMax * 1000) / 1000,
    throughput_cells_per_min: Math.round(cellsPerMin),
    throughput_cells_per_hour: Math.round(cellsPerHour),
    processing_time_min: Math.round(processingTimeMin * 10) / 10,
    total_cells_in_sample: Math.round(totalCells),
    recovered_cells: recoveredCells,
    efficiency_at_optimal: flow.ideal_efficiency,
    concentration_cells_per_ml: concentrationCellsPerMl,
    sample_volume_ml: sampleVolumeMl,
    Dc: flow.Dc,
    channel_height_um: channelHeightUm,
    channel_width_um: channelWidthUm,
  };
}

export interface CascadeStageResult {
  G: number;
  N: number;
  Dc: number;
  d1_mode: "bump" | "zigzag";
  d2_mode: "bump" | "zigzag";
  ideal_efficiency: number;
  q_max_ul_min: number;
  optimal_v_max_mm_s: number;
  separated: boolean;
}

export interface CascadeSummary {
  dc_window_um: number;
  overall_efficiency: number;
  bottleneck_q_max_ul_min: number;
  separation_achieved: boolean;
  stages_agree: boolean;
}

export interface CascadeResult {
  d1: number;
  d2: number;
  stage1: CascadeStageResult;
  stage2: CascadeStageResult;
  summary: CascadeSummary;
}

function stageResult(
  d1: number,
  d2: number,
  G: number,
  N: number,
  channelHeightUm = 50,
  channelWidthUm = 500,
): CascadeStageResult {
  const { sortingEfficiency, particleMode, criticalDiameter } = require("./dld");
  const geo = sortingEfficiency(d1, d2, G, N);
  // Analytic Q_max at Re = RE_CRIT
  const vMax = RE_CRIT / (G * 1e-3); // mm/s
  const wMm = channelWidthUm / 1000;
  const hMm = channelHeightUm / 1000;
  const qMax = vMax * wMm * hMm * 60 / 1000;
  return {
    G,
    N,
    Dc: geo.Dc,
    d1_mode: geo.mode_p1 as "bump" | "zigzag",
    d2_mode: geo.mode_p2 as "bump" | "zigzag",
    ideal_efficiency: geo.efficiency,
    q_max_ul_min: Math.round(qMax * 1000) / 1000,
    optimal_v_max_mm_s: Math.round(vMax * 1000) / 1000,
    separated: geo.separated,
  };
}

export function computeCascade(
  d1: number,
  d2: number,
  g1: number,
  n1: number,
  g2: number,
  n2: number,
  ch1 = 50, cw1 = 500,
  ch2 = 50, cw2 = 500,
): CascadeResult {
  const s1 = stageResult(d1, d2, g1, n1, ch1, cw1);
  const s2 = stageResult(d1, d2, g2, n2, ch2, cw2);

  const dcWindow = Math.abs(s1.Dc - s2.Dc);
  const separationAchieved = s1.separated || s2.separated;
  const stagesAgree = s1.separated && s2.separated &&
    s1.d1_mode === s2.d1_mode && s1.d2_mode === s2.d2_mode;

  // Overall efficiency: if both stages help, multiply; if one, use that one
  let overallEff: number;
  if (s1.separated && s2.separated) {
    overallEff = stagesAgree
      ? Math.round(s1.ideal_efficiency * s2.ideal_efficiency / 100 * 10) / 10
      : Math.round(Math.max(s1.ideal_efficiency, s2.ideal_efficiency) * 0.6 * 10) / 10;
  } else {
    overallEff = s1.separated ? s1.ideal_efficiency : s2.separated ? s2.ideal_efficiency : 0;
  }

  return {
    d1,
    d2,
    stage1: s1,
    stage2: s2,
    summary: {
      dc_window_um: Math.round(dcWindow * 100) / 100,
      overall_efficiency: overallEff,
      bottleneck_q_max_ul_min: Math.min(s1.q_max_ul_min, s2.q_max_ul_min),
      separation_achieved: separationAchieved,
      stages_agree: stagesAgree,
    },
  };
}

export interface OptimizePoint {
  G: number;
  N: number;
  value: number;
}

export interface OptimizeResult {
  objective: string;
  best_G: number;
  best_N: number;
  best_value: number;
  metric_label: string;
  points: OptimizePoint[];
  G_vals: number[];
  N_vals: number[];
  value_matrix: number[][];
}

export function computeOptimize(
  d1: number,
  d2: number,
  objective: "efficiency" | "q_max" | "dc_target",
  dcTarget = 10,
  gMin = 5,
  gMax = 60,
  gStep = 5,
  nMin = 2,
  nMax = 15,
  channelHeightUm = 50,
  channelWidthUm = 500,
): OptimizeResult {
  const G_vals: number[] = [];
  for (let g = gMin; g <= gMax; g += gStep) G_vals.push(g);
  const N_vals: number[] = [];
  for (let n = nMin; n <= nMax; n++) N_vals.push(n);

  const score = (G: number, N: number): number => {
    const geo = sortingEfficiency(d1, d2, G, N);
    if (objective === "efficiency") return geo.efficiency;
    if (objective === "dc_target") return -Math.abs(geo.Dc - dcTarget);
    // q_max: analytic — velocity at Re = RE_CRIT, then Q = v × w × h
    // Re = v_mm_s × G_um × 1e-3  →  v_crit = RE_CRIT / (G * 1e-3)
    const vCrit = RE_CRIT / (G * 1e-3); // mm/s
    const wMm = channelWidthUm / 1000;
    const hMm = channelHeightUm / 1000;
    return vCrit * wMm * hMm * 60 / 1000; // µL/min
  };

  let bestG = G_vals[0], bestN = N_vals[0], bestVal = -Infinity;
  const points: OptimizePoint[] = [];
  const value_matrix: number[][] = [];

  for (const N of N_vals) {
    const row: number[] = [];
    for (const G of G_vals) {
      const val = Math.round(score(G, N) * 1000) / 1000;
      points.push({ G, N, value: val });
      row.push(val);
      if (val > bestVal) { bestVal = val; bestG = G; bestN = N; }
    }
    value_matrix.push(row);
  }

  const metricLabels: Record<string, string> = {
    efficiency: "Sorting efficiency (%)",
    q_max: "Q_max (µL/min)",
    dc_target: `|Dc − ${dcTarget} µm|`,
  };

  return {
    objective,
    best_G: bestG,
    best_N: bestN,
    best_value: Math.round(bestVal * 1000) / 1000,
    metric_label: metricLabels[objective] ?? objective,
    points,
    G_vals,
    N_vals,
    value_matrix,
  };
}

export function analyzeFlowRate(
  d1: number,
  d2: number,
  G: number,
  N: number,
  channelHeightUm = 50,
  channelWidthUm = 500,
  vMaxMmS = 20,
  nPoints = 60,
): FlowAnalysis {
  const geo = sortingEfficiency(d1, d2, G, N);
  const idealEff = geo.efficiency;
  const Dc = geo.Dc;

  // Log-spaced velocity sweep from 0.002 mm/s to vMaxMmS
  const vMin = 0.002;
  const logMin = Math.log10(vMin);
  const logMax = Math.log10(vMaxMmS);

  const points: FlowPoint[] = [];

  for (let i = 0; i < nPoints; i++) {
    const logV = logMin + (i / (nPoints - 1)) * (logMax - logMin);
    const v = Math.pow(10, logV);
    const Re = reynoldsNumber(v, G);
    const factor = efficiencyFactor(Re);
    const eff = Math.round(idealEff * factor * 10) / 10;
    const Q = volumetricFlowRate(v, channelWidthUm, channelHeightUm);

    points.push({
      v_mm_s: Math.round(v * 10000) / 10000,
      Re: Math.round(Re * 100000) / 100000,
      flow_rate_ul_min: Math.round(Q * 10000) / 10000,
      efficiency: eff,
      regime: flowRegime(Re),
    });
  }

  // Optimal window: efficiency ≥ 50 % of ideal AND Re < Re_crit
  const optimalPoints = points.filter(
    (p) => p.efficiency >= idealEff * 0.5 && p.Re < RE_CRIT,
  );

  const optVMin = optimalPoints.length > 0 ? optimalPoints[0].v_mm_s : 0;
  const optVMax = optimalPoints.length > 0 ? optimalPoints[optimalPoints.length - 1].v_mm_s : 0;
  const optQMin = optimalPoints.length > 0 ? optimalPoints[0].flow_rate_ul_min : 0;
  const optQMax = optimalPoints.length > 0 ? optimalPoints[optimalPoints.length - 1].flow_rate_ul_min : 0;

  return {
    points,
    ideal_efficiency: idealEff,
    Dc,
    optimal_v_min_mm_s: Math.round(optVMin * 1000) / 1000,
    optimal_v_max_mm_s: Math.round(optVMax * 1000) / 1000,
    optimal_q_min_ul_min: Math.round(optQMin * 1000) / 1000,
    optimal_q_max_ul_min: Math.round(optQMax * 1000) / 1000,
    re_crit: RE_CRIT,
    channel_height_um: channelHeightUm,
    channel_width_um: channelWidthUm,
  };
}
