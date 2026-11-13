import { Router } from 'express';
import healthRoutes from './health.routes';
import movieRoutes from './movie.routes';

const router = Router();

router.use(healthRoutes);
router.use(movieRoutes);

export default router;
