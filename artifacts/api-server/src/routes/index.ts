import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dldRouter from "./dld";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dldRouter);

export default router;
