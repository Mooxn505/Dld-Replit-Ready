import { Router, type IRouter } from "express";
import {
  AnalyzeParticlesBody,
  SweepGeometryBody,
  GetDcCurveBody,
} from "@workspace/api-zod";
import {
  CELL_LIBRARY,
  sortingEfficiency,
  simulateTrajectory,
  buildPillarArray,
  geometrySweep,
  computeDcCurves,
} from "../lib/dld";

const router: IRouter = Router();

router.get("/dld/cells", async (_req, res): Promise<void> => {
  res.json(CELL_LIBRARY);
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
