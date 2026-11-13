import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import movieRoutes from './movie.routes';
import reviewRoutes from './review.routes';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(movieRoutes);
router.use(reviewRoutes);

export default router;
