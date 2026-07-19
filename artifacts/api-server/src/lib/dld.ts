/**
 * dld.ts
 * ------
 * Core physics engine for Deterministic Lateral Displacement (DLD)
 * microfluidic cell sorting simulation.
 *
 * Based on:
 *   - Davis formula: Dc = 1.4 * G * N^(-0.48)
 *   - Zigzag vs bump mode particle trajectory modeling
 *   - Steric interaction model with pillar arrays
 */

export const CELL_LIBRARY = [
  // Blood cells (smallest → largest)
  { name: "Platelet", diameter: 2.5 },
  { name: "Red blood cell (RBC)", diameter: 7.5 },
  { name: "Lymphocyte", diameter: 8.5 },
  { name: "Neutrophil", diameter: 12.0 },
  { name: "Monocyte", diameter: 15.0 },
  // Stem & progenitor cells
  { name: "Hematopoietic stem cell", diameter: 10.0 },
  // Circulating tumor cells (CTCs)
  { name: "Circulating tumor cell (CTC)", diameter: 18.0 },
  { name: "MCF-7 (breast cancer)", diameter: 20.0 },
  { name: "A549 (lung cancer)", diameter: 18.0 },
  { name: "HeLa cell", diameter: 16.0 },
  { name: "PC-3 (prostate cancer)", diameter: 14.0 },
  // Microbes
  { name: "Bacteria (E. coli)", diameter: 2.0 },
  { name: "Yeast cell", diameter: 4.0 },
  // Custom
  { name: "Custom A", diameter: 6.0 },
  { name: "Custom B", diameter: 14.0 },
];

export function criticalDiameter(G: number, N: number): number {
  return 1.4 * G * Math.pow(N, -0.48);
}

export function particleMode(diameter: number, Dc: number): "bump" | "zigzag" {
  return diameter >= Dc ? "bump" : "zigzag";
}

export interface SortingResult {
  Dc: number;
  mode_p1: string;
  mode_p2: string;
  separated: boolean;
  delta_ld: number;
  efficiency: number;
  lateral_d1: number;
  lateral_d2: number;
}

export function sortingEfficiency(
  d1: number,
  d2: number,
  G: number,
  N: number,
): SortingResult {
  const Dc = criticalDiameter(G, N);
  const m1 = particleMode(d1, Dc);
  const m2 = particleMode(d2, Dc);
  const separated = m1 !== m2;

  const lateralBump = G / N;
  const lateralZigzag = 0.0;

  const ld1 = m1 === "bump" ? lateralBump : lateralZigzag;
  const ld2 = m2 === "bump" ? lateralBump : lateralZigzag;
  const deltaLd = Math.abs(ld1 - ld2);

  const margin1 = Math.abs(d1 - Dc) / Dc;
  const margin2 = Math.abs(d2 - Dc) / Dc;
  const efficiency = separated
    ? Math.min(100, Math.round((margin1 + margin2) * 50 * 10) / 10)
    : 0.0;

  return {
    Dc: Math.round(Dc * 100) / 100,
    mode_p1: m1,
    mode_p2: m2,
    separated,
    delta_ld: Math.round(deltaLd * 1000) / 1000,
    efficiency,
    lateral_d1: Math.round(ld1 * 1000) / 1000,
    lateral_d2: Math.round(ld2 * 1000) / 1000,
  };
}

export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface PillarCircle {
  cx: number;
  cy: number;
  r: number;
}

export function simulateTrajectory(
  diameter: number,
  G: number,
  N: number,
  nRows = 20,
  pillarRadius?: number,
): TrajectoryPoint[] {
  const pr = pillarRadius ?? G * 0.4;
  const Dc = criticalDiameter(G, N);
  const mode = particleMode(diameter, Dc);

  const rowPitch = 2 * pr + G;
  const colPitch = rowPitch;
  const rowOffset = colPitch / N;

  const positions: TrajectoryPoint[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;

  for (let i = 0; i < nRows; i++) {
    y += rowPitch;

    if (mode === "bump") {
      x += rowOffset;
    } else {
      x += i % N < Math.floor(N / 2) ? rowOffset : -rowOffset;
    }

    positions.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
  }

  return positions;
}

export function buildPillarArray(
  G: number,
  N: number,
  nRows = 20,
  nCols = 6,
  pillarRadius?: number,
): PillarCircle[] {
  const pr = pillarRadius ?? G * 0.4;
  const rowPitch = 2 * pr + G;
  const colPitch = rowPitch;

  const pillars: PillarCircle[] = [];

  for (let row = 0; row <= nRows; row++) {
    const offset = (row % N) * (colPitch / N);
    for (let col = -1; col <= nCols; col++) {
      const cx = col * colPitch + offset;
      const cy = row * rowPitch;
      pillars.push({
        cx: Math.round(cx * 100) / 100,
        cy: Math.round(cy * 100) / 100,
        r: Math.round(pr * 100) / 100,
      });
    }
  }

  return pillars;
}

export interface SweepBest {
  G: number;
  N: number;
  efficiency: number;
  Dc: number;
}

export interface SweepResult {
  G_vals: number[];
  N_vals: number[];
  eff_matrix: number[][];
  best: SweepBest;
}

export function geometrySweep(
  d1: number,
  d2: number,
  gMin = 5,
  gMax = 50,
  nG = 15,
  nMin = 2,
  nMax = 12,
): SweepResult {
  const G_vals: number[] = [];
  for (let i = 0; i < nG; i++) {
    G_vals.push(gMin + (i / (nG - 1)) * (gMax - gMin));
  }

  const N_vals: number[] = [];
  for (let n = nMin; n <= nMax; n++) {
    N_vals.push(n);
  }

  const eff_matrix: number[][] = [];
  let bestEff = -1;
  let bestG = G_vals[0];
  let bestN = N_vals[0];
  let bestDc = 0;

  for (let i = 0; i < N_vals.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < G_vals.length; j++) {
      const res = sortingEfficiency(d1, d2, G_vals[j], N_vals[i]);
      row.push(res.efficiency);
      if (res.efficiency > bestEff) {
        bestEff = res.efficiency;
        bestG = G_vals[j];
        bestN = N_vals[i];
        bestDc = res.Dc;
      }
    }
    eff_matrix.push(row);
  }

  return {
    G_vals: G_vals.map((v) => Math.round(v * 100) / 100),
    N_vals,
    eff_matrix,
    best: {
      G: Math.round(bestG * 100) / 100,
      N: bestN,
      efficiency: bestEff,
      Dc: Math.round(bestDc * 100) / 100,
    },
  };
}

export interface DcCurveSeries {
  N: number;
  Dc_vals: number[];
}

export interface DcCurveResult {
  G_vals: number[];
  curves: DcCurveSeries[];
}

export function computeDcCurves(
  N_values: number[],
  gMin = 2,
  gMax = 60,
  nPoints = 60,
): DcCurveResult {
  const G_vals: number[] = [];
  for (let i = 0; i < nPoints; i++) {
    G_vals.push(gMin + (i / (nPoints - 1)) * (gMax - gMin));
  }

  const curves: DcCurveSeries[] = N_values.map((N) => ({
    N,
    Dc_vals: G_vals.map((G) => Math.round(criticalDiameter(G, N) * 100) / 100),
  }));

  return {
    G_vals: G_vals.map((v) => Math.round(v * 100) / 100),
    curves,
  };
}
