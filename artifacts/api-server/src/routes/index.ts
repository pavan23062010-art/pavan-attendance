import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pavanRouter from "./pavan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pavanRouter);

export default router;
