import { Router, type IRouter } from "express";
import {
  AnalyzeParticlesBody,
  SweepGeometryBody,
  GetDcCurveBody,
  ExportDxfBody,
} from "@workspace/api-zod";
import {
  CELL_LIBRARY,
  sortingEfficiency,
  simulateTrajectory,
  buildPillarArray,
  geometrySweep,
  computeDcCurves,
  criticalDiameter,
} from "../lib/dld";
import { generateDxf } from "../lib/dxf";

const router: IRouter = Router();

const DLD_PRESETS = [
  {
    id: "ctc-isolation",
    name: "CTC Isolation",
    description: "Isolates circulating tumor cells (16 µm) from red blood cells (8 µm). Dc sits between both populations.",
    d1: 8.0,
    d2: 16.0,
    label1: "Red blood cell",
    label2: "Circ. tumor cell",
    G: 20,
    N: 5,
    Dc: criticalDiameter(20, 5),
    task: "Liquid biopsy / cancer diagnostics",
  },
  {
    id: "wbc-enrichment",
    name: "WBC Enrichment",
    description: "Separates white blood cells (12 µm) from red blood cells (8 µm). Tight Dc window between the two.",
    d1: 8.0,
    d2: 12.0,
    label1: "Red blood cell",
    label2: "White blood cell",
    G: 20,
    N: 9,
    Dc: criticalDiameter(20, 9),
    task: "Immune cell isolation",
  },
  {
    id: "platelet-depletion",
    name: "Platelet Depletion",
    description: "Removes platelets (2.5 µm) from whole blood while retaining red blood cells (8 µm).",
    d1: 2.5,
    d2: 8.0,
    label1: "Platelet",
    label2: "Red blood cell",
    G: 10,
    N: 8,
    Dc: criticalDiameter(10, 8),
    task: "Blood fractionation",
  },
];

router.get("/dld/cells", async (_req, res): Promise<void> => {
  res.json(CELL_LIBRARY);
});

router.get("/dld/presets", async (_req, res): Promise<void> => {
  res.json(DLD_PRESETS);
});

router.post("/dld/export-dxf", async (req, res): Promise<void> => {
  const parsed = ExportDxfBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { G, N, scale, label, n_rows, n_cols } = parsed.data;

  try {
    const result = generateDxf({
      G,
      N,
      scale,
      label: label ?? undefined,
      n_rows: n_rows ?? undefined,
      n_cols: n_cols ?? undefined,
    });

    req.log.info(
      { G, N, scale, chip_width_mm: result.chip_width_mm, chip_height_mm: result.chip_height_mm },
      "DXF export generated",
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "DXF export failed");
    res.status(400).json({ error: "DXF generation failed" });
  }
});

router.post("/dld/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeParticlesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { d1, d2, G, N, label1, label2 } = parsed.data;

  try {
    const result = sortingEfficiency(d1, d2, G, N);
    const trajectory1 = simulateTrajectory(d1, G, N);
    const trajectory2 = simulateTrajectory(d2, G, N);
    const pillars = buildPillarArray(G, N);

    req.log.info(
      { d1, d2, G, N, label1, label2, separated: result.separated },
      "DLD analysis complete",
    );

    res.json({ result, trajectory1, trajectory2, pillars });
  } catch (err) {
    req.log.error({ err }, "DLD analysis failed");
    res.status(400).json({ error: "Analysis failed" });
  }
});

router.post("/dld/sweep", async (req, res): Promise<void> => {
  const parsed = SweepGeometryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { d1, d2 } = parsed.data;

  try {
    const sweep = geometrySweep(d1, d2);
    req.log.info({ d1, d2, bestN: sweep.best.N, bestG: sweep.best.G }, "Geometry sweep complete");
    res.json(sweep);
  } catch (err) {
    req.log.error({ err }, "Geometry sweep failed");
    res.status(400).json({ error: "Sweep failed" });
  }
});

router.post("/dld/dc-curve", async (req, res): Promise<void> => {
  const parsed = GetDcCurveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { N_values } = parsed.data;

  try {
    const result = computeDcCurves(N_values);
    req.log.info({ N_values }, "Dc curve computation complete");
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Dc curve computation failed");
    res.status(400).json({ error: "Dc curve computation failed" });
  }
});

export default router;
