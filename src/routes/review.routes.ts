import { Router } from 'express';
import {
  createReview,
  deleteReview,
  listReviews,
  updateReview,
} from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public: anyone can read a movie's reviews.
router.get('/movies/:id/reviews', listReviews);

// Logged-in users only. Who may edit or delete depends on the review's author,
// so the service checks that (there's no requireAdmin here).
router.post('/movies/:id/reviews', authenticate, createReview);
router.patch('/reviews/:id', authenticate, updateReview);
router.delete('/reviews/:id', authenticate, deleteReview);

export default router;
