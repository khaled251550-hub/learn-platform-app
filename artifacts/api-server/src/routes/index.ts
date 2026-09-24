import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import platformRouter from "./platform";

const router: IRouter = Router();

router.use(healthRouter);
router.use(platformRouter);
router.use(aiRouter);

export default router;
