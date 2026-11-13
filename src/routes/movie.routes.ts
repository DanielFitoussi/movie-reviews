import { Router } from 'express';
import {
  createMovie,
  deleteMovie,
  getMovie,
  listMovies,
  updateMovie,
} from '../controllers/movie.controller';

const router = Router();

router.get('/movies', listMovies);
router.get('/movies/:id', getMovie);
router.post('/movies', createMovie);
router.patch('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

export default router;
