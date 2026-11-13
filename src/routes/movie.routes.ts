import { Router } from 'express';
import {
  createMovie,
  deleteMovie,
  getMovie,
  listMovies,
  updateMovie,
} from '../controllers/movie.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Public: anyone can view and search.
router.get('/movies', listMovies);
router.get('/movies/:id', getMovie);

// Admin only. Express runs the handlers in order: authenticate (401 if not logged in),
// then requireAdmin (403 if not an admin), and only then the controller.
router.post('/movies', authenticate, requireAdmin, createMovie);
router.patch('/movies/:id', authenticate, requireAdmin, updateMovie);
router.delete('/movies/:id', authenticate, requireAdmin, deleteMovie);

export default router;
